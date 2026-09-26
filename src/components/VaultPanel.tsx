import { useState, useRef, type DragEvent, type ChangeEvent, useCallback } from "react";
import { encryptData, buildStegoVaultPayloadString, type VaultMetadata } from "../utils/crypto";
import { computeSHA256 } from "../utils/midnightContract";
import { hideData } from "../utils/steganography";
import { validateImageFile, createZipBundle, downloadBlob } from "../utils/file-utils";
import { use1AMWallet } from "../hooks/use1AMWallet";
import type { LogEntry } from "./TerminalLog";

interface VaultPanelProps {
    addLog: (text: string, type?: LogEntry["type"]) => void;
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: "", color: "transparent" };
    let s = 0;
    if (pw.length >= 8)  s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    if (s <= 1) return { score: s, label: "Weak",   color: "#f25454" };
    if (s <= 2) return { score: s, label: "Fair",   color: "var(--amber)" };
    if (s <= 3) return { score: s, label: "Good",   color: "#60b8ff" };
    return            { score: s, label: "Strong", color: "var(--green)" };
}

const STEPS = ["Cover Image", "Secret", "Password", "Seal"];

export default function VaultPanel({ addLog }: VaultPanelProps) {
    const { account, chainId, contractAddress, isConnected, connect, sendOnChainAuthorization } = use1AMWallet();

    const [activeStep, setActiveStep] = useState(0);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [seedPhrase, setSeedPhrase] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [done, setDone] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const strength = getPasswordStrength(password);

    const handleFile = useCallback((file: File) => {
        const result = validateImageFile(file);
        if (!result.valid) {
            setErrorMessage(result.error!);
            addLog(`[STEGO] INVALID: ${result.error!}`, "error");
            return;
        }
        setErrorMessage(null);
        setCoverFile(file);
        setPreview(URL.createObjectURL(file));
        addLog(`[STEGO] Cover image: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, "info");
        setActiveStep(1);
    }, [addLog]);

    const handleDrop = (e: DragEvent) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragActive(true); };
    const handleDragLeave = () => setDragActive(false);
    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); };

    const canProceedStep = (step: number) => {
        if (step === 0) return !!coverFile;
        if (step === 1) return !!seedPhrase.trim();
        if (step === 2) return !!password && password === confirmPassword && password.length >= 8;
        return false;
    };

    const handleEncrypt = async () => {
        setErrorMessage(null);
        if (!coverFile)            { setErrorMessage("No cover image selected."); return; }
        if (!seedPhrase.trim())    { setErrorMessage("Secret is empty."); return; }
        if (!password)             { setErrorMessage("Password is required."); return; }
        if (password !== confirmPassword) { setErrorMessage("Passwords don't match."); return; }
        if (password.length < 8)   { setErrorMessage("Password must be at least 8 characters."); return; }

        setProcessing(true);
        setDone(false);
        try {
            let currentAccount = account;
            if (!isConnected || !currentAccount) {
                addLog("[1AM] Connecting wallet…", "info");
                currentAccount = await connect();
                if (currentAccount) addLog(`[1AM] Connected: ${currentAccount.slice(0,8)}...`, "success");
            } else {
                addLog("[1AM] Wallet active ✓", "info");
            }

            const vaultId = crypto.randomUUID?.() ?? `vault-${Date.now()}`;
            addLog(`[VAULT] Vault ID: ${vaultId}`, "info");
            addLog("[CRYPTO] PBKDF2 key derivation (100,000 iterations)…", "info");
            addLog("[CRYPTO] AES-256-GCM encryption…", "info");

            const cryptoPayload = await encryptData(seedPhrase, password);
            const contentHash  = await computeSHA256(cryptoPayload.ciphertext);
            addLog(`[HASH] Commitment: ${contentHash.slice(0, 24)}…`, "info");

            addLog("[MIDNIGHT] Submitting vault commitment…", "info");
            if (contractAddress) addLog(`[CONTRACT] Target: ${contractAddress.slice(0,12)}…`, "info");
            addLog("[1AM] ⏳ Approve the transaction in your wallet…", "warn");

            const onChainResult = await sendOnChainAuthorization(vaultId, contentHash);
            const txHash = onChainResult.txHash;
            addLog("[MIDNIGHT] ✅ Commitment confirmed!", "success");
            addLog(`[MIDNIGHT] Tx: ${txHash.slice(0, 40)}…`, "info");

            const metadata: VaultMetadata = {
                version: 1, walletAddress: currentAccount ?? "no-wallet",
                chainId: chainId || "preprod", vaultId,
                createdAt: new Date().toISOString(), authorizationType: "onchain",
                txHash, contractAddress: contractAddress ?? undefined,
            };

            const payloadStr = buildStegoVaultPayloadString(cryptoPayload, metadata);
            addLog("[STEGO] Injecting encrypted payload into blue-channel LSBs…", "info");
            const stegoBlob = await hideData(coverFile, payloadStr);
            addLog("[STEGO] Injection complete ✓", "success");
            addLog("[ZIP] Creating secure bundle…", "info");

            const zipBlob = await createZipBundle(stegoBlob);
            downloadBlob(zipBlob, "stegovault_secure.zip");

            setDone(true);
            addLog("[SUCCESS] VAULT SEALED ✓ — stegovault_secure.zip downloaded!", "success");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Encryption failed.";
            setErrorMessage(msg);
            addLog(`[ERROR] ${msg}`, "error");
        } finally {
            setProcessing(false);
        }
    };

    const resetAll = () => {
        setCoverFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null);
        setSeedPhrase(""); setPassword(""); setConfirmPassword("");
        setErrorMessage(null); setActiveStep(0); setDone(false);
    };

    return (
        <div className="panel vault-panel">
            {/* Header */}
            <div className="panel-header">
                <div className="panel-icon">🔒</div>
                <div>
                    <h2 className="panel-title">THE VAULT</h2>
                    <p className="panel-subtitle">Encrypt · Commit · Seal</p>
                </div>
            </div>

            {/* Step indicator */}
            <div className="step-indicator">
                {STEPS.map((label, i) => (
                    <div
                        key={label}
                        className={`step-pip ${i < activeStep ? "pip-done" : i === activeStep ? "pip-active" : "pip-idle"}`}
                        onClick={() => i < activeStep && setActiveStep(i)}
                        style={{ cursor: i < activeStep ? "pointer" : "default" }}
                        title={label}
                    >
                        <div className="pip-circle">
                            {i < activeStep ? "✓" : i + 1}
                        </div>
                        <span className="pip-label">{label}</span>
                        {i < STEPS.length - 1 && <div className="pip-line" />}
                    </div>
                ))}
            </div>

            {/* Error */}
            {errorMessage && (
                <div className="error-banner">
                    <span className="error-icon">⚠</span>
                    <span className="error-text">{errorMessage}</span>
                </div>
            )}

            {/* Success */}
            {done && (
                <div className="success-banner">
                    <div className="success-banner-icon">🎉</div>
                    <div>
                        <div className="success-banner-title">Vault Sealed Successfully</div>
                        <div className="success-banner-sub">stegovault_secure.zip has been downloaded to your device.</div>
                    </div>
                    <button className="success-reset-btn" onClick={resetAll}>New Vault</button>
                </div>
            )}

            {/* Step 0: Cover Image */}
            {!done && activeStep === 0 && (
                <div
                    className={`drop-zone ${dragActive ? "drop-zone-active" : ""} ${coverFile ? "drop-zone-loaded" : ""}`}
                    onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    role="button" tabIndex={0} aria-label="Upload cover PNG image"
                    onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
                >
                    <input ref={fileInputRef} type="file" accept="image/png" className="hidden" onChange={handleFileInput} id="vault-cover-image" />
                    {coverFile ? (
                        <div className="drop-zone-preview">
                            {preview && <img src={preview} alt="Cover" className="preview-img" />}
                            <div className="preview-info">
                                <span className="preview-name">{coverFile.name}</span>
                                <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{(coverFile.size / 1024).toFixed(1)} KB · PNG</span>
                                <button className="btn-clear" onClick={e => { e.stopPropagation(); resetAll(); }}>✕ Remove</button>
                            </div>
                        </div>
                    ) : (
                        <div className="drop-zone-empty">
                            <div className="drop-icon">📁</div>
                            <p className="drop-text">Drop a <strong>lossless PNG</strong> here</p>
                            <p className="drop-subtext">or click to browse · JPEG/WebP rejected</p>
                        </div>
                    )}
                </div>
            )}

            {/* Step 1: Secret */}
            {!done && activeStep === 1 && (
                <div className="input-group">
                    <label className="input-label" htmlFor="vault-secret">
                        <span className="label-icon">🔑</span> Seed Phrase / Private Key / Secret
                    </label>
                    <textarea
                        id="vault-secret"
                        className="input-textarea"
                        placeholder="Enter your seed phrase or private key — stays 100% local in your browser…"
                        value={seedPhrase}
                        onChange={e => setSeedPhrase(e.target.value)}
                        rows={5}
                        autoFocus
                    />
                    <div className="secret-counter">{seedPhrase.length} chars · {seedPhrase.trim().split(/\s+/).filter(Boolean).length} words</div>
                </div>
            )}

            {/* Step 2: Password */}
            {!done && activeStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                    <div className="input-group">
                        <label className="input-label" htmlFor="vault-password">
                            <span className="label-icon">🛡️</span> Encryption Password
                        </label>
                        <div className="input-wrap-eye">
                            <input
                                id="vault-password"
                                type={showPass ? "text" : "password"}
                                className="input-field"
                                placeholder="Minimum 8 characters"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoFocus
                            />
                            <button className="eye-btn" type="button" onClick={() => setShowPass(v => !v)} aria-label="Toggle password visibility">
                                {showPass ? "🙈" : "👁"}
                            </button>
                        </div>
                        {password && (
                            <div className="strength-bar-wrap">
                                <div className="strength-bar">
                                    {[1,2,3,4,5].map(n => (
                                        <div key={n} className="strength-seg" style={{ background: n <= strength.score ? strength.color : "rgba(255,255,255,0.08)" }} />
                                    ))}
                                </div>
                                <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                            </div>
                        )}
                    </div>
                    <div className="input-group">
                        <label className="input-label" htmlFor="vault-confirm">
                            <span className="label-icon">🔄</span> Confirm Password
                        </label>
                        <input
                            id="vault-confirm"
                            type={showPass ? "text" : "password"}
                            className="input-field"
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            style={{ borderColor: confirmPassword && confirmPassword !== password ? "var(--err-border)" : "" }}
                        />
                        {confirmPassword && confirmPassword !== password && (
                            <span style={{ fontSize: "0.72rem", color: "#f25454" }}>Passwords don't match</span>
                        )}
                    </div>
                </div>
            )}

            {/* Step 3: Seal */}
            {!done && activeStep === 3 && (
                <div className="seal-summary">
                    <div className="seal-summary-title">Ready to seal</div>
                    <div className="seal-rows">
                        <div className="seal-row"><span className="seal-row-label">Image</span><span className="seal-row-val">{coverFile?.name ?? "—"}</span></div>
                        <div className="seal-row"><span className="seal-row-label">Secret</span><span className="seal-row-val">{seedPhrase.trim().split(/\s+/).length} words</span></div>
                        <div className="seal-row"><span className="seal-row-label">Encryption</span><span className="seal-row-val" style={{ color: "var(--green)" }}>AES-256-GCM</span></div>
                        <div className="seal-row"><span className="seal-row-label">Password</span><span className="seal-row-val" style={{ color: strength.color }}>{strength.label}</span></div>
                        <div className="seal-row"><span className="seal-row-label">Network</span><span className="seal-row-val" style={{ color: "var(--amber)" }}>Midnight Preprod</span></div>
                    </div>
                    <div className="auth-info-note" style={{ marginTop: "0.5rem" }}>
                        <span className="auth-note-icon">⚡</span>
                        <span>Your <strong>1AM Wallet</strong> will sign an on-chain commitment. Approve the popup when it appears.</span>
                    </div>
                </div>
            )}

            {/* Navigation buttons */}
            {!done && (
                <div className="step-nav">
                    {activeStep > 0 && (
                        <button className="step-nav-back" onClick={() => setActiveStep(s => s - 1)}>
                            ← Back
                        </button>
                    )}
                    {activeStep < 3 ? (
                        <button
                            className="step-nav-next"
                            onClick={() => setActiveStep(s => s + 1)}
                            disabled={!canProceedStep(activeStep)}
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            className="btn-primary btn-encrypt"
                            onClick={handleEncrypt}
                            disabled={processing}
                            style={{ flex: 1 }}
                        >
                            {processing
                                ? <span className="btn-loading"><span className="spinner" /> Sealing Vault…</span>
                                : "🔐 SEAL THE VAULT"
                            }
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

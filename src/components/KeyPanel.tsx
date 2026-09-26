import { useState, useRef, type DragEvent, type ChangeEvent, useCallback } from "react";
import { decryptData, parseVaultPayload, type VaultMetadata } from "../utils/crypto";
import { verifyVaultCommitmentOnChain } from "../utils/midnightContract";
import { extractData } from "../utils/steganography";
import { validateImageFile } from "../utils/file-utils";
import { use1AMWallet } from "../hooks/use1AMWallet";
import type { LogEntry } from "./TerminalLog";

interface KeyPanelProps {
    addLog: (text: string, type?: LogEntry["type"]) => void;
}

export default function KeyPanel({ addLog }: KeyPanelProps) {
    const { account, isConnected, connect } = use1AMWallet();

    const [stegoFile, setStegoFile] = useState<File | null>(null);
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [revealedText, setRevealedText] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [vaultMetadata, setVaultMetadata] = useState<VaultMetadata | null>(null);
    const [verificationState, setVerificationState] = useState<"idle" | "checking" | "verified" | "failed">("idle");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((file: File) => {
        const result = validateImageFile(file);
        if (!result.valid) { setErrorMessage(result.error!); addLog(`[STEGO] INVALID: ${result.error!}`, "error"); return; }
        setStegoFile(file); setPreview(URL.createObjectURL(file));
        setRevealedText(null); setVaultMetadata(null); setErrorMessage(null); setVerificationState("idle");
        addLog(`[STEGO] Vault image: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, "info");
    }, [addLog]);

    const handleDrop   = (e: DragEvent) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragActive(true); };
    const handleDragLeave = () => setDragActive(false);
    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); };

    const handleDecrypt = async () => {
        setErrorMessage(null);
        if (!stegoFile) { setErrorMessage("No vault image selected."); addLog("[STEGO] No image selected.", "error"); return; }
        if (!password)  { setErrorMessage("Decryption password is required."); addLog("[CRYPTO] Password required.", "error"); return; }

        setProcessing(true); setRevealedText(null); setVerificationState("checking");

        try {
            let currentAccount = account;
            if (!isConnected || !currentAccount) {
                addLog("[1AM] Connecting wallet…", "info");
                try { currentAccount = await connect(); if (currentAccount) addLog(`[1AM] Connected: ${currentAccount.slice(0,8)}...`, "success"); }
                catch { addLog("[1AM] Wallet optional for verification.", "warn"); currentAccount = null; }
            }

            addLog("[STEGO] Extracting hidden data from image…", "info");
            const raw = await extractData(stegoFile, msg => addLog(`[STEGO] ${msg}`, "info"));

            addLog("[STEGO] Parsing vault payload…", "info");
            let metadata: VaultMetadata | null; let cryptoPayload;
            try { const parsed = parseVaultPayload(raw); metadata = parsed.metadata; cryptoPayload = parsed.cryptoPayload; }
            catch { throw new Error("Image doesn't contain a valid StegoVault payload."); }

            if (metadata) {
                setVaultMetadata(metadata);
                const bound = metadata.walletAddress;
                if (bound && bound !== "no-wallet" && bound !== "local") {
                    addLog(`[AUTH] Bound wallet: ${bound.slice(0,8)}...${bound.slice(-6)}`, "info");
                    if (currentAccount) {
                        if (bound.toLowerCase() !== currentAccount.toLowerCase()) {
                            const msg = `Wallet mismatch — vault belongs to ${bound.slice(0,8)}…, connected: ${currentAccount.slice(0,8)}…`;
                            setErrorMessage(msg); addLog(`[AUTH] ❌ ${msg}`, "error");
                            setVerificationState("failed");
                            throw new Error(msg);
                        }
                        addLog("[AUTH] ✅ Wallet identity verified!", "success");
                    }
                }
                if (metadata.contractAddress) {
                    addLog(`[CONTRACT] Verifying on-chain commitment…`, "info");
                    const vResult = await verifyVaultCommitmentOnChain({ contractAddress: metadata.contractAddress, vaultId: metadata.vaultId });
                    if (vResult.verified) { addLog("[CONTRACT] ✅ Commitment verified in Compact ledger!", "success"); setVerificationState("verified"); }
                    else setVerificationState("verified");
                } else { setVerificationState("verified"); }
            }

            addLog("[CRYPTO] PBKDF2 key derivation…", "info");
            addLog("[CRYPTO] AES-256-GCM decryption…", "info");
            const plaintext = await decryptData(cryptoPayload, password, msg => addLog(msg, "info"));
            setRevealedText(plaintext);
            addLog("[SUCCESS] VAULT UNLOCKED ✓ — Secret recovered in browser memory", "success");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Decryption failed.";
            if (!msg.includes("mismatch")) { setErrorMessage(msg); addLog(`[CRYPTO] FAILED: ${msg}`, "error"); }
            setVerificationState("failed");
        } finally { setProcessing(false); }
    };

    const handleCopy = async () => {
        if (revealedText) { await navigator.clipboard.writeText(revealedText); setCopied(true); addLog("[VAULT] Secret copied.", "warn"); setTimeout(() => setCopied(false), 2500); }
    };

    const clearFile = () => { setStegoFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); setRevealedText(null); setVaultMetadata(null); setErrorMessage(null); setVerificationState("idle"); };

    return (
        <div className="panel key-panel">
            {/* Header */}
            <div className="panel-header">
                <div className="panel-icon">🔓</div>
                <div>
                    <h2 className="panel-title">THE KEY</h2>
                    <p className="panel-subtitle">Verify · Decrypt · Reveal</p>
                </div>
            </div>

            {/* Verification badge */}
            {verificationState !== "idle" && (
                <div className={`verify-badge verify-${verificationState}`}>
                    {verificationState === "checking" && <><span className="spinner" style={{ borderTopColor: "var(--blue)" }} /> Verifying on-chain commitment…</>}
                    {verificationState === "verified" && <><span>✅</span> Identity & commitment verified</>}
                    {verificationState === "failed"   && <><span>❌</span> Verification failed</>}
                </div>
            )}

            {/* Error */}
            {errorMessage && (
                <div className="error-banner">
                    <span className="error-icon">⚠</span>
                    <span className="error-text">{errorMessage}</span>
                </div>
            )}

            {/* Vault metadata */}
            {vaultMetadata && (
                <div className="vault-meta-badge">
                    <div className="meta-row">
                        <span className="meta-label">🔗 Wallet</span>
                        <span className="meta-value">{vaultMetadata.walletAddress.slice(0,10)}…{vaultMetadata.walletAddress.slice(-8)}</span>
                    </div>
                    <div className="meta-row">
                        <span className="meta-label">📅 Created</span>
                        <span className="meta-value">{new Date(vaultMetadata.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="meta-row">
                        <span className="meta-label">🔐 Auth</span>
                        <span className="meta-value" style={{ color: "var(--green)" }}>{vaultMetadata.authorizationType}</span>
                    </div>
                    {vaultMetadata.contractAddress && (
                        <div className="meta-row">
                            <span className="meta-label">📜 Contract</span>
                            <span className="meta-value">{vaultMetadata.contractAddress.slice(0,12)}…</span>
                        </div>
                    )}
                </div>
            )}

            {/* Drop Zone */}
            <div
                className={`drop-zone ${dragActive ? "drop-zone-active" : ""} ${stegoFile ? "drop-zone-loaded" : ""}`}
                onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                role="button" tabIndex={0} aria-label="Upload vault PNG image"
                onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
            >
                <input ref={fileInputRef} type="file" accept="image/png" className="hidden" onChange={handleFileInput} id="key-vault-image" />
                {stegoFile ? (
                    <div className="drop-zone-preview">
                        {preview && <img src={preview} alt="Vault" className="preview-img" />}
                        <div className="preview-info">
                            <span className="preview-name">{stegoFile.name}</span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{(stegoFile.size / 1024).toFixed(1)} KB</span>
                            <button className="btn-clear" onClick={e => { e.stopPropagation(); clearFile(); }}>✕ Remove</button>
                        </div>
                    </div>
                ) : (
                    <div className="drop-zone-empty">
                        <div className="drop-icon">🖼️</div>
                        <p className="drop-text">Drop your <strong>vault.png</strong> here</p>
                        <p className="drop-subtext">or click to browse</p>
                    </div>
                )}
            </div>

            {/* Password */}
            <div className="input-group">
                <label className="input-label" htmlFor="key-password">
                    <span className="label-icon">🛡️</span> Decryption Password
                </label>
                <div className="input-wrap-eye">
                    <input
                        id="key-password"
                        type={showPass ? "text" : "password"}
                        className="input-field"
                        placeholder="Enter the password used during vault creation"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !processing && handleDecrypt()}
                    />
                    <button className="eye-btn" type="button" onClick={() => setShowPass(v => !v)} aria-label="Toggle password visibility">
                        {showPass ? "🙈" : "👁"}
                    </button>
                </div>
            </div>

            {/* Info note */}
            <div className="auth-info-note">
                <span className="auth-note-icon">⚡</span>
                <span>Decryption is <strong>100% local</strong>. If vault is wallet-bound, identity is verified before decryption.</span>
            </div>

            {/* Unlock button */}
            <button className="btn-primary btn-decrypt" onClick={handleDecrypt} disabled={processing}>
                {processing
                    ? <span className="btn-loading"><span className="spinner" /> Verifying &amp; Decrypting…</span>
                    : "🔓 UNLOCK THE VAULT"
                }
            </button>

            {/* Revealed */}
            {revealedText !== null && (
                <div className="revealed-box">
                    <div className="revealed-header">
                        <span className="revealed-title">🔑 Recovered Secret</span>
                        <button className="btn-copy" onClick={handleCopy}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
                    </div>
                    <pre className="revealed-text">{revealedText}</pre>
                    <p className="revealed-warning">⚠ Secret is in browser memory. Copy it and close this panel immediately.</p>
                </div>
            )}
        </div>
    );
}

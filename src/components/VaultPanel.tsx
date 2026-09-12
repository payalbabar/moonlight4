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

export default function VaultPanel({ addLog }: VaultPanelProps) {
    const { account, chainId, contractAddress, isConnected, connect, sendOnChainAuthorization } = use1AMWallet();

    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [seedPhrase, setSeedPhrase] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((file: File) => {
        const result = validateImageFile(file);
        if (!result.valid) {
            setErrorMessage(result.error!);
            addLog(`[STEGO] INVALID COVER IMAGE: ${result.error!}`, "error");
            return;
        }
        setErrorMessage(null);
        setCoverFile(file);
        setPreview(URL.createObjectURL(file));
        addLog(`[STEGO] Cover image loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, "info");
    }, [addLog]);

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    };
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragActive(true); };
    const handleDragLeave = () => setDragActive(false);
    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleFile(e.target.files[0]);
    };

    const handleEncrypt = async () => {
        setErrorMessage(null);

        // ── Input validation ──────────────────────
        if (!coverFile) {
            const err = "No cover image selected. StegoVault requires a lossless PNG image.";
            setErrorMessage(err);
            addLog(`[STEGO] ${err}`, "error");
            return;
        }
        if (!seedPhrase.trim()) {
            const err = "Secret data is empty. Please enter your seed phrase or secret key.";
            setErrorMessage(err);
            addLog(`[VAULT] ${err}`, "error");
            return;
        }
        if (!password) {
            const err = "Encryption password is required.";
            setErrorMessage(err);
            addLog(`[CRYPTO] ${err}`, "error");
            return;
        }
        if (password !== confirmPassword) {
            const err = "Passwords do not match.";
            setErrorMessage(err);
            addLog(`[CRYPTO] ${err}`, "error");
            return;
        }
        if (password.length < 8) {
            const err = "Password must be at least 8 characters.";
            setErrorMessage(err);
            addLog(`[CRYPTO] ${err}`, "warn");
            return;
        }

        setProcessing(true);

        try {
            // ── Step 1: Connect 1AM Wallet (REQUIRED — hard stop if unavailable) ──────
            let currentAccount = account;
            let txHash: string | undefined;
            let authorizationType: VaultMetadata["authorizationType"] = "local";

            if (!isConnected || !currentAccount) {
                addLog("[1AM] Detecting 1AM Wallet…", "info");
                try {
                    currentAccount = await connect();
                    if (currentAccount) {
                        addLog("[1AM] 1AM Wallet detected ✓", "info");
                        addLog(`[1AM] Connected to Midnight Preprod: ${currentAccount.slice(0, 8)}...${currentAccount.slice(-6)}`, "success");
                    }
                } catch (cErr: unknown) {
                    const msg = cErr instanceof Error ? cErr.message : "1AM Wallet connection failed.";
                    addLog(`[1AM] ❌ 1AM Wallet connection failed: ${msg}`, "error");
                    throw new Error(msg);
                }
            } else {
                addLog("[1AM] 1AM Wallet active ✓", "info");
                addLog(`[1AM] Midnight Preprod: ${currentAccount.slice(0, 8)}...${currentAccount.slice(-6)}`, "success");
            }

            // ── Step 2: Generate Vault ID ─────────────────────────────────────────────
            const vaultId = typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `vault-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            addLog(`[VAULT] Vault ID: ${vaultId}`, "info");

            // ── Step 3: Local PBKDF2 + AES-256-GCM Encryption ─────────────────────────
            // Secrets NEVER leave the browser.
            addLog("[CRYPTO] PBKDF2 key derivation (100,000 iterations)…", "info");
            addLog("[CRYPTO] AES-256-GCM encryption…", "info");

            const cryptoPayload = await encryptData(seedPhrase, password);

            // Compute non-sensitive commitment content hash of ciphertext
            const contentHash = await computeSHA256(cryptoPayload.ciphertext);
            addLog(`[HASH] Content commitment hash: ${contentHash.slice(0, 32)}…`, "info");

            // ── Step 4: 1AM Wallet Authorization & On-Chain Commitment ───────────────
            // User MUST approve in the wallet popup before any steganographic injection.
            addLog("[MIDNIGHT] Submitting vault commitment to Midnight Preprod…", "info");
            if (contractAddress) {
                addLog(`[CONTRACT] Target contract: ${contractAddress}`, "info");
            }
            addLog("[1AM] ⏳ Approve the transaction in your 1AM Wallet popup…", "warn");

            try {
                const onChainResult = await sendOnChainAuthorization(vaultId, contentHash);
                txHash = onChainResult.txHash;
                authorizationType = "onchain";
                addLog("[MIDNIGHT] ✅ Vault commitment confirmed!", "success");
                addLog(`[MIDNIGHT] Transaction proof / ID: ${txHash.slice(0, 48)}…`, "info");
            } catch (authErr: unknown) {
                const msg = authErr instanceof Error ? authErr.message : "Authorization failed.";
                addLog(`[MIDNIGHT] ❌ ${msg}`, "error");
                throw new Error(`VAULT AUTHORIZATION FAILED: ${msg}`);
            }

            const metadata: VaultMetadata = {
                version: 1,
                walletAddress: currentAccount ?? "no-wallet",
                chainId: chainId || "preprod",
                vaultId,
                createdAt: new Date().toISOString(),
                authorizationType,
                txHash,
                contractAddress: contractAddress ?? undefined,
            };

            const payloadStr = buildStegoVaultPayloadString(cryptoPayload, metadata);

            // ── Step 5: LSB Steganography ─────────────────────────────────────────────
            addLog("[STEGO] Calculating PNG capacity…", "info");
            addLog("[STEGO] Injecting encrypted payload into blue-channel LSBs…", "info");

            const stegoBlob = await hideData(coverFile, payloadStr);
            addLog("[STEGO] Payload injection successful ✓", "success");

            // ── Step 6: ZIP Bundle ────────────────────────────────────────────────────
            addLog("[ZIP] Creating secure bundle…", "info");
            const zipBlob = await createZipBundle(stegoBlob);

            downloadBlob(zipBlob, "stegovault_secure.zip");

            addLog("[SUCCESS] VAULT SEALED ✓ — 1AM Wallet authorized. stegovault_secure.zip downloaded!", "success");
            if (txHash) {
                addLog(`[SUCCESS] Proof: ${txHash.slice(0, 48)}…`, "success");
            }

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Encryption failed.";
            setErrorMessage(msg);
            addLog(`[ERROR] ${msg}`, "error");
        } finally {
            setProcessing(false);
        }
    };

    const clearCover = () => {
        setCoverFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setErrorMessage(null);
    };

    return (
        <div className="panel vault-panel">
            <div className="panel-header">
                <div className="panel-icon">🔒</div>
                <div>
                    <h2 className="panel-title">THE VAULT</h2>
                    <p className="panel-subtitle">AES-256-GCM · LSB Steganography · Midnight Authorized</p>
                </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
                <div className="error-banner">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{errorMessage}</span>
                </div>
            )}

            {/* Drop Zone */}
            <div
                className={`drop-zone ${dragActive ? "drop-zone-active" : ""} ${coverFile ? "drop-zone-loaded" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    id="vault-cover-image"
                    ref={fileInputRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={handleFileInput}
                />
                {coverFile ? (
                    <div className="drop-zone-preview">
                        {preview && <img src={preview} alt="Cover" className="preview-img" />}
                        <div className="preview-info">
                            <span className="preview-name">{coverFile.name}</span>
                            <button className="btn-clear" onClick={(e) => { e.stopPropagation(); clearCover(); }}>
                                ✕ Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="drop-zone-empty">
                        <div className="drop-icon">📁</div>
                        <p className="drop-text">Drop a <strong>lossless PNG</strong> image here</p>
                        <p className="drop-subtext">or click to browse</p>
                    </div>
                )}
            </div>

            {/* Secret Data Input */}
            <div className="input-group">
                <label className="input-label" htmlFor="vault-secret">
                    <span className="label-icon">🔑</span> Seed Phrase / Private Key / Secret
                </label>
                <textarea
                    id="vault-secret"
                    className="input-textarea"
                    placeholder="Enter your confidential seed phrase or private key (kept 100% local in browser memory)…"
                    value={seedPhrase}
                    onChange={(e) => setSeedPhrase(e.target.value)}
                    rows={4}
                />
            </div>

            {/* Password */}
            <div className="input-group">
                <label className="input-label" htmlFor="vault-password">
                    <span className="label-icon">🛡️</span> AES Encryption Password
                </label>
                <input
                    id="vault-password"
                    type="password"
                    className="input-field"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            {/* Confirm Password */}
            <div className="input-group">
                <label className="input-label" htmlFor="vault-confirm-password">
                    <span className="label-icon">🔄</span> Confirm Password
                </label>
                <input
                    id="vault-confirm-password"
                    type="password"
                    className="input-field"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
            </div>

            {/* Info note */}
            <div className="auth-info-note">
                <span className="auth-note-icon">⚡</span>
                <span>
                    Encryption is <strong>100% local</strong> (AES-256-GCM in your browser).
                    Your <strong>1AM Wallet</strong> will sign an on-chain commitment before vault creation.
                </span>
            </div>

            {/* Seal Button */}
            <button
                className="btn-primary btn-encrypt"
                onClick={handleEncrypt}
                disabled={processing}
            >
                {processing ? (
                    <span className="btn-loading">
                        <span className="spinner" /> Authorizing &amp; Encrypting…
                    </span>
                ) : (
                    <span>🔐 SEAL THE VAULT</span>
                )}
            </button>
        </div>
    );
}

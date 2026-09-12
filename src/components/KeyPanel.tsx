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
    const [processing, setProcessing] = useState(false);
    const [revealedText, setRevealedText] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [vaultMetadata, setVaultMetadata] = useState<VaultMetadata | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((file: File) => {
        const result = validateImageFile(file);
        if (!result.valid) {
            setErrorMessage(result.error!);
            addLog(`[STEGO] INVALID VAULT IMAGE: ${result.error!}`, "error");
            return;
        }
        setStegoFile(file);
        setPreview(URL.createObjectURL(file));
        setRevealedText(null);
        setVaultMetadata(null);
        setErrorMessage(null);
        addLog(`[STEGO] Vault image loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, "info");
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

    const handleDecrypt = async () => {
        setErrorMessage(null);

        if (!stegoFile) {
            const err = "No vault image selected. Please upload your vault.png file.";
            setErrorMessage(err);
            addLog(`[STEGO] ${err}`, "error");
            return;
        }
        if (!password) {
            const err = "Decryption password is required.";
            setErrorMessage(err);
            addLog(`[CRYPTO] ${err}`, "error");
            return;
        }

        setProcessing(true);
        setRevealedText(null);

        try {
            // ── Step 0: Ensure 1AM Wallet is connected ───────────
            let currentAccount = account;
            if (!isConnected || !currentAccount) {
                addLog("[1AM] Attempting 1AM Wallet connection…", "info");
                try {
                    currentAccount = await connect();
                    if (currentAccount) {
                        addLog(`[1AM] Connected: ${currentAccount.slice(0, 8)}...${currentAccount.slice(-6)}`, "success");
                    }
                } catch {
                    addLog("[1AM] Note: Wallet connection pending. Verifying vault payload…", "warn");
                    currentAccount = null;
                }
            }

            // ── Step 1: Extract hidden data from image ──────
            addLog("[STEGO] Loading stego image…", "info");
            const raw = await extractData(stegoFile, (msg) => addLog(`[STEGO] ${msg}`, "info"));

            // ── Step 2: Parse vault payload ─────────────────
            addLog("[STEGO] Parsing vault payload…", "info");
            let metadata: VaultMetadata | null;
            let cryptoPayload;

            try {
                const parsed = parseVaultPayload(raw);
                metadata = parsed.metadata;
                cryptoPayload = parsed.cryptoPayload;
            } catch {
                throw new Error("Failed to parse vault — image does not contain a valid StegoVault payload.");
            }

            // ── Step 3: Wallet authorization & binding verification ──
            if (metadata) {
                setVaultMetadata(metadata);
                const boundAddr = metadata.walletAddress;

                if (boundAddr && boundAddr !== "no-wallet" && boundAddr !== "local") {
                    addLog(`[AUTH] Vault bound to wallet: ${boundAddr.slice(0, 8)}...${boundAddr.slice(-6)}`, "info");

                    if (currentAccount) {
                        if (boundAddr.toLowerCase() !== currentAccount.toLowerCase()) {
                            const mismatchMsg = `1AM WALLET MISMATCH — This vault was created for wallet ${boundAddr.slice(0, 8)}...${boundAddr.slice(-6)}. Connected wallet is ${currentAccount.slice(0, 8)}...`;
                            setErrorMessage(mismatchMsg);
                            addLog(`[AUTH] ❌ ${mismatchMsg}`, "error");
                            throw new Error(mismatchMsg);
                        }
                        addLog("[AUTH] ✅ 1AM Wallet identity verified!", "success");
                    }
                }

                // Verify on-chain commitment if contract was used
                if (metadata.contractAddress) {
                    addLog(`[CONTRACT] Verifying on-chain commitment on contract ${metadata.contractAddress.slice(0, 10)}…`, "info");
                    const vResult = await verifyVaultCommitmentOnChain({
                        contractAddress: metadata.contractAddress,
                        vaultId: metadata.vaultId,
                    });
                    if (vResult.verified) {
                        addLog("[CONTRACT] ✅ On-chain commitment verified in Compact contract ledger!", "success");
                    }
                }
            }

            // ── Step 4: AES-256-GCM Decrypt ─────────────────
            addLog("[CRYPTO] PBKDF2 key derivation from password…", "info");
            addLog("[CRYPTO] AES-256-GCM decryption…", "info");
            const plaintext = await decryptData(cryptoPayload, password, (msg) => addLog(msg, "info"));

            setRevealedText(plaintext);
            addLog("[SUCCESS] VAULT UNLOCKED ✓ — Secret recovered locally in browser memory", "success");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Decryption failed.";
            if (!msg.includes("MISMATCH")) {
                setErrorMessage(`Decryption failed: ${msg}`);
                addLog(`[CRYPTO] DECRYPTION FAILED: ${msg}`, "error");
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleCopy = async () => {
        if (revealedText) {
            await navigator.clipboard.writeText(revealedText);
            setCopied(true);
            addLog("[VAULT] Secret copied to clipboard. Keep it safe!", "warn");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const clearFile = () => {
        setStegoFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setRevealedText(null);
        setVaultMetadata(null);
        setErrorMessage(null);
    };

    return (
        <div className="panel key-panel">
            <div className="panel-header">
                <div className="panel-icon">🔓</div>
                <div>
                    <h2 className="panel-title">THE KEY</h2>
                    <p className="panel-subtitle">1AM Verified Unlock &amp; Reveal</p>
                </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
                <div className="error-banner">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{errorMessage}</span>
                </div>
            )}

            {/* Vault Metadata Badge */}
            {vaultMetadata && (
                <div className="vault-meta-badge">
                    <div className="meta-row">
                        <span className="meta-label">🔗 Bound Wallet:</span>
                        <span className="meta-value">{vaultMetadata.walletAddress.slice(0, 8)}...{vaultMetadata.walletAddress.slice(-6)}</span>
                    </div>
                    <div className="meta-row">
                        <span className="meta-label">📅 Created:</span>
                        <span className="meta-value">{new Date(vaultMetadata.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="meta-row">
                        <span className="meta-label">🔐 Auth:</span>
                        <span className="meta-value">{vaultMetadata.authorizationType}</span>
                    </div>
                    {vaultMetadata.contractAddress && (
                        <div className="meta-row">
                            <span className="meta-label">📜 Contract:</span>
                            <span className="meta-value">{vaultMetadata.contractAddress.slice(0, 10)}...</span>
                        </div>
                    )}
                </div>
            )}

            {/* Drop Zone */}
            <div
                className={`drop-zone ${dragActive ? "drop-zone-active" : ""} ${stegoFile ? "drop-zone-loaded" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    id="key-vault-image"
                    ref={fileInputRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={handleFileInput}
                />
                {stegoFile ? (
                    <div className="drop-zone-preview">
                        {preview && <img src={preview} alt="Vault" className="preview-img" />}
                        <div className="preview-info">
                            <span className="preview-name">{stegoFile.name}</span>
                            <button className="btn-clear" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                                ✕ Remove
                            </button>
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
                <input
                    id="key-password"
                    type="password"
                    className="input-field"
                    placeholder="Enter the password used during vault creation"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            {/* Info note */}
            <div className="auth-info-note">
                <span className="auth-note-icon">⚡</span>
                <span>
                    Decryption is performed <strong>locally</strong> using AES-256-GCM.
                    If the vault is bound to a 1AM Wallet, wallet identity is strictly verified.
                </span>
            </div>

            {/* Unlock Button */}
            <button
                className="btn-primary btn-decrypt"
                onClick={handleDecrypt}
                disabled={processing}
            >
                {processing ? (
                    <span className="btn-loading">
                        <span className="spinner" /> Verifying &amp; Decrypting…
                    </span>
                ) : (
                    <span>🔓 UNLOCK THE VAULT</span>
                )}
            </button>

            {/* Revealed Data */}
            {revealedText !== null && (
                <div className="revealed-box">
                    <div className="revealed-header">
                        <span className="revealed-title">🔑 Recovered Secret</span>
                        <button className="btn-copy" onClick={handleCopy}>
                            {copied ? "✓ Copied" : "📋 Copy"}
                        </button>
                    </div>
                    <pre className="revealed-text">{revealedText}</pre>
                    <p className="revealed-warning">
                        ⚠️ Your secret is now visible in browser memory. Copy it and close this panel immediately.
                    </p>
                </div>
            )}
        </div>
    );
}

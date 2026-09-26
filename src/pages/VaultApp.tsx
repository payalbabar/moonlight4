import { useState, useCallback } from "react";
import VaultPanel from "../components/VaultPanel";
import KeyPanel from "../components/KeyPanel";
import TerminalLog, { type LogEntry } from "../components/TerminalLog";
import Wallet from "../components/Wallet";
import ContractDeployment from "../components/ContractDeployment";
import ToastContainer from "../components/Toast";
import WalletGate from "../components/WalletGate";
import { showToast } from "../components/toastService";
import LockIcon from "../components/LockIcon";
import { use1AMWallet } from "../hooks/use1AMWallet";
import { useNavigate } from "react-router-dom";

let logId = 0;

export default function VaultApp() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const { setContractAddress, isConnected, account, chainId } = use1AMWallet();
    const navigate = useNavigate();

    const addLog = useCallback((text: string, type: LogEntry["type"] = "info") => {
        const now = new Date();
        const timestamp = now.toLocaleTimeString("en-US", { hour12: false });
        setLogs(prev => [...prev, { id: ++logId, text, type, timestamp }]);

        if (type === "success" && (text.includes("VAULT SEALED") || text.includes("VAULT UNLOCKED"))) {
            showToast(text.replace(/^\[.*?\]\s*/, ""), "success");
        } else if (type === "error" && text.includes("FAILED")) {
            showToast(text.replace(/^\[.*?\]\s*/, ""), "error");
        }
    }, []);

    const handleContractChange = useCallback((address: string | null) => {
        setContractAddress(address);
        if (address) showToast(`Contract active: ${address.slice(0, 12)}…`, "success");
    }, [setContractAddress]);

    return (
        <div className="app">
            {/* ── Sticky Header ── */}
            <header className="app-header" role="banner">
                <div className="header-content">
                    <div
                        className="logo-group"
                        onClick={() => navigate("/")}
                        role="link"
                        tabIndex={0}
                        onKeyDown={e => e.key === "Enter" && navigate("/")}
                        aria-label="Go to StegoVault home"
                    >
                        <div className="logo-icon">
                            <LockIcon />
                        </div>
                        <div>
                            <h1 className="app-title">StegoVault</h1>
                            <p className="app-tagline">Midnight Preprod · 1AM Wallet · AES-256-GCM · LSB Stego</p>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
                        {isConnected && account && (
                            <div className="header-wallet-badge">
                                <span className="badge-dot" aria-hidden="true" />
                                {account.slice(0, 8)}…{account.slice(-6)}
                            </div>
                        )}
                        <div className="header-badge">
                            <span className="badge-dot" aria-hidden="true" />
                            {chainId ? chainId.toUpperCase() : "PREPROD"} · Client-Side
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="app-main" role="main">

                {/* Wallet gate — shown when wallet is not yet connected */}
                {!isConnected && (
                    <WalletGate onLog={addLog} />
                )}

                {/* Full dashboard — shown only when wallet is connected */}
                {isConnected && (
                    <>
                        {/* Row 1: Wallet + Contract */}
                        <section aria-label="Wallet and contract">
                            <div className="section-divider">
                                <span className="section-divider-label">Connection</span>
                                <span className="section-divider-line" aria-hidden="true" />
                            </div>
                            <div className="wallet-contract-grid">
                                <Wallet onLog={addLog} />
                                <ContractDeployment onLog={addLog} onContractChange={handleContractChange} />
                            </div>
                        </section>

                        {/* Row 2: Vault + Key panels */}
                        <section aria-label="Vault operations">
                            <div className="section-divider">
                                <span className="section-divider-label">Vault Operations</span>
                                <span className="section-divider-line" aria-hidden="true" />
                            </div>
                            <div className="panels-grid">
                                <VaultPanel addLog={addLog} />
                                <KeyPanel addLog={addLog} />
                            </div>
                        </section>

                        {/* Row 3: Audit log */}
                        <section aria-label="Audit log">
                            <div className="section-divider">
                                <span className="section-divider-label">Audit Log</span>
                                <span className="section-divider-line" aria-hidden="true" />
                            </div>
                            <TerminalLog logs={logs} />
                        </section>
                    </>
                )}
            </main>

            <footer className="app-footer" role="contentinfo">
                <p>
                    StegoVault encrypts your secrets locally with AES-256-GCM.
                    <span className="footer-sep">·</span>
                    Midnight Network stores only non-sensitive commitments.
                    <span className="footer-sep">·</span>
                    Nothing sensitive ever leaves your browser.
                </p>
            </footer>

            <ToastContainer />
        </div>
    );
}

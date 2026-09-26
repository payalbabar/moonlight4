import { useState } from "react";
import { use1AMWallet } from "../hooks/use1AMWallet";

interface WalletProps {
  onLog?: (msg: string, type?: "info" | "success" | "error" | "warn") => void;
}

export default function Wallet({ onLog }: WalletProps) {
  const { account, chainId, isConnected, isConnecting, connect, disconnect } = use1AMWallet();
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    onLog?.("[1AM] Detecting 1AM Wallet…", "info");
    try {
      const addr = await connect();
      if (addr) {
        onLog?.("[1AM] 1AM Wallet detected ✓", "info");
        onLog?.(`[1AM] Connected: ${addr.slice(0, 8)}...${addr.slice(-6)}`, "success");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onLog?.(`[1AM] Connection failed: ${msg}`, "error");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onLog?.("[1AM] 1AM Wallet disconnected.", "warn");
  };

  const handleCopy = async () => {
    if (account) {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="wallet-container">
      <div className="wallet-card">
        {/* Header */}
        <div className="wallet-header">
          <div className="wallet-brand">
            <div style={{
              width: 30, height: 30,
              background: "linear-gradient(135deg,rgba(77,159,255,0.22),rgba(155,109,255,0.18))",
              border: "1px solid rgba(77,159,255,0.3)",
              borderRadius: "var(--r-sm)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.9rem",
            }}>⚡</div>
            <span className="wallet-title">1AM WALLET</span>
          </div>
          <div className="wallet-badge-status">
            <span className={`status-dot ${isConnected ? "status-connected" : "status-disconnected"}`} />
            <span className="status-text" style={{ color: isConnected ? "var(--green)" : "var(--text3)" }}>
              {isConnected ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>
        </div>

        {/* Body */}
        {!isConnected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <p className="wallet-desc">
              Connect your <strong style={{ color: "var(--text)" }}>1AM Wallet</strong> to authorize
              vault operations on Midnight Preprod.
            </p>
            <button className="connect-btn" onClick={handleConnect} disabled={isConnecting} style={{ width: "100%" }}>
              {isConnecting
                ? <><span className="spinner" /> Connecting…</>
                : <>⚡ Connect 1AM Wallet</>
              }
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {/* Address row */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.625rem 0.875rem",
              background: "rgba(0,232,122,0.05)",
              border: "1px solid var(--ok-border)",
              borderRadius: "var(--r-sm)",
            }}>
              <span className="status-dot status-connected" style={{ flexShrink: 0 }} />
              <span style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: "0.8rem", color: "var(--green)", fontWeight: 600, flex: 1,
              }}>
                {account?.slice(0, 10)}…{account?.slice(-8)}
              </span>
              <button
                onClick={handleCopy}
                title="Copy address"
                style={{
                  background: copied ? "var(--ok-bg)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${copied ? "var(--ok-border)" : "var(--border2)"}`,
                  borderRadius: "var(--r-xs)",
                  color: copied ? "var(--green)" : "var(--text3)",
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "0.68rem", padding: "0.15rem 0.55rem",
                  cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
                }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>

            {/* Network + disconnect row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--text3)", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>Network</span>
                <span className="chain-badge">{(chainId ?? "preprod").toUpperCase()}</span>
              </div>
              <button className="disconnect-btn" onClick={handleDisconnect}>Disconnect</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { use1AMWallet } from "../hooks/use1AMWallet";
import "./Wallet.css";

interface WalletProps {
  onLog?: (msg: string, type?: "info" | "success" | "error" | "warn") => void;
}

export default function Wallet({ onLog }: WalletProps) {
  const { account, chainId, isConnected, isConnecting, connect, disconnect } =
    use1AMWallet();
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    onLog?.("[1AM] Detecting 1AM Wallet…", "info");
    try {
      const addr = await connect();
      if (addr) {
        onLog?.("[1AM] 1AM Wallet detected ✓", "info");
        onLog?.(
          `[1AM] Connected 1AM Wallet: ${addr.slice(0, 8)}...${addr.slice(-6)}`,
          "success"
        );
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

  const handleCopyAddress = async () => {
    if (account) {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      onLog?.(`[1AM] Wallet address copied: ${account}`, "info");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="wallet-container">
      <div className="wallet-card">
        <div className="wallet-header">
          <div className="wallet-brand">
            <span className="wallet-icon">⚡</span>
            <span className="wallet-title">1AM WALLET</span>
          </div>
          <div className="wallet-badge-status">
            <span
              className={`status-dot ${
                isConnected ? "status-connected" : "status-disconnected"
              }`}
            />
            <span className="status-text">
              {isConnected ? "CONNECTED" : "STATUS: NOT CONNECTED"}
            </span>
          </div>
        </div>

        {!isConnected ? (
          <div className="wallet-action-row">
            <p className="wallet-desc">
              Connect your 1AM Wallet to authorize steganographic operations on Midnight Preprod.
            </p>
            <button
              className="connect-btn btn-primary"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <span className="btn-loading">
                  <span className="spinner" /> Connecting 1AM Wallet…
                </span>
              ) : (
                <span>⚡ CONNECT 1AM WALLET</span>
              )}
            </button>
          </div>
        ) : (
          <div className="wallet-info">
            <div className="wallet-details">
              <div className="wallet-field">
                <span className="field-label">Address:</span>{" "}
                <span className="field-value account-address" title={account || ""}>
                  {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : ""}
                </span>
                <button
                  type="button"
                  className="btn-copy-address"
                  onClick={handleCopyAddress}
                  title="Copy full 1AM wallet address"
                >
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
              <div className="wallet-field">
                <span className="field-label">Network:</span>{" "}
                <span className="field-value chain-badge">{chainId ? chainId.toUpperCase() : "PREPROD"}</span>
              </div>
            </div>
            <button
              className="disconnect-btn btn-secondary"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

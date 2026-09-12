import { use1AMWallet } from "../hooks/use1AMWallet";

interface WalletGateProps {
  onLog?: (msg: string, type?: "info" | "success" | "error" | "warn") => void;
}

export default function WalletGate({ onLog }: WalletGateProps) {
  const { connect, isConnecting } = use1AMWallet();

  const handleConnect = async () => {
    onLog?.("[1AM] Detecting 1AM Wallet…", "info");
    try {
      const addr = await connect();
      if (addr) {
        onLog?.("[1AM] 1AM Wallet detected ✓", "info");
        onLog?.(
          `[1AM] Connected: ${addr.slice(0, 8)}...${addr.slice(-6)}`,
          "success"
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onLog?.(`[1AM] Connection failed: ${msg}`, "error");
    }
  };

  return (
    <div className="wallet-gate-card">
      <div className="wallet-gate-icon">🔒</div>
      <h2 className="wallet-gate-title">1AM WALLET REQUIRED</h2>
      <p className="wallet-gate-subtitle">
        Connect your 1AM Wallet to continue.
      </p>
      <p className="wallet-gate-desc">
        StegoVault requires 1AM Wallet authentication to bind your steganographic
        vault to your identity and authorize local encryption operations.
      </p>
      <button
        className="connect-btn btn-primary gate-btn"
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <span className="btn-loading">
            <span className="spinner" /> Connecting…
          </span>
        ) : (
          <span>⚡ CONNECT 1AM WALLET</span>
        )}
      </button>
    </div>
  );
}

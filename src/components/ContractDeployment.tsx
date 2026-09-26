import { useState, useEffect } from "react";
import { use1AMWallet } from "../hooks/use1AMWallet";
import {
  deployStegoVaultContract,
  getSavedContract,
  clearSavedContract,
  saveContract,
  type DeployedContractInfo,
  type DeploymentProgress,
} from "../utils/midnightContract";
import CONTRACT_CONFIG, { MIDNIGHT_CONTRACT_ADDRESS_REGEX } from "../config/contract";

interface ContractDeploymentProps {
  onLog?: (msg: string, type?: "info" | "success" | "error" | "warn") => void;
  onContractChange?: (address: string | null) => void;
}

const DEPLOY_STEPS = ["Preparing", "Wallet Approval", "Proving", "Submitting", "Confirming"];
const STEP_STATES  = ["PREPARING", "WAITING_FOR_WALLET", "PROVING", "SUBMITTING", "CONFIRMING"];

export default function ContractDeployment({ onLog, onContractChange }: ContractDeploymentProps) {
  const { account, chainId, isConnected, isConnecting, connect, getWalletProvider, getMidnightProvider, getConnectedApi } = use1AMWallet();
  const currentNetwork = chainId || CONTRACT_CONFIG.network || "preprod";

  const [contractInfo, setContractInfo] = useState<DeployedContractInfo | null>(() => {
    const saved = getSavedContract(currentNetwork);
    if (saved) return saved;
    if (CONTRACT_CONFIG.address) {
      const info: DeployedContractInfo = { address: CONTRACT_CONFIG.address, network: currentNetwork, txId: "env-configured", deployedAt: new Date().toISOString(), deployerAddress: "env", onChain: false };
      saveContract(info);
      return info;
    }
    return null;
  });

  const [progress, setProgress] = useState<DeploymentProgress>(() => {
    const saved = getSavedContract(currentNetwork);
    if (saved || CONTRACT_CONFIG.address) return { state: "CONFIRMED", message: "Contract loaded from configuration" };
    return { state: "IDLE", message: "Ready to deploy" };
  });

  const [copied, setCopied] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => { onContractChange?.(contractInfo?.address ?? null); }, [contractInfo, onContractChange]);

  const handleDeploy = async () => {
    if (!isConnected || !account) {
      onLog?.("[1AM] 1AM Wallet required for deployment.", "warn");
      try { await connect(); } catch (err: unknown) { onLog?.(`[1AM] ${err instanceof Error ? err.message : String(err)}`, "error"); return; }
    }
    const walletProv = getWalletProvider();
    const midnightProv = getMidnightProvider();
    const api = getConnectedApi();
    if (!walletProv || !midnightProv || !api) {
      const e = "Wallet providers unavailable. Ensure 1AM Wallet is unlocked.";
      setProgress({ state: "FAILED", message: e, error: e }); onLog?.(`[CONTRACT] ❌ ${e}`, "error"); return;
    }
    try {
      const deployed = await deployStegoVaultContract({ walletProvider: walletProv, midnightProvider: midnightProv, connectedApi: api, network: currentNetwork, walletAddress: account || "", onProgress: p => setProgress(p), onLog });
      setContractInfo(deployed);
      onContractChange?.(deployed.address);
      onLog?.(`[SUCCESS] Contract active: ${deployed.address}`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProgress({ state: "FAILED", message: "Deployment failed", error: msg });
    }
  };

  const handleCopy = async () => {
    if (contractInfo?.address) { await navigator.clipboard.writeText(contractInfo.address); setCopied(true); onLog?.(`[CONTRACT] Copied: ${contractInfo.address}`, "info"); setTimeout(() => setCopied(false), 2000); }
  };

  const handleReset = () => { clearSavedContract(currentNetwork); setContractInfo(null); onContractChange?.(null); setProgress({ state: "IDLE", message: "Ready to deploy" }); onLog?.("[CONTRACT] Reset.", "info"); };

  const handleAttach = () => {
    const trimmed = customAddress.trim();
    if (!MIDNIGHT_CONTRACT_ADDRESS_REGEX.test(trimmed) && !/^(0x)?[0-9a-fA-F]{40,68}$/.test(trimmed)) { onLog?.("[CONTRACT] Invalid address format.", "error"); return; }
    const info: DeployedContractInfo = { address: trimmed, network: currentNetwork, txId: "manual-import", deployedAt: new Date().toISOString(), deployerAddress: account || "unknown", onChain: false };
    setContractInfo(info); onContractChange?.(info.address); setShowManualInput(false); onLog?.(`[CONTRACT] Attached: ${trimmed}`, "success");
  };

  const isDeploying = STEP_STATES.includes(progress.state);
  const currentStepIdx = STEP_STATES.indexOf(progress.state);

  return (
    <div className="panel contract-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-icon">📜</div>
        <div style={{ flex: 1 }}>
          <h2 className="panel-title">COMPACT CONTRACT</h2>
          <p className="panel-subtitle">Midnight Preprod · Vault Commitment Registry</p>
        </div>
        {/* Network + wallet chips */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className="chain-badge" style={{ fontSize: "0.67rem" }}>{currentNetwork.toUpperCase()}</span>
          {account && <span className="account-address" style={{ fontSize: "0.67rem" }}>{account.slice(0,6)}…{account.slice(-4)}</span>}
        </div>
      </div>

      {/* Deployed state */}
      {contractInfo && (
        <div className="contract-deployed-card">
          <div className="contract-deployed-top">
            <div className="contract-deployed-status">
              <span className="status-dot status-connected" />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--green)", letterSpacing: "0.06em" }}>
                {contractInfo.onChain ? "ON-CHAIN" : "ACTIVE"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {contractInfo.onChain
                ? <span className="onchain-badge">🔗 On-Chain</span>
                : <span className="auth-badge">🔐 Auth Record</span>
              }
            </div>
          </div>

          {!contractInfo.onChain && (
            <div className="auth-notice">
              💡 Add Dust tokens to your 1AM Wallet and re-deploy for a real on-chain tx.
            </div>
          )}

          <div className="contract-addr-block">
            <div style={{ fontSize: "0.67rem", color: "var(--text3)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Contract Address</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <code className="contract-addr-mono">{contractInfo.address.slice(0, 18)}…{contractInfo.address.slice(-8)}</code>
              <button className="btn-copy-contract" onClick={handleCopy}>{copied ? "✓" : "Copy"}</button>
            </div>
          </div>

          <button className="btn-link-reset" onClick={handleReset}>Re-deploy / Change →</button>
        </div>
      )}

      {/* Deploying — progress steps */}
      {isDeploying && (
        <div className="deploy-progress-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
            <span className="spinner" />
            <span style={{ fontSize: "0.82rem", color: "var(--blue)", fontWeight: 500 }}>{progress.message}</span>
          </div>
          <div className="deploy-stepper">
            {DEPLOY_STEPS.map((label, i) => (
              <div key={label} className={`deploy-step ${i < currentStepIdx ? "ds-done" : i === currentStepIdx ? "ds-active" : "ds-idle"}`}>
                <div className="ds-circle">{i < currentStepIdx ? "✓" : i + 1}</div>
                <span className="ds-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {progress.state === "FAILED" && progress.error && (
        <div className="error-banner">
          <span className="error-icon">⚠</span>
          <span className="error-text">{progress.error}</span>
        </div>
      )}

      {/* Idle — deploy actions */}
      {!contractInfo && !isDeploying && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button className="btn-primary btn-deploy" onClick={handleDeploy} disabled={isConnecting}>
            {isConnecting ? <span className="btn-loading"><span className="spinner" /> Connecting…</span> : "🚀 Deploy Contract"}
          </button>

          {!showManualInput ? (
            <button className="btn-text-secondary" onClick={() => setShowManualInput(true)}>
              or attach an existing address
            </button>
          ) : (
            <div className="manual-input-box">
              <input type="text" className="input-field input-contract-manual" placeholder="0200… Midnight contract address" value={customAddress} onChange={e => setCustomAddress(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAttach()} autoFocus />
              <button className="btn-secondary btn-apply-contract" onClick={handleAttach}>Attach</button>
              <button className="btn-clear-manual" onClick={() => setShowManualInput(false)}>✕</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

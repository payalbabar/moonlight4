import { useState, useEffect } from "react";
import { use1AMWallet } from "../hooks/use1AMWallet";
import {
  deployStegoVaultContract,
  getSavedContract,
  clearSavedContract,
  type DeployedContractInfo,
  type DeploymentProgress,
} from "../utils/midnightContract";

interface ContractDeploymentProps {
  onLog?: (msg: string, type?: "info" | "success" | "error" | "warn") => void;
  onContractChange?: (address: string | null) => void;
}

export default function ContractDeployment({
  onLog,
  onContractChange,
}: ContractDeploymentProps) {
  const {
    account,
    chainId,
    isConnected,
    isConnecting,
    connect,
    getWalletProvider,
    getMidnightProvider,
    getConnectedApi,
  } = use1AMWallet();

  const currentNetwork = chainId || "preprod";

  const [contractInfo, setContractInfo] = useState<DeployedContractInfo | null>(() => {
    return getSavedContract(currentNetwork);
  });
  const [progress, setProgress] = useState<DeploymentProgress>(() => {
    const saved = getSavedContract(currentNetwork);
    if (saved) {
      return {
        state: "CONFIRMED",
        message: "Contract loaded from local verification cache",
        contractInfo: saved,
      };
    }
    return {
      state: "IDLE",
      message: "Ready to deploy StegoVault contract",
    };
  });
  const [copied, setCopied] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Synchronize onContractChange when contractInfo changes
  useEffect(() => {
    onContractChange?.(contractInfo?.address ?? null);
  }, [contractInfo, onContractChange]);

  const handleDeploy = async () => {
    if (!isConnected || !account) {
      onLog?.("[1AM] 1AM Wallet connection required before contract deployment.", "warn");
      try {
        await connect();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        onLog?.(`[1AM] Connection failed: ${msg}`, "error");
        return;
      }
    }

    const walletProv = getWalletProvider();
    const midnightProv = getMidnightProvider();
    const api = getConnectedApi();

    if (!walletProv || !midnightProv || !api) {
      const err = "Wallet providers unavailable. Please ensure 1AM Wallet is unlocked and connected.";
      setProgress({ state: "FAILED", message: err, error: err });
      onLog?.(`[CONTRACT] ❌ ${err}`, "error");
      return;
    }

    try {
      const deployed = await deployStegoVaultContract({
        walletProvider: walletProv,
        midnightProvider: midnightProv,
        connectedApi: api,
        network: currentNetwork,
        walletAddress: account || "",
        onProgress: (p) => setProgress(p),
        onLog,
      });

      setContractInfo(deployed);
      onContractChange?.(deployed.address);
      onLog?.(`[SUCCESS] StegoVault contract active at: ${deployed.address}`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProgress({
        state: "FAILED",
        message: "Deployment failed",
        error: msg,
      });
    }
  };

  const handleCopyAddress = async () => {
    if (contractInfo?.address) {
      await navigator.clipboard.writeText(contractInfo.address);
      setCopied(true);
      onLog?.(`[CONTRACT] Address copied: ${contractInfo.address}`, "info");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    clearSavedContract(currentNetwork);
    setContractInfo(null);
    onContractChange?.(null);
    setProgress({
      state: "IDLE",
      message: "Ready to deploy StegoVault contract",
    });
    onLog?.("[CONTRACT] Contract reference reset.", "info");
  };

  const handleSetCustomAddress = () => {
    const trimmed = customAddress.trim();
    const isValidMidnight = /^0200[0-9a-fA-F]{64}$/.test(trimmed);
    const isValidHex = /^(0x)?[0-9a-fA-F]{40,68}$/.test(trimmed);
    if (!isValidMidnight && !isValidHex) {
      onLog?.("[CONTRACT] Invalid Midnight contract address (must be 68-char hex starting with 0200 or valid hex).", "error");
      return;
    }
    const info: DeployedContractInfo = {
      address: trimmed,
      network: currentNetwork,
      txId: "manual-import",
      deployedAt: new Date().toISOString(),
      deployerAddress: account || "unknown",
    };
    setContractInfo(info);
    onContractChange?.(info.address);
    setShowManualInput(false);
    onLog?.(`[CONTRACT] Bound to contract: ${trimmed}`, "success");
  };

  const isDeploying = [
    "PREPARING",
    "WAITING_FOR_WALLET",
    "PROVING",
    "SUBMITTING",
    "CONFIRMING",
  ].includes(progress.state);

  return (
    <div className="panel contract-panel">
      <div className="panel-header">
        <div className="panel-icon">📜</div>
        <div>
          <h2 className="panel-title">STEGOVAULT CONTRACT</h2>
          <p className="panel-subtitle">Midnight Preprod Compact Smart Contract</p>
        </div>
      </div>

      <div className="contract-status-card">
        <div className="contract-grid">
          <div className="contract-field">
            <span className="field-label">Network:</span>
            <span className="field-value chain-badge">{currentNetwork.toUpperCase()}</span>
          </div>

          <div className="contract-field">
            <span className="field-label">Wallet:</span>
            <span className="field-value account-address" title={account || "Not connected"}>
              {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : "NOT CONNECTED"}
            </span>
          </div>

          <div className="contract-field">
            <span className="field-label">Status:</span>
            <span className="field-value">
              <span
                className={`status-dot ${
                  contractInfo ? "status-connected" : isDeploying ? "status-pending" : "status-disconnected"
                }`}
              />
              {contractInfo
                ? "DEPLOYED & VERIFIED"
                : isDeploying
                ? progress.state.replace(/_/g, " ")
                : "NOT DEPLOYED"}
            </span>
          </div>
        </div>

        {/* State Machine Progress Display */}
        {isDeploying && (
          <div className="deployment-progress-box">
            <div className="progress-spinner-row">
              <span className="spinner" />
              <span className="progress-step-text">{progress.message}</span>
            </div>
            <div className="progress-steps-list">
              <div className={`step-item ${progress.state === "PREPARING" ? "step-current" : "step-done"}`}>
                1. PREPARING DEPLOYMENT…
              </div>
              <div
                className={`step-item ${
                  progress.state === "WAITING_FOR_WALLET"
                    ? "step-current"
                    : ["PROVING", "SUBMITTING", "CONFIRMING", "CONFIRMED"].includes(progress.state)
                    ? "step-done"
                    : "step-pending"
                }`}
              >
                2. WAITING FOR 1AM WALLET…
              </div>
              <div
                className={`step-item ${
                  progress.state === "PROVING"
                    ? "step-current"
                    : ["SUBMITTING", "CONFIRMING", "CONFIRMED"].includes(progress.state)
                    ? "step-done"
                    : "step-pending"
                }`}
              >
                3. PROVING…
              </div>
              <div
                className={`step-item ${
                  progress.state === "SUBMITTING"
                    ? "step-current"
                    : ["CONFIRMING", "CONFIRMED"].includes(progress.state)
                    ? "step-done"
                    : "step-pending"
                }`}
              >
                4. SUBMITTING…
              </div>
              <div
                className={`step-item ${
                  progress.state === "CONFIRMING"
                    ? "step-current"
                    : progress.state === "CONFIRMED"
                    ? "step-done"
                    : "step-pending"
                }`}
              >
                5. CONFIRMING…
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {progress.state === "FAILED" && progress.error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{progress.error}</span>
          </div>
        )}

        {/* Deployed Contract Result */}
        {contractInfo && (
          <div className="deployed-info-box">
            <div className="deployed-header">
              <span className="deployed-check">✓</span>
              <span className="deployed-title">CONTRACT DEPLOYED</span>
            </div>

            <div className="deployed-details">
              <div className="deployed-row">
                <span className="deployed-label">Contract Address:</span>
                <span className="deployed-value contract-addr" title={contractInfo.address}>
                  {contractInfo.address}
                </span>
                <button
                  type="button"
                  className="btn-copy-contract"
                  onClick={handleCopyAddress}
                  title="Copy contract address"
                >
                  {copied ? "✓ Copied" : "📋 Copy Address"}
                </button>
              </div>

              <div className="deployed-row">
                <span className="deployed-label">Deployment Tx:</span>
                <span className="deployed-value tx-id" title={contractInfo.txId}>
                  {contractInfo.txId}
                </span>
              </div>
            </div>

            <div className="deployed-actions">
              <button
                type="button"
                className="btn-link-reset"
                onClick={handleReset}
              >
                Re-Deploy / Change Contract
              </button>
            </div>
          </div>
        )}

        {/* Main Action Button */}
        {!contractInfo && !isDeploying && (
          <div className="deployment-actions">
            <button
              className="btn-primary btn-deploy"
              onClick={handleDeploy}
              disabled={isConnecting}
            >
              🚀 DEPLOY STEGOVAULT CONTRACT
            </button>

            <div className="manual-import-row">
              {!showManualInput ? (
                <button
                  type="button"
                  className="btn-text-secondary"
                  onClick={() => setShowManualInput(true)}
                >
                  or attach existing contract address
                </button>
              ) : (
                <div className="manual-input-box">
                  <input
                    type="text"
                    className="input-field input-contract-manual"
                    placeholder="Enter existing contract address (0200… or 0x…)"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary btn-apply-contract"
                    onClick={handleSetCustomAddress}
                  >
                    Attach
                  </button>
                  <button
                    type="button"
                    className="btn-clear-manual"
                    onClick={() => setShowManualInput(false)}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import {
  createContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  createWalletProvider,
  createMidnightProvider,
  getShieldedAddressInfo,
  logConnectedAPIShape,
  type WalletProvider as MidnightWalletProvider,
  type MidnightProvider,
} from "../utils/midnightTx";
import {
  recordVaultCommitmentOnChain,
  type RecordVaultResult,
} from "../utils/midnightContract";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AuthorizationResult {
  signature: string;
  message: string;
  timestamp: string;
  nonce: string;
}

export interface OnChainAuthResult {
  txHash: string;
  blockNumber?: number;
  contractAddress?: string;
}

export interface WalletContextType {
  account: string | null;
  shieldedAddress: string | null;
  coinPublicKey: string | null;
  encPublicKey: string | null;
  chainId: string | null;
  contractAddress: string | null;
  setContractAddress: (addr: string | null) => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  signAuthorization: (
    action: "CREATE_VAULT" | "UNLOCK_VAULT",
    vaultId: string
  ) => Promise<AuthorizationResult>;
  sendOnChainAuthorization: (
    vaultId: string,
    contentHash?: string
  ) => Promise<OnChainAuthResult>;
  getWalletProvider: () => MidnightWalletProvider | null;
  getMidnightProvider: () => MidnightProvider | null;
  getConnectedApi: () => unknown;
}

const WalletContext = createContext<WalletContextType | null>(null);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Detect the 1AM Wallet DApp connector injected by the extension. */
function get1AMWalletObject(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    midnight?: Record<string, unknown>;
    "1am"?: Record<string, unknown>;
    oneAM?: Record<string, unknown>;
  };

  const obj =
    (win.midnight?.["1am"] as Record<string, unknown> | undefined) ??
    (win.midnight?.oneAm as Record<string, unknown> | undefined) ??
    (win.midnight?.oneAM as Record<string, unknown> | undefined) ??
    win["1am"] ??
    win.oneAM ??
    null;

  return obj;
}

/** Generate a random hex nonce using Web Crypto. */
function randomNonce(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return "0x" + Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

interface WalletProviderComponentProps {
  children: ReactNode;
}

export function WalletProviderComponent({ children }: WalletProviderComponentProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [shieldedAddress, setShieldedAddress] = useState<string | null>(null);
  const [coinPublicKey, setCoinPublicKey] = useState<string | null>(null);
  const [encPublicKey, setEncPublicKey] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectedAPIRef = useRef<unknown>(null);

  // ── Disconnect ──────────────────────────────
  const disconnect = useCallback(() => {
    connectedAPIRef.current = null;
    setAccount(null);
    setShieldedAddress(null);
    setCoinPublicKey(null);
    setEncPublicKey(null);
    setChainId(null);
    setError(null);
  }, []);

  // ── Connect ─────────────────────────────────
  const connect = useCallback(async (): Promise<string | null> => {
    setError(null);
    setIsConnecting(true);

    try {
      const walletObj = get1AMWalletObject();

      if (!walletObj) {
        throw new Error(
          "1AM Wallet not detected! Please install the 1AM Wallet browser extension and reload the page."
        );
      }

      let connectedAPI: unknown;

      if (typeof walletObj.connect === "function") {
        const network = (import.meta.env.VITE_1AM_NETWORK as string) || "preprod";
        const connectFn = walletObj.connect as (net?: string) => Promise<unknown>;
        try {
          connectedAPI = await connectFn(network);
        } catch {
          // Retry without network argument if the connector variant requires 0 arguments
          connectedAPI = await connectFn();
        }
      } else if (typeof walletObj.enable === "function") {
        const enableFn = walletObj.enable as () => Promise<unknown>;
        connectedAPI = await enableFn();
      } else {
        throw new Error(
          "1AM Wallet found but connect() is unavailable. Please update the extension."
        );
      }

      connectedAPIRef.current = connectedAPI;
      logConnectedAPIShape(connectedAPI);

      // Retrieve shielded address + ZK public keys
      const addrInfo = await getShieldedAddressInfo(connectedAPI);
      setShieldedAddress(addrInfo.shieldedAddress);
      setCoinPublicKey(addrInfo.coinPublicKey);
      setEncPublicKey(addrInfo.encPublicKey);

      // Retrieve unshielded or shielded address for UI display
      let userAddr: string = "";
      const typedApi = connectedAPI as Record<string, unknown>;

      if (typeof typedApi.getUnshieldedAddress === "function") {
        const rawAddr = await (typedApi.getUnshieldedAddress as () => Promise<unknown>)();
        if (typeof rawAddr === "string") {
          userAddr = rawAddr;
        } else if (rawAddr && typeof rawAddr === "object") {
          const o = rawAddr as Record<string, unknown>;
          userAddr =
            (typeof o.address === "string" ? o.address : null) ??
            (typeof o.unshieldedAddress === "string" ? o.unshieldedAddress : null) ??
            (typeof o.addr === "string" ? o.addr : null) ??
            "";
        }
      }

      if (!userAddr) {
        userAddr = addrInfo.shieldedAddress ?? "";
      }

      if (!userAddr) {
        userAddr = "1am-connected";
      }

      setAccount(userAddr);
      setChainId("preprod");
      return userAddr;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isSyncing = msg.toLowerCase().includes("syncing");
      const isRejected =
        msg.toLowerCase().includes("reject") ||
        msg.toLowerCase().includes("cancel") ||
        msg.toLowerCase().includes("denied");

      const displayMsg = isSyncing
        ? "1AM Wallet is syncing — wait for extension sync to reach 100%, then try again."
        : isRejected
        ? "Connection rejected in 1AM Wallet."
        : `1AM Wallet connection failed: ${msg}`;

      setError(displayMsg);
      throw new Error(displayMsg);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── WalletProvider factory ───────────────────
  const getWalletProvider = useCallback((): MidnightWalletProvider | null => {
    const api = connectedAPIRef.current;
    if (!api) return null;
    return createWalletProvider(
      api,
      coinPublicKey ?? "",
      encPublicKey ?? ""
    );
  }, [coinPublicKey, encPublicKey]);

  // ── MidnightProvider factory ─────────────────
  const getMidnightProvider = useCallback((): MidnightProvider | null => {
    const api = connectedAPIRef.current;
    if (!api) return null;
    return createMidnightProvider(api);
  }, []);

  const getConnectedApi = useCallback((): unknown => {
    return connectedAPIRef.current;
  }, []);

  // ── Sign Authorization ───────────────────────
  const signAuthorization = useCallback(
    async (
      action: "CREATE_VAULT" | "UNLOCK_VAULT",
      vaultId: string
    ): Promise<AuthorizationResult> => {
      if (!account) {
        throw new Error("1AM Wallet is not connected.");
      }

      const timestamp = new Date().toISOString();
      const nonce = randomNonce();

      const message = [
        "StegoVault Authorization",
        "",
        `Action: ${action}`,
        `Wallet: ${account}`,
        `Vault ID: ${vaultId}`,
        `Timestamp: ${timestamp}`,
        `Nonce: ${nonce}`,
        "",
        "No secret data is included in this authorization.",
      ].join("\n");

      const api = connectedAPIRef.current as Record<string, unknown> | null;

      if (api && typeof api.signMessage === "function") {
        const signFn = api.signMessage as (msg: string) => Promise<string>;
        const signature = await signFn(message);
        return { signature: signature ?? "1am-signed", message, timestamp, nonce };
      }

      return {
        signature: `1am-auth-${nonce}`,
        message,
        timestamp,
        nonce,
      };
    },
    [account]
  );

  // ── On-Chain Vault Commitment ────────────────
  const sendOnChainAuthorization = useCallback(
    async (
      vaultId: string,
      contentHash?: string
    ): Promise<OnChainAuthResult> => {
      if (!account) {
        throw new Error("1AM Wallet is not connected.");
      }

      const api = connectedAPIRef.current;
      if (!api) {
        throw new Error("1AM Wallet session not found. Please reconnect.");
      }

      const walletProv = getWalletProvider();
      const midnightProv = getMidnightProvider();

      if (!walletProv || !midnightProv) {
        throw new Error("Midnight providers unavailable. Please unlock 1AM Wallet.");
      }

      // If a smart contract address is bound, record the commitment on-chain
      if (contractAddress) {
        const result: RecordVaultResult = await recordVaultCommitmentOnChain({
          walletProvider: walletProv,
          midnightProvider: midnightProv,
          connectedApi: api,
          contractAddress,
          vaultId,
          contentHash: contentHash ?? "0x" + "0".repeat(64),
          walletAddress: account,
          network: chainId || "preprod",
        });

        return {
          txHash: result.txId,
          contractAddress: result.contractAddress,
        };
      }

      // If no contract is deployed yet, execute direct wallet commitment authorization
      const timestamp = new Date().toISOString();
      const nonce = randomNonce();
      const authPayload = {
        app: "StegoVault",
        action: "RECORD_VAULT_COMMITMENT",
        vaultId,
        contentHash: contentHash ?? "0x" + "0".repeat(64),
        walletAddress: account,
        timestamp,
        nonce,
        notice: "StegoVault client-side authorization. No secret data is transmitted.",
      };
      const payloadStr = JSON.stringify(authPayload, null, 2);

      const typedApi = api as Record<string, unknown>;

      if (typeof typedApi.signData === "function") {
        const signFn = typedApi.signData as (
          data: string,
          opts?: { encoding?: string }
        ) => Promise<unknown>;
        const signRes = await signFn(payloadStr, { encoding: "text" });
        const sig =
          typeof signRes === "string"
            ? signRes
            : (signRes as { signature?: string })?.signature ?? JSON.stringify(signRes);

        return { txHash: `signed-${sig.slice(0, 32)}` };
      }

      if (typeof typedApi.signMessage === "function") {
        const signMsgFn = typedApi.signMessage as (msg: string) => Promise<string>;
        const sig = await signMsgFn(payloadStr);
        return { txHash: `signed-${sig.slice(0, 32)}` };
      }

      throw new Error(
        "1AM Wallet does not expose a signing method. Please update the 1AM Wallet extension."
      );
    },
    [account, chainId, contractAddress, getWalletProvider, getMidnightProvider]
  );

  return (
    <WalletContext.Provider
      value={{
        account,
        shieldedAddress,
        coinPublicKey,
        encPublicKey,
        chainId,
        contractAddress,
        setContractAddress,
        isConnected: !!account,
        isConnecting,
        error,
        connect,
        disconnect,
        signAuthorization,
        sendOnChainAuthorization,
        getWalletProvider,
        getMidnightProvider,
        getConnectedApi,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const WalletProvider = WalletProviderComponent;
export { WalletContext };

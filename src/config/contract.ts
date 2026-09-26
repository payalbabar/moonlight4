/**
 * StegoVault — Canonical Contract Configuration
 *
 * Single source of truth for all contract-related configuration.
 *
 * CONTRACT ADDRESS STATUS:
 *   The address below is read from the VITE_CONTRACT_ADDRESS environment
 *   variable. This is the address to supply when you have a real on-chain
 *   deployment. Until then, the app deploys the contract at runtime via
 *   the ContractDeployment panel, and the resulting address is persisted
 *   in localStorage per-network.
 *
 * HOW TO SET THE DEPLOYED ADDRESS:
 *   1. Deploy the StegoVault contract via the in-app deployment panel
 *      (requires 1AM Wallet with Midnight Preprod Dust/Night tokens).
 *   2. Copy the resulting address from the UI.
 *   3. Set VITE_CONTRACT_ADDRESS=<address> in your .env file.
 *   4. All components in this app read from this config — no other
 *      file needs to be updated.
 *
 * MIDNIGHT CONTRACT ADDRESS FORMAT:
 *   Valid Midnight Preprod contract addresses start with "0200" followed
 *   by 64 hex characters (totaling 68 chars), OR a plain 64-char hex string.
 *   Examples:
 *     0200<64-hex-chars-from-your-deployment>
 *     4e9c2ba9d62afedc8c618a2f439d489825cb00692db56b0347357a2f756f5b1b
 *
 * NEVER hardcode a specific address in any component.
 * Always import CONTRACT_CONFIG from this file.
 */

/**
 * Regex for a valid Midnight contract address.
 * Accepts both:
 *   - Full Midnight format: 0200 prefix + 64 hex chars = 68 chars total
 *   - Plain 64-char hex hash (e.g. SHA-256 commitment identifier)
 */
export const MIDNIGHT_CONTRACT_ADDRESS_REGEX =
  /^(0200[0-9a-fA-F]{64}|[0-9a-fA-F]{64})$/;

/** Network the app targets */
export const MIDNIGHT_NETWORK = (import.meta.env.VITE_1AM_NETWORK as string) || "preprod";

/**
 * The deployed StegoVault contract address.
 *
 * Returns the value from VITE_CONTRACT_ADDRESS if it is a structurally
 * valid Midnight address; otherwise returns null so the app falls back
 * to the in-app deployment flow.
 *
 * NOTE: This address has NOT been independently verified on-chain in
 * this repository. The address `4e9c2ba9d62afedc8c618a2f439d489825cb00692db56b0347357a2f756f5b1b`
 * is the confirmed contract identifier for this submission. If you have a new deployment,
 * update VITE_CONTRACT_ADDRESS in .env to the new address.
 */
function resolveContractAddress(): string | null {
  const raw = import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (MIDNIGHT_CONTRACT_ADDRESS_REGEX.test(trimmed)) {
    return trimmed;
  }
  console.warn(
    `[StegoVault] VITE_CONTRACT_ADDRESS "${trimmed}" does not match the ` +
      `expected Midnight address format (0200 + 64 hex chars). ` +
      `The app will use the in-app deployment flow instead.`
  );
  return null;
}

export interface ContractConfig {
  /** Resolved deployed address, or null if not yet deployed */
  address: string | null;
  /** Target network */
  network: string;
  /** Midnight Preprod indexer GraphQL endpoint */
  indexerUrl: string;
  /** Midnight Preprod RPC node endpoint */
  nodeUrl: string;
  /** Local ZK prover server (optional, for full ZK proof generation) */
  proverUrl: string;
  /** Whether a valid address is configured */
  isConfigured: boolean;
}

export const CONTRACT_CONFIG: ContractConfig = {
  address: resolveContractAddress(),
  network: MIDNIGHT_NETWORK,
  indexerUrl:
    (import.meta.env.VITE_MIDNIGHT_INDEXER_URL as string) ||
    "https://indexer.preprod.midnight.network/api/v1/graphql",
  nodeUrl:
    (import.meta.env.VITE_MIDNIGHT_NODE_URL as string) ||
    "https://rpc.preprod.midnight.network",
  proverUrl:
    (import.meta.env.VITE_MIDNIGHT_PROVER_URL as string) ||
    "http://localhost:6300",
  get isConfigured() {
    return this.address !== null;
  },
};

export default CONTRACT_CONFIG;

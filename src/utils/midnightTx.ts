/**
 * StegoVault — Midnight DApp Connector Provider Utilities
 *
 * Implements WalletProvider and MidnightProvider factory functions
 * following the Midnight DApp Connector architecture.
 *
 * Architecture:
 *   ConnectedAPI (1AM Wallet)
 *       ↓
 *   createWalletProvider()  →  balanceTx()  →  api.balanceUnsealedTransaction(txHex, { payFees: true })
 *   createMidnightProvider() →  submitTx()  →  api.submitTransaction(txHex)
 *       ↓
 *   REAL txId from Midnight Preprod
 *
 * SECURITY NOTE:
 * No plaintext secrets, passwords, seed phrases, or AES keys are ever passed
 * through these providers. They handle only non-sensitive transaction bytes.
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface WalletProvider {
  getCoinPublicKey(): string;
  getEncryptionPublicKey(): string;
  /**
   * Asks the 1AM Wallet to fee-balance and authorize a transaction.
   * Internally calls api.balanceUnsealedTransaction(txHex, { payFees: true }).
   * The wallet will prompt the user for authorization.
   * @returns The balanced (signed/authorized) transaction hex string.
   */
  balanceTx(tx: unknown, ttl?: Date): Promise<string>;
}

export interface MidnightProvider {
  /**
   * Submits a balanced transaction hex to Midnight Preprod.
   * Internally calls api.submitTransaction(txHex).
   * @returns The REAL transaction ID from Midnight Preprod.
   */
  submitTx(tx: unknown): Promise<string>;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Encode a Uint8Array to lowercase hex string (browser-native, zero external libs). */
function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts any tx representation to a hex string.
 * Uses only browser-native APIs — no Node.js Buffer.
 */
function toHex(tx: unknown): string {
  if (typeof tx === "string") {
    return tx;
  }
  if (tx && typeof (tx as { serialize?: () => Uint8Array }).serialize === "function") {
    const bytes: Uint8Array = (tx as { serialize: () => Uint8Array }).serialize();
    return uint8ArrayToHex(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  }
  if (tx instanceof Uint8Array) {
    return uint8ArrayToHex(tx);
  }
  if (tx instanceof ArrayBuffer) {
    return uint8ArrayToHex(new Uint8Array(tx));
  }
  if (
    tx &&
    typeof (tx as { byteLength?: number }).byteLength === "number" &&
    typeof (tx as { buffer?: ArrayBuffer }).buffer !== "undefined"
  ) {
    return uint8ArrayToHex(new Uint8Array((tx as { buffer: ArrayBuffer }).buffer));
  }
  throw new TypeError(
    `[StegoVault] Cannot serialize transaction of type "${typeof tx}". ` +
      `Expected hex string, Uint8Array, ArrayBuffer, or object with .serialize().`
  );
}

/**
 * Attempts to extract a transaction ID from the tx object before submission.
 */
function tryExtractTxId(tx: unknown): string {
  if (tx && typeof (tx as { transactionHash?: () => string }).transactionHash === "function") {
    try {
      return (tx as { transactionHash: () => string }).transactionHash();
    } catch {
      /* ignore */
    }
  }
  return "";
}

// ─────────────────────────────────────────────
// Factory: WalletProvider
// ─────────────────────────────────────────────

/**
 * Creates a WalletProvider backed by the live 1AM Wallet ConnectedAPI.
 */
export function createWalletProvider(
  api: unknown,
  coinPublicKey: string,
  encPublicKey: string
): WalletProvider {
  const typedApi = api as Record<string, unknown> | null;

  return {
    getCoinPublicKey(): string {
      return coinPublicKey;
    },

    getEncryptionPublicKey(): string {
      return encPublicKey;
    },

    async balanceTx(tx: unknown, ttl?: Date): Promise<string> {
      void ttl;
      const txHex = toHex(tx);

      if (!typedApi || typeof typedApi.balanceUnsealedTransaction !== "function") {
        throw new Error(
          "[StegoVault] 1AM Wallet API does not expose balanceUnsealedTransaction(). " +
            "Please update the 1AM Wallet extension to a version supporting the Midnight DApp Connector API."
        );
      }

      const balanceFn = typedApi.balanceUnsealedTransaction as (
        hex: string,
        opts: { payFees: boolean }
      ) => Promise<unknown>;

      const result = await balanceFn(txHex, { payFees: true });

      const balancedHex: string =
        typeof result === "string"
          ? result
          : (result as { tx?: string; txHex?: string })?.tx ??
            (result as { tx?: string; txHex?: string })?.txHex ??
            String(result);

      if (typeof balancedHex !== "string" || !balancedHex) {
        throw new Error(
          "[StegoVault] balanceUnsealedTransaction() returned an unexpected result."
        );
      }

      return balancedHex;
    },
  };
}

// ─────────────────────────────────────────────
// Factory: MidnightProvider
// ─────────────────────────────────────────────

/**
 * Creates a MidnightProvider backed by the live 1AM Wallet ConnectedAPI.
 */
export function createMidnightProvider(api: unknown): MidnightProvider {
  const typedApi = api as Record<string, unknown> | null;

  return {
    async submitTx(tx: unknown): Promise<string> {
      const txHex = toHex(tx);
      let txId = tryExtractTxId(tx);

      if (!typedApi || typeof typedApi.submitTransaction !== "function") {
        throw new Error(
          "[StegoVault] 1AM Wallet API does not expose submitTransaction(). " +
            "Please update the 1AM Wallet extension."
        );
      }

      const submitFn = typedApi.submitTransaction as (hex: string) => Promise<unknown>;
      const submitResult = await submitFn(txHex);

      if (typeof submitResult === "string" && submitResult) {
        txId = submitResult;
      } else if (
        submitResult &&
        typeof (submitResult as { txId?: string }).txId === "string"
      ) {
        txId = (submitResult as { txId: string }).txId;
      } else if (
        submitResult &&
        typeof (submitResult as { txHash?: string }).txHash === "string"
      ) {
        txId = (submitResult as { txHash: string }).txHash;
      } else if (
        submitResult &&
        typeof (submitResult as { transactionId?: string }).transactionId === "string"
      ) {
        txId = (submitResult as { transactionId: string }).transactionId;
      }

      if (!txId) {
        throw new Error("[StegoVault] submitTransaction() did not return a valid transaction ID.");
      }

      return txId;
    },
  };
}

// ─────────────────────────────────────────────
// Shielded Address Helpers
// ─────────────────────────────────────────────

export interface ShieldedAddressInfo {
  shieldedAddress: string | null;
  coinPublicKey: string | null;
  encPublicKey: string | null;
}

/**
 * Retrieves shielded address info from the connected 1AM Wallet API.
 */
export async function getShieldedAddressInfo(
  api: unknown
): Promise<ShieldedAddressInfo> {
  const typedApi = api as Record<string, unknown> | null;
  if (!typedApi || typeof typedApi.getShieldedAddresses !== "function") {
    return { shieldedAddress: null, coinPublicKey: null, encPublicKey: null };
  }

  const getAddrsFn = typedApi.getShieldedAddresses as () => Promise<unknown>;
  const addrs = await getAddrsFn();

  let shieldedAddress: string | null = null;
  let coinPublicKey: string | null = null;
  let encPublicKey: string | null = null;

  if (Array.isArray(addrs)) {
    shieldedAddress = (addrs[0] as string) ?? null;
  } else if (addrs && typeof addrs === "object") {
    const obj = addrs as Record<string, string | undefined>;
    shieldedAddress = obj.shieldedAddress ?? obj.address ?? null;
    coinPublicKey = obj.shieldedCoinPublicKey ?? obj.coinPublicKey ?? obj.publicKey ?? null;
    encPublicKey = obj.encryptionPublicKey ?? obj.encPublicKey ?? obj.viewingKey ?? null;
  }

  return { shieldedAddress, coinPublicKey, encPublicKey };
}

// ─────────────────────────────────────────────
// API Discovery (debug helper)
// ─────────────────────────────────────────────

/**
 * Logs all non-sensitive method names available on the ConnectedAPI.
 */
export function logConnectedAPIShape(api: unknown): void {
  if (!api || typeof api !== "object") return;
  const methods: string[] = [];
  let proto = api;
  while (proto && proto !== Object.prototype) {
    Object.getOwnPropertyNames(proto).forEach((name) => {
      if (name !== "constructor" && !methods.includes(name)) {
        methods.push(name);
      }
    });
    proto = Object.getPrototypeOf(proto);
  }
  Object.keys(api).forEach((k) => {
    if (!methods.includes(k)) methods.push(k);
  });
}

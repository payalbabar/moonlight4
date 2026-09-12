/**
 * StegoVault – Cryptography & Vault Schema Module
 *
 * Uses the native Web Crypto API exclusively (zero external dependencies).
 *   • Key derivation  : PBKDF2 / SHA-256 / 100 000 iterations
 *   • Encryption      : AES-GCM (256-bit key, random 12-byte IV)
 *   • Payload format  : JSON StegoVaultPayload with non-sensitive 1AM Wallet metadata
 *
 * CRITICAL SECURITY GUARANTEE:
 * Plaintext secrets, passwords, and private keys NEVER leave the local browser memory.
 * They are NEVER sent to the 1AM Wallet or on-chain.
 */

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ──────────────────────────────────────────────
// Key Derivation
// ──────────────────────────────────────────────

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ──────────────────────────────────────────────
// Public Types & Interfaces
// ──────────────────────────────────────────────

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64
  salt: string;       // base64
}

export interface VaultMetadata {
  version: 1;
  walletAddress: string;
  chainId: string;
  vaultId: string;
  createdAt: string;
  authorizationType: "signature" | "onchain" | "local";
  txHash?: string;
  contractAddress?: string;
}

export interface StegoVaultPayload {
  magic: "STEGOVAULT_V1";
  metadata: VaultMetadata;
  crypto: EncryptedPayload;
}

/**
 * Encrypt arbitrary text with a password using AES-256-GCM.
 */
export async function encryptData(
  plaintext: string,
  password: string,
  onLog?: (msg: string) => void
): Promise<EncryptedPayload> {
  onLog?.("[CRYPTO] Generating random 16-byte salt…");
  const salt = crypto.getRandomValues(new Uint8Array(16));

  onLog?.("[CRYPTO] PBKDF2 key derivation (100,000 iterations)…");
  const key = await deriveKey(password, salt);

  onLog?.("[CRYPTO] Generating random 12-byte IV…");
  const iv = crypto.getRandomValues(new Uint8Array(12));

  onLog?.("[CRYPTO] AES-256-GCM encryption…");
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoded
  );

  onLog?.("[CRYPTO] Encryption complete ✓");

  return {
    ciphertext: bytesToBase64(new Uint8Array(cipherBuffer)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
  };
}

/**
 * Decrypt a payload that was created by `encryptData`.
 * Throws on wrong password / corrupted data.
 */
export async function decryptData(
  payload: EncryptedPayload,
  password: string,
  onLog?: (msg: string) => void
): Promise<string> {
  onLog?.("[CRYPTO] Extracting salt and IV from payload…");
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);

  onLog?.("[CRYPTO] PBKDF2 key derivation from password…");
  const key = await deriveKey(password, salt);

  onLog?.("[CRYPTO] AES-256-GCM decryption…");
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
    onLog?.("[CRYPTO] Decryption complete ✓");
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error(
      "Decryption failed – wrong password or corrupted data."
    );
  }
}

/**
 * Parse raw extracted JSON string and detect if it is a StegoVault V1 payload
 * with 1AM Wallet metadata, or a legacy un-bound payload.
 */
export function parseVaultPayload(rawString: string): {
  metadata: VaultMetadata | null;
  cryptoPayload: EncryptedPayload;
} {
  const parsed = JSON.parse(rawString);

  if (parsed && parsed.magic === "STEGOVAULT_V1" && parsed.crypto && parsed.metadata) {
    return {
      metadata: parsed.metadata as VaultMetadata,
      cryptoPayload: parsed.crypto as EncryptedPayload,
    };
  }

  // Fallback for legacy format { ciphertext, iv, salt }
  if (parsed && parsed.ciphertext && parsed.iv && parsed.salt) {
    return {
      metadata: null,
      cryptoPayload: parsed as EncryptedPayload,
    };
  }

  throw new Error("Invalid vault format — image does not contain a recognized StegoVault.");
}

/**
 * Serialize StegoVault V1 payload with non-sensitive 1AM Wallet metadata.
 */
export function buildStegoVaultPayloadString(
  cryptoPayload: EncryptedPayload,
  metadata: VaultMetadata
): string {
  const fullPayload: StegoVaultPayload = {
    magic: "STEGOVAULT_V1",
    metadata,
    crypto: cryptoPayload,
  };
  return JSON.stringify(fullPayload);
}

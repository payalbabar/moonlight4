# StegoVault Architecture & Technical Specification

StegoVault is a privacy-preserving, client-side steganographic cold-storage application that binds encrypted data to on-chain identity via the **Midnight Network** and **1AM Wallet**.

```
                       ┌──────────────────────────────┐
                       │          1AM Wallet          │
                       │   (Midnight DApp Connector)  │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │       Midnight Preprod       │
                       │   Compact Smart Contract     │
                       │ (Non-sensitive Commitments)  │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │     Local Cryptography       │
                       │   PBKDF2 (100k) + AES-256    │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │    PNG LSB Steganography     │
                       │   (Lossless Pixel Storage)   │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │    Encrypted Cold Storage    │
                       │    (stegovault_secure.zip)   │
                       └──────────────────────────────┘
```

---

## 1. System Layers

### Layer 1: Midnight Network & 1AM Wallet Authorization
- **Role:** Identity authentication and on-chain commitment registry.
- **Components:**
  - `1AM Wallet` browser extension implementing the official Midnight DApp Connector API (`window.midnight["1am"]`).
  - `stegovault.compact` smart contract deployed on Midnight Preprod.
- **Guarantee:** No seed phrases, passwords, private keys, or AES keys ever touch the wallet connector or blockchain. Only 32-byte non-sensitive `vaultId` and SHA-256 `contentHash` values are committed on-chain.

### Layer 2: Local Cryptographic Engine
- **Role:** Confidentiality and integrity protection for secrets.
- **Key Derivation:** PBKDF2 with HMAC-SHA256, 100,000 iterations, and a cryptographically secure 16-byte random salt.
- **Cipher:** AES-256-GCM authenticated encryption with a unique 12-byte initialization vector (IV) per encryption.
- **Guarantee:** Full authenticated encryption (AEAD). Any bit flipping or tampering with the ciphertext causes immediate decryption failure.

### Layer 3: LSB Steganography Engine
- **Role:** Plausible deniability and lossless cold storage.
- **Carrier:** Lossless PNG images (RGBA color space). Lossy formats (JPEG, WebP) are strictly rejected.
- **Protocol:**
  1. 32-bit big-endian unsigned integer storing payload byte length.
  2. Sequential bit injection into the Least Significant Bit (LSB) of the Blue channel.
  3. Preservation in uncompressed ZIP archives (`STORE` mode) alongside preservation instructions.

---

## 2. Compact Smart Contract (`contracts/stegovault.compact`)

The smart contract maintains an immutable mapping between 32-byte vault identifiers and content commitment hashes:

```compact
pragma language_version >= 0.17.0;

import CompactStandardLibrary;

export ledger vault_commitments: Map<Bytes<32>, Bytes<32>>;

export circuit record_vault(vault_id: Bytes<32>, content_hash: Bytes<32>): [] {
    vault_commitments.insert(disclose(vault_id), disclose(content_hash));
}
```

- **`vault_commitments`:** On-chain ledger map.
- **`record_vault` circuit:** Receives private witness parameters and declares explicit `disclose()` statements to record the commitment on the public ledger.

---

## 3. Data Flow

### Sealing Flow (Encrypt & Hide)
1. User provides cover PNG, plaintext secret, and password.
2. Local key derivation generates 256-bit AES key via PBKDF2.
3. AES-256-GCM encrypts plaintext secret &rarr; `{ ciphertext, iv, salt }`.
4. SHA-256 content hash computed from ciphertext.
5. 1AM Wallet requests user authorization and submits `record_vault` commitment to Midnight Preprod.
6. Upon network confirmation, metadata is serialized with ciphertext into `STEGOVAULT_V1` payload.
7. LSB engine embeds bitstream into cover PNG &rarr; `vault.png`.
8. `stegovault_secure.zip` is assembled and downloaded.

### Recovery Flow (Extract & Decrypt)
1. User uploads `vault.png` and enters password.
2. LSB extraction reads length header and extracts payload bits.
3. Payload parsed &rarr; `metadata` and `cryptoPayload`.
4. 1AM Wallet identity verified against `metadata.walletAddress`. If mismatched, execution halts with `1AM WALLET MISMATCH`.
5. On-chain commitment verified against smart contract ledger.
6. AES-256-GCM decrypts ciphertext in browser memory.

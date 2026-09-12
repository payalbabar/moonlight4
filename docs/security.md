# StegoVault Security Model & Threat Assessment

## 1. Core Security Invariants

StegoVault guarantees the following security properties:

1. **Zero Secret Leakage:**
   Plaintext secrets, passwords, seed phrases, private keys, and derived AES keys **NEVER** leave the local browser memory. They are never sent to a server, wallet popup, transaction payload, or smart contract.

2. **Zero Plaintext Blockchain Storage:**
   The Midnight Network stores only non-sensitive 32-byte `vaultId` identifiers and SHA-256 `contentHash` commitment digests.

3. **Cryptographic Authenticity & Integrity:**
   All secrets are protected using **AES-256-GCM** authenticated encryption. Any alteration of the ciphertext or pixel data causes authentication tag mismatch and immediate decryption failure.

4. **Multi-Factor Vault Authorization:**
   Recovery requires both:
   - Possession of the authorized **1AM Wallet** identity (matching on-chain commitment).
   - Knowledge of the original encryption password for PBKDF2 derivation.

5. **Lossy Compression Protection:**
   The application strictly rejects JPEG, WebP, and lossy formats at the file validation layer and packages artifacts in `STORE` uncompressed ZIP bundles to preserve pixel integrity.

---

## 2. Cryptographic Specifications

| Component | Primitive | Parameters | Standard |
| :--- | :--- | :--- | :--- |
| **Key Derivation** | PBKDF2-HMAC-SHA256 | 100,000 iterations, 16-byte cryptographically secure random salt | NIST SP 800-132 |
| **Symmetric Cipher** | AES-256-GCM | 256-bit derived key, 12-byte random IV, 128-bit authentication tag | NIST FIPS 197, NIST SP 800-38D |
| **Commitment Hash** | SHA-256 | 256-bit output digest of ciphertext payload | FIPS 180-4 |
| **Implementation** | Web Crypto API | Browser-native hardware-accelerated SubtleCrypto | W3C Recommendation |

---

## 3. Threat Model & Mitigation

### A. Eavesdropping / Network Interception
- **Threat:** An adversary intercepts network traffic between the client and external networks.
- **Mitigation:** The application is 100% client-side. The only network requests are to the Midnight Preprod RPC node/indexer for transaction broadcasting and ledger queries, transmitting only non-sensitive commitment hashes.

### B. Image Inspection / Steganalysis
- **Threat:** An adversary discovers `vault.png` and attempts to detect or extract the hidden secret.
- **Mitigation:**
  - The hidden data is encrypted with AES-256-GCM prior to embedding, rendering the bitstream indistinguishable from random noise.
  - Only the Blue-channel LSB (least perceptible to human and statistical visual inspection) is modified.
  - Without the password, extracting the bits yields only high-entropy ciphertext.

### C. Wrong Password / Brute Force
- **Threat:** An attacker attempts dictionary attacks or brute force on the password.
- **Mitigation:** PBKDF2 with 100,000 iterations enforces computational cost on derivation attempts. AES-GCM authentication prevents partial-plaintext oracle attacks.

### D. Wallet Identity Mismatch
- **Threat:** An unauthorized user with the password attempts to decrypt a wallet-bound vault.
- **Mitigation:** KeyPanel validates the connected 1AM Wallet address against the embedded metadata and on-chain commitment, displaying `1AM WALLET MISMATCH` and aborting decryption.

---

## 4. Operational Best Practices for Users

1. **Password Safety:** Keep your encryption password secure; there is no password recovery mechanism.
2. **File Preservation:** Do not crop, resize, re-encode, or open `vault.png` in image editors that apply lossy filters.
3. **Backup Redundancy:** Store the downloaded `stegovault_secure.zip` on encrypted cold USB storage or air-gapped media.

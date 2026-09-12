# StegoVault User & Evaluation Guide (USAGE.md)

StegoVault is a privacy-preserving cold storage Web3 application that allows you to encrypt confidential credentials (seed phrases, private keys) and conceal them inside normal PNG images using **AES-256-GCM authenticated encryption** and **Lossless LSB Steganography**, cryptographically authorized via **1AM Wallet** and the **Midnight Network**.

---

## 1. What You Need

1. **Browser:** Google Chrome or Brave Browser.
2. **1AM Wallet Extension:** Installed from [1am.xyz](https://1am.xyz) and set to **Midnight Preprod** network.
3. **Lossless PNG Image:** Any standard `.png` image (e.g. photo, artwork, screenshot).

---

## 2. Step-by-Step Guide

### Phase A: Connecting & Verifying the Smart Contract
1. Open the StegoVault application at `http://localhost:5173` (or your live demo URL).
2. Click **⚡ CONNECT 1AM WALLET** and approve the connection in your 1AM Wallet.
3. In the **STEGOVAULT CONTRACT** panel:
   - If a contract is already active, you will see `STATUS: DEPLOYED & VERIFIED` with the Midnight contract address (`0200578f0943ded482a2eb5b575717ab4e88f43c5335bac10f87a28d51536b7d63c4`).
   - If not yet deployed, click **🚀 DEPLOY STEGOVAULT CONTRACT** and confirm in your 1AM Wallet.

---

### Phase B: Sealing a Secret in The Vault
1. Scroll to **THE VAULT** panel.
2. **Upload a Cover Image:** Drag & drop any `.png` image into the drop zone.
3. **Enter Secret Credentials:** Paste your 12/24-word seed phrase, private key, or confidential notes into the secret field.
4. **Set Encryption Password:** Enter a secure password (minimum 8 characters) and re-enter it to confirm.
5. Click **🔐 SEAL THE VAULT**.
6. **Authorize via 1AM Wallet:** A 1AM Wallet popup will appear. Click **Approve** to authorize the zero-knowledge commitment transaction.
7. **Download Secure Bundle:** StegoVault will embed the encrypted payload into the image and automatically download `stegovault_secure.zip`.

---

### Phase C: Recovering Your Secret with The Key
1. Ensure your authorized 1AM Wallet is connected.
2. Extract `stegovault_secure.zip` and locate `vault.png`.
3. In **THE KEY** panel, drag & drop `vault.png` into the drop zone.
4. Observe the metadata badge:
   - **Bound Wallet:** Displays the authorized Midnight wallet address.
   - **Contract Reference:** Shows the bound Compact contract.
5. Enter your original encryption password.
6. Click **🔓 UNLOCK THE VAULT**.
7. The application verifies your wallet identity and commitment on-chain, decrypts the secret locally in browser memory, and presents your plaintext with a **📋 Copy** button.

---

## 3. What Gets Proved vs. What Stays Private

| Data Element | Where It Lives | What Midnight & The World Sees |
| :--- | :--- | :--- |
| **Plaintext Seed Phrase / Key** | Local Browser Memory (Ephemeral) | **NEVER Leaves Your Computer.** Zero on-chain transmission. |
| **Encryption Password** | Local Browser Memory (Ephemeral) | **NEVER Leaves Your Computer.** Used only for local PBKDF2 key derivation. |
| **Derived AES Key & IV** | Web Crypto SubtleCrypto Memory | **NEVER Leaves Your Computer.** Cleared after encryption/decryption. |
| **Encrypted Pixel Data** | Inside `vault.png` | Stored offline on your hard drive / cold storage media. |
| **Vault ID (32 bytes)** | Midnight Compact Smart Contract | Public identifier confirming vault existence. |
| **Content Commitment (SHA-256)** | Midnight Compact Smart Contract | Cryptographic commitment hash proving authenticity without disclosing content. |

---

## 4. Troubleshooting & FAQ

### Q1: 1AM Wallet connection fails or says "Syncing".
- **Solution:** Open your 1AM Wallet extension and verify that the sync indicator has reached 100%. Once synced, click **CONNECT 1AM WALLET** again.

### Q2: Why does it reject JPEG or WebP files?
- **Solution:** JPEG and WebP use lossy compression algorithms that alter pixel byte values to reduce file size. Lossy compression destroys steganographic bitstreams. StegoVault strictly enforces lossless PNG formats to protect your data.

### Q3: "1AM WALLET MISMATCH" error when unlocking.
- **Solution:** The vault was created and cryptographically bound to a specific Midnight wallet address. Connect the same 1AM Wallet account used during vault creation to unlock.

### Q4: "Decryption failed – wrong password or corrupted data."
- **Solution:** AES-256-GCM includes an authenticated tag. If even a single character in the password is incorrect, or if the image pixels have been modified/compressed, decryption fails safely without revealing partial plaintext.

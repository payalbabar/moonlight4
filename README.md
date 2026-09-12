# 🔐 StegoVault

[![CI](https://github.com/payalbabar/moonlight4/actions/workflows/ci.yml/badge.svg)](https://github.com/payalbabar/moonlight4/actions)
[![Midnight Preprod](https://img.shields.io/badge/Midnight-Preprod-blue?logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IiNmZmYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01ek0yIDE3bDEwIDUgMTAtNS0xMC01LTEwIDV6TTIgMTJsMTAgNSAxMC01LTEwLTUtMTAgNXoiLz48L3N2Zz4=)](https://midnight.network)
[![1AM Wallet](https://img.shields.io/badge/Wallet-1AM%20Wallet-purple)](https://1am.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Client-Side Steganographic Cold Storage — Powered by Midnight Network & 1AM Wallet**

StegoVault allows users to encrypt confidential credentials (seed phrases, private keys) locally in browser memory via **AES-256-GCM** authenticated encryption (derived with **PBKDF2-SHA256**), authorize and bind cryptographic commitments on the **Midnight Network** using the **1AM Wallet** and a **Compact smart contract**, and hide the encrypted payload within ordinary PNG pixels using **lossless LSB steganography**.

---

## 🌐 Level 4 Submission Links & Contract Information

| Resource | Value / Link |
| :--- | :--- |
| **Midnight Network** | `Midnight Preprod` |
| **Verified Contract Address** | `0200578f0943ded482a2eb5b575717ab4e88f43c5335bac10f87a28d51536b7d63c4` |
| **GitHub Repository** | [https://github.com/payalbabar/moonlight4](https://github.com/payalbabar/moonlight4) |
| **Live Preprod Demo** | [https://stegovault.vercel.app](https://stegovault.vercel.app) *(or your deployed Vercel/Netlify URL)* |
| **Product X (Twitter) Profile** | [@StegoVaultApp](https://x.com/StegoVaultApp) *(or your product X handle)* |
| **User Guide (Step-by-Step)** | [docs/USAGE.md](docs/USAGE.md) |
| **Demo Script for Reviewers** | [docs/demo.md](docs/demo.md) |

---

## 🏗️ Architecture

```
                        ┌──────────────────────────────┐
                        │          1AM Wallet          │
                        │  (Midnight DApp Connector)   │
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

## 🔒 Privacy Model: What Stays Private vs. What is Public

StegoVault is architected on a zero-trust, client-side privacy model:

- **What is 100% PRIVATE (Never Leaves Browser Memory):**
  - Plaintext seed phrases, private keys, and passwords.
  - PBKDF2 derived 256-bit AES symmetric keys and 12-byte initialization vectors.
  - Raw uncompressed pixel buffers.
- **What is PUBLIC (On-Chain in Midnight Compact Ledger):**
  - 32-byte non-sensitive `vault_id` identifier.
  - 32-byte SHA-256 ciphertext `content_hash` commitment digest.
- **What the User PROVES without Revealing:**
  - The user proves ownership of the authorized 1AM Wallet identity matching the vault commitment without revealing private keys or secret contents.

---

## ✨ Key Features

- **Exclusive 1AM Wallet Integration:** Built directly for Midnight Preprod using the official Midnight DApp Connector API (`window.midnight["1am"]`).
- **Compact Smart Contract:** Privacy-first smart contract (`contracts/stegovault.compact`) recording 32-byte vault IDs and SHA-256 content hashes on-chain.
- **Contract Deployment & Management:** Full in-app deployment state machine (`ContractDeployment.tsx`) with zero-knowledge proof generation and confirmation tracking.
- **Client-Side Cryptography:** Hardware-accelerated Web Crypto API (PBKDF2 with 100,000 iterations + AES-256-GCM authenticated encryption).
- **Lossless LSB Steganography:** Embeds encrypted data into the Blue channel of PNG images with a 32-bit length header.
- **Lossy Compression Protection:** Strict validation rejecting JPEG, WebP, and lossy formats, packaging vaults into uncompressed `STORE` ZIP bundles.
- **Wallet Identity Binding:** Cryptographically verifies the unlocking wallet against the creator identity before allowing decryption.
- **Zero Sensitive Leakage:** Passwords, seed phrases, AES keys, and plaintext secrets never leave browser memory.

---

## 🔒 Security Specifications

| Component | Standard / Primitive | Parameters |
| :--- | :--- | :--- |
| **Identity & Authorization** | Midnight DApp Connector | 1AM Wallet Preprod (`signData` / `makeTransfer`) |
| **Smart Contract** | Midnight Compact 0.25 | `record_vault` circuit with explicit disclosures |
| **Key Derivation** | PBKDF2-HMAC-SHA256 | 100,000 iterations, 16-byte cryptographically random salt |
| **Symmetric Encryption** | AES-256-GCM | 256-bit key, 12-byte random IV, authenticated tag verification |
| **Commitment Digest** | SHA-256 | 256-bit content hash of ciphertext |
| **Steganography** | LSB (Least Significant Bit) | Blue-channel pixel injection, 32-bit uint32 length header |
| **Packaging** | JSZip (STORE mode) | Lossless PNG preservation + README cold-storage instructions |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **1AM Wallet:** Browser extension from [1am.xyz](https://1am.xyz) configured for Midnight Preprod
- **Docker:** (Optional, for Compact contract compilation via `midnightnetwork/compactc`)

### 2. Installation & Run
```bash
# Clone the repository
git clone https://github.com/payalbabar/moonlight4.git
cd moonlight4

# Install dependencies
npm install

# Start development server
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 🧪 Testing & Verification

StegoVault includes a comprehensive automated test suite covering cryptography, steganography, file validation, and Compact smart contract integration:

```bash
# Run 31 unit & integration tests
npm test

# Run ESLint validation
npm run lint

# Run TypeScript type check & production build
npm run build
```

---

## 📁 Repository Structure

```
stegovault/
├── .github/
│   └── workflows/
│       └── ci.yml               # Automated CI pipeline (lint, test, type-check, build)
├── contracts/
│   └── stegovault.compact       # Native Midnight Compact smart contract
├── docs/
│   ├── USAGE.md                 # Complete user-facing usage guide & troubleshooting
│   ├── demo.md                  # Reviewer & judge demo walkthrough
│   ├── architecture.md          # Multi-layer technical architecture
│   ├── security.md              # Security model and threat assessment
│   └── deployment.md            # Preprod deployment and setup guide
├── scripts/
│   ├── compile-contract.js      # Compact contract compiler script
│   └── build-esm-contract.js    # ESM transpilation bridge for WebAssembly
├── src/
│   ├── __tests__/
│   │   ├── crypto.test.ts       # Cryptography engine tests (round-trip, wrong password, tampering)
│   │   ├── steganography.test.ts# Capacity & bitstream tests
│   │   ├── file-utils.test.ts   # File validation & ZIP bundling tests
│   │   ├── compact-contract.test.ts # Compact runtime constructor & circuit tests
│   │   └── contract-workflow.test.ts # Midnight contract utility tests
│   ├── components/
│   │   ├── ContractDeployment.tsx# Midnight contract deployment state machine
│   │   ├── VaultPanel.tsx       # Local encryption & LSB sealing panel
│   │   ├── KeyPanel.tsx         # On-chain verification & recovery panel
│   │   ├── TerminalLog.tsx      # Cyberpunk audit terminal
│   │   └── Wallet.tsx           # 1AM Wallet status component
│   ├── context/
│   │   └── WalletContext.tsx    # 1AM Wallet & Midnight provider state
│   ├── hooks/
│   │   └── use1AMWallet.ts      # 1AM Wallet convenience hook
│   ├── pages/
│   │   ├── LandingPage.tsx      # Marketing & overview page
│   │   └── VaultApp.tsx         # Main application dashboard
│   ├── utils/
│   │   ├── crypto.ts            # PBKDF2 + AES-256-GCM engine
│   │   ├── midnightContract.ts  # Contract deployment, ledger query, and commitment services
│   │   ├── midnightTx.ts        # Midnight DApp Connector providers
│   │   ├── file-utils.ts        # MIME validation & lossless ZIP bundling
│   │   └── steganography.ts     # PNG LSB embed / extract engine
│   ├── App.tsx                  # Application routing
│   ├── index.css                # Cyberpunk design system
│   └── main.tsx                 # Application entry point
├── package.json                 # Project configuration and scripts
├── tsconfig.json                # TypeScript compiler configuration
└── README.md                    # Project documentation
```

---

## 📄 License

MIT License. Open source and client-side verifiable.

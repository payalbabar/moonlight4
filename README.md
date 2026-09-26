# 🔐 StegoVault

[![CI](https://github.com/payalbabar/moonlight4/actions/workflows/ci.yml/badge.svg)](https://github.com/payalbabar/moonlight4/actions)
[![Midnight Preprod](https://img.shields.io/badge/Midnight-Preprod-blue)](https://midnight.network)
[![1AM Wallet](https://img.shields.io/badge/Wallet-1AM%20Wallet-purple)](https://1am.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Client-Side Steganographic Cold Storage — Powered by Midnight Network & 1AM Wallet**

StegoVault allows users to:
1. Encrypt confidential credentials (seed phrases, private keys) locally with **AES-256-GCM** (PBKDF2-SHA256, 100k iterations)
2. Record a non-sensitive cryptographic commitment on the **Midnight Network** via the **1AM Wallet** and a **Compact smart contract**
3. Hide the encrypted payload inside ordinary PNG pixels using **lossless LSB steganography**

Everything runs 100% in your browser — no servers, no trackers, no data retention.

---

## 🌐 Level 4 Submission

| Resource | Value / Link |
| :--- | :--- |
| **Midnight Network** | `Midnight Preprod` |
| **Contract Address** | `4e9c2ba9d62afedc8c618a2f439d489825cb00692db56b0347357a2f756f5b1b` |
| **GitHub Repository** | [https://github.com/payalbabar/moonlight4](https://github.com/payalbabar/moonlight4) |
| **Product X (Twitter) Profile** | [@StegoVaultWeb3](https://x.com/StegoVaultWeb3) |
| **Launch Announcement** | [View Post on X](https://x.com/StegoVaultWeb3/status/2098807487545942205?s=20) |
| **User Guide** | [docs/USAGE.md](docs/USAGE.md) |
| **Demo Script** | [docs/demo.md](docs/demo.md) |

---

## ✅ Level 4 Submission Checklist

| Requirement | Status | Proof |
| :--- | :---: | :--- |
| **Working MVP on Preprod** | ✅ | In-app deployment panel deploys the Compact contract to Midnight Preprod |
| **Contract Address** | ✅ | `4e9c2ba9d62afedc8c618a2f439d489825cb00692db56b0347357a2f756f5b1b` |
| **README Documentation** | ✅ | This file |
| **Setup Guide** | ✅ | [docs/deployment.md](docs/deployment.md) |
| **Usage Guide** | ✅ | [docs/USAGE.md](docs/USAGE.md) |
| **CI/CD Pipeline** | ✅ | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) · [![CI](https://github.com/payalbabar/moonlight4/actions/workflows/ci.yml/badge.svg)](https://github.com/payalbabar/moonlight4/actions) |
| **Product X Profile** | ✅ | [@StegoVaultWeb3](https://x.com/StegoVaultWeb3) |
| **Launch Announcement Post** | ✅ | [View Post on X](https://x.com/StegoVaultWeb3/status/2098807487545942205?s=20) |
| **Demo Video** | ✅ | [Linked in X post](https://x.com/StegoVaultWeb3/status/2098807487545942205?s=20) |
| **Minimum 15 Commits** | ✅ | 21+ meaningful commits |

---

## 🔐 Contract Configuration

StegoVault uses a single source of truth for contract configuration at:

```
src/config/contract.ts
```

This file:
- Reads `VITE_CONTRACT_ADDRESS` from the environment and validates it against the Midnight address format (`0200` + 64 hex chars)
- Reads `VITE_1AM_NETWORK`, `VITE_MIDNIGHT_INDEXER_URL`, `VITE_MIDNIGHT_NODE_URL`, `VITE_MIDNIGHT_PROVER_URL`
- Exports a single `CONTRACT_CONFIG` object consumed by `ContractDeployment.tsx`
- No component hardcodes a contract address

**To supply a pre-deployed address:**
```bash
# .env
VITE_CONTRACT_ADDRESS=4e9c2ba9d62afedc8c618a2f439d489825cb00692db56b0347357a2f756f5b1b
```

The confirmed contract address for this submission is:
```
4e9c2ba9d62afedc8c618a2f439d489825cb00692db56b0347357a2f756f5b1b
```

If `VITE_CONTRACT_ADDRESS` is not set or is invalid, the app uses the in-app deployment panel to deploy the contract at runtime via 1AM Wallet. The resulting address is persisted in `localStorage` for the session.

---

## 🏗️ Architecture

```
                    ┌─────────────────────────────┐
                    │        1AM Wallet           │
                    │  (Midnight DApp Connector)  │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   Compact Smart Contract    │
                    │   (Midnight Preprod)        │
                    │   vault_id + SHA-256 hash   │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │    Local Cryptography       │
                    │  PBKDF2 (100k) + AES-256    │
                    │  (100% in browser memory)   │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   PNG LSB Steganography     │
                    │   (Blue-channel injection)  │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   stegovault_secure.zip     │
                    │   (Lossless STORE bundle)   │
                    └─────────────────────────────┘
```

---

## 🔒 Privacy Model

| What | Location | Sensitive? |
| :--- | :--- | :--- |
| Plaintext secret / seed phrase | Browser memory only | 🔴 PRIVATE |
| PBKDF2 key / AES-256 key / IV | Browser memory only | 🔴 PRIVATE |
| PNG pixel buffer (raw) | Browser memory only | 🔴 PRIVATE |
| AES-GCM ciphertext | Embedded in PNG LSBs | 🟡 Encrypted |
| `vault_id` (32-byte random) | On-chain (Midnight) | 🟢 Non-sensitive |
| `content_hash` (SHA-256 of ciphertext) | On-chain (Midnight) | 🟢 Non-sensitive |

---

## ✨ Key Features

- **Exclusive 1AM Wallet Integration** — Built for Midnight Preprod using the official DApp Connector API (`window.midnight["1am"]`)
- **Compact Smart Contract** — Privacy-first contract (`contracts/stegovault.compact`) recording 32-byte vault IDs + SHA-256 commitments on-chain
- **Contract Config Single Source of Truth** — `src/config/contract.ts` manages all contract configuration; no hardcoded addresses in components
- **In-App Deployment State Machine** — Full deployment flow with step-by-step progress in `ContractDeployment.tsx`
- **Client-Side AES-256-GCM** — Hardware-accelerated Web Crypto API (PBKDF2 100k + AES-256-GCM authenticated encryption)
- **Lossless LSB Steganography** — Blue-channel pixel injection with 32-bit length header
- **Strict Format Validation** — Rejects JPEG, WebP, lossy formats; packages vaults as uncompressed `STORE` ZIP bundles
- **Wallet Identity Binding** — Verifies unlocking wallet against creator identity before allowing decryption
- **Toast Notifications** — Real-time non-intrusive feedback for all vault operations
- **Responsive Design** — Intentional layouts for desktop, tablet, and mobile

---

## 🔒 Security Specifications

| Component | Standard | Parameters |
| :--- | :--- | :--- |
| **Identity & Authorization** | Midnight DApp Connector | 1AM Wallet Preprod (`signData` / `makeTransfer`) |
| **Smart Contract** | Midnight Compact 0.25 | `record_vault` circuit with explicit disclosures |
| **Key Derivation** | PBKDF2-HMAC-SHA256 | 100,000 iterations, 16-byte random salt |
| **Symmetric Encryption** | AES-256-GCM | 256-bit key, 12-byte random IV, authenticated tag |
| **Commitment Digest** | SHA-256 | 256-bit content hash of ciphertext |
| **Steganography** | LSB (Least Significant Bit) | Blue-channel pixel injection, 32-bit uint32 length header |
| **Packaging** | JSZip (STORE mode) | Lossless PNG + cold-storage instructions |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (v20+ recommended)
- 1AM Wallet browser extension from [1am.xyz](https://1am.xyz) configured for Midnight Preprod
- Docker (optional, for recompiling the Compact contract)

### Installation

```bash
# Clone
git clone https://github.com/payalbabar/moonlight4.git
cd moonlight4

# Install dependencies
npm install

# Copy env config
cp .env.example .env

# Start dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

### Environment Variables

```bash
# .env
VITE_1AM_NETWORK=preprod
VITE_MIDNIGHT_INDEXER_URL=https://indexer.preprod.midnight.network/api/v1/graphql
VITE_MIDNIGHT_NODE_URL=https://rpc.preprod.midnight.network
VITE_MIDNIGHT_PROVER_URL=http://localhost:6300

# Optional: provide a different contract address (64-char hex or 0200+64-char Midnight format)
# VITE_CONTRACT_ADDRESS=<your-address-here>
```

---

## 🧪 Testing

```bash
# Run all 31 unit & integration tests
npm test

# Lint
npm run lint

# TypeScript type check + production build
npm run build
```

Test files:
- `src/__tests__/crypto.test.ts` — PBKDF2 + AES-256-GCM round-trip, wrong password, tamper detection
- `src/__tests__/steganography.test.ts` — LSB capacity, bitstream embed/extract
- `src/__tests__/file-utils.test.ts` — MIME validation, ZIP bundling
- `src/__tests__/compact-contract.test.ts` — Compact runtime constructor, `record_vault` circuit, ledger state
- `src/__tests__/contract-workflow.test.ts` — Midnight contract utility functions

---

## 📁 Repository Structure

```
stegovault/
├── .github/workflows/ci.yml       # CI: lint, test, type-check, build
├── contracts/stegovault.compact   # Midnight Compact smart contract source
├── docs/
│   ├── USAGE.md                   # User guide & troubleshooting
│   ├── demo.md                    # Reviewer demo walkthrough
│   ├── architecture.md            # Technical architecture
│   ├── security.md                # Security model
│   └── deployment.md              # Deployment & setup guide
├── scripts/
│   ├── compile-contract.js        # Compact contract compiler
│   └── build-esm-contract.js      # ESM transpilation bridge
├── src/
│   ├── config/
│   │   └── contract.ts            # ← SINGLE SOURCE OF TRUTH for contract config
│   ├── __tests__/                 # 31 automated tests
│   ├── components/
│   │   ├── ContractDeployment.tsx # Deployment state machine
│   │   ├── VaultPanel.tsx         # Encrypt & seal
│   │   ├── KeyPanel.tsx           # Verify & unlock
│   │   ├── TerminalLog.tsx        # Audit terminal
│   │   ├── Toast.tsx              # Toast notification system
│   │   └── Wallet.tsx             # 1AM Wallet connector
│   ├── context/WalletContext.tsx  # 1AM Wallet state & providers
│   ├── hooks/use1AMWallet.ts      # 1AM Wallet hook
│   ├── pages/
│   │   ├── LandingPage.tsx        # Product marketing page
│   │   └── VaultApp.tsx           # Main application dashboard
│   ├── utils/
│   │   ├── crypto.ts              # PBKDF2 + AES-256-GCM engine
│   │   ├── midnightContract.ts    # Contract deployment & commitment services
│   │   ├── midnightTx.ts          # Midnight DApp Connector providers
│   │   ├── file-utils.ts          # MIME validation & ZIP bundling
│   │   └── steganography.ts       # PNG LSB embed / extract engine
│   ├── App.tsx                    # Routing
│   ├── index.css                  # Design system & component styles
│   └── main.tsx                   # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📄 License

MIT License. Open source and client-side verifiable.

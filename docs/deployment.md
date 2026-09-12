# StegoVault Deployment & Setup Guide

This guide covers local environment setup, Compact smart contract compilation, 1AM Wallet configuration, and deploying StegoVault on Midnight Preprod.

---

## 1. Prerequisites

- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **Package Manager:** npm (v9+)
- **Docker:** (Optional but recommended for Compact contract compilation via `midnightnetwork/compactc:latest`)
- **1AM Wallet:** Chrome / Brave browser extension (available from [1am.xyz](https://1am.xyz))

---

## 2. Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/YOUR_GITHUB_USERNAME/stegovault.git
cd stegovault

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Compile Compact Smart Contract
npm run contract:compile

# 5. Start development server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 3. Compact Smart Contract Compilation

StegoVault utilizes the Compact smart contract language (`contracts/stegovault.compact`).

To compile the contract into TypeScript bindings and ZKIR circuit representations:

```bash
npm run contract:compile
# Or alias:
npm run compact
```

This executes `scripts/compile-contract.js`, which mounts `contracts/` into the official `midnightnetwork/compactc` Docker image, runs the compiler with `--skip-zk`, and outputs the artifacts into `src/contracts/compiled/`.

---

## 4. 1AM Wallet Configuration

1. Install the **1AM Wallet** extension in Chrome or Brave.
2. Open the 1AM Wallet and switch to the **Midnight Preprod** network.
3. Ensure the wallet has synced to 100%.
4. If testing on Preprod, obtain test tokens from the official Midnight Preprod faucet if required.

---

## 5. Smart Contract Deployment on Midnight Preprod

1. Navigate to `http://localhost:5173/app`.
2. Click **⚡ CONNECT 1AM WALLET** in the top panel and approve in the 1AM extension.
3. In the **STEGOVAULT CONTRACT** panel, verify your connected address and network (`PREPROD`).
4. Click **🚀 DEPLOY STEGOVAULT CONTRACT**.
5. Approve the deployment transaction in your 1AM Wallet popup.
6. The state machine will progress:
   - `PREPARING DEPLOYMENT…`
   - `WAITING FOR 1AM WALLET…`
   - `PROVING…`
   - `SUBMITTING…`
   - `CONFIRMING…`
   - `✓ CONTRACT DEPLOYED`
7. The real contract address will be displayed and persisted in `localStorage` for future sessions.

---

## 6. Building for Production

```bash
# Type check and build bundle
npm run build

# Output will be generated in dist/
```

Deploy the `dist/` directory to any static web host (Vercel, Netlify, GitHub Pages, IPFS, or Cloudflare Pages).

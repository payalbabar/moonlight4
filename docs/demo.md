# StegoVault Judge & Reviewer Demo Script

Follow this step-by-step walkthrough to test and evaluate StegoVault end-to-end.

---

## Prerequisites
- Node.js installed (`npm install && npm run dev`)
- 1AM Wallet extension installed and set to Midnight Preprod

---

## Step 1: Open the Application & Connect 1AM Wallet
1. Navigate to `http://localhost:5173`.
2. Inspect the Landing Page: three security layers, architecture explanation, and Midnight Network badges.
3. Click **⚡ CONNECT 1AM WALLET** (or **LAUNCH STEGOVAULT** &rarr; go to `/app`).
4. Approve the connection in 1AM Wallet.
5. Notice the wallet status badge changes to `CONNECTED` showing your shortened Midnight address and network `PREPROD`.

---

## Step 2: Deploy / Verify Compact Smart Contract
1. In the **STEGOVAULT CONTRACT** panel on `/app`, view the network (`PREPROD`) and wallet address.
2. Click **🚀 DEPLOY STEGOVAULT CONTRACT**.
3. Confirm the deployment in your 1AM Wallet popup.
4. Watch the live state machine progress:
   `PREPARING` &rarr; `WAITING FOR 1AM WALLET` &rarr; `PROVING` &rarr; `SUBMITTING` &rarr; `CONFIRMING` &rarr; `✓ CONTRACT DEPLOYED`.
5. Observe the verified contract address and deployment transaction ID.
6. Click **📋 Copy Address** to verify the clipboard integration.

---

## Step 3: Create & Seal a Steganographic Vault
1. In **THE VAULT** panel:
   - Drag and drop a lossless PNG image (e.g. `test.png`).
   - Enter a test seed phrase (e.g. `apple banana cherry dog elephant fox grape horse igloo jaguar kite lemon`).
   - Enter an encryption password: `TestPassword123!`.
   - Confirm the password: `TestPassword123!`.
2. Click **🔐 SEAL THE VAULT**.
3. The live terminal displays:
   - `[CRYPTO] PBKDF2 key derivation (100,000 iterations)…`
   - `[CRYPTO] AES-256-GCM encryption…`
   - `[HASH] Content commitment hash: …`
   - `[MIDNIGHT] Submitting vault commitment to Midnight Preprod…`
4. Approve the transaction in your 1AM Wallet popup.
5. Upon confirmation:
   - `[STEGO] Injecting encrypted payload into blue-channel LSBs…`
   - `[ZIP] Creating secure bundle…`
   - `[SUCCESS] VAULT SEALED ✓`
6. `stegovault_secure.zip` automatically downloads.

---

## Step 4: Inspect the Downloaded Bundle
1. Extract `stegovault_secure.zip`.
2. Inspect `README.txt`: contains security guidelines, 1AM Wallet requirements, and zero secret leakage.
3. Inspect `vault.png`: looks identical to the original image.

---

## Step 5: Test Secret Recovery (The Key)
1. In **THE KEY** panel:
   - Drag and drop the extracted `vault.png`.
   - Notice the metadata badge displays: Bound Wallet, Creation Date, and Contract reference.
   - Enter the password: `TestPassword123!`.
2. Click **🔓 UNLOCK THE VAULT**.
3. Watch the terminal verify wallet identity, query on-chain commitment, and decrypt locally.
4. The recovered seed phrase appears in the secure reveal box.
5. Click **📋 Copy** to copy the secret.

---

## Step 6: Negative Tests (Security Verification)
1. **Wrong Password Test:**
   - Enter `WrongPassword999!` and click Unlock.
   - Decryption fails safely with `[CRYPTO] DECRYPTION FAILED: Decryption failed – wrong password or corrupted data.`
2. **Lossy File Rejection Test:**
   - Try dropping a `.jpg` or `.webp` file.
   - The application immediately rejects the file with an explicit warning explaining that lossy compression destroys steganographic data.
3. **Wallet Mismatch Test:**
   - If connected with a different 1AM Wallet, the application detects the mismatch, displays `1AM WALLET MISMATCH`, and safely prevents unauthorized decryption.

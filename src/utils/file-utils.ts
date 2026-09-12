/**
 * StegoVault – File Handling Utilities
 *
 *  • MIME-type validation (reject JPEG / WebP)
 *  • ZIP bundling via JSZip
 *  • Safe blob download with memory cleanup
 */

import JSZip from "jszip";

// ──────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────

const ALLOWED_TYPES = ["image/png"];
const REJECTED_TYPES = ["image/jpeg", "image/jpg", "image/webp"];

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate that the uploaded file is a lossless PNG.
 */
export function validateImageFile(file: File): ValidationResult {
    if (REJECTED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `"${file.name}" is a ${file.type.split("/")[1].toUpperCase()} file. JPEG and WebP use lossy compression that DESTROYS hidden data. Please use a lossless PNG image.`,
        };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Unsupported file type "${file.type}". Only lossless PNG images are accepted.`,
        };
    }
    return { valid: true };
}

// ──────────────────────────────────────────────
// ZIP Bundle
// ──────────────────────────────────────────────

const README_CONTENT = `══════════════════════════════════════════════════════════
  STEGOVAULT — SECURE COLD STORAGE INSTRUCTIONS
══════════════════════════════════════════════════════════

🔐 1. ENCRYPTION & 1AM WALLET BINDING
  • Your secret is encrypted locally with AES-256-GCM (256-bit).
  • Key derivation used PBKDF2 with 100,000 iterations.
  • The vault is cryptographically bound to your 1AM Wallet.
  • The blockchain / wallet signature ONLY authorizes the vault;
    it NEVER receives or contains your secret or password.

⚠️ 2. IMAGE PRESERVATION RULES:
  • DO NOT convert vault.png to JPEG, WebP, or AVIF.
  • DO NOT re-compress, resize, crop, or filter vault.png.
  • DO NOT open vault.png in an image editor and re-save it.
  • Lossy compression PERMANENTLY DESTROYS the steganographic data.

✅ 3. SAFE ACTIONS:
  • Copy vault.png as-is to cold USB storage, SD card, or email.
  • Rename the file (keep the .png extension).
  • Store alongside ordinary photos for plausible deniability.

🔓 4. RECOVERY REQUIREMENTS:
  To unlock and recover your secret:
  1. Open StegoVault in your browser.
  2. Connect the SAME 1AM Wallet used to seal the vault.
  3. Authorize the unlock request in 1AM Wallet.
  4. Enter your original encryption password.
  5. Recover your seed phrase or secret data.

Keep your password safe. There is no password recovery.
══════════════════════════════════════════════════════════
`;

/**
 * Bundle a PNG Blob into a ZIP alongside a README.
 */
export async function createZipBundle(
    imageBlob: Blob,
    onLog?: (msg: string) => void
): Promise<Blob> {
    onLog?.("[ZIP] Creating secure bundle…");
    const zip = new JSZip();
    const buffer = await imageBlob.arrayBuffer();
    zip.file("vault.png", buffer);
    zip.file("README.txt", README_CONTENT);

    onLog?.("[ZIP] Compressing archive (STORE mode – zero lossy compression)…");
    const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "STORE", // no compression – protect pixel data
    });

    onLog?.("[ZIP] ZIP bundle ready ✓");
    return zipBlob;
}

// ──────────────────────────────────────────────
// Download
// ──────────────────────────────────────────────

/**
 * Trigger a browser download for a Blob, then revoke the object URL.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Prevent memory leaks
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

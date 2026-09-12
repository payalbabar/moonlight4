import { describe, it, expect } from "vitest";
import {
  encryptData,
  decryptData,
  parseVaultPayload,
  buildStegoVaultPayloadString,
  type VaultMetadata,
} from "../utils/crypto";

describe("StegoVault Cryptography Engine", () => {
  const sampleSecret = "correct horse battery staple 12-word seed phrase test";
  const password = "SuperSecretPassword123!";

  it("should encrypt and decrypt a secret successfully (round-trip)", async () => {
    const encrypted = await encryptData(sampleSecret, password);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();

    const decrypted = await decryptData(encrypted, password);
    expect(decrypted).toBe(sampleSecret);
  });

  it("should fail decryption when using the wrong password", async () => {
    const encrypted = await encryptData(sampleSecret, password);
    await expect(
      decryptData(encrypted, "WrongPassword999!")
    ).rejects.toThrow(/Decryption failed/i);
  });

  it("should fail decryption when ciphertext is tampered (AES-GCM auth tag verification)", async () => {
    const encrypted = await encryptData(sampleSecret, password);
    // Tamper with base64 ciphertext
    const tampered = {
      ...encrypted,
      ciphertext: "AAAA" + encrypted.ciphertext.slice(4),
    };

    await expect(
      decryptData(tampered, password)
    ).rejects.toThrow(/Decryption failed/i);
  });

  it("should generate distinct salts and IVs for identical plaintext", async () => {
    const enc1 = await encryptData(sampleSecret, password);
    const enc2 = await encryptData(sampleSecret, password);

    expect(enc1.salt).not.toBe(enc2.salt);
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it("should serialize and parse StegoVault V1 payload with metadata", async () => {
    const encrypted = await encryptData(sampleSecret, password);
    const metadata: VaultMetadata = {
      version: 1,
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: "preprod",
      vaultId: "test-vault-uuid",
      createdAt: new Date().toISOString(),
      authorizationType: "onchain",
      txHash: "0xabcdef1234567890",
      contractAddress: "0xcontractaddress123",
    };

    const payloadString = buildStegoVaultPayloadString(encrypted, metadata);
    expect(payloadString).toContain("STEGOVAULT_V1");

    const parsed = parseVaultPayload(payloadString);
    expect(parsed.metadata).toEqual(metadata);
    expect(parsed.cryptoPayload).toEqual(encrypted);

    const decrypted = await decryptData(parsed.cryptoPayload, password);
    expect(decrypted).toBe(sampleSecret);
  });

  it("should reject corrupted or malformed payload strings", () => {
    expect(() => parseVaultPayload("not-json-at-all")).toThrow();
    expect(() => parseVaultPayload(JSON.stringify({ invalid: true }))).toThrow(/Invalid vault format/i);
  });
});

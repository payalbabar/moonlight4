import { describe, it, expect, beforeEach } from "vitest";
import {
  toBytes32,
  bytesToHex,
  computeSHA256,
  saveContract,
  getSavedContract,
  clearSavedContract,
  type DeployedContractInfo,
} from "../utils/midnightContract";

describe("Midnight Contract & Commitment Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should convert strings to 32-byte Uint8Array and back", () => {
    const uuid = "e461f364-884f-4d32-84b2-a42f61a7a40b";
    const bytes = toBytes32(uuid);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(32);

    const hex = bytesToHex(bytes);
    expect(hex.length).toBe(64);
  });

  it("should handle 64-char hex strings accurately in toBytes32", () => {
    const rawHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const bytes = toBytes32(rawHex);
    expect(bytes.length).toBe(32);
    expect(bytesToHex(bytes)).toBe(rawHex);
  });

  it("should compute accurate SHA-256 digests", async () => {
    const input = "StegoVault test payload for commitment";
    const hash = await computeSHA256(input);
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);

    const hash2 = await computeSHA256(input);
    expect(hash).toBe(hash2);
  });

  it("should persist, retrieve, and clear deployed contract records", () => {
    const contractInfo: DeployedContractInfo = {
      address: "0200abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      network: "preprod",
      txId: "midnight-tx-12345",
      deployedAt: new Date().toISOString(),
      deployerAddress: "02001111222233334444555566667777888899990000111122223333444455556666",
      onChain: false,
    };

    expect(getSavedContract("preprod")).toBeNull();

    saveContract(contractInfo);
    const retrieved = getSavedContract("preprod");
    expect(retrieved).toEqual(contractInfo);

    clearSavedContract("preprod");
    expect(getSavedContract("preprod")).toBeNull();
  });
});

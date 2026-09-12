import { describe, it, expect } from "vitest";
import {
  computeInitialContractState,
  executeRecordVaultCircuit,
  inspectVaultLedger,
  dummyContractAddress,
  sampleContractAddress,
  encodeContractAddress,
  decodeContractAddress,
} from "../contracts/stegovaultContract";

describe("Real Midnight Compact Contract Execution", () => {
  it("computes initial contract state and initializes an empty ledger", () => {
    const { contractState, stateValue } = computeInitialContractState();
    expect(contractState).toBeDefined();
    expect(stateValue).toBeDefined();

    const ledger = inspectVaultLedger(stateValue);
    expect(ledger.vault_commitments).toBeDefined();
    expect(ledger.vault_commitments.isEmpty()).toBe(true);
    expect(ledger.vault_commitments.size()).toBe(0n);
  });

  it("executes the record_vault circuit and updates ledger state", () => {
    const { contractState } = computeInitialContractState();

    const vaultId = new Uint8Array(32);
    vaultId[0] = 0xaa;
    vaultId[31] = 0xbb;

    const contentHash = new Uint8Array(32);
    contentHash[0] = 0x11;
    contentHash[31] = 0x22;

    const { updatedState, updatedContractState, proofData } = executeRecordVaultCircuit(
      contractState,
      vaultId,
      contentHash
    );

    expect(updatedState).toBeDefined();
    expect(updatedContractState).toBeDefined();
    expect(proofData).toBeDefined();
    expect(proofData.publicTranscript.length).toBeGreaterThan(0);

    const ledger = inspectVaultLedger(updatedState);
    expect(ledger.vault_commitments.isEmpty()).toBe(false);
    expect(ledger.vault_commitments.size()).toBe(1n);
    expect(ledger.vault_commitments.member(vaultId)).toBe(true);

    const lookupResult = ledger.vault_commitments.lookup(vaultId);
    expect(lookupResult).toBeInstanceOf(Uint8Array);
    expect(lookupResult.length).toBe(32);
    expect(lookupResult[0]).toBe(0x11);
    expect(lookupResult[31]).toBe(0x22);
  });

  it("handles multiple vault records in the contract ledger", () => {
    let { contractState } = computeInitialContractState();

    for (let i = 0; i < 3; i++) {
      const vId = new Uint8Array(32);
      vId[0] = i + 1;
      const cHash = new Uint8Array(32);
      cHash[0] = 0xf0 + i;

      const result = executeRecordVaultCircuit(contractState, vId, cHash);
      contractState = result.updatedContractState;
    }

    const ledger = inspectVaultLedger(contractState.data);
    expect(ledger.vault_commitments.size()).toBe(3n);

    // Verify all 3 are queryable
    for (let i = 0; i < 3; i++) {
      const vId = new Uint8Array(32);
      vId[0] = i + 1;
      expect(ledger.vault_commitments.member(vId)).toBe(true);
      const val = ledger.vault_commitments.lookup(vId);
      expect(val[0]).toBe(0xf0 + i);
    }
  });

  it("handles Midnight contract addresses correctly", () => {
    const dummy = dummyContractAddress();
    expect(dummy.startsWith("0200")).toBe(true);
    expect(dummy.length).toBe(68);

    const sample = sampleContractAddress();
    expect(sample.startsWith("0200")).toBe(true);
    expect(sample.length).toBe(68);

    const encoded = encodeContractAddress(sample);
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.length).toBe(32);

    const decoded = decodeContractAddress(encoded);
    expect(decoded).toBe(sample);
  });
});

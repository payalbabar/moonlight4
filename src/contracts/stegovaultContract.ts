/**
 * StegoVault — Midnight Compact Contract Integration Layer
 *
 * Direct integration with compiled Midnight Compact bytecode and Compact runtime.
 * Executes contract constructor, circuit evaluation (`record_vault`),
 * ledger state decoding, and address encoding.
 */

import { Contract, ledger } from "./compiled/contract/index.js";
import {
  ContractState,
  QueryContext,
  dummyContractAddress,
  sampleContractAddress,
  encodeContractAddress,
  decodeContractAddress,
  StateValue,
} from "./runtime/compactRuntime.ts";

export interface StegoVaultContractInstance {
  initialState: (context: {
    initialPrivateState: unknown;
    initialZswapLocalState: unknown;
  }) => {
    currentContractState: ContractState;
    currentPrivateState: unknown;
    currentZswapLocalState: unknown;
  };
  circuits: {
    record_vault: (
      context: {
        originalState: ContractState;
        currentPrivateState: unknown;
        currentZswapLocalState: unknown;
        transactionContext: QueryContext;
      },
      vaultId: Uint8Array,
      contentHash: Uint8Array
    ) => {
      result: unknown[];
      context: {
        originalState: ContractState;
        currentPrivateState: unknown;
        currentZswapLocalState: unknown;
        transactionContext: QueryContext;
      };
      proofData: {
        input: { value: unknown[]; alignment: unknown[] };
        output: { value: unknown[]; alignment: unknown[] };
        publicTranscript: unknown[];
        privateTranscriptOutputs: unknown[];
      };
    };
  };
}

export interface StegoVaultLedger {
  vault_commitments: {
    isEmpty: () => boolean;
    size: () => bigint;
    member: (key: Uint8Array) => boolean;
    lookup: (key: Uint8Array) => Uint8Array;
    [Symbol.iterator]: () => Iterator<[Uint8Array, Uint8Array]>;
  };
}

/**
 * Creates a new StegoVault contract instance targeting Midnight Compact runtime.
 */
export function getStegoVaultContract(): StegoVaultContractInstance {
  return new Contract({}) as StegoVaultContractInstance;
}

/**
 * Executes the contract constructor to produce the initial ledger state.
 */
export function computeInitialContractState(): {
  contractState: ContractState;
  stateValue: StateValue;
} {
  const contract = getStegoVaultContract();
  const initResult = contract.initialState({
    initialPrivateState: {},
    initialZswapLocalState: {},
  });
  return {
    contractState: initResult.currentContractState,
    stateValue: initResult.currentContractState.data,
  };
}

/**
 * Executes the `record_vault` circuit on Midnight VM, updating the ledger state
 * and generating the circuit execution transcript for on-chain submission.
 */
export function executeRecordVaultCircuit(
  currentState: ContractState,
  vaultId: Uint8Array,
  contentHash: Uint8Array
) {
  if (vaultId.length !== 32) {
    throw new Error(`vaultId must be exactly 32 bytes, received ${vaultId.length}`);
  }
  if (contentHash.length !== 32) {
    throw new Error(`contentHash must be exactly 32 bytes, received ${contentHash.length}`);
  }

  const contract = getStegoVaultContract();
  const circuitContext = {
    originalState: currentState,
    currentPrivateState: {},
    currentZswapLocalState: {},
    transactionContext: new QueryContext(currentState.data, dummyContractAddress()),
  };

  const result = contract.circuits.record_vault(circuitContext, vaultId, contentHash);
  const nextContractState = new ContractState();
  nextContractState.data = result.context.transactionContext.state;

  return {
    circuitResult: result.result,
    updatedState: result.context.transactionContext.state,
    updatedContractState: nextContractState,
    proofData: result.proofData,
  };
}

/**
 * Decodes the public ledger state of the StegoVault contract.
 */
export function inspectVaultLedger(state: StateValue): StegoVaultLedger {
  return ledger(state) as StegoVaultLedger;
}

export {
  dummyContractAddress,
  sampleContractAddress,
  encodeContractAddress,
  decodeContractAddress,
  ContractState,
  QueryContext,
  StateValue,
};

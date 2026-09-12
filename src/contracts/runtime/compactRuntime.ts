/**
 * Native ESM Compact Runtime Adapter for StegoVault & Midnight Network.
 *
 * Direct bridge to `@midnight-ntwrk/onchain-runtime` (WebAssembly VM)
 * with native ES module support for Vite, Vitest, and browser environments.
 */

import * as ocrt from "@midnight-ntwrk/onchain-runtime";

export * from "@midnight-ntwrk/onchain-runtime";

export const versionString = "0.8.1";

export const MAX_FIELD: bigint = ocrt.maxField();

export const DUMMY_ADDRESS: string = ocrt.dummyContractAddress();

export class CompactError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "CompactError";
  }
}

export function assert(b: boolean, s: string): void {
  if (!b) {
    throw new CompactError(`failed assert: ${s}`);
  }
}

export function type_error(
  who: string,
  what: string,
  where: string,
  type: string,
  x: unknown
): never {
  const repr = typeof x === "object" && x !== null ? JSON.stringify(x) : String(x);
  throw new CompactError(
    `type error: ${who} ${what} at ${where}; expected value of type ${type} but received ${repr}`
  );
}

export function alignedConcat(...values: ocrt.AlignedValue[]): ocrt.AlignedValue {
  const res: ocrt.AlignedValue = { value: [], alignment: [] };
  for (const value of values) {
    res.value = res.value.concat(value.value);
    res.alignment = res.alignment.concat(value.alignment);
  }
  return res;
}

export class CompactTypeField {
  alignment(): ocrt.Alignment {
    return [{ tag: "atom", value: { tag: "field" } }];
  }
  fromValue(value: Uint8Array[]): bigint {
    const val = value.shift();
    if (val === undefined) {
      throw new CompactError("expected Field");
    }
    return ocrt.valueToBigInt([val]);
  }
  toValue(value: bigint): Uint8Array[] {
    return ocrt.bigIntToValue(value);
  }
}

export class CompactTypeBoolean {
  alignment(): ocrt.Alignment {
    return [{ tag: "atom", value: { tag: "bytes", length: 1 } }];
  }
  fromValue(value: Uint8Array[]): boolean {
    const val = value.shift();
    if (val === undefined || val.length > 1 || (val.length === 1 && val[0] !== 1)) {
      throw new CompactError("expected Boolean");
    }
    return val.length === 1;
  }
  toValue(value: boolean): Uint8Array[] {
    if (value) {
      return [new Uint8Array([1])];
    }
    return [new Uint8Array(0)];
  }
}

export class CompactTypeBytes {
  length: number;
  constructor(length: number) {
    this.length = length;
  }
  alignment(): ocrt.Alignment {
    return [{ tag: "atom", value: { tag: "bytes", length: this.length } }];
  }
  fromValue(value: Uint8Array[]): Uint8Array {
    const val = value.shift();
    if (val === undefined || val.length > this.length) {
      throw new CompactError(`expected Bytes[${this.length}]`);
    }
    if (val.length === this.length) {
      return val;
    }
    const res = new Uint8Array(this.length);
    res.set(val, 0);
    return res;
  }
  toValue(value: Uint8Array): Uint8Array[] {
    let end = value.length;
    while (end > 0 && value[end - 1] === 0) {
      end -= 1;
    }
    return [value.slice(0, end)];
  }
}

export class CompactTypeUnsignedInteger {
  maxValue: bigint;
  length: number;
  constructor(maxValue: bigint, length: number) {
    this.maxValue = maxValue;
    this.length = length;
  }
  alignment(): ocrt.Alignment {
    return [{ tag: "atom", value: { tag: "bytes", length: this.length } }];
  }
  fromValue(value: Uint8Array[]): bigint {
    const val = value.shift();
    if (val === undefined) {
      throw new CompactError(`expected UnsignedInteger[<=${this.maxValue}]`);
    }
    let res = 0n;
    for (let i = 0; i < val.length; i++) {
      res += (1n << (8n * BigInt(i))) * BigInt(val[i]);
    }
    if (res > this.maxValue) {
      throw new CompactError(`expected UnsignedInteger[<=${this.maxValue}]`);
    }
    return res;
  }
  toValue(value: bigint): Uint8Array[] {
    return new CompactTypeField().toValue(value);
  }
}

export class CompactTypeVector<T> {
  length: number;
  type: {
    alignment: () => ocrt.Alignment;
    fromValue: (val: Uint8Array[]) => T;
    toValue: (val: T) => Uint8Array[];
  };
  constructor(length: number, type: { alignment: () => ocrt.Alignment; fromValue: (val: Uint8Array[]) => T; toValue: (val: T) => Uint8Array[] }) {
    this.length = length;
    this.type = type;
  }
  alignment(): ocrt.Alignment {
    const inner = this.type.alignment();
    let res: ocrt.Alignment = [];
    for (let i = 0; i < this.length; i++) {
      res = res.concat(inner);
    }
    return res;
  }
  fromValue(value: Uint8Array[]): T[] {
    const res: T[] = [];
    for (let i = 0; i < this.length; i++) {
      res.push(this.type.fromValue(value));
    }
    return res;
  }
  toValue(value: T[]): Uint8Array[] {
    if (value.length !== this.length) {
      throw new CompactError(`expected ${this.length}-element array`);
    }
    let res: Uint8Array[] = [];
    for (let i = 0; i < this.length; i++) {
      res = res.concat(this.type.toValue(value[i]));
    }
    return res;
  }
}

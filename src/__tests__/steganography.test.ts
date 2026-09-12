import { describe, it, expect } from "vitest";
import { maxCapacity } from "../utils/steganography";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a minimal RGBA flat ImageData-like Uint8ClampedArray
// We test the pure capacity math and bit-manipulation helpers in isolation.
// The full hide/extract round-trip involves the browser canvas API which
// cannot run in jsdom; those paths are covered by manual E2E testing.
// ─────────────────────────────────────────────────────────────────────────────

/** Simulate the 32-bit big-endian uint32 header encoding (replicates steganography.ts) */
function uint32ToBinary(n: number): string {
  return n.toString(2).padStart(32, "0");
}

function binaryToUint32(b: string): number {
  return parseInt(b, 2);
}

/** Simulate LSB bit injection into a flat RGBA array */
function injectBits(pixels: Uint8ClampedArray, bitstream: string): void {
  for (let i = 0; i < bitstream.length; i++) {
    const bit = parseInt(bitstream[i], 10);
    const blueIndex = i * 4 + 2; // B is index 2 in RGBA
    pixels[blueIndex] = (pixels[blueIndex] & 0xfe) | bit;
  }
}

/** Simulate LSB bit extraction from a flat RGBA array */
function extractBits(pixels: Uint8ClampedArray, numBits: number): string {
  let bits = "";
  for (let i = 0; i < numBits; i++) {
    const blueIndex = i * 4 + 2;
    bits += (pixels[blueIndex] & 1).toString();
  }
  return bits;
}

/** Text → binary string (UTF-8 encoding) */
function textToBinary(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, "0"))
    .join("");
}

/** Binary string → decoded text */
function binaryToText(binary: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < binary.length; i += 8) {
    bytes.push(parseInt(binary.slice(i, i + 8), 2));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

describe("Steganography: Capacity Calculations", () => {
  it("should calculate correct byte capacity for small pixel counts", () => {
    // 32 bits for header = 4 bytes overhead
    // 100 pixels = 100 bits - 32 bits = 68 bits → 8 bytes
    expect(maxCapacity(100)).toBe(8);

    // 1000x1000 pixels = 1,000,000 pixels = 999,968 bits = 124,996 bytes (~122 KB)
    expect(maxCapacity(1_000_000)).toBe(124_996);

    // 32 pixels = 0 payload bytes (only fits header)
    expect(maxCapacity(32)).toBe(0);

    // less than 32 pixels = negative/zero
    expect(maxCapacity(10)).toBeLessThanOrEqual(0);
  });

  it("should return correct capacity for typical image sizes", () => {
    // 800x600 = 480,000 pixels → (480,000 - 32) / 8 = 59,996 bytes
    expect(maxCapacity(800 * 600)).toBe(59_996);

    // 1920x1080 = 2,073,600 pixels → (2,073,600 - 32) / 8 = 259,196 bytes
    expect(maxCapacity(1920 * 1080)).toBe(259_196);

    // 256x256 = 65,536 pixels → (65,536 - 32) / 8 = 8,188 bytes
    expect(maxCapacity(256 * 256)).toBe(8_188);
  });

  it("should correctly indicate that capacity grows linearly with pixel count", () => {
    const c1 = maxCapacity(1000);
    const c2 = maxCapacity(2000);
    // doubling pixels should roughly double capacity
    expect(c2).toBeGreaterThan(c1);
    expect(c2 - c1).toBe(Math.floor(1000 / 8));
  });
});

describe("Steganography: Header Encoding & Decoding", () => {
  it("should encode and decode small message lengths correctly", () => {
    for (const n of [0, 1, 127, 255, 256, 1000, 65535, 100_000]) {
      const binary = uint32ToBinary(n);
      expect(binary.length).toBe(32);
      expect(binaryToUint32(binary)).toBe(n);
    }
  });

  it("should encode max uint32 value without truncation", () => {
    const max = 4_294_967_295; // 0xFFFFFFFF
    const binary = uint32ToBinary(max);
    expect(binary).toBe("11111111111111111111111111111111");
    expect(binaryToUint32(binary)).toBe(max);
  });

  it("should encode zero as 32 zero bits", () => {
    const binary = uint32ToBinary(0);
    expect(binary).toBe("00000000000000000000000000000000");
    expect(binaryToUint32(binary)).toBe(0);
  });
});

describe("Steganography: Bit Injection & Extraction (RGBA simulation)", () => {
  it("should inject and extract a single bit into Blue channel LSB", () => {
    // Create 4-byte RGBA pixel (1 pixel) with Blue = 0b11111110 (even)
    const pixels = new Uint8ClampedArray([255, 128, 254, 255]); // R, G, B=254, A
    // Inject bit '1' at position 0 (blueIndex = 2)
    injectBits(pixels, "1");
    expect(pixels[2] & 1).toBe(1); // LSB should be 1 now
    expect(pixels[2]).toBe(255); // 254 | 1 = 255

    // Inject bit '0' again
    injectBits(pixels, "0");
    expect(pixels[2] & 1).toBe(0);
    expect(pixels[2]).toBe(254); // 255 & 0xfe = 254
  });

  it("should preserve R, G, A channels when modifying Blue LSB", () => {
    const pixels = new Uint8ClampedArray([100, 200, 150, 255]);
    injectBits(pixels, "1");
    expect(pixels[0]).toBe(100); // R unchanged
    expect(pixels[1]).toBe(200); // G unchanged
    expect(pixels[3]).toBe(255); // A unchanged
    // B is 150 = 0b10010110 → with LSB=1 → 0b10010111 = 151
    expect(pixels[2]).toBe(151);
  });

  it("should correctly round-trip a text message through LSB injection and extraction", () => {
    const message = "StegoVault test payload 🔐";
    const msgBytes = new TextEncoder().encode(message);
    const msgByteLength = msgBytes.length;

    // Build bitstream: 32-bit header + message bits
    const headerBits = uint32ToBinary(msgByteLength);
    const msgBits = textToBinary(message);
    const bitstream = headerBits + msgBits;

    // Need at least (bitstream.length) pixels
    const numPixels = bitstream.length + 100; // extra headroom
    const pixels = new Uint8ClampedArray(numPixels * 4).fill(128); // grey RGBA

    // Inject
    injectBits(pixels, bitstream);

    // Extract length header
    const extractedHeaderBits = extractBits(pixels, 32);
    const extractedLength = binaryToUint32(extractedHeaderBits);
    expect(extractedLength).toBe(msgByteLength);

    // Extract message bits
    const rawMsgBits = extractBits(pixels.slice(32 * 4), extractedLength * 8);
    const recovered = binaryToText(rawMsgBits);
    expect(recovered).toBe(message);
  });

  it("should correctly inject known bit patterns and verify byte-level output", () => {
    // All zeros payload into pixels with B=255
    const pixels = new Uint8ClampedArray(8 * 4).fill(255); // 8 pixels, B=255
    const zeroBits = "00000000"; // 8 zero bits
    injectBits(pixels, zeroBits);

    for (let i = 0; i < 8; i++) {
      const blueIndex = i * 4 + 2;
      expect(pixels[blueIndex] & 1).toBe(0); // all B LSBs should be 0
      expect(pixels[blueIndex]).toBe(254); // 255 & 0xfe = 254
    }

    // All ones payload into pixels with B=0
    const pixels2 = new Uint8ClampedArray(8 * 4).fill(0); // B=0
    const oneBits = "11111111"; // 8 one bits
    injectBits(pixels2, oneBits);
    for (let i = 0; i < 8; i++) {
      const blueIndex = i * 4 + 2;
      expect(pixels2[blueIndex] & 1).toBe(1);
      expect(pixels2[blueIndex]).toBe(1); // 0 | 1 = 1
    }
  });

  it("should correctly encode and decode UTF-8 multibyte strings", () => {
    // Test with ASCII
    const ascii = "correct horse battery staple";
    const asciiBits = textToBinary(ascii);
    const recoveredAscii = binaryToText(asciiBits);
    expect(recoveredAscii).toBe(ascii);

    // Test with Unicode
    const unicode = "密码: abc123 🔑";
    const unicodeBits = textToBinary(unicode);
    const recoveredUnicode = binaryToText(unicodeBits);
    expect(recoveredUnicode).toBe(unicode);
  });
});

describe("Steganography: Edge Cases", () => {
  it("should handle empty string injection and extraction", () => {
    const msgBytes = new TextEncoder().encode("");
    const msgByteLength = msgBytes.length; // 0
    expect(msgByteLength).toBe(0);

    const headerBits = uint32ToBinary(0);
    expect(binaryToUint32(headerBits)).toBe(0);
  });

  it("should handle exactly capacity-sized payload without overflow", () => {
    const totalPixels = 100;
    const capacity = maxCapacity(totalPixels);
    expect(capacity).toBe(8);

    // Create an 8-byte payload (exactly at capacity)
    const payload = "12345678"; // 8 ASCII bytes
    const payloadBytes = new TextEncoder().encode(payload).length;
    expect(payloadBytes).toBeLessThanOrEqual(capacity);
  });
});

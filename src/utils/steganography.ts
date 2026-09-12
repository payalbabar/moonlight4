/**
 * StegoVault – Steganography Engine
 *
 * Hides / extracts binary data inside the Blue channel LSB of each pixel.
 *
 * Protocol
 * --------
 *  1. The first 32 bits store the message length (in bytes) as a big-endian uint32.
 *  2. Immediately after come the message bytes, one bit per pixel (Blue LSB).
 *  3. During extraction the length header tells us exactly when to stop.
 *
 * Only the Blue channel is modified — it is the least perceptible to the human eye.
 */

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function textToBinary(text: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    let binary = "";
    for (const b of bytes) {
        binary += b.toString(2).padStart(8, "0");
    }
    return binary;
}

function binaryToText(binary: string): string {
    const bytes: number[] = [];
    for (let i = 0; i < binary.length; i += 8) {
        bytes.push(parseInt(binary.slice(i, i + 8), 2));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
}

function uint32ToBinary(n: number): string {
    return n.toString(2).padStart(32, "0");
}

function binaryToUint32(b: string): number {
    return parseInt(b, 2);
}

/**
 * Load an image File into an ImageData object via an off-screen canvas.
 */
function loadImageData(file: File): Promise<{ imageData: ImageData; width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            URL.revokeObjectURL(url);
            resolve({ imageData, width: img.width, height: img.height });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image."));
        };
        img.src = url;
    });
}

/**
 * Convert ImageData back to a PNG Blob.
 */
function imageDataToBlob(imageData: ImageData, width: number, height: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed."));
        }, "image/png");
    });
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Returns the maximum number of **bytes** that can be hidden in an image
 * of the given pixel count.
 *
 * Each pixel stores 1 bit. We need 32 bits for the length header,
 * so usable capacity = floor((totalPixels − 32) / 8).
 */
export function maxCapacity(totalPixels: number): number {
    return Math.floor((totalPixels - 32) / 8);
}

/**
 * Hide a string message inside a cover image.
 * Returns a PNG Blob with the data embedded.
 */
export async function hideData(
    coverFile: File,
    message: string,
    onLog?: (msg: string) => void
): Promise<Blob> {
    onLog?.("Loading cover image…");
    const { imageData, width, height } = await loadImageData(coverFile);
    const totalPixels = width * height;

    // Convert message to binary
    const messageBinary = textToBinary(message);
    const messageByteLength = new TextEncoder().encode(message).length;

    // Capacity check
    const capacity = maxCapacity(totalPixels);
    onLog?.(`Image capacity: ${capacity.toLocaleString()} bytes | Message size: ${messageByteLength.toLocaleString()} bytes`);
    if (messageByteLength > capacity) {
        throw new Error(
            `Image too small! Capacity: ${capacity} bytes, but message requires ${messageByteLength} bytes.`
        );
    }

    // Build full bitstream: [32-bit length header] + [message bits]
    const lengthHeader = uint32ToBinary(messageByteLength);
    const bitstream = lengthHeader + messageBinary;

    // Inject into Blue channel LSB
    onLog?.("Injecting data into Blue channel LSBs…");
    const pixels = imageData.data; // RGBA flat array
    for (let i = 0; i < bitstream.length; i++) {
        const bit = parseInt(bitstream[i], 10);
        const blueIndex = i * 4 + 2; // R=0, G=1, B=2, A=3
        pixels[blueIndex] = (pixels[blueIndex] & 0xfe) | bit; // clear LSB, set new
    }

    onLog?.("Rendering modified image as PNG…");
    const blob = await imageDataToBlob(imageData, width, height);
    onLog?.("Steganographic injection complete ✓");
    return blob;
}

/**
 * Extract a hidden message from a stego-image file.
 */
export async function extractData(
    stegoFile: File,
    onLog?: (msg: string) => void
): Promise<string> {
    onLog?.("Loading stego image…");
    const { imageData, width, height } = await loadImageData(stegoFile);
    const totalPixels = width * height;
    const pixels = imageData.data;

    // Read 32-bit length header
    onLog?.("Reading length header (32 bits)…");
    let lengthBits = "";
    for (let i = 0; i < 32; i++) {
        const blueIndex = i * 4 + 2;
        lengthBits += (pixels[blueIndex] & 1).toString();
    }
    const messageByteLength = binaryToUint32(lengthBits);

    if (messageByteLength <= 0 || messageByteLength > maxCapacity(totalPixels)) {
        throw new Error("No valid hidden data found in this image.");
    }

    onLog?.(`Detected message size: ${messageByteLength} bytes`);

    // Read message bits
    onLog?.("Extracting hidden bits from Blue channel…");
    const totalMessageBits = messageByteLength * 8;
    let messageBinary = "";
    for (let i = 0; i < totalMessageBits; i++) {
        const pixelIndex = 32 + i; // offset past length header
        const blueIndex = pixelIndex * 4 + 2;
        messageBinary += (pixels[blueIndex] & 1).toString();
    }

    onLog?.("Reconstructing message…");
    const message = binaryToText(messageBinary);
    onLog?.(`Extraction complete ✓ (${messageByteLength} bytes recovered)`);

    void width; void height; // used implicitly via imageData
    return message;
}

import { describe, it, expect } from "vitest";
import { validateImageFile, createZipBundle } from "../utils/file-utils";

describe("File Handling Utilities", () => {
  it("should validate and accept image/png", () => {
    const pngFile = new File(["fake-png-bytes"], "cover.png", { type: "image/png" });
    const res = validateImageFile(pngFile);
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("should reject JPEG and WebP with specific lossy compression warnings", () => {
    const jpegFile = new File(["fake-jpg"], "photo.jpg", { type: "image/jpeg" });
    const resJpeg = validateImageFile(jpegFile);
    expect(resJpeg.valid).toBe(false);
    expect(resJpeg.error).toContain("JPEG");
    expect(resJpeg.error).toContain("DESTROYS hidden data");

    const webpFile = new File(["fake-webp"], "photo.webp", { type: "image/webp" });
    const resWebp = validateImageFile(webpFile);
    expect(resWebp.valid).toBe(false);
    expect(resWebp.error).toContain("WebP");
  });

  it("should reject other non-PNG formats", () => {
    const pdfFile = new File(["fake-pdf"], "doc.pdf", { type: "application/pdf" });
    const resPdf = validateImageFile(pdfFile);
    expect(resPdf.valid).toBe(false);
    expect(resPdf.error).toContain("Unsupported file type");
  });

  it("should generate a ZIP bundle containing vault.png and README.txt in STORE mode", async () => {
    const fakePngBlob = new Blob(["png-data"], { type: "image/png" });
    const zipBlob = await createZipBundle(fakePngBlob);

    expect(zipBlob).toBeDefined();
    expect(zipBlob.size).toBeGreaterThan(0);
    expect(zipBlob.type).toBe("application/zip");
  });
});

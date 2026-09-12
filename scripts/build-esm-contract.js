import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const cjsPath = path.join(rootDir, "src", "contracts", "compiled", "contract", "index.cjs");
const esmPath = path.join(rootDir, "src", "contracts", "compiled", "contract", "index.js");
const dtsPath = path.join(rootDir, "src", "contracts", "compiled", "contract", "index.d.ts");
const dctsPath = path.join(rootDir, "src", "contracts", "compiled", "contract", "index.d.cts");

if (fs.existsSync(cjsPath)) {
  let content = fs.readFileSync(cjsPath, "utf-8");
  
  // Replace require with import
  content = content.replace(
    /const __compactRuntime = require\(['"]@midnight-ntwrk\/compact-runtime['"]\);/,
    "import * as __compactRuntime from '../../runtime/compactRuntime.ts';"
  );
  
  // Replace CommonJS exports with ESM exports
  content = content.replace(/exports\.Contract\s*=\s*Contract;/, "");
  content = content.replace(/exports\.ledger\s*=\s*ledger;/, "");
  content = content.replace(/exports\.pureCircuits\s*=\s*pureCircuits;/, "");
  content = content.replace(/exports\.contractReferenceLocations\s*=\s*contractReferenceLocations;/, "");
  
  content += `
export { Contract, ledger, pureCircuits, contractReferenceLocations };
export default { Contract, ledger, pureCircuits, contractReferenceLocations };
`;
  
  fs.writeFileSync(esmPath, content, "utf-8");
  console.log("[StegoVault] Generated ESM contract module at:", esmPath);
}

if (fs.existsSync(dctsPath)) {
  fs.copyFileSync(dctsPath, dtsPath);
  console.log("[StegoVault] Copied type definitions to index.d.ts");
}

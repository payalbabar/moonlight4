import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const contractPath = path.join(rootDir, "contracts", "stegovault.compact");
const outDir = path.join(rootDir, "src", "contracts", "compiled");
const tempOutDir = path.join(rootDir, "contracts", "compiled");

console.log("[StegoVault] Compiling Compact contract: stegovault.compact...");

if (!fs.existsSync(contractPath)) {
  console.error(`[Error] Contract file not found: ${contractPath}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tempOutDir, { recursive: true });

let compiled = false;

// 1. Try Docker with midnightnetwork/compactc:latest
try {
  console.log("[StegoVault] Attempting compilation via Docker (midnightnetwork/compactc)...");
  // Normalize Windows paths for Docker volume mounting
  const contractsMount = path.resolve(rootDir, "contracts").replace(/\\/g, "/");
  const dockerCmd = `docker run --rm -v "${contractsMount}:/workspace" midnightnetwork/compactc:latest -c "compactc --skip-zk /workspace/stegovault.compact /workspace/compiled"`;
  
  execSync(dockerCmd, { stdio: "inherit" });
  compiled = true;
  console.log("[StegoVault] Docker compilation successful!");
} catch (dockerErr) {
  console.warn("[StegoVault] Docker compilation failed, trying native compactc...", dockerErr.message);
  
  // 2. Try native compactc if installed
  try {
    const nativeCmd = `compactc --skip-zk "${contractPath}" "${tempOutDir}"`;
    execSync(nativeCmd, { stdio: "inherit" });
    compiled = true;
    console.log("[StegoVault] Native compactc compilation successful!");
  } catch (nativeErr) {
    console.warn("[StegoVault] Native compactc not found or failed:", nativeErr.message);
  }
}

// Copy compiled output into src/contracts/compiled if generated in contracts/compiled
if (compiled && fs.existsSync(tempOutDir)) {
  fs.cpSync(tempOutDir, outDir, { recursive: true });
  console.log(`[StegoVault] Contract artifacts successfully copied to: ${outDir}`);
  execSync("node scripts/build-esm-contract.js", { stdio: "inherit" });
} else if (!compiled) {
  console.error("[StegoVault] Contract compilation failed. Please ensure Docker or compactc is available.");
  process.exit(1);
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    wasm(),
    tailwindcss(),
    react(),
  ],
  build: {
    target: "esnext",
  },
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
});

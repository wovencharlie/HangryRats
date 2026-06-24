import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  // @solana/web3.js expects a Node-ish global; map it to globalThis.
  define: {
    global: "globalThis",
  },
  server: {
    host: true, // expose on LAN so you can test on a phone
    port: 5173,
  },
  build: {
    target: "es2020",
    outDir: "dist",
    assetsInlineLimit: 0,
  },
});

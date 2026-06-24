import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: true, // expose on LAN so you can test on a phone
    port: 5173,
  },
  build: {
    target: "es2019",
    outDir: "dist",
    assetsInlineLimit: 0,
  },
});

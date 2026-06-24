// Minimal browser polyfills required by @solana/web3.js when bundled for the
// browser. Imported first in main.js, before any Solana code runs.
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  window.global = window.global || window;
  window.Buffer = window.Buffer || Buffer;
}

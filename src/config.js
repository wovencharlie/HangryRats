// Web3 / token-gate configuration shared by the client.
// The token mint and gate amount are fixed constants (see README). The RPC URL
// is read from a Vite build-time env var so it can be swapped for a reliable
// provider (e.g. Helius) without code changes; it falls back to the public RPC.

// NYCPR — Solana mainnet SPL token used to gate play.
export const NYCPR_MINT = "EPaAwfBi4TyaqvyteW3sgL3fZvQroCNkz9AN6Yiupump";
export const NYCPR_DECIMALS = 6;
export const NYCPR_LABEL = "NYCPR";

// Gate: must hold at least 1,000 NYCPR. With 6 decimals that's 1e9 base units.
export const GATE_AMOUNT_UI = 1000;
export const GATE_AMOUNT_BASE = 1_000_000_000; // 1000 * 10^6

// Public RPC endpoint. Override at build time with VITE_SOLANA_RPC_URL.
export const SOLANA_RPC_URL =
  (import.meta.env && import.meta.env.VITE_SOLANA_RPC_URL) ||
  "https://api.mainnet-beta.solana.com";

// Where players can view / acquire the token (shown on the "need NYCPR" gate).
export const TOKEN_LINK = "https://pump.fun/coin/" + NYCPR_MINT;
export const TOKEN_EXPLORER = "https://solscan.io/token/" + NYCPR_MINT;

// Wallet module — all Web3 logic lives here, kept out of the Phaser scenes.
//
// Public API:
//   isMobile()                -> boolean (no injected provider + touch UA)
//   getProvider()             -> the injected Solana provider, or null
//   phantomDeeplink()         -> https://phantom.app/ul/browse/... for mobile
//   connect()                 -> connects + signs a login message; returns pubkey
//   getPublicKey()            -> base58 string of the connected wallet (or null)
//   getNYCPRBalance(pubkey)   -> { base: bigint-ish number, ui: number }
//   meetsGate(pubkey)         -> boolean (>= 1000 NYCPR)
//   signMessage(text)         -> { signatureBase58, publicKey } over `text`
//   getLoginSignature()       -> the login signature captured on connect
//
import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import {
  NYCPR_MINT,
  NYCPR_DECIMALS,
  GATE_AMOUNT_BASE,
  SOLANA_RPC_URL,
} from "./config.js";

let _provider = null;
let _pubkey = null; // base58 string
let _loginSig = null; // { message, signatureBase58 }
let _conn = null;

function connection() {
  if (!_conn) _conn = new Connection(SOLANA_RPC_URL, "confirmed");
  return _conn;
}

// --- provider detection --------------------------------------------------
export function getProvider() {
  if (_provider) return _provider;
  const w = typeof window !== "undefined" ? window : {};
  // Phantom (preferred), then generic window.solana, then Solflare.
  if (w.phantom?.solana?.isPhantom) _provider = w.phantom.solana;
  else if (w.solana) _provider = w.solana;
  else if (w.solflare?.isSolflare) _provider = w.solflare;
  return _provider || null;
}

export function isMobile() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const touch = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  // On a plain mobile browser there's no injected wallet to talk to.
  return touch && !getProvider();
}

// Phantom universal deeplink that re-opens this site inside Phantom's
// in-app browser, where the provider IS injected.
export function phantomDeeplink() {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const ref = typeof window !== "undefined" ? window.location.origin : "";
  return (
    "https://phantom.app/ul/browse/" +
    encodeURIComponent(url) +
    "?ref=" +
    encodeURIComponent(ref)
  );
}

// --- connect + sign-in ---------------------------------------------------
export async function connect() {
  const provider = getProvider();
  if (!provider) throw new Error("NO_PROVIDER");

  const res = await provider.connect();
  _pubkey =
    (res && res.publicKey && res.publicKey.toString()) ||
    (provider.publicKey && provider.publicKey.toString());
  if (!_pubkey) throw new Error("NO_PUBKEY");

  // Sign a login message once on connect (proves ownership / user consent).
  const login = buildLoginMessage(_pubkey);
  try {
    const signed = await signMessage(login);
    _loginSig = { message: login, signatureBase58: signed.signatureBase58 };
  } catch (e) {
    // User declined the signature — treat as a failed connect.
    throw new Error("SIGN_REJECTED");
  }
  return _pubkey;
}

export function getPublicKey() {
  return _pubkey;
}

export function getLoginSignature() {
  return _loginSig;
}

// --- signing -------------------------------------------------------------
export async function signMessage(text) {
  const provider = getProvider();
  if (!provider) throw new Error("NO_PROVIDER");
  const bytes = new TextEncoder().encode(text);
  // Phantom/Solflare: signMessage(Uint8Array, display) -> { signature, publicKey }
  const out = await provider.signMessage(bytes, "utf8");
  const sig = out.signature || out;
  const signatureBase58 = bs58.encode(sig);
  return { signatureBase58, publicKey: _pubkey };
}

// --- balance -------------------------------------------------------------
export async function getNYCPRBalance(pubkeyStr) {
  const owner = new PublicKey(pubkeyStr || _pubkey);
  const mint = new PublicKey(NYCPR_MINT);
  const resp = await connection().getParsedTokenAccountsByOwner(owner, { mint });
  let base = 0;
  for (const { account } of resp.value) {
    const amt = account.data?.parsed?.info?.tokenAmount;
    if (amt && typeof amt.amount === "string") base += Number(amt.amount);
  }
  return { base, ui: base / 10 ** NYCPR_DECIMALS };
}

export async function meetsGate(pubkeyStr) {
  const { base } = await getNYCPRBalance(pubkeyStr);
  return base >= GATE_AMOUNT_BASE;
}

// --- message builders (format MUST match the server) ---------------------
export function buildLoginMessage(pubkey) {
  return (
    "Sign in to Hangry Rats\n" +
    "wallet: " + pubkey + "\n" +
    "ts: " + Date.now() + "\n" +
    "nonce: " + Math.random().toString(36).slice(2)
  );
}

// Score-submission message: embeds wallet + score + a fresh timestamp so the
// server can reject replays / stale submissions.
export function buildScoreMessage(pubkey, score) {
  return (
    "Hangry Rats - score submission\n" +
    "wallet: " + pubkey + "\n" +
    "score: " + score + "\n" +
    "ts: " + Date.now()
  );
}

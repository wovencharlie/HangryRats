// Pure, I/O-free score-submission validation shared by the server and tests.
// (Network/DB steps — rate limiting, on-chain balance, the DB upsert — live in
// server.js. Everything here is deterministic and unit-testable.)
import nacl from "tweetnacl";
import bs58 from "bs58";

// Parse the signed score message (format mirrors src/wallet.js).
export function parseScoreMessage(msg) {
  const wallet = /wallet:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/.exec(msg || "");
  const score = /score:\s*(\d+)/.exec(msg || "");
  const ts = /ts:\s*(\d+)/.exec(msg || "");
  if (!wallet || !score || !ts) return null;
  return { wallet: wallet[1], score: Number(score[1]), ts: Number(ts[1]) };
}

// Verify an ed25519 detached signature (base58 sig + base58 pubkey).
export function verifySignature(message, signatureB58, walletB58) {
  try {
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = bs58.decode(signatureB58);
    const pubBytes = bs58.decode(walletB58);
    if (pubBytes.length !== 32 || sigBytes.length !== 64) return false;
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubBytes);
  } catch {
    return false;
  }
}

// Validate a submission body. Returns { ok:true, name } or
// { ok:false, status, error }. Does NOT check balance / rate limit / DB.
export function validateScore(body, opts = {}) {
  const now = opts.now ?? Date.now();
  const maxScore = opts.maxScore ?? 2_000_000;
  const replayWindowMs = opts.replayWindowMs ?? 120_000;

  const { wallet, name, score, message, signature } = body || {};
  if (
    typeof wallet !== "string" ||
    typeof name !== "string" ||
    typeof score !== "number" ||
    typeof message !== "string" ||
    typeof signature !== "string"
  ) {
    return { ok: false, status: 400, error: "missing_fields" };
  }
  if (!Number.isInteger(score) || score < 0 || score > maxScore) {
    return { ok: false, status: 422, error: "score_out_of_range" };
  }
  const parsed = parseScoreMessage(message);
  if (!parsed) return { ok: false, status: 400, error: "bad_message" };
  if (parsed.wallet !== wallet) return { ok: false, status: 400, error: "wallet_mismatch" };
  if (parsed.score !== score) return { ok: false, status: 400, error: "score_mismatch" };
  if (Math.abs(now - parsed.ts) > replayWindowMs) {
    return { ok: false, status: 401, error: "stale_or_replayed" };
  }
  if (!verifySignature(message, signature, wallet)) {
    return { ok: false, status: 401, error: "bad_signature" };
  }
  const cleanName = name.trim().slice(0, 24) || "Anon Rat";
  return { ok: true, name: cleanName };
}

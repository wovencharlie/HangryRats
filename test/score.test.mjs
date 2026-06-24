import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { validateScore, parseScoreMessage, verifySignature } from "../lib/score.js";

// Helper: build + sign a score message the way the client (src/wallet.js) does.
function signedSubmission(score, { ts = Date.now(), kp = Keypair.generate() } = {}) {
  const wallet = bs58.encode(kp.publicKey.toBytes());
  const message =
    "Hangry Rats - score submission\n" +
    "wallet: " + wallet + "\n" +
    "score: " + score + "\n" +
    "ts: " + ts;
  const sig = nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey);
  return { wallet, name: "Test Rat", score, message, signature: bs58.encode(sig), kp };
}

test("valid signed submission passes", () => {
  const body = signedSubmission(12345);
  const r = validateScore(body);
  assert.equal(r.ok, true);
  assert.equal(r.name, "Test Rat");
});

test("parseScoreMessage extracts fields", () => {
  const body = signedSubmission(777);
  const p = parseScoreMessage(body.message);
  assert.equal(p.wallet, body.wallet);
  assert.equal(p.score, 777);
  assert.ok(typeof p.ts === "number");
});

test("tampered signature is rejected", () => {
  const body = signedSubmission(500);
  // flip the signature to a different valid-length sig
  const other = signedSubmission(500);
  body.signature = other.signature;
  const r = validateScore(body);
  assert.equal(r.ok, false);
  assert.equal(r.error, "bad_signature");
});

test("score in body must match signed message (anti-inflation of a signed msg)", () => {
  const body = signedSubmission(500);
  body.score = 999999; // claim a different score than was signed
  const r = validateScore(body);
  assert.equal(r.ok, false);
  // 999999 within cap, so it reaches the mismatch check
  assert.equal(r.error, "score_mismatch");
});

test("stale timestamp is rejected (replay protection)", () => {
  const body = signedSubmission(500, { ts: Date.now() - 5 * 60 * 1000 });
  const r = validateScore(body);
  assert.equal(r.ok, false);
  assert.equal(r.error, "stale_or_replayed");
});

test("over-cap score is rejected", () => {
  const body = signedSubmission(5_000_000); // > 2,000,000 cap
  const r = validateScore(body);
  assert.equal(r.ok, false);
  assert.equal(r.error, "score_out_of_range");
});

test("missing fields are rejected", () => {
  const r = validateScore({ wallet: "x" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "missing_fields");
});

test("raw verifySignature: true for good, false for tampered message", () => {
  const body = signedSubmission(42);
  assert.equal(verifySignature(body.message, body.signature, body.wallet), true);
  assert.equal(verifySignature(body.message + "x", body.signature, body.wallet), false);
});

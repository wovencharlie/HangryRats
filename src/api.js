// Frontend API client for the leaderboard backend. All calls are same-origin
// (the production server serves both the static build and /api/*).
import {
  getPublicKey,
  signMessage,
  buildScoreMessage,
} from "./wallet.js";

const NAME_KEY = "hangry-rats-name-v1";
const HIGH_KEY = "hangry-rats-submitted-high-v1";

export function getStoredName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

// Last score we successfully submitted, so we only resubmit on a true new high.
export function getSubmittedHigh() {
  try {
    return Number(localStorage.getItem(HIGH_KEY) || 0);
  } catch {
    return 0;
  }
}

function setSubmittedHigh(score) {
  try {
    localStorage.setItem(HIGH_KEY, String(score));
  } catch {
    /* ignore */
  }
}

// Prompt once for a display name; persist it. Players only ever enter a name.
export function ensureName() {
  let name = getStoredName();
  if (name) return name;
  const input = window.prompt(
    "New high score! Enter a display name for the leaderboard:",
    ""
  );
  if (input == null) return null; // cancelled
  name = input.trim().slice(0, 24) || "Anon Rat";
  setStoredName(name);
  return name;
}

export async function fetchLeaderboard(limit = 20) {
  const res = await fetch(`/api/leaderboard?limit=${encodeURIComponent(limit)}`);
  if (!res.ok) throw new Error("LEADERBOARD_FETCH_FAILED");
  return res.json(); // [{ name, score }]
}

// Sign + submit a score. Returns { ok, ...} or throws. Only call on a genuine
// new personal high (caller checks getSubmittedHigh()).
export async function submitScore(score) {
  const wallet = getPublicKey();
  if (!wallet) throw new Error("NOT_CONNECTED");

  const name = ensureName();
  if (!name) return { ok: false, reason: "no_name" };

  const message = buildScoreMessage(wallet, score);
  const { signatureBase58 } = await signMessage(message);

  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet,
      name,
      score,
      message,
      signature: signatureBase58,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) setSubmittedHigh(score);
  return { ok: res.ok, status: res.status, ...data };
}

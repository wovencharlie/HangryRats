// Hangry Rats production server.
//
// Serves the static Vite build in ./dist AND exposes a small leaderboard API
// backed by Postgres. One process, one Railway service.
//
//   GET  /api/leaderboard?limit=20  -> public top scores [{ name, score }]
//   POST /api/score                 -> signed score submission (verified)
//   GET  /admin                     -> owner-only prize list (ADMIN_KEY)
//
// Env:
//   PORT           injected by Railway (defaults 3000 locally)
//   DATABASE_URL   Postgres connection string (Railway Postgres)
//   SOLANA_RPC_URL RPC endpoint (defaults to public mainnet)
//   ADMIN_KEY      password for /admin (admin disabled if unset)

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import pg from "pg";
import { Connection, PublicKey } from "@solana/web3.js";
import { validateScore } from "./lib/score.js";

const { Pool } = pg;

// ---- config -------------------------------------------------------------
const DIST = new URL("./dist/", import.meta.url);
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || "";
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const ADMIN_KEY = process.env.ADMIN_KEY || "";

// NYCPR token gate (mirrors src/config.js).
const NYCPR_MINT = "EPaAwfBi4TyaqvyteW3sgL3fZvQroCNkz9AN6Yiupump";
const GATE_AMOUNT_BASE = 1_000_000_000; // 1000 NYCPR @ 6 decimals
const MAX_SCORE = 2_000_000; // sanity cap (cumulative best across 10 levels)
const REPLAY_WINDOW_MS = 120_000; // reject score messages older than 2 min

// ---- postgres -----------------------------------------------------------
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      // Railway's internal DATABASE_URL needs no SSL; the public proxy URL
      // does. Enable SSL when the string asks for it or PGSSL=1 is set.
      ssl:
        /sslmode=require/.test(DATABASE_URL) || process.env.PGSSL === "1"
          ? { rejectUnauthorized: false }
          : false,
    })
  : null;

async function initDb() {
  if (!pool) {
    console.warn("[db] DATABASE_URL not set — leaderboard API disabled.");
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      wallet     text PRIMARY KEY,
      name       text NOT NULL,
      score      int  NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  `);
  console.log("[db] scores table ready");
}

// ---- solana balance re-check -------------------------------------------
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

async function holdsGate(walletStr) {
  const owner = new PublicKey(walletStr);
  const mint = new PublicKey(NYCPR_MINT);
  const resp = await connection.getParsedTokenAccountsByOwner(owner, { mint });
  let base = 0;
  for (const { account } of resp.value) {
    const amt = account.data?.parsed?.info?.tokenAmount;
    if (amt && typeof amt.amount === "string") base += Number(amt.amount);
  }
  return base >= GATE_AMOUNT_BASE;
}

// ---- rate limiting (in-memory; resets on restart) ----------------------
const lastByWallet = new Map(); // wallet -> ts
const hitsByIp = new Map(); // ip -> [ts,...]
const WALLET_MIN_INTERVAL = 8_000; // 1 submission / 8s per wallet
const IP_WINDOW = 60_000;
const IP_MAX = 20; // 20 submissions / min per IP

function rateLimited(wallet, ip) {
  const now = Date.now();
  const last = lastByWallet.get(wallet) || 0;
  if (now - last < WALLET_MIN_INTERVAL) return true;
  const hits = (hitsByIp.get(ip) || []).filter((t) => now - t < IP_WINDOW);
  if (hits.length >= IP_MAX) return true;
  hits.push(now);
  hitsByIp.set(ip, hits);
  lastByWallet.set(wallet, now);
  return false;
}

// ---- helpers ------------------------------------------------------------
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function readJson(req, maxBytes = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error("BODY_TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("BAD_JSON"));
      }
    });
    req.on("error", reject);
  });
}

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

// ---- API: POST /api/score ----------------------------------------------
async function handleScore(req, res) {
  if (!pool) return send(res, 503, { error: "leaderboard_unavailable" });

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    return send(res, 400, { error: "bad_request", detail: e.message });
  }

  const { wallet } = body || {};

  // Stateless validation: required fields, score cap, message<->body match,
  // freshness (anti-replay), and ed25519 signature.
  const v = validateScore(body, {
    maxScore: MAX_SCORE,
    replayWindowMs: REPLAY_WINDOW_MS,
  });
  if (!v.ok) return send(res, v.status, { error: v.error });

  // Rate limit per wallet + IP.
  if (rateLimited(wallet, clientIp(req))) {
    return send(res, 429, { error: "rate_limited" });
  }

  // Server-side RE-VERIFY the wallet still holds >= 1000 NYCPR (never trust
  // the client gate).
  let gated;
  try {
    gated = await holdsGate(wallet);
  } catch (e) {
    return send(res, 502, { error: "rpc_error" });
  }
  if (!gated) return send(res, 403, { error: "insufficient_nycpr" });

  // Upsert: keep the MAX score per wallet; store the latest name.
  try {
    await pool.query(
      `INSERT INTO scores (wallet, name, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (wallet) DO UPDATE
         SET score = GREATEST(scores.score, EXCLUDED.score),
             name = EXCLUDED.name,
             updated_at = now()`,
      [wallet, v.name, body.score]
    );
  } catch (e) {
    return send(res, 500, { error: "db_error" });
  }

  return send(res, 200, { ok: true });
}

// ---- API: GET /api/leaderboard -----------------------------------------
async function handleLeaderboard(req, res, url) {
  if (!pool) return send(res, 503, { error: "leaderboard_unavailable" });
  let limit = parseInt(url.searchParams.get("limit") || "20", 10);
  if (!Number.isFinite(limit)) limit = 20;
  limit = Math.max(1, Math.min(100, limit));
  try {
    const r = await pool.query(
      `SELECT name, score FROM scores
       ORDER BY score DESC, updated_at ASC
       LIMIT $1`,
      [limit]
    );
    // NEVER expose wallets here.
    return send(res, 200, r.rows.map((x) => ({ name: x.name, score: x.score })));
  } catch (e) {
    return send(res, 500, { error: "db_error" });
  }
}

// ---- admin: GET /admin --------------------------------------------------
function adminAuthorized(req, url) {
  if (!ADMIN_KEY) return false;
  if (url.searchParams.get("key") === ADMIN_KEY) return true;
  const h = req.headers["authorization"] || "";
  if (h.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(h.slice(6), "base64").toString("utf8");
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      if (pass === ADMIN_KEY) return true;
    } catch {
      /* fall through */
    }
  }
  return false;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function handleAdmin(req, res, url) {
  if (!ADMIN_KEY) {
    res.writeHead(503, { "content-type": "text/plain" });
    return res.end("Admin disabled: set ADMIN_KEY.");
  }
  if (!adminAuthorized(req, url)) {
    res.writeHead(401, {
      "content-type": "text/plain",
      "www-authenticate": 'Basic realm="Hangry Rats Admin"',
    });
    return res.end("Unauthorized");
  }
  if (!pool) {
    res.writeHead(503, { "content-type": "text/plain" });
    return res.end("Database not configured.");
  }
  let rows = [];
  try {
    const r = await pool.query(
      `SELECT name, wallet, score, updated_at FROM scores ORDER BY score DESC`
    );
    rows = r.rows;
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    return res.end("DB error");
  }
  const tr = rows
    .map(
      (x) =>
        `<tr><td>${esc(x.name)}</td><td class="mono">${esc(x.wallet)}</td>` +
        `<td class="num">${Number(x.score).toLocaleString()}</td>` +
        `<td>${esc(new Date(x.updated_at).toISOString())}</td></tr>`
    )
    .join("");
  const html = `<!doctype html><meta charset="utf-8">
<title>Hangry Rats — Prize List</title>
<style>
  body{font:15px system-ui,sans-serif;background:#15110c;color:#f3e7cf;margin:24px}
  h1{color:#ffd23f} .meta{opacity:.7;margin-bottom:14px}
  table{border-collapse:collapse;width:100%} th,td{padding:8px 12px;border-bottom:1px solid #3a2c1b;text-align:left}
  th{cursor:pointer;color:#ffd27a;user-select:none} tr:hover td{background:#211a11}
  .mono{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#cdbfa3}
  .num{text-align:right} caption{caption-side:bottom;opacity:.6;margin-top:10px;font-size:12px}
</style>
<h1>🏆 Prize List</h1>
<div class="meta">${rows.length} wallet(s). Click a column header to sort. Wallets are private to this page.</div>
<table id="t"><thead><tr>
  <th data-i="0">Name</th><th data-i="1">Wallet</th>
  <th data-i="2" data-num="1">Score</th><th data-i="3">Updated</th>
</tr></thead><tbody>${tr}</tbody>
<caption>Hangry Rats owner admin — review before paying out.</caption></table>
<script>
  const tb=document.querySelector("#t tbody");
  document.querySelectorAll("#t th").forEach(th=>{
    let asc=true;
    th.addEventListener("click",()=>{
      const i=+th.dataset.i, num=th.dataset.num==="1";
      [...tb.rows].sort((a,b)=>{
        let x=a.cells[i].innerText,y=b.cells[i].innerText;
        if(num){x=parseFloat(x.replace(/[^0-9.-]/g,""))||0;y=parseFloat(y.replace(/[^0-9.-]/g,""))||0;return asc?x-y:y-x;}
        return asc?x.localeCompare(y):y.localeCompare(x);
      }).forEach(r=>tb.appendChild(r));
      asc=!asc;
    });
  });
</script>`;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(html);
}

// ---- static (unchanged behavior) ---------------------------------------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

async function handleStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/" || pathname.endsWith("/")) pathname += "index.html";
  let target = new URL("." + pathname, DIST);
  if (!target.href.startsWith(DIST.href)) target = new URL("index.html", DIST);
  let data;
  try {
    data = await readFile(target);
  } catch {
    target = new URL("index.html", DIST);
    data = await readFile(target);
  }
  const ext = extname(target.pathname);
  res.writeHead(200, {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000",
  });
  res.end(data);
}

// ---- router -------------------------------------------------------------
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;

    if (path === "/api/score" && req.method === "POST") return handleScore(req, res);
    if (path === "/api/leaderboard" && req.method === "GET")
      return handleLeaderboard(req, res, url);
    if (path === "/admin" && req.method === "GET") return handleAdmin(req, res, url);
    if (path.startsWith("/api/")) return send(res, 404, { error: "not_found" });

    return handleStatic(req, res, url);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Internal Server Error");
  }
});

initDb()
  .catch((e) => console.error("[db] init failed:", e.message))
  .finally(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Hangry Rats serving ./dist + API on http://0.0.0.0:${PORT}`);
    });
  });

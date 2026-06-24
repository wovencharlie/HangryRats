// Boots the real server.js (no DATABASE_URL) and checks routing + admin auth.
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const PORT = 4599;
const base = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, PORT: String(PORT), ADMIN_KEY: "secret123", DATABASE_URL: "" };
delete env.DATABASE_URL;

const srv = spawn("node", ["server.js"], { env, stdio: ["ignore", "pipe", "pipe"] });
await new Promise((resolve, reject) => {
  const to = setTimeout(() => reject(new Error("server start timeout")), 8000);
  srv.stdout.on("data", (d) => { if (String(d).includes("serving")) { clearTimeout(to); resolve(); } });
  srv.stderr.on("data", (d) => process.stderr.write(d));
});

let failures = 0;
async function check(name, fn) {
  try { await fn(); console.log("ok  -", name); }
  catch (e) { failures++; console.log("FAIL-", name, "::", e.message); }
}
const get = (p, opts) => fetch(base + p, opts);

await check("GET / serves the game (200)", async () => {
  const r = await get("/");
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.ok(/Hangry Rats/i.test(html), "index html served");
});
await check("GET /api/leaderboard without DB -> 503", async () => {
  assert.equal((await get("/api/leaderboard")).status, 503);
});
await check("POST /api/score without DB -> 503", async () => {
  const r = await get("/api/score", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(r.status, 503);
});
await check("GET /admin without key -> 401", async () => {
  assert.equal((await get("/admin")).status, 401);
});
await check("GET /admin wrong key -> 401", async () => {
  assert.equal((await get("/admin?key=nope")).status, 401);
});
await check("GET /admin correct key -> authorized (503 db-not-configured, NOT 401)", async () => {
  const r = await get("/admin?key=secret123");
  assert.notEqual(r.status, 401);
  assert.equal(r.status, 503); // auth passed; DB simply absent here
});
await check("GET /api/unknown -> 404 json", async () => {
  assert.equal((await get("/api/whatever")).status, 404);
});

srv.kill("SIGKILL");
console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL HTTP SMOKE CHECKS PASSED");
process.exit(failures ? 1 : 0);

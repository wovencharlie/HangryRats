// Validates the SQL contracts the server relies on, using an in-memory
// Postgres (pg-mem). Crucially asserts the PUBLIC leaderboard query never
// returns wallets, while the admin query does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";

function freshDb() {
  const db = newDb();
  db.public.none(`
    CREATE TABLE scores (
      wallet text PRIMARY KEY,
      name text NOT NULL,
      score int NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  `);
  return db;
}

// Mirror the server's upsert.
function upsert(db, wallet, name, score) {
  db.public.none(
    `INSERT INTO scores (wallet, name, score) VALUES ('${wallet}','${name}',${score})
     ON CONFLICT (wallet) DO UPDATE
       SET score = GREATEST(scores.score, EXCLUDED.score),
           name = EXCLUDED.name,
           updated_at = now()`
  );
}

test("upsert keeps the MAX score and latest name", () => {
  const db = freshDb();
  upsert(db, "WALLET_A", "Alice", 1000);
  upsert(db, "WALLET_A", "Alicia", 500); // lower score, new name
  const row = db.public.many(`SELECT name, score FROM scores WHERE wallet='WALLET_A'`)[0];
  assert.equal(row.score, 1000, "max score kept");
  assert.equal(row.name, "Alicia", "latest name stored");
  upsert(db, "WALLET_A", "Alicia", 2500); // higher score
  const row2 = db.public.many(`SELECT score FROM scores WHERE wallet='WALLET_A'`)[0];
  assert.equal(row2.score, 2500);
});

test("public leaderboard query exposes name+score ONLY (no wallet)", () => {
  const db = freshDb();
  upsert(db, "SECRET_WALLET_1", "Bob", 900);
  upsert(db, "SECRET_WALLET_2", "Cara", 1500);
  const rows = db.public.many(
    `SELECT name, score FROM scores ORDER BY score DESC, updated_at ASC LIMIT 20`
  );
  assert.equal(rows[0].name, "Cara"); // highest first
  for (const r of rows) {
    assert.ok(!("wallet" in r), "leaderboard row must NOT contain a wallet");
    assert.deepEqual(Object.keys(r).sort(), ["name", "score"]);
  }
});

test("admin query DOES include wallet", () => {
  const db = freshDb();
  upsert(db, "SECRET_WALLET_9", "Dan", 700);
  const row = db.public.many(
    `SELECT name, wallet, score, updated_at FROM scores ORDER BY score DESC`
  )[0];
  assert.equal(row.wallet, "SECRET_WALLET_9");
});

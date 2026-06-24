// Minimal zero-dependency static file server for the production build.
// Serves the Vite output in ./dist and binds to the port Railway provides
// via the PORT env var (defaults to 3000 for local use).

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const DIST = new URL("./dist/", import.meta.url);
const PORT = process.env.PORT || 3000;

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

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname === "/" || pathname.endsWith("/")) pathname += "index.html";

    // Resolve against dist and guard against path traversal: any resolved
    // URL that escapes the dist root falls back to index.html.
    let target = new URL("." + pathname, DIST);
    if (!target.href.startsWith(DIST.href)) target = new URL("index.html", DIST);

    let data;
    try {
      data = await readFile(target);
    } catch {
      // Unknown path -> serve index.html (single-page friendly).
      target = new URL("index.html", DIST);
      data = await readFile(target);
    }

    const ext = extname(target.pathname);
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000",
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Hangry Rats serving ./dist on http://0.0.0.0:${PORT}`);
});

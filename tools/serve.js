#!/usr/bin/env node
/**
 * Serve dist/ over HTTP so the hosted build can be tested the way it will
 * actually run.
 *
 * A service worker can't register over file://, so opening dist/index.html
 * directly proves nothing about installability or offline behaviour. localhost
 * counts as a secure context, so this is enough to exercise the real thing:
 * install the SW, then kill the network and confirm the app still loads.
 *
 *   npm run serve        # then open http://localhost:8080
 */
const fs = require("fs");
const http = require("http");
const path = require("path");

const DIST = path.resolve(__dirname, "..", "dist");
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const rel = url.endsWith("/") ? path.join(url, "index.html") : url;
    // path.join normalises away any ../ before we resolve against DIST
    const file = path.join(DIST, path.join("/", rel));
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found: " + rel);
        return;
      }
      res.writeHead(200, {
        "content-type": TYPES[path.extname(file)] || "application/octet-stream",
        // never let the browser's own cache mask what the service worker is doing
        "cache-control": "no-store",
      });
      res.end(buf);
    });
  })
  .listen(PORT, () => console.log(`serving dist/ at http://localhost:${PORT}`));

#!/usr/bin/env node
/**
 * Build Think & Sort.
 *
 * Development happens across many small files in src/ — a shell plus one module
 * per activity. This inlines them into the two things that actually get used:
 *
 *   dist/app.html              the page body on its own (what the Artifact hosts)
 *   dist/think-and-sort.html   the standalone offline file for the tablet
 *
 * Adding an activity means dropping a file into src/activities/ and listing it
 * in ACTIVITY_FILES below — nothing else here changes.
 *
 *   node tools/build.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const ICONS = path.join(ROOT, "icons");
const PHOTOS = path.join(SRC, "photos");

// Order matters: `const` has no hoisting, so anything evaluated at load time
// must come after what it names. Activities are defined before the registry
// that lists them; boot runs last.
const SHELL_BEFORE = [
  "10-helpers.js",
  "00-state.js",
  "20-stimuli.js",
  "30-rewards.js",
  "35-drag.js",
  "36-trace-engine.js",
  "40-mastery.js",
  "50-session.js",
];

const ACTIVITY_FILES = [
  "activities/patterns.js",
  "activities/sorting.js",
  "activities/seriate.js",
  "activities/count.js",
  "activities/trace.js",
  "activities/match.js",
  "activities/odd.js",
  "activities/where.js",
  "activities/wordfind.js",
  "activities/wordfill.js",
  "activities/sky.js",
  "activities/nine.js",
];

const SHELL_AFTER = [
  "60-registry.js",
  "70-home.js",
  "75-gate.js",
  "80-settings.js",
  "90-boot.js",
];

// The app's display name and colours, in one place. Both the offline file's
// inlined data-URI manifest and the hosted manifest.webmanifest are generated
// from this, so renaming the app is a one-line change and the two builds
// cannot disagree about what it's called.
const MANIFEST_INFO = {
  name: "Kiaan's App",
  short_name: "Kiaan's App",
  display: "fullscreen",
  orientation: "landscape",
  background_color: "#f7f9fc",
  theme_color: "#f7f9fc",
  start_url: ".",
  scope: ".",
};

// The offline file has no files to point at, so it carries no icons and no
// scope — just the identity and colours, inlined as a data URI.
const OFFLINE_MANIFEST =
  "data:application/manifest+json," +
  encodeURIComponent(JSON.stringify({
    name: MANIFEST_INFO.name,
    short_name: MANIFEST_INFO.short_name,
    display: MANIFEST_INFO.display,
    orientation: MANIFEST_INFO.orientation,
    background_color: MANIFEST_INFO.background_color,
    theme_color: MANIFEST_INFO.theme_color,
    start_url: MANIFEST_INFO.start_url,
  }));

const SKELETON_HEAD = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="${MANIFEST_INFO.theme_color}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Kiaan&rsquo;s App">
<link rel="manifest" href="${OFFLINE_MANIFEST}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ctext y=%27.9em%27 font-size=%2790%27%3E%F0%9F%A7%A9%3C/text%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Crect width=%27100%27 height=%27100%27 fill=%27%23f7f9fc%27/%3E%3Ctext y=%27.85em%27 x=%27.08em%27 font-size=%2778%27%3E%F0%9F%A7%A9%3C/text%3E%3C/svg%3E">
<style>
  html{color-scheme:light}
  body{margin:0;font:14px system-ui,sans-serif}
  img{max-width:100%}
  [hidden]{display:none!important}
</style>
</head>
<body>
`;

/* ======================================================================
 * Hosted build — dist/index.html + manifest.webmanifest + sw.js + icons/
 *
 * This is an ADDITION alongside the offline single-file build above, not a
 * replacement: dist/think-and-sort.html keeps its inlined data-URI manifest
 * and stays a self-contained file with zero external references, exactly as
 * before. The hosted build is for a real URL that installs as a PWA and then
 * runs offline via a service worker — see DEPLOY.md.
 * ====================================================================== */

const HOSTED_HEAD = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="${MANIFEST_INFO.theme_color}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Kiaan&rsquo;s App">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<style>
  html{color-scheme:light}
  body{margin:0;font:14px system-ui,sans-serif}
  img{max-width:100%}
  [hidden]{display:none!important}
</style>
</head>
<body>
`;

// The service worker's own registration — inlined here rather than in src/
// because it must NEVER be part of buildBody(): app.html is what jsdom boots
// in tests and what the offline file inlines, and neither should touch
// navigator.serviceWorker (jsdom doesn't have it; the offline file can't use
// it — service workers don't run over file://).
const SW_REGISTER = `<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(()=>{}); });
  // The SW below calls skipWaiting()+clients.claim() on every deploy, so a
  // fresh version takes over as soon as it finishes installing — reload once
  // to actually run it instead of leaving the old page code in memory.
  let refreshed = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshed) return;
    refreshed = true;
    location.reload();
  });
}
</script>
`;

function buildManifest() {
  return JSON.stringify(
    {
      ...MANIFEST_INFO,
      icons: [
        { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    null,
    2
  ) + "\n";
}

/**
 * `buildId` is a content hash of the built page — it becomes the cache name,
 * so every rebuild that actually changes something gets a fresh cache and the
 * activate handler below drops the old one. Rebuilding without changing
 * anything reuses the same cache name and touches nothing on the tablet.
 */
function computeBuildId(body) {
  return crypto.createHash("sha256").update(body).digest("hex").slice(0, 12);
}

function buildServiceWorker(buildId) {
  const assets = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
  ];
  return `// Generated by tools/build.js — do not edit by hand, edit build.js instead.
const CACHE_NAME = "think-and-sort-${buildId}";
const ASSETS = ${JSON.stringify(assets)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first: on the tablet's daily use this always picks up a freshly
// pushed build while online, and falls back to the cached shell the moment
// the network isn't there — which is the only path once it's truly offline.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((hit) => hit || caches.match("./index.html"))
      )
  );
});
`;
}

const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");

/**
 * The reward photographs, inlined as data URIs.
 *
 * They go INTO the page rather than beside it on purpose: the offline file has
 * to stay one self-contained thing with zero external references, and inlining
 * for the hosted build too means the service worker still has exactly one
 * document to cache and cannot end up with the page from one build and the
 * pictures from another.
 *
 * File name is the word — dog.webp is DOG, "ice-cream.webp" is ICE CREAM —
 * the same rule Settings uses for photos a parent adds from the tablet.
 */
function buildPhotoPack() {
  if (!fs.existsSync(PHOTOS)) return { js: "const PHOTO_PACK = {};\n", count: 0, bytes: 0 };
  const entries = fs.readdirSync(PHOTOS).filter((f) => f.endsWith(".webp")).sort();
  let bytes = 0;
  const pairs = entries.map((f) => {
    const buf = fs.readFileSync(path.join(PHOTOS, f));
    bytes += buf.length;
    const word = f.replace(/\.webp$/, "").replace(/-/g, " ").toUpperCase();
    return JSON.stringify(word) + ':"data:image/webp;base64,' + buf.toString("base64") + '"';
  });
  return {
    js: "const PHOTO_PACK = {\n" + pairs.join(",\n") + "\n};\n",
    count: entries.length,
    bytes,
  };
}

function buildBody() {
  const files = [...SHELL_BEFORE, ...ACTIVITY_FILES, ...SHELL_AFTER];
  const photos = buildPhotoPack();
  const js = files
    .map((rel) => {
      const chunk = `\n/* ---------- src/${rel} ---------- */\n${read(rel).trimEnd()}`;
      // ahead of the rewards module, which reads PHOTO_PACK when filling its bag
      return rel === "30-rewards.js"
        ? `\n/* ---------- src/photos/*.webp (${photos.count}) ---------- */\n${photos.js.trimEnd()}\n${chunk}`
        : chunk;
    })
    .join("\n");

  return (
    "<title>Kiaan&rsquo;s App</title>\n" +
    "<style>\n" + read("style.css").trimEnd() + "\n</style>\n\n" +
    read("markup.html").trimEnd() + "\n\n" +
    '<script>\n(function(){\n"use strict";\n' + js + "\n\n})();\n<\/script>\n"
  );
}

function buildHosted(body) {
  const buildId = computeBuildId(body);
  return {
    buildId,
    indexHtml: HOSTED_HEAD + body + "\n" + SW_REGISTER + "</body>\n</html>\n",
    manifest: buildManifest(),
    sw: buildServiceWorker(buildId),
  };
}

function main() {
  const body = buildBody();
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, "app.html"), body);
  fs.writeFileSync(
    path.join(DIST, "think-and-sort.html"),
    SKELETON_HEAD + body + "\n</body>\n</html>\n"
  );

  const hosted = buildHosted(body);
  fs.writeFileSync(path.join(DIST, "index.html"), hosted.indexHtml);
  fs.writeFileSync(path.join(DIST, "manifest.webmanifest"), hosted.manifest);
  fs.writeFileSync(path.join(DIST, "sw.js"), hosted.sw);
  fs.mkdirSync(path.join(DIST, "icons"), { recursive: true });
  // Icons are checked-in assets (tools/make-icons.js is a one-off generator,
  // not part of the normal build), but generate them on demand so a fresh
  // clone that skipped that step still builds instead of failing on a
  // missing directory.
  if (!fs.existsSync(ICONS) || fs.readdirSync(ICONS).length === 0) {
    require("./make-icons").generate({ quiet: true });
  }
  for (const name of fs.readdirSync(ICONS)) {
    fs.copyFileSync(path.join(ICONS, name), path.join(DIST, "icons", name));
  }

  const n = ACTIVITY_FILES.length;
  const photos = buildPhotoPack();
  console.log(
    `built dist/app.html (${body.length} bytes) from ` +
    `${SHELL_BEFORE.length + SHELL_AFTER.length} shell files + ${n} activit${n === 1 ? "y" : "ies"} + ` +
    `${photos.count} photos (${Math.round(photos.bytes / 1024)} KB)`
  );
  console.log(`built dist/index.html + manifest.webmanifest + sw.js (cache ${hosted.buildId})`);
}

module.exports = {
  buildBody, buildPhotoPack, SRC, ROOT, ICONS, PHOTOS, ACTIVITY_FILES, SHELL_BEFORE, SHELL_AFTER, read,
  MANIFEST_INFO, buildManifest, computeBuildId, buildServiceWorker, buildHosted,
};

if (require.main === module) main();

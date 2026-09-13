/* The hosted PWA build: dist/index.html + manifest.webmanifest + sw.js +
 * icons, alongside — never instead of — the untouched offline single file. */
const fs = require("fs");
const path = require("path");
const { Runner, ROOT } = require("./_harness");
const build = require("../tools/build");

const R = new Runner("pwa");
const check = (c, m) => R.check(c, m);

const DIST = path.join(ROOT, "dist");
const readDist = (name) => fs.readFileSync(path.join(DIST, name), "utf8");

/* ---- the offline file is not touched by any of this ---- */
const offline = readDist("think-and-sort.html");
check(/data:application\/manifest\+json/.test(offline), "the offline file keeps its inlined data-URI manifest");
check(!/serviceWorker/.test(offline), "the offline file never references a service worker");
check(!/manifest\.webmanifest/.test(offline), "the offline file never references the hosted manifest file");

const appBody = readDist("app.html");
check(!/serviceWorker/.test(appBody), "app.html (what tests boot and an Artifact would host) stays free of SW code");

/* ---- the hosted build shares the same body as app.html ---- */
const index = readDist("index.html");
check(index.includes(appBody.trim()), "index.html is built from the exact same body as app.html");
check(/<link rel="manifest" href="manifest\.webmanifest">/.test(index), "index.html links the real manifest file");
check(/icons\/icon-192\.png/.test(index), "index.html references the 192px icon");
check(/serviceWorker/.test(index), "index.html registers the service worker");
check(/controllerchange/.test(index), "index.html reloads once a new SW takes control, so updates don't get stuck");

/* ---- manifest.webmanifest ---- */
const manifest = JSON.parse(readDist("manifest.webmanifest"));
check(manifest.name === "Think & Sort", "manifest has the app name");
check(manifest.start_url === "." && manifest.scope === ".", "manifest uses relative start_url/scope (subpath-safe hosting)");
check(Array.isArray(manifest.icons) && manifest.icons.length === 3, "manifest lists all three icons");
check(manifest.icons.some((i) => i.purpose === "maskable"), "manifest includes a maskable icon for Android's adaptive icon shape");
check(manifest.icons.every((i) => fs.existsSync(path.join(DIST, i.src))), "every icon the manifest points at actually exists in dist/");

/* ---- sw.js: updates cleanly, never leaves a stale cache stuck ---- */
const sw = readDist("sw.js");
const buildId = build.computeBuildId(appBody);
check(sw.includes(`think-and-sort-${buildId}`), "the cache name is derived from the built content, not a hand-bumped version");
check(/skipWaiting/.test(sw) && /clients\.claim/.test(sw), "a new SW activates immediately instead of waiting for every tab to close");
check(/caches\.delete/.test(sw), "activate drops caches from previous builds");
check(/caches\.match/.test(sw), "fetch falls back to the cache, which is what makes it work with no network");

/* rebuilding with unchanged content must reuse the same cache name */
const rebuilt = build.buildHosted(appBody);
check(rebuilt.buildId === buildId, "an unchanged rebuild keeps the same cache name (no needless tablet re-fetch)");
const changed = build.buildHosted(appBody + " ");
check(changed.buildId !== buildId, "any content change produces a new cache name, so activate() actually evicts the old one");

/* ---- icons are real, correctly-sized PNGs ---- */
function pngSize(buf) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.subarray(0, 8).equals(sig)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512]]) {
  const buf = fs.readFileSync(path.join(DIST, "icons", name));
  const info = pngSize(buf);
  check(!!info, `icons/${name} is a valid PNG`);
  check(info && info.width === size && info.height === size, `icons/${name} is ${size}x${size}`);
  check(info && info.colorType === 6, `icons/${name} has an alpha channel (color type 6)`);
}

R.finish();

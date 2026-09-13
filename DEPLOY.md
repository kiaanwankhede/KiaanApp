# Getting it onto the tablet

There are now two builds, from the same `src/`:

- **`dist/think-and-sort.html`** — one self-contained file, zero external
  references, works offline the moment you have the file. Still the simplest
  option if you don't want to host anything.
- **`dist/index.html`** (+ `manifest.webmanifest`, `sw.js`, `icons/`) — a real
  PWA meant to be hosted at a URL. Open it once online, "Add to Home screen" /
  "Install app", and after that it launches like a native app and works with
  no connection at all — the service worker caches everything it needs on
  first load. This is what fixes "copy the file over every time."

Both come out of `npm run build`; neither is a manual step beyond that.

---

## Recommended: host it, so updates are just a push

Any static host works — `dist/` needs no server-side code. The one already
wired up here is **GitHub Pages via GitHub Actions**
(`.github/workflows/deploy.yml`): every push to `main` runs `npm test`, then
`npm run build`, then publishes `dist/` to Pages. A change reaches the tablet
the next time it's opened online — no manual rebuild-and-copy step, ever
again.

Setup, once:

```bash
gh auth login                                   # one-time, in a browser
gh repo create think-and-sort --private --source=. --push
```

Then in the repo on GitHub: **Settings → Pages → Build and deployment → Source
→ GitHub Actions**. The workflow that's already in this repo takes it from
there — push to `main` and it deploys.

On the tablet: open the `https://<you>.github.io/think-and-sort/` URL once
while online, then in Chrome **⋮ → Install app** (or **Add to Home screen** —
wording varies by Chrome version). It now behaves like an installed app: own
icon, no address bar, and it keeps working with the wifi off.

**Netlify** works the same way if you'd rather not use GitHub Pages — drag
`dist/` onto https://app.netlify.com/drop after `npm run build`, or:

```bash
npx netlify-cli deploy --dir=dist --prod
```

A manual host means you re-run that deploy step yourself after every
`npm run build`; GitHub Pages via Actions does it on every push instead.

---

## Keeping it updating cleanly

`sw.js` is regenerated on every build with a cache name derived from the
built page's content (`tools/build.js`'s `computeBuildId`). On activate it:

1. **Deletes every cache except the current one** — so a rebuild's tablet
   never accumulates or gets stuck serving last month's version.
2. Calls `skipWaiting()` + `clients.claim()` — the new service worker takes
   over immediately rather than waiting for every open tab to close, which
   matters for a tablet that mostly stays on one pinned tab.
3. The page listens for that handover (`controllerchange`) and reloads once,
   so the fresh code actually runs instead of the old page sitting in memory
   under a new, unused worker.

Fetches are network-first: online, the tablet always gets whatever was just
deployed; the moment the network isn't there, it falls back to the cached
copy — which is the only thing that makes "works offline after first load"
true rather than "works offline until the next tab close."

Net effect: push a change, and the next time the tablet has a connection and
reloads (or is periodically checked by the browser's own SW update cycle) it
picks up the new build and drops the old cache. There's no separate "clear
cache" step to remember.

## No hosting at all (still works)

Copy `dist/think-and-sort.html` to the tablet however you like, open it in
Chrome, then **⋮ → Add to Home screen**. Downside is exactly what prompted
this: every update means copying the file again. Useful for a one-off test
before you've set up hosting.

## An APK

Worth doing only once the app stops changing weekly, since each update then
means a rebuild and reinstall.

**Easiest** — host it (above), then put that URL into
https://www.pwabuilder.com, which produces a signed APK. Nothing to install
locally.

**Self-contained** — wrap it with Capacitor. Needs Android Studio or the
command-line SDK plus a JDK:

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android
npx cap init "Think & Sort" com.example.thinkandsort --web-dir=dist
npx cap add android
npx cap sync
cd android && ./gradlew assembleDebug
# app/build/outputs/apk/debug/app-debug.apk
```

For a kiosk-style build, set `android:screenOrientation="landscape"` in
`android/app/src/main/AndroidManifest.xml`.

## Locking the tablet

None of the above stops him leaving the app — the OS does that:

- **Android** — Settings → Security → *App pinning*, with "ask for PIN before
  unpinning". Open the app, then pin it from the recent-apps view.
- **iPad** — Settings → Accessibility → *Guided Access*, set a passcode, then
  triple-click the side button inside the app.

Settings inside the app explains both, so the instructions are on the tablet.

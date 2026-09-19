/* The reward photographs.
 *
 * The pictures shown on the reward screen are real photographs rather than
 * emoji, because the screen's whole job is pairing a spoken word with the thing
 * it points at, and a photo of a dog teaches that better than a cartoon of one.
 * That only holds while the pairing is actually right, so the checks here are:
 *
 *   - every word in the reward pool has a photo, and every photo has a word
 *     (a stray file would never be shown; a missing one silently drops back to
 *     the emoji, which is the fallback, not the intent)
 *   - the file name still derives to the word it is filed under, since that is
 *     the same rule Settings uses for photos a parent adds from the tablet
 *   - the pictures really are in the built page, since an offline file that
 *     references anything external is broken by definition
 *   - every photo is attributed, because most are CC BY / CC BY-SA and
 *     attribution is a licence condition
 */
const fs = require("fs");
const path = require("path");
const { pureContext, Runner } = require("./_harness");
const { buildPhotoPack, PHOTOS } = require("../tools/build.js");
const { plainAuthor } = require("../tools/make-credits.js");

const R = new Runner("photos");
const check = (c, m) => R.check(c, m);

const { EMOJI_PACK } = pureContext(["30-rewards.js"], ["EMOJI_PACK"]);
const words = EMOJI_PACK.map((p) => p[0]);
// A word with no emoji has no acceptable stand-in, so its photo isn't just
// preferred — it's the only thing that can ever be shown for it.
const photoOnly = EMOJI_PACK.filter((p) => !p[1]).map((p) => p[0]);

const files = fs.readdirSync(PHOTOS).filter((f) => f.endsWith(".webp"));
const wordFromFile = (f) => f.replace(/\.webp$/, "").replace(/-/g, " ").toUpperCase();
const haveWords = files.map(wordFromFile);

check(files.length === words.length,
  "one photo per reward word (" + files.length + " photos, " + words.length + " words)");

const missing = words.filter((w) => haveWords.indexOf(w) === -1);
check(missing.length === 0, "every reward word has a photo" +
  (missing.length ? " — missing " + missing.join(", ") : ""));

const orphans = haveWords.filter((w) => words.indexOf(w) === -1);
check(orphans.length === 0, "no photo without a reward word" +
  (orphans.length ? " — stray " + orphans.join(", ") : ""));

check(photoOnly.length > 0, "at least one word is photo-only (CHAKLI has no emoji)");
const strandedWords = photoOnly.filter((w) => haveWords.indexOf(w) === -1);
check(strandedWords.length === 0,
  "every photo-only word still has its photo, or it could never be shown" +
  (strandedWords.length ? " — stranded: " + strandedWords.join(", ") : ""));

/* Every file must really be a WebP, and small enough that 152 of them inlined
   still leave a page a tablet opens quickly. */
let biggest = 0, bad = [];
files.forEach((f) => {
  const buf = fs.readFileSync(path.join(PHOTOS, f));
  biggest = Math.max(biggest, buf.length);
  const isWebp = buf.slice(0, 4).toString("ascii") === "RIFF" &&
                 buf.slice(8, 12).toString("ascii") === "WEBP";
  // The floor only catches a truncated or empty write. It has to stay low:
  // a plain subject on a plain ground compresses to almost nothing, and
  // egg.webp — a white egg on white — is a legitimate 974 bytes.
  if (!isWebp || buf.length < 300) bad.push(f);
});
check(bad.length === 0, "every photo is a real, non-empty WebP" +
  (bad.length ? " — bad: " + bad.join(", ") : ""));
check(biggest < 80 * 1024, "no single photo is over 80 KB (biggest " + Math.round(biggest / 1024) + " KB)");

const pack = buildPhotoPack();
check(pack.count === files.length, "the build inlines every photo (" + pack.count + ")");
check(pack.bytes < 2.5 * 1024 * 1024,
  "the whole pack stays under 2.5 MB (" + Math.round(pack.bytes / 1024) + " KB)");
check(/^const PHOTO_PACK = \{/.test(pack.js), "the build emits a PHOTO_PACK object");
check(pack.js.indexOf('"ICE CREAM":') !== -1,
  "a hyphenated file name becomes a spaced word (ice-cream.webp is ICE CREAM)");

/* The offline file must carry the pictures itself — no URLs to fetch. */
const built = fs.readFileSync(path.join(__dirname, "..", "dist", "think-and-sort.html"), "utf8");
const inlined = built.match(/data:image\/webp;base64,/g) || [];
check(inlined.length === files.length,
  "the offline file inlines all " + files.length + " photos (found " + inlined.length + ")");
check(!/<img[^>]+src=["']https?:/i.test(built), "no photo is loaded from the network");

/* Attribution: most of these are CC BY / CC BY-SA, where crediting the author
   is a condition of use rather than a nicety. */
const credits = JSON.parse(fs.readFileSync(path.join(PHOTOS, "credits.json"), "utf8"));
check(credits.length === files.length, "credits.json covers every photo");
const uncredited = credits.filter((c) => !c.licence || !plainAuthor(c.author) || !c.page);
check(uncredited.length === 0, "every photo records an author, a licence and a source page" +
  (uncredited.length ? " — missing for " + uncredited.map((c) => c.word).join(", ") : ""));

const creditsMd = fs.readFileSync(path.join(__dirname, "..", "PHOTO-CREDITS.md"), "utf8");
const listed = words.filter((w) => creditsMd.indexOf("| " + w + " |") !== -1);
check(listed.length === words.length,
  "PHOTO-CREDITS.md lists every photo (" + listed.length + " of " + words.length + ")");
check(!/<[a-z/]/i.test(creditsMd.replace(/https?:\/\/\S+/g, "")),
  "no leftover HTML in the credits table");

R.finish();

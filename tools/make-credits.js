#!/usr/bin/env node
/**
 * Regenerate PHOTO-CREDITS.md from src/photos/credits.json.
 *
 * The reward photographs come from Wikimedia Commons and most are CC BY or
 * CC BY-SA, which means attribution is a condition of using them, not a
 * courtesy. credits.json is written by the fetch pipeline and records author,
 * licence and source page for every file; this turns it into the file that
 * ships with the repo.
 *
 *   node tools/make-credits.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src", "photos", "credits.json");
const OUT = path.join(ROOT, "PHOTO-CREDITS.md");

// extmetadata's Artist field is a scrap of HTML — links, spans, sometimes a
// whole table. Flatten it to the plain name.
function plainAuthor(html) {
  return String(html || "")
    // the stored value is capped at 400 chars, so it can end mid-tag
    .replace(/<[^>]*$/, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim() || "Unknown";
}

function generate({ quiet = false } = {}) {
  const recs = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const counts = {};
  recs.forEach((r) => {
    const l = (r.licence || "unknown").trim();
    counts[l] = (counts[l] || 0) + 1;
  });

  const lines = [];
  lines.push("# Photo credits");
  lines.push("");
  lines.push("The " + recs.length + " reward photographs in `src/photos/` come from " +
    "[Wikimedia Commons](https://commons.wikimedia.org). They are cropped square and " +
    "re-encoded as WebP; nothing else about them is changed.");
  lines.push("");
  lines.push("Most are licensed CC BY or CC BY-SA, so **attribution is a condition of " +
    "use, not a courtesy** — this file is that attribution, and it must travel with any " +
    "copy of the app that includes the pictures. Each row links to the source page, " +
    "where the full licence terms live.");
  lines.push("");
  lines.push("Licences in use: " +
    Object.entries(counts).sort((a, b) => b[1] - a[1])
      .map(([l, n]) => l + " (" + n + ")").join(", ") + ".");
  lines.push("");
  lines.push("Regenerate with `node tools/make-credits.js`.");
  lines.push("");
  lines.push("| Word | File | Author | Licence | Source |");
  lines.push("| --- | --- | --- | --- | --- |");
  recs.slice().sort((a, b) => a.word.localeCompare(b.word)).forEach((r) => {
    const src = r.page ? "[Commons](" + r.page + ")" : "—";
    lines.push("| " + r.word + " | `" + r.file + "` | " + plainAuthor(r.author).replace(/\|/g, "/") +
      " | " + (r.licence || "—") + " | " + src + " |");
  });
  lines.push("");

  fs.writeFileSync(OUT, lines.join("\n"));
  if (!quiet) console.log("wrote PHOTO-CREDITS.md (" + recs.length + " photos)");
  return recs.length;
}

module.exports = { generate, plainAuthor };
if (require.main === module) generate();

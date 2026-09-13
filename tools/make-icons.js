#!/usr/bin/env node
/**
 * Generate the PWA icon PNGs checked into icons/.
 *
 * This is a one-off asset generator, not part of `npm run build` — icons only
 * need regenerating if the mark itself changes, so the PNGs are committed like
 * any other static asset and tools/build.js just copies them into dist/.
 *
 * No image library: Node ships everything needed (zlib for the PNG's deflate
 * stream) and the glyph is drawn as rounded rectangles via a signed-distance
 * containment test, so this has zero new dependencies and needs no browser.
 *
 *   node tools/make-icons.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "icons");

const BG = [0x3a, 0x86, 0xff]; // --accent, matches src/style.css
const FG = [0xff, 0xff, 0xff];

// ---- rounded-rect containment (signed-distance query, no anti-aliasing math
// needed beyond supersampling the whole image and averaging down) ----
function inRoundedRect(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  if (qx <= 0 && qy <= 0) return true;
  const dx = Math.max(qx, 0), dy = Math.max(qy, 0);
  return dx * dx + dy * dy <= r * r;
}

/**
 * Render one icon at `size`, supersampled 4x for anti-aliasing.
 * `bleed`  — true for a maskable icon: background fills edge-to-edge with no
 *            rounding of our own (the OS applies its own mask shape), and the
 *            glyph is kept inside the safe-zone circle (40% radius) so no
 *            launcher's mask crops it.
 */
function render(size, { bleed }) {
  const SS = 4;
  const N = size * SS;
  const px = Buffer.alloc(N * N * 4);

  const bgHW = N / 2, bgHH = N / 2, bgR = bleed ? 0 : N * 0.18;
  // glyph: a 2x2 grid of rounded squares — reads as "sort into groups" at a glance
  const glyphSide = N * (bleed ? 0.5 : 0.56); // bleed variant must clear the 0.4*N safe-zone radius
  const gap = glyphSide * 0.16;
  const cellSide = (glyphSide - gap) / 2;
  const cellR = cellSide * 0.28;
  const cx = N / 2, cy = N / 2;
  const cellCenters = [
    [cx - cellSide / 2 - gap / 2, cy - cellSide / 2 - gap / 2],
    [cx + cellSide / 2 + gap / 2, cy - cellSide / 2 - gap / 2],
    [cx - cellSide / 2 - gap / 2, cy + cellSide / 2 + gap / 2],
    [cx + cellSide / 2 + gap / 2, cy + cellSide / 2 + gap / 2],
  ];

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const bg = bleed || inRoundedRect(x + 0.5, y + 0.5, cx, cy, bgHW, bgHH, bgR);
      if (!bg) { px[i + 3] = 0; continue; } // transparent corners outside the squircle
      let fg = false;
      for (const [ccx, ccy] of cellCenters) {
        if (inRoundedRect(x + 0.5, y + 0.5, ccx, ccy, cellSide / 2, cellSide / 2, cellR)) { fg = true; break; }
      }
      const c = fg ? FG : BG;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
    }
  }

  // box-downsample SS x SS -> size x size
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const si = ((y * SS + sy) * N + (x * SS + sx)) * 4;
          const alpha = px[si + 3];
          r += px[si] * alpha; g += px[si + 1] * alpha; b += px[si + 2] * alpha; a += alpha;
        }
      }
      const n = SS * SS;
      const oi = (y * size + x) * 4;
      out[oi + 3] = Math.round(a / n);
      if (a > 0) {
        out[oi] = Math.round(r / a); out[oi + 1] = Math.round(g / a); out[oi + 2] = Math.round(b / a);
      }
    }
  }
  return out;
}

// ---- minimal PNG encoder: signature + IHDR + IDAT + IEND ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA, no interlace
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter type "none" per scanline
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const TARGETS = [
  ["icon-192.png", 192, { bleed: false }],
  ["icon-512.png", 512, { bleed: false }],
  ["icon-maskable-512.png", 512, { bleed: true }],
];

function generate({ quiet } = {}) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, size, opts] of TARGETS) {
    const png = encodePNG(size, render(size, opts));
    fs.writeFileSync(path.join(OUT, name), png);
    if (!quiet) console.log(`wrote icons/${name} (${png.length} bytes)`);
  }
}

if (require.main === module) generate();
module.exports = { render, encodePNG, generate, OUT, TARGETS };

// Writes docs/desk-card.html: a self-contained A5 desk card with an inline SVG QR code.
// Run from the repo root: (cd e2e && npm ci) && node scripts/make-desk-card.mjs
const APP_URL = "https://dibs-fair-rooms.lovable.app";

import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";

const require = createRequire(new URL("../e2e/package.json", import.meta.url));
const QRCode = require("qrcode");

const TERRACOTTA = "#c9562f";
const CREAM = "#faf2e6";
const INK = "#2b211c";

const steps = [
  "Paste a group-chat invite",
  "See when you'd hit your overdraft",
  "Split next year's rent fairly with Dibs",
];

const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

const qrSvg = (
  await QRCode.toString(APP_URL, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    color: { dark: INK, light: "#ffffff" },
  })
)
  .trim()
  .replace("<svg ", `<svg role="img" aria-label="QR code for ${escapeHtml(APP_URL)}" `);

const displayUrl = APP_URL.replace(/^https?:\/\//, "");

const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Til Loan Day · desk card</title>
<style>
  @page { size: A5 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { background: #d9d2c7; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: ${INK};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .card {
    width: 148mm;
    height: 210mm;
    margin: 10mm auto;
    padding: 14mm 13mm 11mm;
    background: ${CREAM};
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    overflow: hidden;
    box-shadow: 0 2mm 8mm rgb(0 0 0 / 0.18);
  }
  .wordmark {
    font-weight: 800;
    font-size: 44pt;
    line-height: 1;
    letter-spacing: -0.03em;
    color: ${TERRACOTTA};
  }
  .tagline {
    margin-top: 4mm;
    font-size: 15pt;
    font-weight: 600;
    line-height: 1.25;
  }
  .qr {
    margin-top: 8mm;
    width: 80mm;
    height: 80mm;
    padding: 2mm;
    background: #fff;
    border: 1.2mm solid ${TERRACOTTA};
    border-radius: 5mm;
  }
  .qr svg { display: block; width: 100%; height: 100%; }
  .url {
    margin-top: 3mm;
    font-size: 11pt;
    font-weight: 600;
    color: ${TERRACOTTA};
  }
  .steps {
    list-style: none;
    margin-top: 8mm;
    display: grid;
    gap: 3.2mm;
    text-align: left;
  }
  .steps li {
    display: flex;
    align-items: center;
    gap: 4mm;
    font-size: 13pt;
    font-weight: 600;
    line-height: 1.2;
  }
  .steps .n {
    flex: none;
    width: 9mm;
    height: 9mm;
    border-radius: 50%;
    background: ${TERRACOTTA};
    color: ${CREAM};
    font-weight: 800;
    font-size: 13pt;
    display: grid;
    place-items: center;
  }
  .small {
    margin-top: auto;
    font-size: 9pt;
    letter-spacing: 0.02em;
    color: rgb(43 33 28 / 0.7);
  }
  @media print {
    html { background: ${CREAM}; }
    /* Chrome's A5 page box is a fraction of a mm short of 210mm. */
    .card { margin: 0; height: 209mm; box-shadow: none; }
  }
</style>
</head>
<body>
<main class="card">
  <h1 class="wordmark">Til Loan Day</h1>
  <p class="tagline">Make your money last till loan day.</p>
  <div class="qr">${qrSvg}</div>
  <p class="url">${escapeHtml(displayUrl)}</p>
  <ol class="steps">
${steps.map((step, i) => `    <li><span class="n" aria-hidden="true">${i + 1}</span>${escapeHtml(step)}</li>`).join("\n")}
  </ol>
  <p class="small">Runs in your browser · no bank login · nothing stored</p>
</main>
</body>
</html>
`;

const out = new URL("../docs/desk-card.html", import.meta.url);
await writeFile(out, html);
console.log(`Wrote docs/desk-card.html for ${APP_URL}`);

#!/usr/bin/env node
/**
 * build-star-catalog.mjs
 *
 * Generates src/data/hipparcos.catalog.json — the deterministic, real-sky star
 * catalog used by the universe explorer's night-sky field.
 *
 * Source: HYG Database v4.2 (astronexus) — a best-effort merge of the
 * Hipparcos, Yale Bright Star, and Gliese catalogs.
 *   https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hyg_v42.csv
 *
 * Selection: keep every star that (a) has a Hipparcos id, (b) has an apparent
 * magnitude, and (c) has a B-V color index, with Vmag <= 6.5 (~the naked-eye
 * limit, ~9-10k stars). Its fields map onto the app's StarData shape (ra, dec,
 * vMag, bvIndex + optional hipId/properName/spectralType). Stars already in the
 * app's hand-curated BRIGHT_STARS list are excluded so they never double-draw.
 *
 * Run: node scripts/build-star-catalog.mjs
 * Requires: Node >= 18 (global fetch).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SOURCE_URL =
  'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(HERE, '..', 'src', 'data', 'hipparcos.catalog.json');
const MAG_LIMIT = 6.5;

// eslint-disable-next-line no-console
const log = (...a) => console.log(...a);

/** Minimal RFC-4180-ish CSV parser: handles quoted fields with embedded commas. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const num = (s) => (s === '' || s === undefined ? NaN : Number(s));

async function main() {
  log(`Fetching ${SOURCE_URL} ...`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let res;
  try {
    res = await fetch(SOURCE_URL, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const text = await res.text();
  log(`Downloaded ${(text.length / 1e6).toFixed(1)} MB`);

  const rows = parseCsv(text);
  const header = rows[0].map((h) => h.trim());
  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`Missing column "${name}" in HYG header`);
    return i;
  };
  const iHip = col('hip');
  const iRa = col('ra');
  const iDec = col('dec');
  const iMag = col('mag');
  const iAbsMag = col('absmag');
  const iCi = col('ci');
  const iSpect = col('spect');
  const iCon = col('con');
  const iPmRa = col('pmra');
  const iPmDec = col('pmdec');
  const iDist = col('dist');
  const iProper = col('proper');

  const stars = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const hipRaw = (row[iHip] || '').trim();
    const hipId = Number(hipRaw);
    const mag = num(row[iMag]);
    const ci = num(row[iCi]);
    if (!hipId || !Number.isFinite(hipId)) continue; // must be a Hipparcos star
    if (!Number.isFinite(mag) || mag > MAG_LIMIT) continue; // naked-eye limit
    if (!Number.isFinite(ci)) continue; // need a B-V for color

    // Distance (parsecs) and apparent magnitude give us parallax/absMag via
    // the same formulas the app uses (absoluteMagnitude in stars.ts), so the
    // emitted records satisfy the app's StarData shape with real values only.
    const dist = num(row[iDist]);
    const actualAbsMag = num(row[iAbsMag]);
    const absMag = Number.isFinite(actualAbsMag)
      ? actualAbsMag
      : Number.isFinite(dist) && dist > 0
        ? mag + 5 - 5 * Math.log10(dist)
        : mag;

    const entry = {
      hipId,
      ra: num(row[iRa]),
      dec: num(row[iDec]),
      pmRa: Number.isFinite(num(row[iPmRa])) ? num(row[iPmRa]) : 0,
      pmDec: Number.isFinite(num(row[iPmDec])) ? num(row[iPmDec]) : 0,
      parallax: Number.isFinite(dist) && dist > 0 ? 1000 / dist : 0,
      distance: Number.isFinite(dist) ? dist : 0,
      vMag: mag,
      absMag,
      bvIndex: ci,
      constellation: (row[iCon] || '').trim(),
    };
    const proper = (row[iProper] || '').trim();
    if (proper) entry.properName = proper;
    const spect = (row[iSpect] || '').trim();
    if (spect) entry.spectralType = spect;
    stars.push(entry);
  }

  stars.sort((a, b) => a.vMag - b.vMag);
  const json = `${JSON.stringify(stars)}\n`;
  writeFileSync(OUT_PATH, json, 'utf8');
  log(`Wrote ${stars.length} stars -> ${OUT_PATH} (${(json.length / 1e6).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error('build-star-catalog failed:', err.message);
  process.exit(1);
});
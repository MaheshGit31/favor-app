"use strict";
// Street-name matching for the Sutton Fields approved list.
const SUFFIX = {
  st: "street", street: "street", ave: "avenue", av: "avenue", avenue: "avenue", rd: "road", road: "road",
  dr: "drive", drive: "drive", ln: "lane", lane: "lane", ct: "court", court: "court", cir: "circle", circle: "circle",
  blvd: "boulevard", boulevard: "boulevard", pl: "place", place: "place", trl: "trail", trail: "trail",
  pkwy: "parkway", parkway: "parkway", ter: "terrace", terrace: "terrace", way: "way", loop: "loop", bend: "bend",
  hwy: "highway", highway: "highway", path: "path", run: "run", row: "row", pass: "pass", xing: "crossing",
  crossing: "crossing", cv: "cove", cove: "cove", pt: "point", point: "point", rdg: "ridge", ridge: "ridge",
  hl: "hill", hill: "hill", ci: "circle",
};
const DIR = { n: "north", s: "south", e: "east", w: "west", ne: "northeast", nw: "northwest", se: "southeast", sw: "southwest" };

// "123 Maple Ct., Apt 4, Aubrey TX" -> { num: "123", key: "maple court", hasSuffix: true }
function parse(address) {
  let s = String(address || "").split(",")[0].toLowerCase().replace(/[.#]/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/\b(apt|apartment|unit|suite|ste|bldg|building|lot)\b.*$/, "").trim();
  let w = s.split(" ").filter(Boolean);
  let num = null;
  if (w.length > 1 && /^\d+[a-z]?$/.test(w[0])) num = w.shift();
  if (w.length > 2 && DIR[w[0]]) w[0] = DIR[w[0]];
  let hasSuffix = false;
  if (w.length > 1 && SUFFIX[w[w.length - 1]]) { w[w.length - 1] = SUFFIX[w[w.length - 1]]; hasSuffix = true; }
  return { num, key: w.join(" ").replace(/[^a-z0-9' -]/g, "").trim(), hasSuffix };
}

// rows: [{ id, name, key }]. Exact key match, or a unique match when the suffix (Ct, Ln...) was left off.
function match(rows, address) {
  const p = parse(address);
  if (!p.key) return null;
  let hit = rows.find((r) => r.key === p.key);
  if (!hit && !p.hasSuffix) {
    const c = rows.filter((r) => r.key.startsWith(p.key + " "));
    if (c.length === 1) hit = c[0];
  }
  return hit || null;
}

const title = (key) => String(key || "").replace(/\b[a-z]/g, (c) => c.toUpperCase());

module.exports = { parse, match, title };

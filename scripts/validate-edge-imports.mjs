#!/usr/bin/env node
/**
 * Pre-deploy validation: scans supabase/functions/**\/*.ts for external
 * import URLs (https://...) and verifies each is reachable. Fails (exit 1)
 * if any URL returns a non-2xx status or times out.
 *
 * Usage:
 *   node scripts/validate-edge-imports.mjs
 *   node scripts/validate-edge-imports.mjs --function=admin-ai-assistant
 *   node scripts/validate-edge-imports.mjs --timeout=15000
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = "supabase/functions";
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const TIMEOUT_MS = Number(args.timeout ?? 10_000);
const ONLY_FN = typeof args.function === "string" ? args.function : null;
const CONCURRENCY = Number(args.concurrency ?? 8);

const IMPORT_RE =
  /(?:import|export)\s+(?:[\s\S]*?)\s+from\s+["'](https:\/\/[^"']+)["']|import\(["'](https:\/\/[^"']+)["']\)/g;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const p = join(dir, entry);
    const s = await stat(p);
    if (s.isDirectory()) out.push(...(await walk(p)));
    else if (entry.endsWith(".ts")) out.push(p);
  }
  return out;
}

async function extractImports(file) {
  const src = await readFile(file, "utf8");
  const urls = new Set();
  for (const m of src.matchAll(IMPORT_RE)) {
    const url = m[1] || m[2];
    if (url) urls.add(url);
  }
  return [...urls];
}

async function checkUrl(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    if (res.status === 405 || res.status === 403 || res.status === 404) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    }
    return { url, ok: res.ok, status: res.status };
  } catch (err) {
    return { url, ok: false, status: 0, error: err.name === "AbortError" ? `timeout >${TIMEOUT_MS}ms` : err.message };
  } finally {
    clearTimeout(t);
  }
}

async function pool(items, worker, size) {
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await worker(items[idx]);
      }
    })
  );
  return results;
}

(async () => {
  const files = (await walk(ROOT)).filter(
    (f) => !ONLY_FN || f.includes(`/${ONLY_FN}/`)
  );

  if (files.length === 0) {
    console.error(`No edge function files found${ONLY_FN ? ` for "${ONLY_FN}"` : ""}.`);
    process.exit(1);
  }

  // Map url -> files using it
  const urlToFiles = new Map();
  for (const file of files) {
    for (const url of await extractImports(file)) {
      if (!urlToFiles.has(url)) urlToFiles.set(url, []);
      urlToFiles.get(url).push(relative(process.cwd(), file));
    }
  }

  const urls = [...urlToFiles.keys()];
  console.log(`Validating ${urls.length} unique imports across ${files.length} files (timeout ${TIMEOUT_MS}ms)...\n`);

  const results = await pool(urls, checkUrl, CONCURRENCY);

  const failures = results.filter((r) => !r.ok);
  for (const r of results.sort((a, b) => Number(a.ok) - Number(b.ok))) {
    const tag = r.ok ? "✓" : "✗";
    const detail = r.ok ? `${r.status}` : `${r.status || "ERR"} ${r.error ?? ""}`.trim();
    console.log(`${tag} [${detail}] ${r.url}`);
    if (!r.ok) {
      for (const f of urlToFiles.get(r.url)) console.log(`    used by ${f}`);
    }
  }

  console.log(`\n${results.length - failures.length}/${results.length} reachable`);
  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} unreachable import(s). Update or replace these before deploying.`);
    process.exit(1);
  }
  console.log("✅ All edge function imports reachable.");
})().catch((e) => {
  console.error("Validator crashed:", e);
  process.exit(1);
});

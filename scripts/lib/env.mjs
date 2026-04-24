import fs from "node:fs";
import path from "node:path";

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(filename, root = process.cwd()) {
  const filePath = path.join(root, filename);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  const entries = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim().replace(/^export\s+/, "");
    entries.push([key, stripQuotes(trimmed.slice(eq + 1))]);
  }
  return entries;
}

function applyEnvEntries(entries) {
  const pending = new Map();
  for (const [key, value] of entries) {
    if (process.env[key] || pending.has(key)) continue;
    pending.set(key, value);
  }

  const resolving = new Set();
  const resolved = new Map();

  function resolveKey(key) {
    if (resolved.has(key)) return resolved.get(key);
    if (process.env[key]) return process.env[key];
    if (!pending.has(key)) return undefined;
    if (resolving.has(key)) return pending.get(key);

    resolving.add(key);
    const value = pending.get(key).replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (match, refKey) => {
      const refValue = resolveKey(refKey);
      return refValue ?? match;
    });
    resolving.delete(key);
    resolved.set(key, value);
    return value;
  }

  for (const key of pending.keys()) {
    process.env[key] = resolveKey(key) ?? pending.get(key);
  }
}

export function loadEnvFile(filename, root = process.cwd()) {
  applyEnvEntries(parseEnvFile(filename, root));
}

export function loadDefaultEnv(root = process.cwd()) {
  const entries = [".env", ".env.local"].flatMap((filename) => parseEnvFile(filename, root));
  applyEnvEntries(entries);
}

// Runs a command and masks currency amounts and exact private training prices in its output, so a priced run cannot leak a value into a log.
//   node scripts/run-masked.mjs <command> [args...]
// The exit code is the command's own. Masking is a second layer: the priced checks are also written to fail without printing values.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRICE_SLOTS, PRICES_FILE } from "../src/lib/training-prices.mjs";
import { decodePriceEntities } from "./price-text.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("run-masked: no command given.");
  process.exit(2);
}

const exact = [];
const file = resolve(process.cwd(), PRICES_FILE);
if (existsSync(file)) {
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    for (const [course, key] of PRICE_SLOTS) {
      const value = data?.[course]?.[key];
      if (typeof value === "string" && value.length > 1) exact.push(value, value.replaceAll(",", ""));
    }
  } catch { /* Unusable input is reported by the build itself, with fixed text. */ }
}
exact.sort((a, b) => b.length - a.length);

const AMOUNT = /[£€$]\p{White_Space}*\p{Nd}[\p{Nd},]*(?:\.\p{Nd}+)?/gu;
const mask = (text) => {
  let out = decodePriceEntities(text);
  for (const value of exact) out = out.split(value).join("[amount]");
  return out.replace(AMOUNT, "[amount]");
};

// Keep stdout/stderr in arrival order until the command finishes: a fragmented
// value must not escape across chunks, lines, markup or output channels.
const limit = 8 * 1024 * 1024;
let size = 0;
let chunks = [];
let suppressed = false;
function collect(stream) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    if (suppressed) return;
    size += Buffer.byteLength(chunk, "utf8");
    if (size > limit) { suppressed = true; chunks = []; return; }
    chunks.push(chunk);
  });
}

const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
collect(child.stdout);
collect(child.stderr);
child.on("error", () => { console.error("run-masked: the command could not start."); process.exit(127); });
child.on("close", (code, signal) => {
  process.stdout.write(suppressed ? "run-masked: output suppressed after the safe buffer limit.\n" : mask(chunks.join("")));
  chunks = [];
  process.exitCode = code ?? (signal ? 1 : 0);
});

// Runs a command and masks currency amounts and exact private training prices in its output, so a priced run cannot leak a value into a log.
//   node scripts/run-masked.mjs <command> [args...]
// The exit code is the command's own. Masking is a second layer: the priced checks are also written to fail without printing values.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRICE_SLOTS, PRICES_FILE } from "../src/lib/training-prices.mjs";

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

const AMOUNT = /[£€$]\s?\d[\d,]*(?:\.\d+)?/g;
const mask = (text) => {
  let out = text;
  for (const value of exact) out = out.split(value).join("[amount]");
  return out.replace(AMOUNT, "[amount]");
};

function relay(stream, target) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    pending += chunk;
    const cut = pending.lastIndexOf("\n");
    if (cut < 0) return;
    target.write(mask(pending.slice(0, cut + 1)));
    pending = pending.slice(cut + 1);
  });
  stream.on("end", () => { if (pending) target.write(mask(pending)); });
}

const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
relay(child.stdout, process.stdout);
relay(child.stderr, process.stderr);
child.on("error", () => { console.error("run-masked: the command could not start."); process.exit(127); });
child.on("close", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));

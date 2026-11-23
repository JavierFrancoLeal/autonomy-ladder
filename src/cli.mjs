#!/usr/bin/env node
/**
 * Autonomy Ladder — Standalone CLI (Zero Dependencies)
 * Commands:
 *   autonomy-ladder grade <file> [--json] [--ci]
 *   autonomy-ladder log <file> --pattern <name> --outcome <ok|corrected|error> [--tier YELLOW] [--serious] [--sensitive]
 */
import fs from "node:fs";
import path from "node:path";
import { gradeEvents, parseSupervisionLog } from "./core.mjs";

const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === "--help" || cmd === "-h") {
  console.log(
    "Usage:\n" +
      "  autonomy-ladder grade <supervision.jsonl|supervision.md> [--json] [--ci]\n" +
      "  autonomy-ladder log <supervision.jsonl> --pattern <name> --outcome <ok|corrected|error> [--tier YELLOW] [--serious] [--sensitive]",
  );
  process.exit(0);
}

if (cmd === "log") {
  const file = args[1];
  if (!file) {
    console.error("Missing log file path.");
    process.exit(1);
  }
  const getOpt = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  };
  const pattern = getOpt("--pattern");
  const outcome = getOpt("--outcome");
  if (!pattern || !outcome) {
    console.error("Both --pattern and --outcome are required.");
    process.exit(1);
  }
  const entry = {
    timestamp: new Date().toISOString(),
    pattern,
    outcome,
    currentTier: (getOpt("--tier") || "YELLOW").toUpperCase(),
    serious: args.includes("--serious"),
    sensitive: args.includes("--sensitive"),
  };
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf8");
  console.log(`Recorded: ${JSON.stringify(entry)}`);
  process.exit(0);
}

if (cmd === "grade") {
  const file = args[1];
  const asJson = args.includes("--json");
  const ciMode = args.includes("--ci");
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const empty = { status: "no_data", message: `Supervision log not found: ${file || "(none)"}` };
    console.log(asJson ? JSON.stringify(empty, null, 2) : empty.message);
    process.exit(ciMode ? 1 : 0);
  }

  const raw = fs.readFileSync(file, "utf8");
  const events = parseSupervisionLog(raw);
  const report = gradeEvents(events);

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.status === "no_data") {
    console.log("No supervision evidence found. Autonomy Ladder never invents grades.");
  } else {
    console.log(`Autonomy Ladder Report — ${file}`);
    console.log(`Total events: ${report.totalEvents} | Overall Domain Autonomy Level: ${report.overallLevel}/5\n`);
    console.log("Pattern".padEnd(28) + "N".padStart(4) + "  OK%".padStart(7) + "  Grade  Signal      Action");
    console.log("-".repeat(86));
    for (const p of report.patterns) {
      console.log(
        p.pattern.slice(0, 27).padEnd(28) +
          String(p.samples).padStart(4) +
          `${p.okRate.toFixed(1)}%`.padStart(7) +
          `    ${p.grade}    ${p.signal.padEnd(11)} ${p.action}`,
      );
    }
    if (report.proposals.length > 0) {
      console.log("\nProposed decisions.md changes (human approval required — never auto-edited):");
      for (const prop of report.proposals) {
        console.log(`  ${prop.proposal}`);
      }
    }
  }

  if (ciMode && (report.hasRegression || report.status === "no_data")) {
    process.exit(1);
  }
  process.exit(0);
}

console.error(`Unknown command: ${cmd}`);
process.exit(1);

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { gradeEvents, parseSupervisionLog } from "../src/core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CLI = path.join(ROOT, "src", "cli.mjs");
const MCP = path.join(ROOT, "src", "mcp-server.mjs");

test("1. Empty log returns no_data and never invents grades", () => {
  const res = gradeEvents([]);
  assert.equal(res.status, "no_data");
  assert.equal(res.overallLevel, null);
});

test("2. Grades A (>=10 samples, >=95% OK, 0 errors), B (>=5, >=85%), C (small sample), D (<70% or serious)", () => {
  const events = [
    ...Array.from({ length: 12 }, () => ({ pattern: "format-code", outcome: "ok", currentTier: "YELLOW" })),
    ...Array.from({ length: 9 }, () => ({ pattern: "draft-changelog", outcome: "ok", currentTier: "GREEN" })),
    { pattern: "draft-changelog", outcome: "corrected", currentTier: "GREEN" },
    ...Array.from({ length: 4 }, () => ({ pattern: "schema-migration", outcome: "ok", currentTier: "YELLOW" })),
  ];
  const r = gradeEvents(events);
  assert.equal(r.status, "graded");
  const byName = Object.fromEntries(r.patterns.map((p) => [p.pattern, p]));
  assert.equal(byName["format-code"].grade, "A");
  assert.equal(byName["format-code"].recommendedTier, "GREEN");
  assert.equal(byName["draft-changelog"].grade, "B");
  assert.equal(byName["draft-changelog"].recommendedTier, "FLAG");
  assert.equal(byName["schema-migration"].grade, "C");
  assert.equal(byName["schema-migration"].recommendedTier, "YELLOW");
  assert.equal(r.overallLevel, 3);
});

test("3. Any serious or credential/money error demotes pattern to RED and drops overall level to 1", () => {
  const events = [
    ...Array.from({ length: 15 }, () => ({ pattern: "lint-fix", outcome: "ok", currentTier: "GREEN" })),
    ...Array.from({ length: 9 }, () => ({ pattern: "rotate-credentials", outcome: "ok", currentTier: "YELLOW" })),
    { pattern: "rotate-credentials", outcome: "error", currentTier: "YELLOW", serious: true },
  ];
  const r = gradeEvents(events);
  const cred = r.patterns.find((p) => p.pattern === "rotate-credentials");
  assert.equal(cred.grade, "D");
  assert.equal(cred.recommendedTier, "RED");
  assert.equal(cred.acceptMode, "OBSERVE");
  assert.equal(r.overallLevel, 1);
  assert.equal(r.hasRegression, true);
});

test("4. Parses Markdown tables, structured bullets, and JSONL identically", () => {
  const md = `
# Supervision Log
| pattern | outcome | tier | serious | sensitive |
| :--- | :--- | :--- | :--- | :--- |
| run-tests | ok | YELLOW | false | false |
- [run-tests] outcome=ok tier=YELLOW
{"pattern":"run-tests","outcome":"ok","currentTier":"YELLOW"}
`;
  const parsed = parseSupervisionLog(md);
  assert.equal(parsed.length, 3);
  assert.ok(parsed.every((e) => e.pattern === "run-tests" && e.outcome === "ok"));
});

test("5. CLI log + grade --ci exits 0 when healthy and exits 1 on Grade D regression", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "al-cli-"));
  const logFile = path.join(dir, "supervision.jsonl");
  try {
    for (let i = 0; i < 10; i++) {
      const r = spawnSync(process.execPath, [CLI, "log", logFile, "--pattern", "run-tests", "--outcome", "ok", "--tier", "YELLOW"], { encoding: "utf8" });
      assert.equal(r.status, 0);
    }
    const g1 = spawnSync(process.execPath, [CLI, "grade", logFile, "--ci", "--json"], { encoding: "utf8" });
    assert.equal(g1.status, 0);
    const j1 = JSON.parse(g1.stdout);
    assert.equal(j1.overallLevel, 5);

    // Inject a serious error -> CI must exit 1!
    spawnSync(process.execPath, [CLI, "log", logFile, "--pattern", "deploy-prod", "--outcome", "error", "--serious"], { encoding: "utf8" });
    const g2 = spawnSync(process.execPath, [CLI, "grade", logFile, "--ci"], { encoding: "utf8" });
    assert.equal(g2.status, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("6. Stdio MCP server handles initialize, tools/list, and autonomy_grade_events over JSON-RPC", async () => {
  const child = spawn(process.execPath, [MCP], { stdio: ["pipe", "pipe", "pipe"] });
  const responses = [];
  let buf = "";
  child.stdout.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) responses.push(JSON.parse(line));
    }
  });
  const send = (obj) => child.stdin.write(`${JSON.stringify(obj)}\n`);
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  send({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "autonomy_grade_events",
      arguments: {
        events: Array.from({ length: 10 }, () => ({ pattern: "lint-fix", outcome: "ok", currentTier: "YELLOW" })),
      },
    },
  });
  child.stdin.end();
  await new Promise((resolve) => child.on("close", resolve));
  assert.equal(responses.length, 3);
  assert.equal(responses[0].result.serverInfo.name, "autonomy-ladder");
  assert.equal(responses[1].result.tools.length, 3);
  const graded = JSON.parse(responses[2].result.content[0].text);
  assert.equal(graded.overallLevel, 5);
  assert.equal(graded.patterns[0].recommendedTier, "GREEN");
});

test("7. Edge-case regressions: blank/pattern-less events return no_data (never Level 5) and Grade D on RED never promotes to YELLOW", () => {
  const blankRes = gradeEvents([{ pattern: "   ", outcome: "ok" }, { outcome: "ok" }]);
  assert.equal(blankRes.status, "no_data");
  assert.equal(blankRes.overallLevel, null);

  const redD = gradeEvents([
    { pattern: "legacy-sync", outcome: "error", currentTier: "RED" },
    { pattern: "legacy-sync", outcome: "error", currentTier: "RED" },
  ]);
  const p = redD.patterns[0];
  assert.equal(p.grade, "D");
  assert.equal(p.recommendedTier, "RED");
  assert.equal(redD.proposals.length, 0, "Should NOT propose RED -> YELLOW promotion on Grade D");
});

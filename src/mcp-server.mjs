#!/usr/bin/env node
/**
 * Autonomy Ladder — Zero-Dependency Stdio MCP Server (Advisory Evidence Grader)
 * Exposes 3 tools to Claude Code, Cursor, Gemini CLI, Antigravity, and DSH:
 *   - autonomy_grade_events
 *   - autonomy_grade_file
 *   - autonomy_record_event
 * Never auto-edits decisions.md — the human always approves tier moves.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { gradeEvents, parseSupervisionLog } from "./core.mjs";

const TOOLS = [
  {
    name: "autonomy_grade_events",
    description: "Grade an array of supervision events into A/B/C/D trust scores, Traffic-Light tier proposals (GREEN/FLAG/YELLOW/RED), and overall Autonomy Level (1-5).",
    inputSchema: {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              pattern: { type: "string" },
              outcome: { type: "string", enum: ["ok", "corrected", "error"] },
              currentTier: { type: "string", enum: ["GREEN", "FLAG", "YELLOW", "RED"] },
              serious: { type: "boolean" },
              sensitive: { type: "boolean" },
            },
            required: ["pattern", "outcome"],
          },
        },
      },
      required: ["events"],
    },
  },
  {
    name: "autonomy_grade_file",
    description: "Parse a supervision.jsonl or supervision.md file and compute evidence-based Traffic-Light autonomy grades.",
    inputSchema: {
      type: "object",
      properties: { filePath: { type: "string" } },
      required: ["filePath"],
    },
  },
  {
    name: "autonomy_record_event",
    description: "Append a structured supervision outcome event to a JSONL log file.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: { type: "string" },
        pattern: { type: "string" },
        outcome: { type: "string", enum: ["ok", "corrected", "error"] },
        currentTier: { type: "string", enum: ["GREEN", "FLAG", "YELLOW", "RED"] },
        serious: { type: "boolean" },
        sensitive: { type: "boolean" },
      },
      required: ["filePath", "pattern", "outcome"],
    },
  },
];

function send(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

function handleRequest(req) {
  const { id, method, params } = req;
  if (method === "initialize") {
    return send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "autonomy-ladder", version: "1.0.0" },
      },
    });
  }
  if (method === "notifications/initialized") return;
  if (method === "tools/list") {
    return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }
  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};
    let payload;
    if (name === "autonomy_grade_events") {
      payload = gradeEvents(args.events || []);
    } else if (name === "autonomy_grade_file") {
      if (!args.filePath || !fs.existsSync(args.filePath)) {
        payload = { status: "no_data", message: `File not found: ${args.filePath}` };
      } else {
        payload = gradeEvents(parseSupervisionLog(fs.readFileSync(args.filePath, "utf8")));
      }
    } else if (name === "autonomy_record_event") {
      const entry = {
        timestamp: new Date().toISOString(),
        pattern: args.pattern,
        outcome: args.outcome,
        currentTier: (args.currentTier || "YELLOW").toUpperCase(),
        serious: Boolean(args.serious),
        sensitive: Boolean(args.sensitive),
      };
      fs.mkdirSync(path.dirname(path.resolve(args.filePath)), { recursive: true });
      fs.appendFileSync(args.filePath, `${JSON.stringify(entry)}\n`, "utf8");
      payload = { recorded: true, entry };
    } else {
      return send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${name}` } });
    }
    return send({
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text: JSON.stringify(payload) }] },
    });
  }
  if (id !== undefined) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    handleRequest(JSON.parse(trimmed));
  } catch (err) {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: `Parse error: ${err.message}` } });
  }
});

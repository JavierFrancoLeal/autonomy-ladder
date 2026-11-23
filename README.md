# Autonomy Ladder (`@franco/autonomy-ladder`)

[![CI](https://github.com/JavierFrancoLeal/autonomy-ladder/actions/workflows/ci.yml/badge.svg)](https://github.com/JavierFrancoLeal/autonomy-ladder/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

**Evidence-based Traffic-Light Autonomy Grader (`🟢 / ⚑ / 🟡 / 🔴`) for AI agents.**  
*By [Javier Franco](https://github.com/JavierFrancoLeal) · `v1.0.0` · Zero External Dependencies · Apache-2.0*

> **Autonomy is earned, never assumed.** Autonomy Ladder parses real supervision logs (`JSONL` or `Markdown`), computes deterministic `A/B/C/D` trust grades, proposes Traffic-Light tier promotions/demotions, and exits non-zero in CI on any Grade `D` regression. **The grader proposes; the human decides.**  
> 📖 **Read the essay:** [Earned Autonomy: Climbing the Traffic-Light Ladder](./docs/ESSAY_EARNED_AUTONOMY.md)

![Autonomy Ladder Terminal Demo](./assets/demo-terminal.svg)

---

## Grading Rules (100 % Deterministic)

| Grade | Evidence Threshold | Traffic-Light Signal | Accept Mode |
| :--- | :--- | :--- | :--- |
| **A** | `>= 10` samples, `>= 95%` verified OK, `0` errors | 🟢 **GREEN** | `EXECUTE` (propose promotion) |
| **B** | `>= 5` samples, `>= 85%` verified OK, `0` serious errors | ⚑ **FLAG** | Keep & watch |
| **C** | Fewer samples, or `70–85%` OK, or minor corrections | 🟡 **YELLOW** | `PROPOSE` (human approval) |
| **D** | `< 70%` OK, or **any** serious / safety / credential / money error | 🔴 **RED** (or 🟡) | `OBSERVE` (immediate demotion; domain drops to `1/5`) |

---

## Quick Start (Zero Dependencies, Node `>= 18`)

```bash
git clone https://github.com/JavierFrancoLeal/autonomy-ladder.git
cd autonomy-ladder
npm test
```

### Log & Grade via CLI
```bash
node src/cli.mjs log supervision.jsonl --pattern format-and-lint --outcome ok --tier YELLOW
node src/cli.mjs grade supervision.jsonl --ci
```

### Use as a Stdio MCP Server (Claude Code / Cursor / Gemini CLI / Antigravity / DSH)
```json
{
  "mcpServers": {
    "autonomy-ladder": {
      "command": "node",
      "args": ["/path/to/autonomy-ladder/src/mcp-server.mjs"]
    }
  }
}
```

---

## Open-Source Agent Engineering Trilogy (All `v1.0.0+` Live)

| Flagship | Role | Status |
| :--- | :--- | :--- |
| **[`casebook`](https://github.com/JavierFrancoLeal/casebook)** | Bounded-entropy 4-tier memory, Open Symptoms Radar & executable oracle | **`v1.0.0` Live** |
| **[`dual-brain-guard`](https://github.com/JavierFrancoLeal/dual-brain-guard)** | Harness-agnostic mechanical cross-model verification (`CLI + MCP + hooks`) | **`v1.1.0` Live** |
| **[`autonomy-ladder`](https://github.com/JavierFrancoLeal/autonomy-ladder)** | Evidence-based Traffic-Light autonomy grader (`🟢 / ⚑ / 🟡 / 🔴`) | **`v1.0.0` Live** |

---

## License

Apache License 2.0 — see [LICENSE](./LICENSE).

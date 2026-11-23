# Autonomy Ladder (`@franco/autonomy-ladder`)

[![CI](https://github.com/JavierFrancoLeal/autonomy-ladder/actions/workflows/ci.yml/badge.svg)](https://github.com/JavierFrancoLeal/autonomy-ladder/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

**Evidence-based Traffic-Light Autonomy Grader (`🟢 / ⚑ / 🟡 / 🔴`) for AI agents.**  
*By [Javier Franco](https://github.com/JavierFrancoLeal) · `v1.0.2` · Zero External Dependencies · Apache-2.0*

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

## Open-Source Agent Governance Suite

| Repository | Role | Status |
| :--- | :--- | :--- |
| **[`casebook`](https://github.com/JavierFrancoLeal/casebook)** | Bounded-entropy 4-tier constitutional memory, Open Symptoms Radar & 5-to-1 compaction oracle | **`v1.0.1` Live** |
| **[`dual-brain-guard`](https://github.com/JavierFrancoLeal/dual-brain-guard)** | Harness-agnostic mechanical Proposer != Verifier cross-model guard (`CLI + MCP + hooks`) | **`v1.1.1` Live** |
| **[`autonomy-ladder`](https://github.com/JavierFrancoLeal/autonomy-ladder)** | Evidence-based Traffic-Light autonomy grader (`🟢 / ⚑ / 🟡 / 🔴` & `A/B/C/D` trust scores) | **`v1.0.2` Live** |
| **[`governed-browser`](https://github.com/JavierFrancoLeal/governed-browser)** | Constitutional commit-click brake (`🛑 RED` on Send/Pay/Delete) & SHA-256 hash-chained audit trail | **`v1.0.1` Live** |
| **[`forensic-contracts`](https://github.com/JavierFrancoLeal/forensic-contracts)** | 5-line `@forensic-contract` linter, `@blast-radius` cage enforcer & literal `sourcePin` verifier | **`v1.0.1` Live** |
| **[`agent-governance`](https://github.com/JavierFrancoLeal/agent-governance)** | Complete 26-plugin DeepSeek Harness governance suite (mother repository) | **`v1.0.0` Live** |
| **[`best-security-governance-architects`](https://github.com/JavierFrancoLeal/best-security-governance-architects)** | CPU-first pre-merge security & governance suite (`ECOSYSTEM_CONTRACT v1.2.0`) | **`v1.2.0` Live** |
| **[`best-ui-ux-designers`](https://github.com/JavierFrancoLeal/best-ui-ux-designers)** | Adversarial UI/UX design judgment suite — 12 Barbell design minds & 4 Via Negativa auditors | **`v1.2.0` Live** |

---

## License

Apache License 2.0 — see [LICENSE](./LICENSE).

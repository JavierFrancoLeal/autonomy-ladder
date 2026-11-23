# Earned Autonomy: Why AI Agents Should Climb a Traffic-Light Ladder Instead of Starting at Full Access

*Field notes on replacing static permission prompts with evidence-based autonomy scoring — by [Javier Franco](https://github.com/JavierFrancoLeal).*

---

## 1. The Binary Autonomy Trap

Most AI coding setups live at one of two broken extremes:
1. **Paranoid mode:** the human clicks "Approve" 80 times per session on harmless `git status` and formatting commands — until approval fatigue sets in and they blindly click "Approve" on a destructive `git reset --hard`.
2. **YOLO mode:** the agent runs with blanket auto-approve on everything — until one silent hallucination leaks a secret, strips a native module, or pushes broken code to `main`.

Both extremes fail for the same reason: **autonomy is treated as a static toggle instead of an earned, evidence-backed gradient.**

---

## 2. The Traffic-Light Ladder (`🟢 / ⚑ / 🟡 / 🔴`)

**Autonomy Ladder** treats agent trust the same way aviation and clinical engineering treat operational privileges — **patterns earn autonomy through verified runs, and lose it immediately on a single serious failure**:

- **Grade A (`>= 10` samples, `>= 95%` verified OK, `0` errors)** → **🟢 GREEN (`EXECUTE`)**: candidate for automatic execution.
- **Grade B (`>= 5` samples, `>= 85%` verified OK, `0` serious errors)** → **⚑ FLAG**: keep current tier and monitor minor corrections.
- **Grade C (fewer samples or `70–85%` OK)** → **🟡 YELLOW (`PROPOSE`)**: human approval required; gather more evidence.
- **Grade D (`< 70%` OK, OR any serious error, OR any error touching safety/credentials/money)** → **🔴 RED (`OBSERVE`)**: immediate demotion and overall domain level drops to `1/5`.

Crucial invariant: **the grader only proposes; the human edits `decisions.md` and signs off.** An agent never promotes its own permissions.

---

## 3. Completing the Open-Source Agent Engineering Trilogy

Autonomy Ladder closes the loop with its two companion repositories:
1. **[`casebook`](https://github.com/JavierFrancoLeal/casebook)** — bounds memory entropy across 4 tiers (`Transferability × Recurrence`, Open Symptoms Radar, executable oracles).
2. **[`dual-brain-guard`](https://github.com/JavierFrancoLeal/dual-brain-guard)** — mechanically blocks unaudited `git commit`/`push` and turn completion until an independent second brain verifies the real diff.
3. **[`autonomy-ladder`](https://github.com/JavierFrancoLeal/autonomy-ladder)** — turns the resulting supervision trail into deterministic A/B/C/D trust grades and Traffic-Light tier proposals (`CLI + MCP + CI`).

Together, they replace fragile prompt-only checklists with **bounded memory, mechanical cross-verification, and earned autonomy.**

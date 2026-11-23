/**
 * Autonomy Ladder — Deterministic Evidence Parser & Trust Grading Engine (Zero Dependencies)
 * Turns supervision logs (JSONL or Markdown) into A/B/C/D trust grades,
 * Traffic-Light tier proposals (GREEN / FLAG / YELLOW / RED), Accept Modes (EXECUTE / PROPOSE / OBSERVE),
 * and an overall domain Autonomy Level (1..5). Never edits decisions.md automatically.
 */

export const TIER_SIGNALS = {
  GREEN: "🟢 GREEN",
  FLAG: "⚑ FLAG",
  YELLOW: "🟡 YELLOW",
  RED: "🔴 RED",
};

const SENSITIVE_PATTERN_RE = /\b(auth|secret|credential|key|token|payment|billing|money|prod|deploy|delete|drop|safety|security)\b/i;

export function parseSupervisionLog(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return [];
  const events = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("<!--")) continue;

    // 1. JSONL line
    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        const obj = JSON.parse(line);
        if (obj && typeof obj.pattern === "string" && obj.pattern.trim()) {
          events.push(normalizeEvent(obj));
        }
      } catch {
        // skip malformed JSON line
      }
      continue;
    }

    // 2. Markdown pipe table row: | pattern | outcome | tier | serious | sensitive |
    if (line.startsWith("|") && line.endsWith("|")) {
      const cols = line.slice(1, -1).split("|").map((c) => c.trim());
      if (cols.length >= 2 && !/^[-:\s]+$/.test(cols[0]) && cols[0].toLowerCase() !== "pattern") {
        events.push(
          normalizeEvent({
            pattern: cols[0],
            outcome: cols[1],
            currentTier: cols[2] || "YELLOW",
            serious: /^(true|yes|1)$/i.test(cols[3] || ""),
            sensitive: /^(true|yes|1)$/i.test(cols[4] || ""),
          }),
        );
      }
      continue;
    }

    // 3. Structured bullet line: - [pattern] outcome=ok tier=YELLOW serious=false sensitive=false
    const bullet = line.match(/^-\s+\[([^\]]+)\]\s+(.+)$/);
    if (bullet) {
      const [, pattern, rest] = bullet;
      const kv = {};
      for (const m of rest.matchAll(/([a-zA-Z_]+)=([^\s]+)/g)) {
        kv[m[1].toLowerCase()] = m[2];
      }
      if (kv.outcome) {
        events.push(
          normalizeEvent({
            pattern,
            outcome: kv.outcome,
            currentTier: kv.tier || "YELLOW",
            serious: /^(true|yes|1)$/i.test(kv.serious || ""),
            sensitive: /^(true|yes|1)$/i.test(kv.sensitive || ""),
            channel: kv.channel,
            worker: kv.worker,
          }),
        );
      }
    }
  }
  return events;
}

export function normalizeEvent(obj) {
  const pattern = String(obj.pattern || "").trim();
  const rawOutcome = String(obj.outcome || "ok").toLowerCase();
  const outcome =
    rawOutcome === "ok" || rawOutcome === "pass" || rawOutcome === "verified"
      ? "ok"
      : rawOutcome === "corrected" || rawOutcome === "adjusted"
        ? "corrected"
        : "error";
  const currentTier = String(obj.currentTier || obj.tier || "YELLOW").toUpperCase();
  const serious = Boolean(obj.serious);
  const sensitive = Boolean(obj.sensitive) || SENSITIVE_PATTERN_RE.test(pattern);
  return {
    pattern,
    outcome,
    currentTier: ["GREEN", "FLAG", "YELLOW", "RED"].includes(currentTier) ? currentTier : "YELLOW",
    serious,
    sensitive,
    channel: obj.channel ? String(obj.channel) : "default",
    worker: obj.worker ? String(obj.worker) : "default",
    timestamp: obj.timestamp || null,
  };
}

export function scorePattern(stats) {
  const { samples, ok, errors, seriousErrors, sensitive, currentTier } = stats;
  const okRate = samples > 0 ? ok / samples : 0;

  let grade;
  if (okRate < 0.7 || seriousErrors > 0 || (errors > 0 && sensitive)) {
    grade = "D";
  } else if (samples >= 10 && okRate >= 0.95 && errors === 0 && seriousErrors === 0) {
    grade = "A";
  } else if (samples >= 5 && okRate >= 0.85 && seriousErrors === 0) {
    grade = "B";
  } else {
    grade = "C";
  }

  let recommendedTier;
  let acceptMode;
  let action;

  if (grade === "A") {
    recommendedTier = "GREEN";
    acceptMode = "EXECUTE";
    action = currentTier === "GREEN" ? "KEEP GREEN" : "PROPOSE PROMOTE -> GREEN";
  } else if (grade === "B") {
    recommendedTier = currentTier === "GREEN" ? "FLAG" : currentTier;
    acceptMode = currentTier === "GREEN" ? "EXECUTE" : "PROPOSE";
    action = "KEEP & WATCH (FLAG)";
  } else if (grade === "C") {
    recommendedTier = "YELLOW";
    acceptMode = "PROPOSE";
    action = currentTier === "GREEN" ? "PROPOSE DEMOTE -> YELLOW" : "KEEP YELLOW (NEED MORE SAMPLES)";
  } else {
    recommendedTier = seriousErrors > 0 || sensitive ? "RED" : "YELLOW";
    acceptMode = recommendedTier === "RED" ? "OBSERVE" : "PROPOSE";
    action = `IMMEDIATE DEMOTE -> ${recommendedTier}`;
  }

  return {
    ...stats,
    okRate: Number((okRate * 100).toFixed(1)),
    grade,
    recommendedTier,
    signal: TIER_SIGNALS[recommendedTier],
    acceptMode,
    action,
    decisionProposal: `- [${recommendedTier}] ${stats.pattern} (mode=${acceptMode}; evidence: ${ok}/${samples} OK, ${stats.corrected} corrected, ${errors} errors)`,
  };
}

export function gradeEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return {
      status: "no_data",
      totalEvents: 0,
      overallLevel: null,
      patterns: [],
      proposals: [],
      hasRegression: false,
    };
  }

  const grouped = new Map();
  for (const raw of events) {
    const ev = normalizeEvent(raw);
    if (!ev.pattern) continue;
    if (!grouped.has(ev.pattern)) {
      grouped.set(ev.pattern, {
        pattern: ev.pattern,
        samples: 0,
        ok: 0,
        corrected: 0,
        errors: 0,
        seriousErrors: 0,
        sensitive: false,
        currentTier: ev.currentTier,
      });
    }
    const g = grouped.get(ev.pattern);
    g.samples += 1;
    if (ev.outcome === "ok") g.ok += 1;
    else if (ev.outcome === "corrected") g.corrected += 1;
    else g.errors += 1;
    if (ev.serious) g.seriousErrors += 1;
    if (ev.sensitive) g.sensitive = true;
    g.currentTier = ev.currentTier;
  }

  const patterns = [...grouped.values()]
    .map(scorePattern)
    .sort((a, b) => a.grade.localeCompare(b.grade) || b.samples - a.samples);

  const hasSeriousOrSensitiveD = patterns.some((p) => p.seriousErrors > 0 || (p.grade === "D" && p.sensitive));
  const hasAnyD = patterns.some((p) => p.grade === "D");
  const countA = patterns.filter((p) => p.grade === "A").length;
  const countB = patterns.filter((p) => p.grade === "B").length;
  const countC = patterns.filter((p) => p.grade === "C").length;
  const total = patterns.length;

  let overallLevel;
  if (hasSeriousOrSensitiveD) {
    overallLevel = 1;
  } else if (hasAnyD || countC > total / 2) {
    overallLevel = 2;
  } else if (countA === total && patterns.every((p) => p.samples >= 10)) {
    overallLevel = 5;
  } else if (countA / total >= 0.7 && countA + countB === total) {
    overallLevel = 4;
  } else {
    overallLevel = 3;
  }

  const proposals = patterns
    .filter((p) => p.recommendedTier !== p.currentTier)
    .map((p) => ({
      pattern: p.pattern,
      from: p.currentTier,
      to: p.recommendedTier,
      signal: p.signal,
      grade: p.grade,
      proposal: p.decisionProposal,
    }));

  return {
    status: "graded",
    totalEvents: events.length,
    overallLevel,
    patterns,
    proposals,
    hasRegression: hasAnyD,
  };
}

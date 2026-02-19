import type {
  GraphData,
  DetectedCycle,
  SmurfingPattern,
  LayeringPattern,
  FraudRing,
  SuspiciousAccount,
  FalsePositiveProfile,
} from "./types";
import { buildFalsePositiveProfile } from "./smurfingDetector";

interface AccountScoreContext {
  cycleScores: number[];
  smurfingScores: number[];
  layeringScores: number[];
  patterns: string[];
  ringIds: string[];
}

function computeCycleContribution(cycle: DetectedCycle): number {
  let score = 0;
  if (cycle.cycle_length === 3) {
    score += 40;
  } else if (cycle.cycle_length >= 4 && cycle.cycle_length <= 5) {
    score += 30;
  }
  if (cycle.temporal_proximity) score += 10;
  if (cycle.amount_similarity) score += 10;
  return score;
}

function computeSmurfingContribution(pattern: SmurfingPattern): number {
  let score = 0;
  if (pattern.direction === "fan_in" || pattern.direction === "both") {
    score += 35;
  }
  if (pattern.direction === "fan_out" || pattern.direction === "both") {
    score += 35;
  }
  if (pattern.velocity >= 0.7) {
    score += 15;
  }
  return score;
}

function computeLayeringContribution(pattern: LayeringPattern): number {
  let score = 25;
  if (pattern.hop_count > 3) {
    score += 10;
  }
  return score;
}

function applyFalsePositiveDeductions(
  score: number,
  fp: FalsePositiveProfile
): number {
  if (fp.is_merchant_like) score -= 30;
  if (fp.is_payroll_like) score -= 30;
  if (fp.is_stable_recurring) score -= 15;
  return score;
}

export function computeSuspicionScores(
  graph: GraphData,
  cycles: DetectedCycle[],
  smurfingPatterns: SmurfingPattern[],
  layeringPatterns: LayeringPattern[]
): SuspiciousAccount[] {
  const accountContexts = new Map<string, AccountScoreContext>();

  function ensureContext(accountId: string): AccountScoreContext {
    if (!accountContexts.has(accountId)) {
      accountContexts.set(accountId, {
        cycleScores: [],
        smurfingScores: [],
        layeringScores: [],
        patterns: [],
        ringIds: [],
      });
    }
    return accountContexts.get(accountId) as AccountScoreContext;
  }

  for (const cycle of cycles) {
    const contribution = computeCycleContribution(cycle);
    const patternName = `cycle_length_${cycle.cycle_length}`;

    for (const accountId of cycle.member_accounts) {
      const ctx = ensureContext(accountId);
      ctx.cycleScores.push(contribution);
      if (!ctx.patterns.includes(patternName)) {
        ctx.patterns.push(patternName);
      }
      if (!ctx.ringIds.includes(cycle.ring_id)) {
        ctx.ringIds.push(cycle.ring_id);
      }
    }
  }

  for (const pattern of smurfingPatterns) {
    const contribution = computeSmurfingContribution(pattern);

    for (const accountId of pattern.member_accounts) {
      const ctx = ensureContext(accountId);
      ctx.smurfingScores.push(contribution);
      if (!ctx.patterns.includes("smurfing")) {
        ctx.patterns.push("smurfing");
      }
      if (!ctx.ringIds.includes(pattern.ring_id)) {
        ctx.ringIds.push(pattern.ring_id);
      }
    }
  }

  for (const pattern of layeringPatterns) {
    const contribution = computeLayeringContribution(pattern);

    for (const accountId of pattern.member_accounts) {
      const ctx = ensureContext(accountId);
      ctx.layeringScores.push(contribution);
      if (!ctx.patterns.includes("layering")) {
        ctx.patterns.push("layering");
      }
      if (!ctx.ringIds.includes(pattern.ring_id)) {
        ctx.ringIds.push(pattern.ring_id);
      }
    }
  }

  const suspiciousAccounts: SuspiciousAccount[] = [];

  for (const [accountId, ctx] of accountContexts) {
    let rawScore = 0;

    if (ctx.cycleScores.length > 0) {
      rawScore += Math.max(...ctx.cycleScores);
    }
    if (ctx.smurfingScores.length > 0) {
      rawScore += Math.max(...ctx.smurfingScores);
    }
    if (ctx.layeringScores.length > 0) {
      rawScore += Math.max(...ctx.layeringScores);
    }

    const nodeData = graph.nodes.get(accountId);
    if (nodeData) {
      const fpProfile = buildFalsePositiveProfile(nodeData, graph);
      rawScore = applyFalsePositiveDeductions(rawScore, fpProfile);
    }

    const clampedScore = Math.min(100, Math.max(0, rawScore));

    if (clampedScore > 0) {
      suspiciousAccounts.push({
        account_id: accountId,
        suspicion_score: parseFloat(clampedScore.toFixed(1)),
        detected_patterns: ctx.patterns,
        ring_id: ctx.ringIds[0] ?? "",
      });
    }
  }

  suspiciousAccounts.sort((a, b) => b.suspicion_score - a.suspicion_score);

  return suspiciousAccounts;
}

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

/**
 * Internal context accumulated per account across all detected patterns.
 * Uses Set<string> for pattern labels to guarantee no duplicates.
 */
interface AccountScoreContext {
  cycleScores: number[];
  smurfingScores: number[];
  layeringScores: number[];
  /** Set ensures no duplicate pattern labels; converted to array at export. */
  patterns: Set<string>;
  ringIds: string[];
}

/**
 * Compute score contribution from a detected cycle.
 * Shorter cycles score higher (length-3 is the strongest signal).
 */
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

/**
 * Compute score contribution from a smurfing pattern.
 * Both fan-in and fan-out together produce the highest score.
 */
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

/**
 * Compute score contribution from a layering pattern.
 * Deeper chains receive higher scores.
 */
function computeLayeringContribution(pattern: LayeringPattern): number {
  let score = 25;
  if (pattern.hop_count > 3) {
    score += 10;
  }
  return score;
}

/**
 * Apply standard false-positive deductions based on behavioral profile.
 * Merchant-like: -30, Payroll-like: -30, Stable recurring: -15.
 */
function applyFalsePositiveDeductions(
  score: number,
  fp: FalsePositiveProfile
): number {
  if (fp.is_merchant_like) score -= 30;
  if (fp.is_payroll_like) score -= 30;
  if (fp.is_stable_recurring) score -= 15;
  return score;
}

/**
 * Enhanced high-volume merchant check for false-positive suppression.
 *
 * If an account has >200 total transactions AND highly consistent
 * amounts (CV < 0.3) AND does NOT participate in any cycle,
 * its suspicion score is reduced by 40 points.
 *
 * This prevents flagging legitimate businesses (e.g., POS terminals,
 * subscription services) that naturally show fan-in patterns.
 *
 * Time complexity: O(t) where t = transactions for this account.
 */
function computeHighVolumeMerchantDeduction(
  accountId: string,
  graph: GraphData,
  cycleParticipants: Set<string>
): number {
  const nodeData = graph.nodes.get(accountId);
  if (!nodeData) return 0;

  const totalTx = nodeData.in_degree + nodeData.out_degree;
  if (totalTx <= 200) return 0;

  // Already in a cycle \u2014 not safe to dismiss
  if (cycleParticipants.has(accountId)) return 0;

  const allAmounts = [
    ...nodeData.in_transactions.map((t) => t.amount),
    ...nodeData.out_transactions.map((t) => t.amount),
  ];
  if (allAmounts.length === 0) return 0;

  const avg = allAmounts.reduce((s, v) => s + v, 0) / allAmounts.length;
  if (avg === 0) return 0;

  const variance =
    allAmounts.reduce((s, v) => s + (v - avg) * (v - avg), 0) / allAmounts.length;
  const cv = Math.sqrt(variance) / avg;

  // Highly consistent amounts + no cyclic involvement = likely legitimate
  if (cv < 0.3) return 40;

  return 0;
}

/**
 * Computes suspicion scores for all accounts involved in detected patterns.
 *
 * Scoring strategy:
 * 1. For each pattern type, take the MAX contribution across all rings the account appears in.
 * 2. Sum the max contributions across pattern types.
 * 3. Apply false-positive deductions (merchant, payroll, stable-recurring, high-volume).
 * 4. Clamp to [0, 100].
 *
 * Pattern labels (precise, deduplicated via Set):
 *   Cycles:    "cycle_length_3", "cycle_length_4", "cycle_length_5"
 *   Smurfing:  "fan_in", "fan_out", "high_velocity"
 *   Layering:  "layered_shell"
 *
 * Time complexity: O(R \u00b7 M + A) where R = total rings, M = avg members per ring, A = flagged accounts.
 * Space complexity: O(A).
 *
 * Returns accounts sorted descending by suspicion_score.
 */
export function computeSuspicionScores(
  graph: GraphData,
  cycles: DetectedCycle[],
  smurfingPatterns: SmurfingPattern[],
  layeringPatterns: LayeringPattern[]
): SuspiciousAccount[] {
  const accountContexts = new Map<string, AccountScoreContext>();

  // Build set of accounts that participate in any cycle (used for FP control)
  const cycleParticipants = new Set<string>();
  for (const cycle of cycles) {
    for (const acc of cycle.member_accounts) {
      cycleParticipants.add(acc);
    }
  }

  function ensureContext(accountId: string): AccountScoreContext {
    if (!accountContexts.has(accountId)) {
      accountContexts.set(accountId, {
        cycleScores: [],
        smurfingScores: [],
        layeringScores: [],
        patterns: new Set<string>(),
        ringIds: [],
      });
    }
    return accountContexts.get(accountId) as AccountScoreContext;
  }

  // --- Accumulate cycle contributions ---
  for (const cycle of cycles) {
    const contribution = computeCycleContribution(cycle);
    // Precise label: "cycle_length_3", "cycle_length_4", "cycle_length_5"
    const patternName = `cycle_length_${cycle.cycle_length}`;

    for (const accountId of cycle.member_accounts) {
      const ctx = ensureContext(accountId);
      ctx.cycleScores.push(contribution);
      ctx.patterns.add(patternName);
      if (!ctx.ringIds.includes(cycle.ring_id)) {
        ctx.ringIds.push(cycle.ring_id);
      }
    }
  }

  // --- Accumulate smurfing contributions ---
  for (const pattern of smurfingPatterns) {
    const contribution = computeSmurfingContribution(pattern);

    for (const accountId of pattern.member_accounts) {
      const ctx = ensureContext(accountId);
      ctx.smurfingScores.push(contribution);

      // Precise labels based on direction and velocity
      if (pattern.direction === "fan_in" || pattern.direction === "both") {
        ctx.patterns.add("fan_in");
      }
      if (pattern.direction === "fan_out" || pattern.direction === "both") {
        ctx.patterns.add("fan_out");
      }
      if (pattern.velocity >= 0.7) {
        ctx.patterns.add("high_velocity");
      }

      if (!ctx.ringIds.includes(pattern.ring_id)) {
        ctx.ringIds.push(pattern.ring_id);
      }
    }
  }

  // --- Accumulate layering contributions ---
  for (const pattern of layeringPatterns) {
    const contribution = computeLayeringContribution(pattern);

    for (const accountId of pattern.member_accounts) {
      const ctx = ensureContext(accountId);
      ctx.layeringScores.push(contribution);
      // Precise label for layered shell networks
      ctx.patterns.add("layered_shell");
      if (!ctx.ringIds.includes(pattern.ring_id)) {
        ctx.ringIds.push(pattern.ring_id);
      }
    }
  }

  // --- Compute final scores ---
  const suspiciousAccounts: SuspiciousAccount[] = [];

  for (const [accountId, ctx] of accountContexts) {
    let rawScore = 0;

    // Take the MAX contribution from each pattern type
    if (ctx.cycleScores.length > 0) {
      rawScore += Math.max(...ctx.cycleScores);
    }
    if (ctx.smurfingScores.length > 0) {
      rawScore += Math.max(...ctx.smurfingScores);
    }
    if (ctx.layeringScores.length > 0) {
      rawScore += Math.max(...ctx.layeringScores);
    }

    // Apply false-positive deductions
    const nodeData = graph.nodes.get(accountId);
    if (nodeData) {
      const fpProfile = buildFalsePositiveProfile(nodeData, graph);
      rawScore = applyFalsePositiveDeductions(rawScore, fpProfile);
    }

    // Additional high-volume merchant deduction (>200 tx, consistent, no cycles)
    rawScore -= computeHighVolumeMerchantDeduction(accountId, graph, cycleParticipants);

    // Clamp to [0, 100], always 1-decimal float
    const clampedScore = parseFloat(Math.min(100, Math.max(0, rawScore)).toFixed(1));

    if (clampedScore > 0) {
      suspiciousAccounts.push({
        account_id: accountId,
        suspicion_score: clampedScore,
        // Convert Set to sorted array for deterministic output
        detected_patterns: Array.from(ctx.patterns).sort(),
        ring_id: ctx.ringIds[0] ?? "",
      });
    }
  }

  // Sort descending by suspicion_score (required by RIFT spec)
  suspiciousAccounts.sort((a, b) => b.suspicion_score - a.suspicion_score);

  return suspiciousAccounts;
}

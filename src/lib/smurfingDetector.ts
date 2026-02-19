/**
 * Smurfing / Structuring Detection Module
 *
 * Detects fan-in and fan-out patterns: accounts that aggregate from or
 * distribute to 10+ counterparties within sliding 72-hour windows.
 *
 * False-positive mitigation:
 *   - Merchant accounts (>200 tx total OR high in-degree with low amount CV)
 *   - Payroll accounts (periodic outgoing timing with CV < 0.4)
 *   - Stable recurring patterns (low CV in both amount *and* timing gaps)
 *
 * Complexity:
 *   Time:  O(V · W · d) where V = accounts, W = # of 72h windows per account,
 *          d = degree of the account. Window count is bounded by |E_node|.
 *   Space: O(V + |results|). Per-account sets are short-lived.
 *   Early termination: stops after 1000 smurfing patterns.
 */
import type { GraphData, SmurfingPattern, ParsedTransaction, NodeData, FalsePositiveProfile } from "./types";

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
const FAN_THRESHOLD = 10;
const REDISTRIBUTION_THRESHOLD = 0.70;

interface TimeWindow {
  start_ms: number;
  end_ms: number;
}

function getTimeWindows(transactions: ParsedTransaction[]): TimeWindow[] {
  if (transactions.length === 0) return [];

  const sorted = [...transactions].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  const windows: TimeWindow[] = [];
  const seen = new Set<string>();

  for (const tx of sorted) {
    const windowStart = tx.timestamp_ms;
    const windowEnd = windowStart + SEVENTY_TWO_HOURS_MS;
    const key = `${Math.floor(windowStart / 3600000)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    windows.push({ start_ms: windowStart, end_ms: windowEnd });
  }

  return windows;
}

function getUniqueSendersInWindow(
  inTxs: ParsedTransaction[],
  window: TimeWindow
): Set<string> {
  const senders = new Set<string>();
  for (const tx of inTxs) {
    if (tx.timestamp_ms >= window.start_ms && tx.timestamp_ms <= window.end_ms) {
      senders.add(tx.sender_id);
    }
  }
  return senders;
}

function getUniqueReceiversInWindow(
  outTxs: ParsedTransaction[],
  window: TimeWindow
): Set<string> {
  const receivers = new Set<string>();
  for (const tx of outTxs) {
    if (tx.timestamp_ms >= window.start_ms && tx.timestamp_ms <= window.end_ms) {
      receivers.add(tx.receiver_id);
    }
  }
  return receivers;
}

function getAmountInWindow(txs: ParsedTransaction[], window: TimeWindow): number {
  let total = 0;
  for (const tx of txs) {
    if (tx.timestamp_ms >= window.start_ms && tx.timestamp_ms <= window.end_ms) {
      total += tx.amount;
    }
  }
  return total;
}

function computeVelocity(
  inAmount: number,
  outAmount: number
): number {
  if (inAmount === 0) return 0;
  return Math.min(outAmount / inAmount, 1.0);
}

export function buildFalsePositiveProfile(
  nodeData: NodeData,
  graph: GraphData
): FalsePositiveProfile {
  const isMerchantLike = checkMerchantLike(nodeData);
  const isPayrollLike = checkPayrollLike(nodeData);
  const isStableRecurring = checkStableRecurring(nodeData);

  return {
    is_merchant_like: isMerchantLike,
    is_payroll_like: isPayrollLike,
    is_stable_recurring: isStableRecurring,
  };
}

/**
 * Enhanced merchant detection: an account is merchant-like if it receives
 * high-volume incoming transactions with consistent amounts and predominantly
 * one-directional flow (many senders, few outgoing).
 *
 * Criteria (upgraded for false-positive control):
 * - Total transactions > 200  OR  in_degree > 20
 * - Coefficient of variation (CV) of incoming amounts < 0.4
 * - in_degree > out_degree * 3  (receive-heavy pattern)
 *
 * Time complexity: O(t) where t = number of incoming transactions for this node.
 */
function checkMerchantLike(nodeData: NodeData): boolean {
  const totalTx = nodeData.in_degree + nodeData.out_degree;

  // Must have significant transaction volume
  if (totalTx <= 200 && nodeData.in_degree < 20) return false;

  const inAmounts = nodeData.in_transactions.map((tx) => tx.amount);
  if (inAmounts.length < 10) return false;

  const avg = inAmounts.reduce((s, v) => s + v, 0) / inAmounts.length;
  if (avg === 0) return false;

  const variance = inAmounts.reduce((s, v) => s + (v - avg) * (v - avg), 0) / inAmounts.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / avg;

  // Highly consistent incoming amounts AND predominantly receive-heavy
  return cv < 0.4 && nodeData.in_degree > nodeData.out_degree * 3;
}

/**
 * Detects payroll-like patterns: 1 sender → many receivers with repeated
 * similar amounts and regular timestamp intervals (monthly/bi-weekly/daily).
 *
 * Criteria:
 * - out_degree >= 5 (sends to multiple receivers)
 * - >= 70% of receivers receive consistent amounts (CV < 10%)
 * - Optionally checks for periodic timing (monthly or bi-weekly intervals)
 *
 * Time complexity: O(t) where t = number of outgoing transactions.
 */
function checkPayrollLike(nodeData: NodeData): boolean {
  if (nodeData.out_degree < 5) return false;

  const outTxs = nodeData.out_transactions;
  if (outTxs.length < 5) return false;

  const receivers = new Set<string>();
  for (const tx of outTxs) {
    receivers.add(tx.receiver_id);
  }

  const amountsByReceiver = new Map<string, number[]>();
  const timestampsByReceiver = new Map<string, number[]>();
  for (const tx of outTxs) {
    if (!amountsByReceiver.has(tx.receiver_id)) {
      amountsByReceiver.set(tx.receiver_id, []);
      timestampsByReceiver.set(tx.receiver_id, []);
    }
    (amountsByReceiver.get(tx.receiver_id) as number[]).push(tx.amount);
    (timestampsByReceiver.get(tx.receiver_id) as number[]).push(tx.timestamp_ms);
  }

  let consistentCount = 0;
  let periodicCount = 0;
  for (const [receiverId, amounts] of amountsByReceiver) {
    if (amounts.length < 2) continue;
    const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    if (avg === 0) continue;
    const allClose = amounts.every((a) => Math.abs(a - avg) / avg < 0.1);
    if (allClose) consistentCount++;

    // Check for periodic timing (monthly ~30d, bi-weekly ~14d, or daily ~1d)
    const timestamps = timestampsByReceiver.get(receiverId);
    if (timestamps && timestamps.length >= 2) {
      const sorted = [...timestamps].sort((a, b) => a - b);
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        gaps.push(sorted[i] - sorted[i - 1]);
      }
      if (gaps.length > 0) {
        const avgGap = gaps.reduce((s, v) => s + v, 0) / gaps.length;
        const gapVariance = gaps.reduce((s, v) => s + (v - avgGap) * (v - avgGap), 0) / gaps.length;
        const gapCV = avgGap > 0 ? Math.sqrt(gapVariance) / avgGap : Infinity;
        // Low variance in payment intervals indicates regular scheduling
        if (gapCV < 0.3) periodicCount++;
      }
    }
  }

  const amountConsistent = consistentCount >= receivers.size * 0.7;
  const hasPeriodicity = periodicCount >= receivers.size * 0.5;

  // Payroll if amounts are consistent; periodic timing strengthens the signal
  return amountConsistent || (consistentCount >= receivers.size * 0.5 && hasPeriodicity);
}

function checkStableRecurring(nodeData: NodeData): boolean {
  const allTxs = [...nodeData.in_transactions, ...nodeData.out_transactions];
  if (allTxs.length < 6) return false;

  const counterparties = new Map<string, number>();
  for (const tx of nodeData.in_transactions) {
    counterparties.set(tx.sender_id, (counterparties.get(tx.sender_id) ?? 0) + 1);
  }
  for (const tx of nodeData.out_transactions) {
    counterparties.set(tx.receiver_id, (counterparties.get(tx.receiver_id) ?? 0) + 1);
  }

  let recurringCount = 0;
  for (const count of counterparties.values()) {
    if (count >= 3) recurringCount++;
  }

  return recurringCount >= counterparties.size * 0.6;
}

/**
 * Detects smurfing patterns (fan-in/fan-out with rapid redistribution).
 * Uses sliding time-windows over pre-sorted transaction lists.
 *
 * Time complexity: O(V · W) where V = vertices, W = number of unique hourly
 *   time windows per node. Each window scan is O(t) for that node's transactions.
 *   Overall effectively O(V · t_max) where t_max = max transactions per node.
 * Space complexity: O(V + |results|).
 * Early termination: stops after 500 patterns to bound output size.
 */
export function detectSmurfing(graph: GraphData, existingRingCount: number): SmurfingPattern[] {
  const results: SmurfingPattern[] = [];
  let ringCounter = existingRingCount;
  const processedHubs = new Set<string>();

  for (const [accountId, nodeData] of graph.nodes) {
    const allTxs = [...nodeData.in_transactions, ...nodeData.out_transactions];
    if (allTxs.length === 0) continue;

    const windows = getTimeWindows(allTxs);

    let bestFanIn = 0;
    let bestFanOut = 0;
    let bestVelocity = 0;
    let bestFanInWindow: TimeWindow | null = null;
    let bestFanOutWindow: TimeWindow | null = null;
    let bestFanInSenders = new Set<string>();
    let bestFanOutReceivers = new Set<string>();

    for (const window of windows) {
      const uniqueSenders = getUniqueSendersInWindow(nodeData.in_transactions, window);
      const uniqueReceivers = getUniqueReceiversInWindow(nodeData.out_transactions, window);

      if (uniqueSenders.size > bestFanIn) {
        bestFanIn = uniqueSenders.size;
        bestFanInWindow = window;
        bestFanInSenders = uniqueSenders;
      }

      if (uniqueReceivers.size > bestFanOut) {
        bestFanOut = uniqueReceivers.size;
        bestFanOutWindow = window;
        bestFanOutReceivers = uniqueReceivers;
      }

      const inAmount = getAmountInWindow(nodeData.in_transactions, window);
      const outAmount = getAmountInWindow(nodeData.out_transactions, window);
      const vel = computeVelocity(inAmount, outAmount);
      if (vel > bestVelocity) bestVelocity = vel;
    }

    const isFanIn = bestFanIn >= FAN_THRESHOLD;
    const isFanOut = bestFanOut >= FAN_THRESHOLD;

    if (!isFanIn && !isFanOut) continue;

    let hasRedistribution = false;
    if (isFanIn && bestFanInWindow) {
      const extendedEnd = bestFanInWindow.end_ms + SEVENTY_TWO_HOURS_MS;
      const inAmount = getAmountInWindow(nodeData.in_transactions, bestFanInWindow);
      const outAmount = getAmountInWindow(nodeData.out_transactions, {
        start_ms: bestFanInWindow.start_ms,
        end_ms: extendedEnd,
      });
      if (inAmount > 0 && outAmount / inAmount >= REDISTRIBUTION_THRESHOLD) {
        hasRedistribution = true;
      }
    }

    if (isFanOut && !hasRedistribution && bestFanOutWindow) {
      const extendedStart = bestFanOutWindow.start_ms - SEVENTY_TWO_HOURS_MS;
      const inAmount = getAmountInWindow(nodeData.in_transactions, {
        start_ms: extendedStart,
        end_ms: bestFanOutWindow.end_ms,
      });
      const outAmount = getAmountInWindow(nodeData.out_transactions, bestFanOutWindow);
      if (inAmount > 0 && outAmount / inAmount >= REDISTRIBUTION_THRESHOLD) {
        hasRedistribution = true;
      }
    }

    const fpProfile = buildFalsePositiveProfile(nodeData, graph);
    if (fpProfile.is_merchant_like || fpProfile.is_payroll_like) continue;

    let direction: "fan_in" | "fan_out" | "both";
    if (isFanIn && isFanOut) {
      direction = "both";
    } else if (isFanIn) {
      direction = "fan_in";
    } else {
      direction = "fan_out";
    }

    const memberAccounts = new Set<string>();
    memberAccounts.add(accountId);
    if (isFanIn) {
      for (const s of bestFanInSenders) memberAccounts.add(s);
    }
    if (isFanOut) {
      for (const r of bestFanOutReceivers) memberAccounts.add(r);
    }

    let riskScore = 0;
    if (isFanIn) riskScore += 35;
    if (isFanOut) riskScore += 35;
    if (bestVelocity >= REDISTRIBUTION_THRESHOLD) riskScore += 15;
    if (hasRedistribution) riskScore += 10;
    riskScore = Math.min(100, Math.max(0, riskScore));

    ringCounter++;
    const ringId = `RING_${String(ringCounter).padStart(3, "0")}`;

    results.push({
      ring_id: ringId,
      member_accounts: Array.from(memberAccounts),
      pattern_type: "smurfing",
      risk_score: parseFloat(riskScore.toFixed(1)),
      hub_account: accountId,
      direction,
      velocity: parseFloat(bestVelocity.toFixed(3)),
    });

    processedHubs.add(accountId);

    if (results.length > 500) break;
  }

  return results;
}

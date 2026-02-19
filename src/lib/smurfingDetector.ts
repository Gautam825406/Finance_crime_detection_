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

function checkMerchantLike(nodeData: NodeData): boolean {
  if (nodeData.in_degree < 20) return false;

  const inAmounts = nodeData.in_transactions.map((tx) => tx.amount);
  if (inAmounts.length < 10) return false;

  const avg = inAmounts.reduce((s, v) => s + v, 0) / inAmounts.length;
  if (avg === 0) return false;

  const variance = inAmounts.reduce((s, v) => s + (v - avg) * (v - avg), 0) / inAmounts.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / avg;

  return cv < 0.5 && nodeData.in_degree > nodeData.out_degree * 3;
}

function checkPayrollLike(nodeData: NodeData): boolean {
  if (nodeData.out_degree < 5) return false;

  const outTxs = nodeData.out_transactions;
  if (outTxs.length < 5) return false;

  const receivers = new Set<string>();
  for (const tx of outTxs) {
    receivers.add(tx.receiver_id);
  }

  const amountsByReceiver = new Map<string, number[]>();
  for (const tx of outTxs) {
    if (!amountsByReceiver.has(tx.receiver_id)) {
      amountsByReceiver.set(tx.receiver_id, []);
    }
    (amountsByReceiver.get(tx.receiver_id) as number[]).push(tx.amount);
  }

  let consistentCount = 0;
  for (const amounts of amountsByReceiver.values()) {
    if (amounts.length < 2) continue;
    const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    if (avg === 0) continue;
    const allClose = amounts.every((a) => Math.abs(a - avg) / avg < 0.1);
    if (allClose) consistentCount++;
  }

  return consistentCount >= receivers.size * 0.7;
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

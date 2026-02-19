/**
 * Layering Detection Module
 *
 * Detects layered shell-company networks where funds hop through 3+ intermediate
 * accounts that have minimal transaction activity (2–3 total transactions).
 *
 * RIFT Spec: "Look for chains of 3+ hops where intermediate accounts have only
 * 2–3 total transactions."
 *
 * Algorithm: Bounded iterative DFS from non-shell nodes that connect to shells.
 *   - Start from accounts adjacent to potential shell intermediaries
 *   - Explore paths up to MAX_HOPS depth
 *   - A path is flagged only if:
 *       1. It has >= MIN_HOP_COUNT hops (i.e. >= 4 nodes in the chain)
 *       2. >= 70% of intermediate nodes (excluding start/end) are shells
 *       3. Temporal continuity OR amount preservation is present
 *
 * Complexity:
 *   Time:  O(S · d^H) where S = start nodes adjacent to shells,
 *          d = avg out-degree, H = MAX_HOPS (8).
 *   Space: O(V + |results|). DFS stack bounded by MAX_HOPS.
 *   Early termination: stops after 500 patterns.
 */
import type { GraphData, LayeringPattern, ParsedTransaction, NodeData } from "./types";

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

/**
 * MIN_HOP_COUNT = 3 means the chain must have at least 4 nodes (start -> A -> B -> end)
 * which corresponds to 3 edges / 3 hops. This strictly satisfies the RIFT spec
 * requirement of "chains of 3+ hops".
 *
 * Note: path.length = number of nodes = hops + 1
 * So we check: path.length >= MIN_HOP_COUNT + 1 (i.e., >= 4 nodes)
 */
const MIN_HOP_COUNT = 3;
const MAX_HOPS = 8;
const AMOUNT_SIMILARITY_THRESHOLD = 0.5;

/** Shell account: total degree (in + out) between 2 and 3 per RIFT spec. */
const SHELL_MIN_TX = 2;
const SHELL_MAX_TX = 3;

/** Minimum fraction of intermediates that must be shell accounts. */
const SHELL_INTERMEDIATE_RATIO = 0.70;

/**
 * Returns true if the account is a shell intermediary:
 * total transaction count (in_degree + out_degree) is between 2 and 3.
 * These are pass-through accounts with minimal activity.
 */
function isShellIntermediary(nodeData: NodeData): boolean {
  const totalTx = nodeData.in_degree + nodeData.out_degree;
  return totalTx >= SHELL_MIN_TX && totalTx <= SHELL_MAX_TX;
}

function checkTemporalContinuity(
  chain: string[],
  graph: GraphData
): boolean {
  let prevMaxTime = -Infinity;

  for (let i = 0; i < chain.length - 1; i++) {
    const from = chain[i];
    const to = chain[i + 1];
    const edgeTxs = graph.adjacency.get(from)?.get(to);
    if (!edgeTxs || edgeTxs.length === 0) return false;

    let minEdgeTime = Infinity;
    let maxEdgeTime = -Infinity;
    for (const tx of edgeTxs) {
      if (tx.timestamp_ms < minEdgeTime) minEdgeTime = tx.timestamp_ms;
      if (tx.timestamp_ms > maxEdgeTime) maxEdgeTime = tx.timestamp_ms;
    }

    if (i > 0 && minEdgeTime < prevMaxTime - SEVENTY_TWO_HOURS_MS) {
      return false;
    }

    prevMaxTime = maxEdgeTime;
  }

  const firstEdge = graph.adjacency.get(chain[0])?.get(chain[1]);
  const lastEdge = graph.adjacency.get(chain[chain.length - 2])?.get(chain[chain.length - 1]);
  if (!firstEdge || !lastEdge) return false;

  const firstMin = Math.min(...firstEdge.map((t) => t.timestamp_ms));
  const lastMax = Math.max(...lastEdge.map((t) => t.timestamp_ms));

  return (lastMax - firstMin) <= SEVENTY_TWO_HOURS_MS * 2;
}

function checkAmountPreservation(
  chain: string[],
  graph: GraphData
): boolean {
  const edgeAmounts: number[] = [];

  for (let i = 0; i < chain.length - 1; i++) {
    const from = chain[i];
    const to = chain[i + 1];
    const edgeTxs = graph.adjacency.get(from)?.get(to);
    if (!edgeTxs || edgeTxs.length === 0) return false;

    let totalAmount = 0;
    for (const tx of edgeTxs) {
      totalAmount += tx.amount;
    }
    edgeAmounts.push(totalAmount);
  }

  if (edgeAmounts.length < 2) return false;

  const maxAmount = Math.max(...edgeAmounts);
  const minAmount = Math.min(...edgeAmounts);

  if (maxAmount === 0) return false;

  return (maxAmount - minAmount) / maxAmount <= AMOUNT_SIMILARITY_THRESHOLD;
}

export function detectLayering(graph: GraphData, existingRingCount: number): LayeringPattern[] {
  const results: LayeringPattern[] = [];
  let ringCounter = existingRingCount;
  const foundChains = new Set<string>();

  // --- Step 1: Index all potential shell intermediaries ---
  // O(V) scan: shell = total degree between 2 and 3
  const potentialShells = new Set<string>();
  for (const [accountId, nodeData] of graph.nodes) {
    if (isShellIntermediary(nodeData)) {
      potentialShells.add(accountId);
    }
  }

  if (potentialShells.size === 0) return results;

  // --- Step 2: Find start nodes (non-shell with outgoing edge to a shell) ---
  const startNodes: string[] = [];
  for (const [accountId, nodeData] of graph.nodes) {
    if (!potentialShells.has(accountId) && nodeData.out_degree > 0) {
      const adj = graph.adjacency.get(accountId);
      if (adj) {
        for (const neighbor of adj.keys()) {
          if (potentialShells.has(neighbor)) {
            startNodes.push(accountId);
            break;
          }
        }
      }
    }
  }

  // --- Step 3: Bounded DFS from each start node ---
  for (const startNode of startNodes) {
    const stack: Array<{ node: string; path: string[]; shellCount: number; visited: Set<string> }> = [];
    const adj = graph.adjacency.get(startNode);
    if (!adj) continue;

    for (const neighbor of adj.keys()) {
      if (neighbor === startNode) continue;
      const isShell = potentialShells.has(neighbor);
      const visited = new Set<string>();
      visited.add(startNode);
      visited.add(neighbor);
      stack.push({
        node: neighbor,
        path: [startNode, neighbor],
        shellCount: isShell ? 1 : 0,
        visited,
      });
    }

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) break;

      const { node, path, shellCount, visited } = current;
      const hopCount = path.length - 1; // edges = nodes - 1

      // --- Check if current path qualifies as a layering pattern ---
      // RIFT spec: "chains of 3+ hops" means >= 3 edges, i.e., >= 4 nodes in path
      if (hopCount >= MIN_HOP_COUNT) {
        // Intermediates are all nodes except first and last
        const intermediateCount = path.length - 2;

        // Require >= 70% of intermediates to be shell accounts
        // This prevents false positives from long chains through active accounts
        if (intermediateCount > 0 && shellCount / intermediateCount >= SHELL_INTERMEDIATE_RATIO) {
          const chainKey = path.join("|");
          if (!foundChains.has(chainKey)) {
            const hasTemporalCont = checkTemporalContinuity(path, graph);
            const hasAmountPres = checkAmountPreservation(path, graph);

            if (hasTemporalCont || hasAmountPres) {
              foundChains.add(chainKey);
              ringCounter++;
              const ringId = `RING_${String(ringCounter).padStart(3, "0")}`;

              // Risk scoring: base 25, bonuses for depth, shell density, and evidence quality
              let riskScore = 25;
              if (hopCount > 3) riskScore += 10;       // deeper chains = higher risk
              if (shellCount >= 2) riskScore += 15;     // more shells = more layering
              if (hasTemporalCont) riskScore += 10;     // temporal evidence
              if (hasAmountPres) riskScore += 10;       // amount preservation evidence
              riskScore = Math.min(100, Math.max(0, riskScore));

              results.push({
                ring_id: ringId,
                member_accounts: [...path],
                pattern_type: "layering",
                risk_score: parseFloat(riskScore.toFixed(1)),
                chain: [...path],
                hop_count: hopCount,
              });
            }
          }
        }
      }

      // --- Expand DFS if within depth limit ---
      if (path.length < MAX_HOPS + 1) {
        const nextAdj = graph.adjacency.get(node);
        if (nextAdj) {
          for (const neighbor of nextAdj.keys()) {
            if (!visited.has(neighbor)) {
              const isShell = potentialShells.has(neighbor);
              const newVisited = new Set(visited);
              newVisited.add(neighbor);
              stack.push({
                node: neighbor,
                path: [...path, neighbor],
                shellCount: shellCount + (isShell ? 1 : 0),
                visited: newVisited,
              });
            }
          }
        }
      }
    }

    if (results.length > 500) break;
  }

  return results;
}

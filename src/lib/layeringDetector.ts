import type { GraphData, LayeringPattern, ParsedTransaction, NodeData } from "./types";

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
const MIN_HOPS = 3;
const MAX_HOPS = 8;
const AMOUNT_SIMILARITY_THRESHOLD = 0.5;
const SHELL_MIN_TX = 2;
const SHELL_MAX_TX = 3;

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

  const potentialShells = new Set<string>();
  for (const [accountId, nodeData] of graph.nodes) {
    if (isShellIntermediary(nodeData)) {
      potentialShells.add(accountId);
    }
  }

  if (potentialShells.size === 0) return results;

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

      if (path.length >= MIN_HOPS && shellCount >= 1) {
        const chainKey = path.join("|");
        if (!foundChains.has(chainKey)) {
          const hasTemporalCont = checkTemporalContinuity(path, graph);
          const hasAmountPres = checkAmountPreservation(path, graph);

          if (hasTemporalCont || hasAmountPres) {
            foundChains.add(chainKey);
            ringCounter++;
            const ringId = `RING_${String(ringCounter).padStart(3, "0")}`;

            let riskScore = 25;
            if (path.length > 3) riskScore += 10;
            if (shellCount >= 2) riskScore += 15;
            if (hasTemporalCont) riskScore += 10;
            if (hasAmountPres) riskScore += 10;
            riskScore = Math.min(100, Math.max(0, riskScore));

            results.push({
              ring_id: ringId,
              member_accounts: [...path],
              pattern_type: "layering",
              risk_score: parseFloat(riskScore.toFixed(1)),
              chain: [...path],
              hop_count: path.length - 1,
            });
          }
        }
      }

      if (path.length < MAX_HOPS) {
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

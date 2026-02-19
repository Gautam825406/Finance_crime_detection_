import type { GraphData, DetectedCycle, ParsedTransaction } from "./types";

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

function canonicalizeCycle(cycle: string[]): string {
  let minIdx = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i] < cycle[minIdx]) {
      minIdx = i;
    }
  }
  const rotated: string[] = [];
  for (let i = 0; i < cycle.length; i++) {
    rotated.push(cycle[(minIdx + i) % cycle.length]);
  }
  return rotated.join("|");
}

function checkTemporalProximity(
  path: string[],
  graph: GraphData
): boolean {
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (let i = 0; i < path.length; i++) {
    const from = path[i];
    const to = path[(i + 1) % path.length];
    const edgeTxs = graph.adjacency.get(from)?.get(to);
    if (!edgeTxs || edgeTxs.length === 0) return false;

    for (const tx of edgeTxs) {
      if (tx.timestamp_ms < minTime) minTime = tx.timestamp_ms;
      if (tx.timestamp_ms > maxTime) maxTime = tx.timestamp_ms;
    }
  }

  return (maxTime - minTime) <= SEVENTY_TWO_HOURS_MS;
}

function checkAmountSimilarity(
  path: string[],
  graph: GraphData
): boolean {
  const edgeAmounts: number[] = [];

  for (let i = 0; i < path.length; i++) {
    const from = path[i];
    const to = path[(i + 1) % path.length];
    const edgeTxs = graph.adjacency.get(from)?.get(to);
    if (!edgeTxs || edgeTxs.length === 0) return false;

    let totalAmount = 0;
    for (const tx of edgeTxs) {
      totalAmount += tx.amount;
    }
    edgeAmounts.push(totalAmount / edgeTxs.length);
  }

  const avg = edgeAmounts.reduce((s, v) => s + v, 0) / edgeAmounts.length;
  if (avg === 0) return false;

  for (const ea of edgeAmounts) {
    if (Math.abs(ea - avg) / avg > 0.5) return false;
  }
  return true;
}

function computeCycleRiskScore(
  cycleLength: number,
  temporalProximity: boolean,
  amountSimilarity: boolean
): number {
  let score = 0;
  if (cycleLength === 3) {
    score += 40;
  } else if (cycleLength >= 4 && cycleLength <= 5) {
    score += 30;
  }
  if (temporalProximity) score += 10;
  if (amountSimilarity) score += 10;

  score = Math.min(100, Math.max(0, score));
  return parseFloat(score.toFixed(1));
}

export function detectCycles(graph: GraphData): DetectedCycle[] {
  const foundCanonical = new Set<string>();
  const results: DetectedCycle[] = [];
  let ringCounter = 0;

  const nodeIds = Array.from(graph.nodes.keys());

  for (const startNode of nodeIds) {
    const adj = graph.adjacency.get(startNode);
    if (!adj || adj.size === 0) continue;

    const stack: Array<{ node: string; path: string[]; visited: Set<string> }> = [];

    const startNeighbors = adj;
    for (const neighbor of startNeighbors.keys()) {
      const visited = new Set<string>();
      visited.add(startNode);
      visited.add(neighbor);
      stack.push({ node: neighbor, path: [startNode, neighbor], visited });
    }

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) break;

      const { node, path, visited } = current;
      const depth = path.length;

      if (depth >= 3) {
        const lastAdj = graph.adjacency.get(node);
        if (lastAdj && lastAdj.has(startNode)) {
          const cyclePath = path;
          const canonical = canonicalizeCycle(cyclePath);

          if (!foundCanonical.has(canonical)) {
            foundCanonical.add(canonical);
            const temporalProximity = checkTemporalProximity(cyclePath, graph);
            const amountSimilarity = checkAmountSimilarity(cyclePath, graph);

            ringCounter++;
            const ringId = `RING_${String(ringCounter).padStart(3, "0")}`;

            results.push({
              ring_id: ringId,
              member_accounts: [...cyclePath],
              pattern_type: "cycle",
              risk_score: computeCycleRiskScore(cyclePath.length, temporalProximity, amountSimilarity),
              cycle_length: cyclePath.length,
              temporal_proximity: temporalProximity,
              amount_similarity: amountSimilarity,
            });
          }
        }
      }

      if (depth < 5) {
        const nextAdj = graph.adjacency.get(node);
        if (nextAdj) {
          for (const neighbor of nextAdj.keys()) {
            if (neighbor === startNode && depth >= 2) {
              continue;
            }
            if (!visited.has(neighbor)) {
              const newVisited = new Set(visited);
              newVisited.add(neighbor);
              stack.push({ node: neighbor, path: [...path, neighbor], visited: newVisited });
            }
          }
        }
      }
    }

    if (results.length > 5000) break;
  }

  return results;
}

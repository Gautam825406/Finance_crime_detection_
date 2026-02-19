"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { AnalysisResult, SuspiciousAccount, FraudRingOutput } from "@/lib/types";
import type cytoscape from "cytoscape";

interface GraphViewerProps {
  result: AnalysisResult;
  /** Raw CSV text — used to render ALL accounts and ALL transaction edges. */
  csvText: string;
  onNodeSelect: (account: SuspiciousAccount | null) => void;
}

/** Color palette for distinguishing fraud rings. */
const RING_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
];

/** Default color for non-ring nodes and edges. */
const DEFAULT_NODE_COLOR = "#374151";
const DEFAULT_EDGE_COLOR = "#4b5563";

/**
 * Lightweight CSV edge parser for the graph visualization layer.
 * Extracts all (sender, receiver) pairs from raw CSV text.
 * Handles quoted values and whitespace consistently with the server-side parser.
 *
 * Time complexity: O(n) where n = number of CSV rows.
 */
function parseCSVEdges(csvText: string): Array<{ source: string; target: string }> {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header to find sender_id and receiver_id column indices
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const senderIdx = header.indexOf("sender_id");
  const receiverIdx = header.indexOf("receiver_id");

  if (senderIdx === -1 || receiverIdx === -1) return [];

  const edges: Array<{ source: string; target: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple field extraction supporting quoted values
    const fields = parseCSVLineLight(line);
    const sender = fields[senderIdx]?.trim();
    const receiver = fields[receiverIdx]?.trim();

    if (sender && receiver) {
      edges.push({ source: sender, target: receiver });
    }
  }

  return edges;
}

/**
 * Light CSV line parser handling quoted fields.
 * Time complexity: O(n) for line length n.
 */
function parseCSVLineLight(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export default function GraphViewer({ result, csvText, onNodeSelect }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [isReady, setIsReady] = useState(false);

  /**
   * Parse ALL edges from the full CSV. Memoized to avoid re-parsing on every render.
   * This gives us the complete transaction graph, not just fraud ring edges.
   */
  const allCSVEdges = useMemo(() => parseCSVEdges(csvText), [csvText]);

  const buildElements = useCallback((): {
    nodes: cytoscape.ElementDefinition[];
    edges: cytoscape.ElementDefinition[];
  } => {
    // --- Lookup maps for suspicious accounts and fraud rings ---
    const suspiciousMap = new Map<string, SuspiciousAccount>();
    for (const sa of result.suspicious_accounts) {
      suspiciousMap.set(sa.account_id, sa);
    }

    const ringColorMap = new Map<string, string>();
    const accountRingMap = new Map<string, string>();

    result.fraud_rings.forEach((ring: FraudRingOutput, idx: number) => {
      const color = RING_COLORS[idx % RING_COLORS.length];
      ringColorMap.set(ring.ring_id, color);
      for (const acc of ring.member_accounts) {
        if (!accountRingMap.has(acc)) {
          accountRingMap.set(acc, ring.ring_id);
        }
      }
    });

    // --- Build the set of ring-specific edges for highlighting ---
    const ringEdgeKeys = new Set<string>();
    for (const ring of result.fraud_rings) {
      if (ring.pattern_type === "cycle") {
        for (let i = 0; i < ring.member_accounts.length; i++) {
          const src = ring.member_accounts[i];
          const tgt = ring.member_accounts[(i + 1) % ring.member_accounts.length];
          ringEdgeKeys.add(`${src}->${tgt}`);
        }
      } else {
        for (let i = 0; i < ring.member_accounts.length - 1; i++) {
          ringEdgeKeys.add(`${ring.member_accounts[i]}->${ring.member_accounts[i + 1]}`);
        }
      }
    }

    // --- Collect ALL unique accounts from the full CSV edges ---
    const allAccountIds = new Set<string>();
    for (const e of allCSVEdges) {
      allAccountIds.add(e.source);
      allAccountIds.add(e.target);
    }

    // --- Build node elements: ALL accounts with conditional styling ---
    const nodes: cytoscape.ElementDefinition[] = [];
    for (const accountId of allAccountIds) {
      const isSuspicious = suspiciousMap.has(accountId);
      const suspicionScore = suspiciousMap.get(accountId)?.suspicion_score ?? 0;
      const ringId = accountRingMap.get(accountId) ?? "";
      const ringColor = ringId ? (ringColorMap.get(ringId) ?? DEFAULT_NODE_COLOR) : DEFAULT_NODE_COLOR;
      const isInRing = ringId !== "";

      nodes.push({
        data: {
          id: accountId,
          label: accountId.length > 12 ? accountId.slice(0, 12) + "..." : accountId,
          isSuspicious,
          isInRing,
          suspicionScore,
          ringId,
          ringColor: isInRing ? ringColor : DEFAULT_NODE_COLOR,
          // Suspicious nodes are larger; ring nodes medium; normal nodes smallest
          size: isSuspicious ? 30 + suspicionScore * 0.3 : isInRing ? 25 : 16,
          borderWidth: isSuspicious ? 3 : isInRing ? 2 : 1,
        },
      });
    }

    // --- Build edge elements: ALL transaction edges with deduplication ---
    const edgeDedup = new Map<string, { count: number; isRingEdge: boolean; ringColor: string }>();
    for (const e of allCSVEdges) {
      const key = `${e.source}->${e.target}`;
      const existing = edgeDedup.get(key);
      const isRing = ringEdgeKeys.has(key);
      const sourceRing = accountRingMap.get(e.source) ?? "";
      const color = isRing && sourceRing
        ? (ringColorMap.get(sourceRing) ?? DEFAULT_EDGE_COLOR)
        : DEFAULT_EDGE_COLOR;

      if (existing) {
        existing.count++;
        if (isRing) {
          existing.isRingEdge = true;
          existing.ringColor = color;
        }
      } else {
        edgeDedup.set(key, { count: 1, isRingEdge: isRing, ringColor: color });
      }
    }

    const edges: cytoscape.ElementDefinition[] = [];
    for (const [key, meta] of edgeDedup) {
      const [source, target] = key.split("->");
      edges.push({
        data: {
          id: key,
          source,
          target,
          edgeColor: meta.isRingEdge ? meta.ringColor : DEFAULT_EDGE_COLOR,
          isRingEdge: meta.isRingEdge,
          width: meta.isRingEdge ? 3 : 1.5,
          opacity: meta.isRingEdge ? 0.9 : 0.35,
        },
      });
    }

    return { nodes, edges };
  }, [result, allCSVEdges]);

  useEffect(() => {
    let mounted = true;

    async function initCytoscape(): Promise<void> {
      if (!containerRef.current) return;

      const cy = await import("cytoscape");
      const cytoscapeLib = cy.default;

      if (!mounted || !containerRef.current) return;

      // Destroy any existing instance to avoid memory leaks
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }

      const { nodes, edges } = buildElements();
      const totalEdges = edges.length;

      // Adaptive layout: grid for large graphs (>2000 edges), cose for smaller ones
      // Grid layout is O(V) vs cose's O(V^2), critical for 10K transaction performance
      const layoutConfig: cytoscape.LayoutOptions = totalEdges > 2000
        ? {
            name: "grid",
            animate: false,
            condense: true,
            avoidOverlap: true,
          } as cytoscape.LayoutOptions
        : {
            name: "cose",
            animate: false,
            nodeOverlap: 20,
            idealEdgeLength: () => 100,
            nodeRepulsion: () => 8000,
            gravity: 0.25,
            numIter: 500,
          } as cytoscape.LayoutOptions;

      const instance = cytoscapeLib({
        container: containerRef.current,
        // Use empty elements initially, add via batch for performance
        elements: [],
        style: [
          // --- Normal (non-suspicious, non-ring) nodes ---
          {
            selector: "node",
            style: {
              "background-color": "data(ringColor)" as unknown as string,
              label: "data(label)",
              "text-valign": "bottom",
              "text-halign": "center",
              "font-size": "8px",
              color: "#6b7280",
              width: "data(size)" as unknown as number,
              height: "data(size)" as unknown as number,
              "border-width": "data(borderWidth)" as unknown as number,
              "border-color": "#6b7280",
              "text-margin-y": 5 as unknown as number,
              opacity: 0.7 as unknown as number,
            },
          },
          // --- Ring member nodes: colored by ring ---
          {
            selector: "node[?isInRing]",
            style: {
              "background-color": "data(ringColor)" as unknown as string,
              "border-color": "#d1d5db",
              "border-width": 2 as unknown as number,
              color: "#d1d5db",
              "font-size": "10px",
              opacity: 1 as unknown as number,
            },
          },
          // --- Suspicious nodes: red border, larger, full opacity ---
          {
            selector: "node[?isSuspicious]",
            style: {
              "border-color": "#ef4444",
              "border-width": 3 as unknown as number,
              "background-opacity": 0.95 as unknown as number,
              color: "#f9fafb",
              "font-size": "10px",
              opacity: 1 as unknown as number,
            },
          },
          // --- Normal edges ---
          {
            selector: "edge",
            style: {
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "target-arrow-color": "data(edgeColor)" as unknown as string,
              "line-color": "data(edgeColor)" as unknown as string,
              width: "data(width)" as unknown as number,
              opacity: "data(opacity)" as unknown as number,
            },
          },
          // --- Ring edges: brighter, thicker ---
          {
            selector: "edge[?isRingEdge]",
            style: {
              "line-color": "data(edgeColor)" as unknown as string,
              "target-arrow-color": "data(edgeColor)" as unknown as string,
              width: 3,
              opacity: 0.9 as unknown as number,
              "z-index": 10,
            },
          },
          // --- Selected node ---
          {
            selector: "node:selected",
            style: {
              "border-color": "#60a5fa",
              "border-width": 4 as unknown as number,
              "background-opacity": 1 as unknown as number,
              opacity: 1 as unknown as number,
            },
          },
        ],
        // Layout is applied after batch element addition (below)
        layout: { name: "preset" } as cytoscape.LayoutOptions,
        minZoom: 0.1,
        maxZoom: 4,
        wheelSensitivity: 0.3,
      });

      // Use cy.batch() to add all elements in one render pass — avoids
      // intermediate layout recalculations. Critical for 10K+ edge performance.
      instance.batch(() => {
        instance.add([...nodes, ...edges]);
      });

      // Now run the adaptive layout
      instance.layout(layoutConfig).run();

      // --- Click handlers: show details for ALL nodes, not just suspicious ---
      const suspiciousMap = new Map<string, SuspiciousAccount>();
      for (const sa of result.suspicious_accounts) {
        suspiciousMap.set(sa.account_id, sa);
      }

      instance.on("tap", "node", (evt) => {
        const nodeId = evt.target.id() as string;
        const existing = suspiciousMap.get(nodeId);
        if (existing) {
          // Known suspicious account — show full details
          onNodeSelect(existing);
        } else {
          // Non-suspicious node — build a minimal detail object
          // so the panel always shows something useful on click
          const nodeData = evt.target.data();
          onNodeSelect({
            account_id: nodeId,
            suspicion_score: nodeData.suspicionScore ?? 0,
            detected_patterns: [],
            ring_id: nodeData.ringId || "",
          });
        }
      });

      instance.on("tap", (evt) => {
        if (evt.target === instance) {
          onNodeSelect(null);
        }
      });

      cyRef.current = instance;
      setIsReady(true);
    }

    initCytoscape();

    return () => {
      mounted = false;
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [result, buildElements, onNodeSelect]);

  function handleFitView(): void {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  }

  return (
    <div className="glass rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2.5 tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          Transaction Graph
        </h2>
        <button
          onClick={handleFitView}
          className="text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 px-3.5 py-1.5 rounded-lg transition-all border border-white/5 hover:border-white/10"
        >
          Fit View
        </button>
      </div>
      <div
        ref={containerRef}
        className="w-full bg-surface-0"
        style={{ height: "70vh", minHeight: "500px" }}
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-0/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-slate-400 text-sm">Loading graph...</span>
          </div>
        </div>
      )}
    </div>
  );
}

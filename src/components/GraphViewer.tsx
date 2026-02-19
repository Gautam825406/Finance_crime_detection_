"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AnalysisResult, SuspiciousAccount, FraudRingOutput } from "@/lib/types";
import type cytoscape from "cytoscape";

interface GraphViewerProps {
  result: AnalysisResult;
  onNodeSelect: (account: SuspiciousAccount | null) => void;
}

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

export default function GraphViewer({ result, onNodeSelect }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [isReady, setIsReady] = useState(false);

  const buildElements = useCallback((): { nodes: cytoscape.ElementDefinition[]; edges: cytoscape.ElementDefinition[] } => {
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

    const nodeSet = new Set<string>();
    const edgeList: Array<{ source: string; target: string }> = [];

    for (const ring of result.fraud_rings) {
      for (const acc of ring.member_accounts) {
        nodeSet.add(acc);
      }

      if (ring.pattern_type === "cycle") {
        for (let i = 0; i < ring.member_accounts.length; i++) {
          const source = ring.member_accounts[i];
          const target = ring.member_accounts[(i + 1) % ring.member_accounts.length];
          edgeList.push({ source, target });
        }
      } else {
        for (let i = 0; i < ring.member_accounts.length - 1; i++) {
          edgeList.push({
            source: ring.member_accounts[i],
            target: ring.member_accounts[i + 1],
          });
        }
      }
    }

    const nodes: cytoscape.ElementDefinition[] = [];
    for (const accountId of nodeSet) {
      const isSuspicious = suspiciousMap.has(accountId);
      const suspicionScore = suspiciousMap.get(accountId)?.suspicion_score ?? 0;
      const ringId = accountRingMap.get(accountId) ?? "";
      const ringColor = ringId ? (ringColorMap.get(ringId) ?? "#6b7280") : "#6b7280";

      nodes.push({
        data: {
          id: accountId,
          label: accountId.length > 12 ? accountId.slice(0, 12) + "..." : accountId,
          isSuspicious,
          suspicionScore,
          ringId,
          ringColor,
          size: isSuspicious ? 30 + suspicionScore * 0.3 : 20,
          borderWidth: isSuspicious ? 3 : 1,
        },
      });
    }

    const edgeDedup = new Set<string>();
    const edges: cytoscape.ElementDefinition[] = [];
    for (const e of edgeList) {
      const key = `${e.source}->${e.target}`;
      if (!edgeDedup.has(key)) {
        edgeDedup.add(key);
        const sourceRing = accountRingMap.get(e.source) ?? "";
        const edgeColor = sourceRing ? (ringColorMap.get(sourceRing) ?? "#4b5563") : "#4b5563";

        edges.push({
          data: {
            id: key,
            source: e.source,
            target: e.target,
            edgeColor,
          },
        });
      }
    }

    return { nodes, edges };
  }, [result]);

  useEffect(() => {
    let mounted = true;

    async function initCytoscape(): Promise<void> {
      if (!containerRef.current) return;

      const cy = await import("cytoscape");
      const cytoscapeLib = cy.default;

      if (!mounted || !containerRef.current) return;

      const { nodes, edges } = buildElements();

      const instance = cytoscapeLib({
        container: containerRef.current,
        elements: [...nodes, ...edges],
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(ringColor)" as unknown as string,
              label: "data(label)",
              "text-valign": "bottom",
              "text-halign": "center",
              "font-size": "10px",
              color: "#d1d5db",
              width: "data(size)" as unknown as number,
              height: "data(size)" as unknown as number,
              "border-width": "data(borderWidth)" as unknown as number,
              "border-color": "#ffffff",
              "text-margin-y": 5 as unknown as number,
            },
          },
          {
            selector: "node[?isSuspicious]",
            style: {
              "border-color": "#fbbf24",
              "border-width": 3 as unknown as number,
              "background-opacity": 0.9 as unknown as number,
            },
          },
          {
            selector: "edge",
            style: {
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "target-arrow-color": "data(edgeColor)" as unknown as string,
              "line-color": "data(edgeColor)" as unknown as string,
              width: 2,
              opacity: 0.7 as unknown as number,
            },
          },
          {
            selector: "node:selected",
            style: {
              "border-color": "#60a5fa",
              "border-width": 4 as unknown as number,
              "background-opacity": 1 as unknown as number,
            },
          },
        ],
        layout: {
          name: "cose",
          animate: false,
          nodeOverlap: 20,
          idealEdgeLength: () => 100,
          nodeRepulsion: () => 8000,
          gravity: 0.25,
          numIter: 500,
        } as cytoscape.LayoutOptions,
        minZoom: 0.2,
        maxZoom: 3,
        wheelSensitivity: 0.3,
      });

      const suspiciousMap = new Map<string, SuspiciousAccount>();
      for (const sa of result.suspicious_accounts) {
        suspiciousMap.set(sa.account_id, sa);
      }

      instance.on("tap", "node", (evt) => {
        const nodeId = evt.target.id() as string;
        const sa = suspiciousMap.get(nodeId);
        onNodeSelect(sa ?? null);
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

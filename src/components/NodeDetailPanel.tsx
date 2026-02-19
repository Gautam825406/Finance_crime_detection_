"use client";

import type { SuspiciousAccount } from "@/lib/types";

interface NodeDetailPanelProps {
  account: SuspiciousAccount | null;
}

export default function NodeDetailPanel({ account }: NodeDetailPanelProps) {
  if (!account) {
    return (
      <div className="glass rounded-2xl p-6 shadow-card h-full">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2.5 tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          Node Details
        </h2>
        <p className="text-slate-600 text-sm">Select a node on the graph to see its details here.</p>
      </div>
    );
  }

  const score = account.suspicion_score;
  const isSuspicious = score > 0 || account.detected_patterns.length > 0;

  const scoreColor =
    score >= 75
      ? "text-red-400"
      : score >= 50
        ? "text-orange-400"
        : score >= 25
          ? "text-yellow-400"
          : "text-green-400";

  const barColor =
    score >= 75
      ? "bg-red-500"
      : score >= 50
        ? "bg-orange-500"
        : score >= 25
          ? "bg-yellow-500"
          : "bg-green-500";

  return (
    <div className="glass rounded-2xl p-6 shadow-card">
      <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2.5 tracking-tight">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        Node Details
      </h2>

      <div className="space-y-4">
        <div>
          <span className="text-slate-500 text-[11px] font-medium uppercase tracking-widest">Account ID</span>
          <p className="text-white font-mono text-sm mt-1">{account.account_id}</p>
        </div>

        <div>
          <span className="text-slate-500 text-[11px] font-medium uppercase tracking-widest">Suspicion Score</span>
          <p className={`text-3xl font-bold mt-1 ${scoreColor}`}>
            {score.toFixed(1)}
          </p>
          <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
        </div>

        <div>
          <span className="text-slate-500 text-[11px] font-medium uppercase tracking-widest">Detected Patterns</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {isSuspicious ? (
              account.detected_patterns.map((pattern) => (
                <span
                  key={pattern}
                  className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium"
                >
                  {pattern}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-medium">
                Clean — no suspicious patterns
              </span>
            )}
          </div>
        </div>

        <div>
          <span className="text-slate-500 text-[11px] font-medium uppercase tracking-widest">Ring ID</span>
          <p className="text-blue-400 font-mono text-sm mt-1">
            {account.ring_id || "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}

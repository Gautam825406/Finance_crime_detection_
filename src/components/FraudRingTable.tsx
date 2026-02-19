"use client";

import { useState } from "react";
import type { FraudRingOutput } from "@/lib/types";

interface FraudRingTableProps {
  rings: FraudRingOutput[];
}

const PAGE_SIZE = 10;

export default function FraudRingTable({ rings }: FraudRingTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rings.length / PAGE_SIZE));
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const pageRings = rings.slice(startIdx, endIdx);

  function goToPage(page: number): void {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }

  function getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  if (rings.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 shadow-card">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2.5 tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          Fraud Rings
        </h2>
        <p className="text-slate-600 text-sm">No fraud rings detected.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2.5 tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          Fraud Rings
          <span className="text-sm font-normal text-slate-500">({rings.length})</span>
        </h2>
        <span className="text-slate-600 text-xs">
          {startIdx + 1}–{Math.min(endIdx, rings.length)} of {rings.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 uppercase text-[11px] tracking-wider border-b border-white/5">
              <th className="px-5 py-3.5 text-left font-medium">Ring ID</th>
              <th className="px-5 py-3.5 text-left font-medium">Pattern Type</th>
              <th className="px-5 py-3.5 text-center font-medium">Members</th>
              <th className="px-5 py-3.5 text-center font-medium">Risk Score</th>
              <th className="px-5 py-3.5 text-left font-medium">Member Account IDs</th>
            </tr>
          </thead>
          <tbody>
            {pageRings.map((ring) => {
              const riskColor =
                ring.risk_score >= 75
                  ? "text-red-400 bg-red-500/10"
                  : ring.risk_score >= 50
                    ? "text-orange-400 bg-orange-500/10"
                    : ring.risk_score >= 25
                      ? "text-yellow-400 bg-yellow-500/10"
                      : "text-green-400 bg-green-500/10";

              const patternColor =
                ring.pattern_type === "cycle"
                  ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                  : ring.pattern_type === "smurfing"
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

              return (
                <tr key={ring.ring_id} className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0">
                  <td className="px-5 py-3.5 text-blue-400 font-mono text-xs">
                    {ring.ring_id}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${patternColor}`}>
                      {ring.pattern_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center text-slate-300">
                    {ring.member_accounts.length}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${riskColor}`}>
                      {ring.risk_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {ring.member_accounts.slice(0, 8).map((acc) => (
                        <span
                          key={acc}
                          className="px-2 py-0.5 bg-white/[0.03] text-slate-400 rounded-md text-xs font-mono border border-white/5"
                        >
                          {acc}
                        </span>
                      ))}
                      {ring.member_accounts.length > 8 && (
                        <span className="px-2 py-0.5 bg-white/[0.03] text-slate-600 rounded-md text-xs border border-white/5">
                          +{ring.member_accounts.length - 8} more
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 disabled:hover:bg-transparent font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers()[0] > 1 && (
              <>
                <button
                  onClick={() => goToPage(1)}
                  className="w-8 h-8 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                >
                  1
                </button>
                {getPageNumbers()[0] > 2 && (
                  <span className="text-slate-700 text-xs px-1">...</span>
                )}
              </>
            )}

            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  page === currentPage
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {page}
              </button>
            ))}

            {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
              <>
                {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                  <span className="text-slate-700 text-xs px-1">...</span>
                )}
                <button
                  onClick={() => goToPage(totalPages)}
                  className="w-8 h-8 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 disabled:hover:bg-transparent font-medium"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

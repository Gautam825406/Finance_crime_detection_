"use client";

import { useState, useCallback } from "react";
import type { AnalysisResult, SuspiciousAccount } from "@/lib/types";
import CSVUploader from "@/components/CSVUploader";
import GraphViewer from "@/components/GraphViewer";
import NodeDetailPanel from "@/components/NodeDetailPanel";
import FraudRingTable from "@/components/FraudRingTable";
import SummaryPanel from "@/components/SummaryPanel";
import DownloadButton from "@/components/DownloadButton";
import { ErrorDisplay, ApiErrorDisplay } from "@/components/ErrorDisplay";
import Link from "next/link";

interface ApiValidationError {
  row: number;
  message: string;
}

interface ApiErrorResponse {
  error: string;
  details?: ApiValidationError[];
}

export default function AnalyzePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<SuspiciousAccount | null>(null);
  const [apiError, setApiError] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<ApiValidationError[]>([]);
  const [csvText, setCsvText] = useState<string>("");

  const handleNodeSelect = useCallback((account: SuspiciousAccount | null) => {
    setSelectedAccount(account);
  }, []);

  async function handleUpload(csvText: string): Promise<void> {
    setIsLoading(true);
    setResult(null);
    setApiError("");
    setValidationErrors([]);
    setSelectedAccount(null);
    setCsvText(csvText);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as ApiErrorResponse;
        if (errorBody.details && errorBody.details.length > 0) {
          setValidationErrors(errorBody.details);
        } else {
          setApiError(errorBody.error || `Server error: ${response.status}`);
        }
        setIsLoading(false);
        return;
      }

      const data = (await response.json()) as AnalysisResult;
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 text-white noise-bg">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 border-b border-white/5">
        <div className="w-full mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 group-hover:scale-105 transition-all">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Financial Crime Detection Engine
              </h1>
              <p className="text-slate-600 text-[11px] tracking-wide">RIFT 2026 Hackathon — Graph Theory Track</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[13px] text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            >
              Home
            </Link>
            {result && <DownloadButton result={result} />}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="w-full mx-auto px-6 lg:px-10 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 animate-fade-in-up">
            <CSVUploader onUpload={handleUpload} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <NodeDetailPanel account={selectedAccount} />
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="animate-fade-in">
            <ErrorDisplay errors={validationErrors} />
          </div>
        )}

        {apiError && (
          <div className="animate-fade-in">
            <ApiErrorDisplay message={apiError} />
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-fade-in-up">
            <SummaryPanel summary={result.summary} />
            <GraphViewer result={result} csvText={csvText} onNodeSelect={handleNodeSelect} />
            <FraudRingTable rings={result.fraud_rings} />
          </div>
        )}

        {!result && !isLoading && !apiError && validationErrors.length === 0 && (
          <div className="glass rounded-2xl p-16 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center mx-auto mb-6 border border-white/5">
              <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-slate-300 text-lg font-semibold mb-3 tracking-tight">Nothing here yet</h3>
            <p className="text-slate-600 text-sm max-w-lg mx-auto leading-relaxed">
              Upload a CSV with your transaction data and hit &quot;Analyze Transactions&quot; —
              we&apos;ll scan for cycles, smurfing patterns, and layered shell networks.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="w-full mx-auto px-6 lg:px-10 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-sm tracking-tight">FCDE</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Built for RIFT 2026 Hackathon — graph-based fraud detection, no database required.
              </p>
            </div>
            <div>
              <h4 className="text-slate-500 font-semibold text-[11px] uppercase tracking-widest mb-4">Quick Links</h4>
              <div className="space-y-2.5">
                <Link href="/" className="block text-slate-600 hover:text-slate-300 text-xs transition-colors">Home</Link>
                <Link href="/analyze" className="block text-slate-600 hover:text-slate-300 text-xs transition-colors">Analyze</Link>
              </div>
            </div>
            <div>
              <h4 className="text-slate-500 font-semibold text-[11px] uppercase tracking-widest mb-4">Tech Stack</h4>
              <div className="flex flex-wrap gap-1.5">
                {["Next.js", "TypeScript", "Tailwind", "Cytoscape.js"].map((tech) => (
                  <span key={tech} className="px-2.5 py-1 bg-white/[0.03] text-slate-500 rounded-lg text-xs border border-white/5">{tech}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 text-center text-slate-700 text-xs">
            Graph-Based Financial Crime Detection Engine &middot; RIFT 2026 Hackathon &middot; Graph Theory Track
          </div>
        </div>
      </footer>
    </div>
  );
}

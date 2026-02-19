"use client";

import type { AnalysisSummary } from "@/lib/types";

interface SummaryPanelProps {
  summary: AnalysisSummary;
}

export default function SummaryPanel({ summary }: SummaryPanelProps) {
  const cards = [
    {
      label: "Total Accounts",
      value: summary.total_accounts_analyzed.toLocaleString(),
      icon: (
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "border-blue-600",
    },
    {
      label: "Flagged",
      value: summary.suspicious_accounts_flagged.toLocaleString(),
      icon: (
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      color: "border-red-600",
    },
    {
      label: "Rings Found",
      value: summary.fraud_rings_detected.toLocaleString(),
      icon: (
        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: "border-purple-600",
    },
    {
      label: "Time Taken",
      value: `${summary.processing_time_seconds.toFixed(1)}s`,
      icon: (
        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "border-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`glass rounded-2xl p-5 shadow-card border-l-2 ${card.color} hover:bg-white/[0.03] transition-all duration-300`}
        >
          <div className="flex items-center gap-3.5">
            {card.icon}
            <div>
              <p className="text-slate-500 text-[11px] font-medium uppercase tracking-widest">{card.label}</p>
              <p className="text-white text-2xl font-bold tracking-tight">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

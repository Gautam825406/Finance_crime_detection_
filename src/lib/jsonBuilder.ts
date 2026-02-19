import type {
  GraphData,
  DetectedCycle,
  SmurfingPattern,
  LayeringPattern,
  SuspiciousAccount,
  FraudRingOutput,
  AnalysisResult,
  AnalysisSummary,
} from "./types";

export function buildAnalysisResult(
  graph: GraphData,
  cycles: DetectedCycle[],
  smurfingPatterns: SmurfingPattern[],
  layeringPatterns: LayeringPattern[],
  suspiciousAccounts: SuspiciousAccount[],
  processingTimeSeconds: number
): AnalysisResult {
  const fraudRings: FraudRingOutput[] = [];

  for (const cycle of cycles) {
    fraudRings.push({
      ring_id: cycle.ring_id,
      member_accounts: cycle.member_accounts,
      pattern_type: cycle.pattern_type,
      risk_score: cycle.risk_score,
    });
  }

  for (const pattern of smurfingPatterns) {
    fraudRings.push({
      ring_id: pattern.ring_id,
      member_accounts: pattern.member_accounts,
      pattern_type: pattern.pattern_type,
      risk_score: pattern.risk_score,
    });
  }

  for (const pattern of layeringPatterns) {
    fraudRings.push({
      ring_id: pattern.ring_id,
      member_accounts: pattern.member_accounts,
      pattern_type: pattern.pattern_type,
      risk_score: pattern.risk_score,
    });
  }

  const summary: AnalysisSummary = {
    total_accounts_analyzed: graph.nodes.size,
    suspicious_accounts_flagged: suspiciousAccounts.length,
    fraud_rings_detected: fraudRings.length,
    processing_time_seconds: parseFloat(processingTimeSeconds.toFixed(1)),
  };

  return {
    suspicious_accounts: suspiciousAccounts,
    fraud_rings: fraudRings,
    summary,
  };
}

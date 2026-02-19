export interface Transaction {
  transaction_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  timestamp: string;
}

export interface ParsedTransaction extends Transaction {
  timestamp_ms: number;
}

export interface NodeData {
  account_id: string;
  in_degree: number;
  out_degree: number;
  total_in_amount: number;
  total_out_amount: number;
  in_transactions: ParsedTransaction[];
  out_transactions: ParsedTransaction[];
}

export interface GraphData {
  nodes: Map<string, NodeData>;
  adjacency: Map<string, Map<string, ParsedTransaction[]>>;
  reverse_adjacency: Map<string, Map<string, ParsedTransaction[]>>;
  all_transactions: ParsedTransaction[];
}

export interface DetectedCycle {
  ring_id: string;
  member_accounts: string[];
  pattern_type: "cycle";
  risk_score: number;
  cycle_length: number;
  temporal_proximity: boolean;
  amount_similarity: boolean;
}

export interface SmurfingPattern {
  ring_id: string;
  member_accounts: string[];
  pattern_type: "smurfing";
  risk_score: number;
  hub_account: string;
  direction: "fan_in" | "fan_out" | "both";
  velocity: number;
}

export interface LayeringPattern {
  ring_id: string;
  member_accounts: string[];
  pattern_type: "layering";
  risk_score: number;
  chain: string[];
  hop_count: number;
}

export type FraudRing = DetectedCycle | SmurfingPattern | LayeringPattern;

export interface SuspiciousAccount {
  account_id: string;
  suspicion_score: number;
  detected_patterns: string[];
  ring_id: string;
}

export interface FraudRingOutput {
  ring_id: string;
  member_accounts: string[];
  pattern_type: string;
  risk_score: number;
}

export interface AnalysisSummary {
  total_accounts_analyzed: number;
  suspicious_accounts_flagged: number;
  fraud_rings_detected: number;
  processing_time_seconds: number;
}

export interface AnalysisResult {
  suspicious_accounts: SuspiciousAccount[];
  fraud_rings: FraudRingOutput[];
  summary: AnalysisSummary;
}

export interface ValidationError {
  row: number;
  message: string;
}

export interface CSVValidationResult {
  valid: boolean;
  errors: ValidationError[];
  transactions: Transaction[];
}

export interface FalsePositiveProfile {
  is_merchant_like: boolean;
  is_payroll_like: boolean;
  is_stable_recurring: boolean;
}

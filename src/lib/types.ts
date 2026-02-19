/**
 * Core transaction as parsed from CSV input.
 * All fields are required; the parser rejects rows with missing values.
 */
export interface Transaction {
  transaction_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  /** Format: "YYYY-MM-DD HH:MM:SS" */
  timestamp: string;
}

/** Transaction with pre-computed millisecond timestamp for O(1) comparisons. */
export interface ParsedTransaction extends Transaction {
  timestamp_ms: number;
}

/** Per-account statistics aggregated during graph construction. */
export interface NodeData {
  account_id: string;
  in_degree: number;
  out_degree: number;
  total_in_amount: number;
  total_out_amount: number;
  /** Sorted ascending by timestamp_ms for efficient window queries. */
  in_transactions: ParsedTransaction[];
  /** Sorted ascending by timestamp_ms for efficient window queries. */
  out_transactions: ParsedTransaction[];
}

/**
 * Directed graph representation using adjacency lists for O(1) neighbor lookup.
 * adjacency:         sender -> receiver -> transactions[]
 * reverse_adjacency: receiver -> sender -> transactions[]
 */
export interface GraphData {
  nodes: Map<string, NodeData>;
  adjacency: Map<string, Map<string, ParsedTransaction[]>>;
  reverse_adjacency: Map<string, Map<string, ParsedTransaction[]>>;
  all_transactions: ParsedTransaction[];
}

/** Detected directed cycle (length 3–5) in the transaction graph. */
export interface DetectedCycle {
  ring_id: string;
  member_accounts: string[];
  pattern_type: "cycle";
  risk_score: number;
  cycle_length: number;
  temporal_proximity: boolean;
  amount_similarity: boolean;
}

/** Detected smurfing pattern (fan-in / fan-out within 72-hour windows). */
export interface SmurfingPattern {
  ring_id: string;
  member_accounts: string[];
  pattern_type: "smurfing";
  risk_score: number;
  hub_account: string;
  direction: "fan_in" | "fan_out" | "both";
  velocity: number;
}

/** Detected layered shell-company network (3+ hop chain). */
export interface LayeringPattern {
  ring_id: string;
  member_accounts: string[];
  pattern_type: "layering";
  risk_score: number;
  chain: string[];
  hop_count: number;
}

export type FraudRing = DetectedCycle | SmurfingPattern | LayeringPattern;

/**
 * RIFT-compliant suspicious account output.
 * Field order matters: account_id, suspicion_score, detected_patterns, ring_id.
 */
export interface SuspiciousAccount {
  account_id: string;
  /** Always a float with 1 decimal place, range [0, 100]. */
  suspicion_score: number;
  /**
   * Precise pattern labels from the allowed set:
   *   cycle_length_3, cycle_length_4, cycle_length_5,
   *   fan_in, fan_out, high_velocity, layered_shell
   */
  detected_patterns: string[];
  ring_id: string;
}

/**
 * RIFT-compliant fraud ring output.
 * Field order: ring_id, member_accounts, pattern_type, risk_score.
 */
export interface FraudRingOutput {
  ring_id: string;
  member_accounts: string[];
  pattern_type: string;
  /** Always a float with 1 decimal place, range [0, 100]. */
  risk_score: number;
}

/** RIFT-compliant analysis summary. */
export interface AnalysisSummary {
  total_accounts_analyzed: number;
  suspicious_accounts_flagged: number;
  fraud_rings_detected: number;
  /** Always a float with 2 decimal places. */
  processing_time_seconds: number;
}

/** Top-level API response structure. */
export interface AnalysisResult {
  suspicious_accounts: SuspiciousAccount[];
  fraud_rings: FraudRingOutput[];
  summary: AnalysisSummary;
}

/** Individual CSV row validation error. */
export interface ValidationError {
  row: number;
  message: string;
}

/** Result of CSV parsing and validation. */
export interface CSVValidationResult {
  valid: boolean;
  errors: ValidationError[];
  transactions: Transaction[];
}

/**
 * Behavioral profile used for false-positive suppression.
 * Merchant-like, payroll-like, and stable-recurring accounts
 * receive score deductions to prevent over-flagging.
 */
export interface FalsePositiveProfile {
  is_merchant_like: boolean;
  is_payroll_like: boolean;
  is_stable_recurring: boolean;
}

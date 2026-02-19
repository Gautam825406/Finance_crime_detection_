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

/**
 * Ensures a numeric value is a float with exactly 1 decimal place.
 * Eliminates NaN/undefined by defaulting to 0.0.
 */
function toFixed1(value: number | undefined | null): number {
  const safe = typeof value === "number" && !isNaN(value) ? value : 0;
  return parseFloat(safe.toFixed(1));
}

/**
 * Ensures a numeric value is a float with exactly 2 decimal places.
 * Eliminates NaN/undefined by defaulting to 0.00.
 */
function toFixed2(value: number | undefined | null): number {
  const safe = typeof value === "number" && !isNaN(value) ? value : 0;
  return parseFloat(safe.toFixed(2));
}

/**
 * Validates the final AnalysisResult object for RIFT judge compliance.
 *
 * Checks performed:
 * - Required top-level keys present with correct types
 * - suspicious_accounts sorted descending by suspicion_score
 * - No undefined or null values in any field
 * - suspicion_score and risk_score are valid floats
 * - All pattern labels are from the allowed set
 * - Field ordering is correct (enforced by construction)
 *
 * Returns null if valid, or an error message string if invalid.
 */
function validateAnalysisResult(result: AnalysisResult): string | null {
  // Check top-level structure
  if (!Array.isArray(result.suspicious_accounts)) {
    return "suspicious_accounts must be an array";
  }
  if (!Array.isArray(result.fraud_rings)) {
    return "fraud_rings must be an array";
  }
  if (typeof result.summary !== "object" || result.summary === null) {
    return "summary must be an object";
  }

  // Check suspicious_accounts sorted descending
  for (let i = 1; i < result.suspicious_accounts.length; i++) {
    if (result.suspicious_accounts[i].suspicion_score > result.suspicious_accounts[i - 1].suspicion_score) {
      return "suspicious_accounts must be sorted descending by suspicion_score";
    }
  }

  const ALLOWED_PATTERNS = new Set([
    "cycle_length_3",
    "cycle_length_4",
    "cycle_length_5",
    "fan_in",
    "fan_out",
    "high_velocity",
    "layered_shell",
  ]);

  // Validate each suspicious account
  for (const sa of result.suspicious_accounts) {
    if (typeof sa.account_id !== "string" || sa.account_id === "") {
      return `Invalid account_id: ${sa.account_id}`;
    }
    if (typeof sa.suspicion_score !== "number" || isNaN(sa.suspicion_score)) {
      return `Invalid suspicion_score for ${sa.account_id}`;
    }
    if (!Array.isArray(sa.detected_patterns)) {
      return `detected_patterns must be an array for ${sa.account_id}`;
    }
    for (const p of sa.detected_patterns) {
      if (!ALLOWED_PATTERNS.has(p)) {
        return `Unknown pattern label "${p}" for account ${sa.account_id}`;
      }
    }
    if (typeof sa.ring_id !== "string") {
      return `ring_id must be a string for ${sa.account_id}`;
    }
  }

  // Validate fraud rings
  for (const ring of result.fraud_rings) {
    if (typeof ring.ring_id !== "string" || ring.ring_id === "") {
      return `Invalid ring_id: ${ring.ring_id}`;
    }
    if (!Array.isArray(ring.member_accounts) || ring.member_accounts.length === 0) {
      return `member_accounts must be a non-empty array for ${ring.ring_id}`;
    }
    if (typeof ring.pattern_type !== "string") {
      return `pattern_type must be a string for ${ring.ring_id}`;
    }
    if (typeof ring.risk_score !== "number" || isNaN(ring.risk_score)) {
      return `Invalid risk_score for ${ring.ring_id}`;
    }
  }

  // Validate summary
  const s = result.summary;
  if (typeof s.total_accounts_analyzed !== "number") return "Invalid total_accounts_analyzed";
  if (typeof s.suspicious_accounts_flagged !== "number") return "Invalid suspicious_accounts_flagged";
  if (typeof s.fraud_rings_detected !== "number") return "Invalid fraud_rings_detected";
  if (typeof s.processing_time_seconds !== "number") return "Invalid processing_time_seconds";

  return null; // valid
}

/**
 * Builds the final AnalysisResult object with exact RIFT-compliant JSON structure.
 *
 * Field ordering per spec:
 *   suspicious_accounts[]: account_id, suspicion_score, detected_patterns, ring_id
 *   fraud_rings[]:         ring_id, member_accounts, pattern_type, risk_score
 *   summary:               total_accounts_analyzed, suspicious_accounts_flagged,
 *                           fraud_rings_detected, processing_time_seconds
 *
 * Numerical precision:
 *   suspicion_score:          1 decimal
 *   risk_score:               1 decimal
 *   processing_time_seconds:  2 decimals
 *
 * The result is validated before return; throws on structural errors.
 */
export function buildAnalysisResult(
  graph: GraphData,
  cycles: DetectedCycle[],
  smurfingPatterns: SmurfingPattern[],
  layeringPatterns: LayeringPattern[],
  suspiciousAccounts: SuspiciousAccount[],
  processingTimeSeconds: number
): AnalysisResult {
  // Build fraud_rings with exact field order: ring_id, member_accounts, pattern_type, risk_score
  const fraudRings: FraudRingOutput[] = [];

  for (const cycle of cycles) {
    fraudRings.push({
      ring_id: cycle.ring_id,
      member_accounts: [...cycle.member_accounts],
      pattern_type: cycle.pattern_type,
      risk_score: toFixed1(cycle.risk_score),
    });
  }

  for (const pattern of smurfingPatterns) {
    fraudRings.push({
      ring_id: pattern.ring_id,
      member_accounts: [...pattern.member_accounts],
      pattern_type: pattern.pattern_type,
      risk_score: toFixed1(pattern.risk_score),
    });
  }

  for (const pattern of layeringPatterns) {
    fraudRings.push({
      ring_id: pattern.ring_id,
      member_accounts: [...pattern.member_accounts],
      pattern_type: pattern.pattern_type,
      risk_score: toFixed1(pattern.risk_score),
    });
  }

  // Ensure suspicious_accounts have proper decimal formatting
  // and field order: account_id, suspicion_score, detected_patterns, ring_id
  const cleanAccounts: SuspiciousAccount[] = suspiciousAccounts.map((sa) => ({
    account_id: sa.account_id,
    suspicion_score: toFixed1(sa.suspicion_score),
    detected_patterns: [...sa.detected_patterns],
    ring_id: sa.ring_id || "",
  }));

  // Summary with exact field order and processing_time_seconds at 2 decimals
  const summary: AnalysisSummary = {
    total_accounts_analyzed: graph.nodes.size,
    suspicious_accounts_flagged: cleanAccounts.length,
    fraud_rings_detected: fraudRings.length,
    processing_time_seconds: toFixed2(processingTimeSeconds),
  };

  const result: AnalysisResult = {
    suspicious_accounts: cleanAccounts,
    fraud_rings: fraudRings,
    summary,
  };

  // Validate before returning — catch structural issues in dev
  const validationError = validateAnalysisResult(result);
  if (validationError) {
    throw new Error(`JSON validation failed: ${validationError}`);
  }

  return result;
}

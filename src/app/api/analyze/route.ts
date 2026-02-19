import { NextRequest, NextResponse } from "next/server";
import type { Transaction, AnalysisResult } from "@/lib/types";
import { validateCSV, buildGraph } from "@/lib/graph";
import { detectCycles } from "@/lib/cycleDetector";
import { detectSmurfing } from "@/lib/smurfingDetector";
import { detectLayering } from "@/lib/layeringDetector";
import { computeSuspicionScores } from "@/lib/scoring";
import { buildAnalysisResult } from "@/lib/jsonBuilder";

export const maxDuration = 30;

/** Maximum request body size: 50 MB */
const MAX_BODY_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * POST /api/analyze
 *
 * Accepts { csv: string } and returns the RIFT-compliant AnalysisResult JSON.
 * All errors are returned as structured { error: string } responses.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    // ---- Request size guard ----
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Request body too large. Maximum allowed: 50 MB." },
        { status: 413 }
      );
    }

    // ---- Parse request body ----
    let body: { csv?: string };
    try {
      body = await request.json() as { csv?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    if (!body.csv || typeof body.csv !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'csv' field in request body." },
        { status: 400 }
      );
    }

    if (body.csv.trim().length === 0) {
      return NextResponse.json(
        { error: "CSV content is empty." },
        { status: 400 }
      );
    }

    // ---- CSV Validation ----
    const validation = validateCSV(body.csv);

    if (!validation.valid) {
      const firstErrors = validation.errors.slice(0, 20);
      const hasMissingCols = firstErrors.some((e) => e.message.includes("Missing required column"));
      const hasTimestampErr = firstErrors.some((e) => e.message.includes("timestamp"));
      const hasSizeErr = firstErrors.some((e) => e.message.includes("too large"));

      // Return specific error messages depending on the type of failure
      let errorMessage = "CSV validation failed.";
      if (hasSizeErr) {
        errorMessage = "CSV file too large.";
      } else if (hasMissingCols) {
        errorMessage = "CSV is missing required columns.";
      } else if (hasTimestampErr) {
        errorMessage = "CSV contains invalid timestamps.";
      }

      return NextResponse.json(
        { error: errorMessage, details: firstErrors },
        { status: 400 }
      );
    }

    // ---- Build graph & run detectors ----
    const transactions: Transaction[] = validation.transactions;
    const graph = buildGraph(transactions);

    const cycles = detectCycles(graph);
    const smurfingPatterns = detectSmurfing(graph, cycles.length);
    const layeringPatterns = detectLayering(
      graph,
      cycles.length + smurfingPatterns.length
    );

    const suspiciousAccounts = computeSuspicionScores(
      graph,
      cycles,
      smurfingPatterns,
      layeringPatterns
    );

    // ---- Build result with precise timing ----
    const endTime = performance.now();
    const processingTimeSeconds = (endTime - startTime) / 1000;

    const result: AnalysisResult = buildAnalysisResult(
      graph,
      cycles,
      smurfingPatterns,
      layeringPatterns,
      suspiciousAccounts,
      processingTimeSeconds
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error occurred.";
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}

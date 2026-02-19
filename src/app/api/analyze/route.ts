import { NextRequest, NextResponse } from "next/server";
import type { Transaction, AnalysisResult } from "@/lib/types";
import { validateCSV, buildGraph } from "@/lib/graph";
import { detectCycles } from "@/lib/cycleDetector";
import { detectSmurfing } from "@/lib/smurfingDetector";
import { detectLayering } from "@/lib/layeringDetector";
import { computeSuspicionScores } from "@/lib/scoring";
import { buildAnalysisResult } from "@/lib/jsonBuilder";

export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    const body = await request.json() as { csv: string };

    if (!body.csv || typeof body.csv !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'csv' field in request body." },
        { status: 400 }
      );
    }

    const validation = validateCSV(body.csv);

    if (!validation.valid) {
      return NextResponse.json(
        { error: "CSV validation failed.", details: validation.errors },
        { status: 400 }
      );
    }

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

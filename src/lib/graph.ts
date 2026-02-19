import type { Transaction, ParsedTransaction, GraphData, NodeData, CSVValidationResult, ValidationError } from "./types";

const REQUIRED_COLUMNS = ["transaction_id", "sender_id", "receiver_id", "amount", "timestamp"] as const;

/**
 * Accepts both "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DD H:MM:SS" (1-digit hour).
 * Whitespace between date and time is \s+ to tolerate minor formatting variance.
 */
const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}$/;

/** Maximum CSV file size: 50 MB */
const MAX_CSV_SIZE_BYTES = 50 * 1024 * 1024;

/** Maximum allowed validation errors before aborting parse */
const MAX_ERRORS = 50;

/**
 * Normalizes a timestamp to the strict RIFT format "YYYY-MM-DD HH:MM:SS".
 * Pads a 1-digit hour with a leading zero (e.g. "3:01:00" → "03:01:00").
 * Assumes the input already passed TIMESTAMP_REGEX.
 */
function normalizeTimestamp(raw: string): string {
  const [datePart, timePart] = raw.trim().split(/\s+/);
  const [hour, min, sec] = timePart.split(":");
  return `${datePart} ${hour.padStart(2, "0")}:${min}:${sec}`;
}

function parseTimestamp(ts: string): number {
  return new Date(ts.replace(" ", "T") + "Z").getTime();
}

/**
 * RFC 4180-compliant CSV line parser.
 * Handles quoted fields, escaped double-quotes (""), and whitespace trimming.
 * Time complexity: O(n) where n is the length of the line.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Validates and parses raw CSV text into Transaction objects.
 * Handles: quoted values, extra whitespace, empty lines, invalid timestamps.
 * Returns structured errors for any malformed rows.
 *
 * Time complexity: O(n) where n is the number of CSV rows.
 * Space complexity: O(n) for storing parsed transactions.
 */
export function validateCSV(rawText: string): CSVValidationResult {
  const errors: ValidationError[] = [];
  const transactions: Transaction[] = [];

  // File size guard — reject excessively large payloads early
  const byteLength = new TextEncoder().encode(rawText).length;
  if (byteLength > MAX_CSV_SIZE_BYTES) {
    errors.push({ row: 0, message: `CSV file too large (${(byteLength / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${MAX_CSV_SIZE_BYTES / 1024 / 1024} MB.` });
    return { valid: false, errors, transactions };
  }

  const lines = rawText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    errors.push({ row: 0, message: "CSV must contain a header row and at least one data row." });
    return { valid: false, errors, transactions };
  }

  // Parse header using the RFC 4180 parser for consistency
  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase());

  for (const col of REQUIRED_COLUMNS) {
    if (!header.includes(col)) {
      errors.push({ row: 0, message: `Missing required column: ${col}` });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, transactions };
  }

  const colIndex: Record<string, number> = {};
  for (const col of REQUIRED_COLUMNS) {
    colIndex[col] = header.indexOf(col);
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue; // skip empty lines gracefully

    const parts = parseCSVLine(line);

    if (parts.length < REQUIRED_COLUMNS.length) {
      errors.push({ row: i + 1, message: `Row has ${parts.length} columns, expected at least ${REQUIRED_COLUMNS.length}.` });
      if (errors.length > MAX_ERRORS) break;
      continue;
    }

    const txId = parts[colIndex["transaction_id"]];
    const senderId = parts[colIndex["sender_id"]];
    const receiverId = parts[colIndex["receiver_id"]];
    const amountStr = parts[colIndex["amount"]];
    const timestamp = parts[colIndex["timestamp"]];

    if (!senderId || senderId === "") {
      errors.push({ row: i + 1, message: "sender_id is null or empty." });
      if (errors.length > MAX_ERRORS) break;
      continue;
    }

    if (!receiverId || receiverId === "") {
      errors.push({ row: i + 1, message: "receiver_id is null or empty." });
      if (errors.length > MAX_ERRORS) break;
      continue;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0) {
      errors.push({ row: i + 1, message: `Invalid amount: "${amountStr}".` });
      if (errors.length > MAX_ERRORS) break;
      continue;
    }

    if (!TIMESTAMP_REGEX.test(timestamp)) {
      errors.push({ row: i + 1, message: `Invalid timestamp format: "${timestamp}". Expected YYYY-MM-DD HH:MM:SS (or H:MM:SS).` });
      if (errors.length > MAX_ERRORS) break;
      continue;
    }

    // Normalize to strict RIFT format: pad 1-digit hour → "03:01:00"
    const normalizedTs = normalizeTimestamp(timestamp);

    const tsMs = parseTimestamp(normalizedTs);
    if (isNaN(tsMs)) {
      errors.push({ row: i + 1, message: `Unparseable timestamp: "${timestamp}".` });
      if (errors.length > MAX_ERRORS) break;
      continue;
    }

    transactions.push({
      transaction_id: txId,
      sender_id: senderId,
      receiver_id: receiverId,
      amount,
      timestamp: normalizedTs,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    transactions,
  };
}

/**
 * Builds a directed graph from parsed transactions.
 * Uses adjacency list (Map<string, Map<string, ParsedTransaction[]>>) for O(1) edge lookup.
 * Pre-indexes transactions by timestamp (sorted arrays on each node).
 *
 * Time complexity: O(n log n) dominated by sorting per-node transaction lists.
 * Space complexity: O(n + m) where n = unique accounts, m = transactions.
 */
export function buildGraph(transactions: Transaction[]): GraphData {
  const nodes = new Map<string, NodeData>();
  const adjacency = new Map<string, Map<string, ParsedTransaction[]>>();
  const reverse_adjacency = new Map<string, Map<string, ParsedTransaction[]>>();
  const allParsed: ParsedTransaction[] = [];

  function ensureNode(accountId: string): void {
    if (!nodes.has(accountId)) {
      nodes.set(accountId, {
        account_id: accountId,
        in_degree: 0,
        out_degree: 0,
        total_in_amount: 0,
        total_out_amount: 0,
        in_transactions: [],
        out_transactions: [],
      });
    }
  }

  for (const tx of transactions) {
    const parsed: ParsedTransaction = {
      ...tx,
      timestamp_ms: parseTimestamp(tx.timestamp),
    };
    allParsed.push(parsed);

    const { sender_id, receiver_id } = tx;

    ensureNode(sender_id);
    ensureNode(receiver_id);

    const senderNode = nodes.get(sender_id) as NodeData;
    senderNode.out_degree += 1;
    senderNode.total_out_amount += tx.amount;
    senderNode.out_transactions.push(parsed);

    const receiverNode = nodes.get(receiver_id) as NodeData;
    receiverNode.in_degree += 1;
    receiverNode.total_in_amount += tx.amount;
    receiverNode.in_transactions.push(parsed);

    if (!adjacency.has(sender_id)) {
      adjacency.set(sender_id, new Map<string, ParsedTransaction[]>());
    }
    const senderAdj = adjacency.get(sender_id) as Map<string, ParsedTransaction[]>;
    if (!senderAdj.has(receiver_id)) {
      senderAdj.set(receiver_id, []);
    }
    (senderAdj.get(receiver_id) as ParsedTransaction[]).push(parsed);

    if (!reverse_adjacency.has(receiver_id)) {
      reverse_adjacency.set(receiver_id, new Map<string, ParsedTransaction[]>());
    }
    const receiverRevAdj = reverse_adjacency.get(receiver_id) as Map<string, ParsedTransaction[]>;
    if (!receiverRevAdj.has(sender_id)) {
      receiverRevAdj.set(sender_id, []);
    }
    (receiverRevAdj.get(sender_id) as ParsedTransaction[]).push(parsed);
  }

  for (const node of nodes.values()) {
    node.in_transactions.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    node.out_transactions.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  }

  return { nodes, adjacency, reverse_adjacency, all_transactions: allParsed };
}

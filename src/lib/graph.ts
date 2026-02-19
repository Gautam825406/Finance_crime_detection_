import type { Transaction, ParsedTransaction, GraphData, NodeData, CSVValidationResult, ValidationError } from "./types";

const REQUIRED_COLUMNS = ["transaction_id", "sender_id", "receiver_id", "amount", "timestamp"] as const;

const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function parseTimestamp(ts: string): number {
  return new Date(ts.replace(" ", "T") + "Z").getTime();
}

export function validateCSV(rawText: string): CSVValidationResult {
  const errors: ValidationError[] = [];
  const transactions: Transaction[] = [];

  const lines = rawText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    errors.push({ row: 0, message: "CSV must contain a header row and at least one data row." });
    return { valid: false, errors, transactions };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

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
    if (line === "") continue;

    const parts = line.split(",").map((p) => p.trim());

    if (parts.length < REQUIRED_COLUMNS.length) {
      errors.push({ row: i + 1, message: `Row has ${parts.length} columns, expected ${REQUIRED_COLUMNS.length}.` });
      if (errors.length > 50) break;
      continue;
    }

    const txId = parts[colIndex["transaction_id"]];
    const senderId = parts[colIndex["sender_id"]];
    const receiverId = parts[colIndex["receiver_id"]];
    const amountStr = parts[colIndex["amount"]];
    const timestamp = parts[colIndex["timestamp"]];

    if (!senderId || senderId === "") {
      errors.push({ row: i + 1, message: "sender_id is null or empty." });
      if (errors.length > 50) break;
      continue;
    }

    if (!receiverId || receiverId === "") {
      errors.push({ row: i + 1, message: "receiver_id is null or empty." });
      if (errors.length > 50) break;
      continue;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      errors.push({ row: i + 1, message: `Invalid amount: "${amountStr}".` });
      if (errors.length > 50) break;
      continue;
    }

    if (!TIMESTAMP_REGEX.test(timestamp)) {
      errors.push({ row: i + 1, message: `Invalid timestamp format: "${timestamp}". Expected YYYY-MM-DD HH:MM:SS.` });
      if (errors.length > 50) break;
      continue;
    }

    const tsMs = parseTimestamp(timestamp);
    if (isNaN(tsMs)) {
      errors.push({ row: i + 1, message: `Unparseable timestamp: "${timestamp}".` });
      if (errors.length > 50) break;
      continue;
    }

    transactions.push({
      transaction_id: txId,
      sender_id: senderId,
      receiver_id: receiverId,
      amount,
      timestamp,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    transactions,
  };
}

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

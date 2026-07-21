export type ParsedBulkEntries = {
  names: string[];
  skippedEmptyCount: number;
  hadMultipleRows: boolean;
  hadAdditionalColumns: boolean;
};

export type BulkEntryStatus = "ready" | "empty" | "existing" | "duplicate";

export type BulkEntryEvaluation = {
  normalizedName: string;
  status: BulkEntryStatus;
  reason?: string;
};

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

export function parseBulkEntryText(value: string): ParsedBulkEntries {
  const normalized = normalizeLineEndings(value);
  const rows = normalized.split("\n");
  let skippedEmptyCount = 0;
  const names: string[] = [];

  for (const row of rows) {
    const [firstColumn = ""] = row.split("\t");
    const name = firstColumn.trim();
    if (!name) {
      skippedEmptyCount += 1;
      continue;
    }
    names.push(name);
  }

  return {
    names,
    skippedEmptyCount,
    hadMultipleRows: rows.length > 1,
    hadAdditionalColumns: rows.some((row) => row.includes("\t"))
  };
}

function normalizedKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function evaluateBulkEntryNames(names: string[], occupiedNames: string[]): BulkEntryEvaluation[] {
  const occupied = new Set(occupiedNames.map(normalizedKey).filter(Boolean));
  const seen = new Set<string>();

  return names.map((name) => {
    const normalizedName = name.trim();
    const key = normalizedKey(normalizedName);
    if (!normalizedName) return { normalizedName, status: "empty", reason: "Empty rows are skipped." };
    if (occupied.has(key)) return { normalizedName, status: "existing", reason: "Already exists." };
    if (seen.has(key)) return { normalizedName, status: "duplicate", reason: "Duplicate within this paste." };
    seen.add(key);
    return { normalizedName, status: "ready" };
  });
}
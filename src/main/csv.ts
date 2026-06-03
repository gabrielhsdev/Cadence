/**
 * Minimal CSV serialiser / parser.
 * Handles commas, double-quotes, and newlines inside fields correctly.
 */

export const CSV_HEADERS = [
  'problem_title',
  'topic',
  'difficulty',
  'leetcode_url',
  'list_name',
  'rating',
  'notes',
  'reviewed_at',
  'next_review_at',
] as const;

export type CsvRow = Record<(typeof CSV_HEADERS)[number], string>;

// ── serialise ──────────────────────────────────────────────────────────────

function escapeField(value: string): string {
  // Wrap in double-quotes if the value contains commas, quotes, or newlines
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: CsvRow[]): string {
  const header = CSV_HEADERS.join(',');
  const lines = rows.map((row) =>
    CSV_HEADERS.map((h) => escapeField(row[h] ?? '')).join(',')
  );
  return [header, ...lines].join('\n');
}

// ── parse ──────────────────────────────────────────────────────────────────

// Tokenise the whole document in a single pass so quoted fields may span line
// breaks (a note like "line1\nline2" round-trips correctly). Splitting on '\n'
// first — as the previous version did — tore such fields across records.
function parseRecords(csv: string): string[][] {
  const s = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;

  const endField = (): void => {
    record.push(field);
    field = '';
  };
  const endRecord = (): void => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false; // closing quote
        }
      } else {
        field += ch; // any char incl. newline is part of the field
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      endField();
    } else if (ch === '\n') {
      endRecord();
    } else {
      field += ch;
    }
  }
  // Flush the final field/record if the file didn't end on a newline.
  if (field.length > 0 || record.length > 0) endRecord();

  return records;
}

export function csvToRows(csv: string): CsvRow[] {
  const records = parseRecords(csv);
  if (records.length === 0) return [];

  const headers = records[0].map((h) => h.trim());

  // Validate all expected columns are present
  for (const expected of CSV_HEADERS) {
    if (!headers.includes(expected)) {
      throw new Error(`CSV is missing required column: "${expected}"`);
    }
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    // Skip blank records (e.g. a trailing newline produced an empty line)
    if (values.length === 1 && values[0].trim() === '') continue;
    const row = {} as CsvRow;
    for (const h of CSV_HEADERS) {
      const idx = headers.indexOf(h);
      row[h] = idx !== -1 ? (values[idx] ?? '') : '';
    }
    rows.push(row);
  }

  return rows;
}

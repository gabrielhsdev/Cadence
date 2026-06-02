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

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      let field = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            // Escaped quote
            field += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      fields.push(field);
      if (line[i] === ',') i++; // skip comma
    } else {
      // Unquoted field — read until comma
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }

  return fields;
}

export function csvToRows(csv: string): CsvRow[] {
  // Normalise line endings
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0].trim();
  const headers = parseCsvLine(headerLine);

  // Validate all expected columns are present
  for (const expected of CSV_HEADERS) {
    if (!headers.includes(expected)) {
      throw new Error(`CSV is missing required column: "${expected}"`);
    }
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row = {} as CsvRow;
    for (const h of CSV_HEADERS) {
      const idx = headers.indexOf(h);
      row[h] = idx !== -1 ? (values[idx] ?? '') : '';
    }
    rows.push(row);
  }

  return rows;
}

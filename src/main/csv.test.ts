import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowsToCsv, csvToRows, CSV_HEADERS, CsvRow } from './csv';

function makeRow(over: Partial<CsvRow> = {}): CsvRow {
  return {
    problem_title: 'Two Sum',
    topic: 'Arrays',
    difficulty: 'Easy',
    leetcode_url: 'https://leetcode.com/problems/two-sum/',
    list_name: 'NeetCode 150',
    rating: '5',
    notes: '',
    reviewed_at: '2026-06-02',
    next_review_at: '2026-06-09',
    ...over,
  };
}

test('round-trips a simple row unchanged', () => {
  const row = makeRow();
  const parsed = csvToRows(rowsToCsv([row]));
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0], row);
});

test('escapes and parses fields containing commas', () => {
  const row = makeRow({ notes: 'use a map, then a set' });
  const csv = rowsToCsv([row]);
  assert.match(csv, /"use a map, then a set"/);
  assert.equal(csvToRows(csv)[0].notes, 'use a map, then a set');
});

test('escapes and parses fields containing double-quotes', () => {
  const row = makeRow({ notes: 'the "two pointer" trick' });
  const csv = rowsToCsv([row]);
  // Inner quotes are doubled per RFC 4180
  assert.match(csv, /"the ""two pointer"" trick"/);
  assert.equal(csvToRows(csv)[0].notes, 'the "two pointer" trick');
});

test('parses plain unquoted fields', () => {
  const header = CSV_HEADERS.join(',');
  const line = 'Two Sum,Arrays,Easy,https://x,NeetCode 150,5,ok,2026-06-02,2026-06-09';
  const rows = csvToRows(`${header}\n${line}`);
  assert.equal(rows[0].problem_title, 'Two Sum');
  assert.equal(rows[0].notes, 'ok');
});

test('throws a helpful error when a required column is missing', () => {
  const headers = CSV_HEADERS.filter((h) => h !== 'rating').join(',');
  assert.throws(() => csvToRows(`${headers}\na,b,c,d,e,f,g,h`), /missing required column: "rating"/);
});

test('ignores blank and trailing-newline lines', () => {
  const csv = `${rowsToCsv([makeRow(), makeRow({ problem_title: 'Valid Anagram' })])}\n\n`;
  const rows = csvToRows(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].problem_title, 'Valid Anagram');
});

test('header-only or empty input yields no rows', () => {
  assert.deepEqual(csvToRows(''), []);
  assert.deepEqual(csvToRows(CSV_HEADERS.join(',')), []);
});

test('column order in the source file does not matter', () => {
  // Reverse the header order; values must still map back by name.
  const reversed = [...CSV_HEADERS].reverse();
  const header = reversed.join(',');
  const values = reversed
    .map((h) => makeRow({ topic: 'Graphs' })[h])
    .join(',');
  const rows = csvToRows(`${header}\n${values}`);
  assert.equal(rows[0].topic, 'Graphs');
  assert.equal(rows[0].rating, '5');
});

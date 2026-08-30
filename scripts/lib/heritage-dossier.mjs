/**
 * Pure helpers for reading Markdown-embedded evidence CSV blocks.
 * Git may materialise repository text as LF or CRLF, but evidence parsing
 * must see one canonical representation on every host.
 */

export function normaliseNewlines(text) {
  return String(text).replace(/\r\n?/g, "\n");
}

export function extractFencedCsv(text, header, { optional = false } = {}) {
  const canonical = normaliseNewlines(text);
  const escaped = String(header).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockPattern = new RegExp(
    "^```csv\\n(" + escaped + "(?:\\n[\\s\\S]*?)?)\\n```",
    "gm",
  );
  const matches = [...canonical.matchAll(blockPattern)];
  if (matches.length > 1) {
    throw new Error(`duplicate fenced CSV blocks headed by ${header}`);
  }
  if (matches.length === 0) {
    const headerPattern = new RegExp("^```csv\\n" + escaped + "(?:\\n|$)", "m");
    if (optional && !headerPattern.test(canonical)) return null;
    throw new Error(`missing or malformed fenced CSV block headed by ${header}`);
  }
  return matches[0][1];
}

export function parseCsv(text, {
  label = "CSV",
  expectedHeader = null,
  expectedRows = null,
  nonEmptyColumns = [],
} = {}) {
  const canonical = normaliseNewlines(text);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;

  const fail = (message) => {
    throw new Error(`${label}: ${message}`);
  };
  const pushField = () => {
    row.push(field);
    field = "";
    afterQuote = false;
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < canonical.length; i++) {
    const c = canonical[i];
    if (inQuotes) {
      if (c === '"' && canonical[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
        afterQuote = true;
      } else {
        field += c;
      }
    } else if (afterQuote) {
      if (c === ",") pushField();
      else if (c === "\n") pushRow();
      else fail(`unexpected character after closing quote at offset ${i}`);
    } else if (c === '"') {
      if (field.length) fail(`quote may only begin a field at offset ${i}`);
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else {
      field += c;
    }
  }

  if (inQuotes) fail("unterminated quoted field");
  if (afterQuote || field.length || row.length) pushRow();

  const header = rows.shift();
  if (!header) fail("missing header");

  const expectedColumns = expectedHeader === null
    ? null
    : Array.isArray(expectedHeader) ? expectedHeader : String(expectedHeader).split(",");
  if (expectedColumns && (header.length !== expectedColumns.length
    || header.some((value, i) => value !== expectedColumns[i]))) {
    fail("header does not match exactly");
  }

  for (const [i, dataRow] of rows.entries()) {
    if (dataRow.length !== header.length) {
      fail(`row ${i + 2} has ${dataRow.length} fields; expected ${header.length}`);
    }
    for (const column of nonEmptyColumns) {
      if (dataRow[column] === "") fail(`row ${i + 2} has an empty required field at column ${column + 1}`);
    }
  }
  if (expectedRows !== null && rows.length !== expectedRows) {
    fail(`expected ${expectedRows} data rows; got ${rows.length}`);
  }

  return rows.map(dataRow => Object.fromEntries(header.map((h, i) => [h, dataRow[i]])));
}

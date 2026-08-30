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

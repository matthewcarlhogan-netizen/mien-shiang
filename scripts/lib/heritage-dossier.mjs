/**
 * Pure helpers for reading Markdown-embedded evidence CSV blocks.
 * Git may materialise repository text as LF or CRLF, but evidence parsing
 * must see one canonical representation on every host.
 */

export function normaliseNewlines(text) {
  return String(text).replace(/\r\n?/g, "\n");
}

export function extractFencedCsv(text, header) {
  const canonical = normaliseNewlines(text);
  const escaped = String(header).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = canonical.match(new RegExp(
    "```csv\\n(" + escaped + "[\\s\\S]*?)\\n```",
    "m",
  ));
  if (!match) {
    throw new Error(`missing fenced CSV block headed by ${header}`);
  }
  return match[1];
}

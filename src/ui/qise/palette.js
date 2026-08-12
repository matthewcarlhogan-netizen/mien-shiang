/*
 * PHASE 9 — the palette.
 *
 * ── WHY THE SIMILES TRAVEL WITH THE HEX VALUES ─────────────────────────────
 * Every colour here is derived from Su Wen Ch. 17's own descriptions of what a
 * favourable showing looks like, and each simile is carried as data rather
 * than as a comment someone can delete. They are the reason the greens are
 * jade rather than indigo and the yellows are realgar rather than loess — and
 * without them the next person to touch this file has five arbitrary hex
 * values and every reason to "improve" them.
 *
 * Five accents, five colours, no sixth, no gradients. A sixth accent would
 * have nothing behind it: the classical scheme has five, and an accent with no
 * referent is decoration pretending to be meaning.
 */

/**
 * The five, plus the ground they sit on.
 *
 * `ground` is not a sixth accent. It is paper.
 */
export const PALETTE = Object.freeze({
  qing: { hex: "#4A6E67", simile: "moistened greyish jade, not indigo", direction: "east", season: "spring" },
  chi: { hex: "#B0392A", simile: "vermilion covered with white, not ochre", direction: "south", season: "summer" },
  huang: { hex: "#C09A2B", simile: "realgar covered with gauze, not loess", direction: "centre", season: "late summer" },
  bai: { hex: "#EDE8DC", simile: "goose feather, not salt", direction: "west", season: "autumn" },
  hei: { hex: "#1B1917", simile: "dark varnish, not greyish charcoal", direction: "north", season: "winter" },
});

export const GROUND = Object.freeze({ hex: "#DCDBD3", note: "pale mineral paper" });

/** Order used wherever the five are listed. Classical, not alphabetical. */
export const COLOUR_ORDER = Object.freeze(["qing", "chi", "huang", "bai", "hei"]);

/**
 * The type stack.
 *
 * ── AN HONEST GAP, NOT A DESIGN CHOICE ─────────────────────────────────────
 * The brief names Bricolage Grotesque, EB Garamond, IBM Plex Mono and Noto
 * Serif SC, self-hosted as subset woff2 and preloaded. The families are
 * declared here so the intent is recorded and one edit switches them on, but
 * NO @font-face rule is emitted and no woff2 file is committed.
 *
 * Emitting @font-face for files that do not exist would be worse than the gap
 * it papers over: every load would fire four requests that 404, the service
 * worker would precache four missing entries, and `tests/source-integrity`
 * would be asserting against files nobody can produce from this repository.
 * The webfont import was removed from index.html for related reasons, and the
 * reasoning is recorded at the top of that file.
 *
 * What is outstanding is the font binaries and the subsetting, and that is
 * recorded in docs/QISE_NOTES.md rather than hidden behind a broken link.
 */
export const TYPE = Object.freeze({
  display: {
    intended: "Bricolage Grotesque",
    stack: "'Bricolage Grotesque',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  },
  passage: {
    intended: "EB Garamond",
    stack: "'EB Garamond',Garamond,Georgia,'Times New Roman',serif",
  },
  // Readings are instrument output and are set as such: tabular figures, so a
  // column of numbers lines up and a changing digit does not reflow the row.
  numeric: {
    intended: "IBM Plex Mono",
    stack: "'IBM Plex Mono',ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace",
  },
  cjk: {
    intended: "Noto Serif SC",
    stack: "'Noto Serif SC','Noto Serif CJK SC','Songti SC','Source Han Serif SC',serif",
  },
  /*
   * The two ritual roles, added for the palace grid's seal treatment.
   *
   * ── WHY THESE ARE SEPARATE ROLES AND NOT A REDEFINITION OF passage/numeric ─
   * `passage` is body prose and `numeric` is instrument output; both are set
   * at reading sizes and both are load-bearing for how the app reads as an
   * instrument. `ritual` is a display role used at 1.5rem italic for one line
   * on one card, and `terminal` is a small-caps annotation role. Redefining
   * the two existing roles to reach the new look would restyle every screen
   * to serve one card, which is the opposite of a scoped change.
   *
   * ── AND WHY THERE IS STILL NO @font-face ───────────────────────────────────
   * Same reason as the four families above, and it has not changed: no woff2
   * is committed, so a rule here would 404 on every load and precache a
   * missing entry. Google Fonts is not the escape hatch — it is a third-party
   * request on every load for a product whose claim is that nothing leaves the
   * device, and both index.html and qise.html record that removal deliberately.
   * The named family sits first in each stack, so a device that already has it
   * uses it and every other device gets the fallback silently.
   */
  ritual: {
    intended: "Cormorant Garamond",
    stack: "'Cormorant Garamond','EB Garamond',Garamond,Georgia,'Times New Roman',serif",
  },
  terminal: {
    intended: "JetBrains Mono",
    stack: "'JetBrains Mono','IBM Plex Mono',ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace",
  },
});

/**
 * The custom properties, with each simile kept as the CSS comment.
 *
 * Generated rather than hand-maintained so the stylesheet and PALETTE cannot
 * drift — a hex value corrected in one and not the other is invisible until
 * somebody screenshots both.
 */
export function paletteCss() {
  const lines = [":root{"];
  for (const name of COLOUR_ORDER) {
    const c = PALETTE[name];
    lines.push(`  --${name}: ${c.hex};  /* ${c.simile} */`);
  }
  lines.push(`  --ground: ${GROUND.hex};  /* ${GROUND.note} */`);
  lines.push(`  --display: ${TYPE.display.stack};`);
  lines.push(`  --passage: ${TYPE.passage.stack};`);
  lines.push(`  --numeric: ${TYPE.numeric.stack};`);
  lines.push(`  --cjk: ${TYPE.cjk.stack};`);
  lines.push(`  --font-ritual: ${TYPE.ritual.stack};`);
  lines.push(`  --font-terminal: ${TYPE.terminal.stack};`);
  lines.push("}");
  return lines.join("\n");
}

/*
 * Client-side share card.
 *
 * Draws the reading receipt to a canvas on the device and hands the resulting
 * PNG to the OS share sheet. No upload, no library, no network — the image is
 * produced and consumed entirely on the phone, which is the only way a share
 * feature can exist here without contradicting the app's one real promise.
 *
 * ── THE PHOTO IS EXCLUDED BY DEFAULT, AND THAT IS A PRIVACY DECISION ───────
 * "No photo leaves your device" survives right up until the user posts an
 * image with their face in it. Including the frame by default would quietly
 * convert a privacy guarantee into a privacy hazard at the exact moment the
 * user is least likely to be thinking about it. So `includePhoto` defaults to
 * false everywhere, the toggle is opt-in, and the warning next to it says what
 * posting the image actually does. If it IS included, the already-processed
 * frame is reused — nothing is re-read from the camera and nothing is uploaded.
 *
 * ── WHY THE FEATURE DETECTION IS INJECTED ──────────────────────────────────
 * `chooseDelivery()` takes the navigator as an argument for the same reason
 * `createLandmarkerWithFallback()` takes its factory: the fallback path is the
 * one that matters (iOS and desktop Safari, Firefox, and in-app browsers all
 * miss file sharing to varying degrees), and a fallback that nothing can
 * execute is a fallback nobody has ever run. Injected, it is testable in Node.
 *
 * ── NO FONTS OR IMAGES ARE LOADED ──────────────────────────────────────────
 * The card draws with the system font stack and vector shapes only. That is
 * deliberate: a canvas drawn before a webfont resolves rasterises fallback
 * glyphs or blank boxes, and this repo removed its webfont on purpose (see the
 * note at the top of index.html). Nothing here needs preloading, and nothing
 * here adds an asset to the service-worker precache.
 */

import { buildSummary } from "./reading/summary.js";

export const SIZES = {
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

const INK = "#E8EAEC";
const INK_60 = "#8A9299";
const PAPER = "#0F1216";
const CINNABAR = "#E05540";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const DISPLAY = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * The text content of the card. Pure, so what the image says can be asserted
 * without a canvas.
 *
 * @param {object} reading  composeReading() output
 * @param {string} caveatText  supplied by the caller from index.html's
 *        disclaimer template — never a literal here, see readingview.js
 */
export function buildShareModel(reading, caveatText, opts = {}) {
  const s = buildSummary(reading);
  const { unlocked = false, url = "" } = opts;

  const fe = reading?.fiveElements;
  const h = reading?.harmony;

  /* The canon value is ALWAYS rendered with what it is a match TO.
   * A bare "82/100" beside someone's face shape, on an image they are about
   * to post publicly, reads as a rating of them — which is the one thing this
   * number is not, and the thing consent clause 04 promises the app does not
   * do. The label is not decoration around the figure; it is what makes the
   * figure true. Never draw one without the other. */
  const canon = Number.isFinite(h?.value)
    ? { value: h.value, label: "MATCH TO THE CLASSICAL CANONS", basis: h.basis }
    : null;

  return {
    wordmark: "面相",
    mode: unlocked ? "unlocked" : "locked",
    shapeLine: fe?.available ? `${titleCase(fe.shape)} — ${fe.name} Element` : null,
    canon,
    headline: s.headline.map((x) => `${x.label} ${x.hanzi}`),
    coverage: s.coverage,
    emphasis: s.emphasis,
    /* WHOLE attributed strings, never excerpts.
     *
     * The brief asked for "the first line of the narrative". That is precisely
     * the defect CLAUDE.md item 24 records: every Module A string opens with
     * its attribution — "In Mian Xiang…", "Classical Chinese face reading…" —
     * so cutting at a line, a sentence or a character count can strand that
     * opening and turn a statement about a tradition into a statement about
     * the reader. The copy guards never see it, because they scan the source
     * strings and not what a view does to them afterwards.
     *
     * So these are complete sentences, taken whole. If one does not fit the
     * card it is DROPPED, not trimmed — see fitWhole() in the draw step. */
    readings: unlocked ? [fe?.reading, h?.components?.[0]?.reads].filter(Boolean) : [],
    teaser: unlocked ? null : "Full TCM Report + Aesthetic Analysis",
    cta: unlocked || !url ? null : `Scan your face → ${url}`,
    caveat: caveatText ?? "",
    /** Mirrors the summary: nothing read means nothing claimed. */
    anyRead: s.anyRead,
  };
}

const titleCase = (str) =>
  String(str ?? "").replace(/^[a-z]/, (c) => c.toUpperCase());

/**
 * A padlock, drawn as vector rather than set as an emoji glyph.
 *
 * This file loads no fonts and no images on purpose — a canvas drawn before a
 * webfont resolves rasterises blank boxes. An emoji is the same hazard wearing
 * different clothes: 🔒 depends on a colour emoji font being present and
 * having that codepoint, and where it is missing the card renders a tofu box
 * in the middle of the image with no way to detect it after the fact. Two
 * rounded rectangles and an arc always draw.
 */
export function drawPadlock(ctx, x, y, size, colour) {
  const body = size * 0.62;
  const shackleR = size * 0.26;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(2, size * 0.09);

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size - body - shackleR * 0.15, shackleR, Math.PI, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.rect(x, y + size - body, size, body);
  ctx.fill();
  ctx.restore();
}

/**
 * Decide how this device can deliver the image.
 *
 * @param {object} nav  a navigator-shaped object (injected for testability)
 * @param {File} file
 * @returns {"share"|"download"} never anything else — the button must not
 *          become a dead end on any platform.
 */
export function chooseDelivery(nav, file) {
  try {
    if (typeof nav?.share === "function" && typeof nav?.canShare === "function"
        && nav.canShare({ files: [file] })) {
      return "share";
    }
  } catch {
    // canShare throws on some in-app browsers rather than returning false.
    // Falling through to download is the whole point of catching it.
    return "download";
  }
  return "download";
}

/** Word-wrap for canvas, which has no text layout of its own. */
export function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draw the receipt. Requires a real 2D context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} model  buildShareModel() output
 * @param {{w:number,h:number}} size
 * @param {HTMLCanvasElement|ImageBitmap|null} photo  opt-in only
 */
export function drawShareCard(ctx, model, size, photo = null) {
  const { w, h } = size;
  const pad = Math.round(w * 0.085);
  const maxW = w - pad * 2;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = CINNABAR;
  ctx.fillRect(0, 0, w, Math.round(h * 0.006));

  let y = pad + Math.round(w * 0.06);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = CINNABAR;
  ctx.font = `${Math.round(w * 0.075)}px ${DISPLAY}`;
  ctx.fillText(model.wordmark, pad, y);
  y += Math.round(w * 0.075);

  ctx.fillStyle = INK_60;
  ctx.font = `${Math.round(w * 0.026)}px ${MONO}`;
  ctx.fillText("READING RECEIPT", pad, y);
  y += Math.round(w * 0.075);

  // Face shape, when it was actually typed. Absent rather than guessed.
  if (model.shapeLine) {
    ctx.fillStyle = INK;
    ctx.font = `600 ${Math.round(w * 0.046)}px ${DISPLAY}`;
    ctx.fillText(model.shapeLine, pad, y);
    y += Math.round(w * 0.072);
  }

  // The canon value, and never without the line that says what it matches.
  if (model.canon) {
    ctx.fillStyle = CINNABAR;
    ctx.font = `700 ${Math.round(w * 0.105)}px ${DISPLAY}`;
    ctx.fillText(`${model.canon.value}/100`, pad, y);
    y += Math.round(w * 0.038);
    ctx.fillStyle = INK_60;
    ctx.font = `${Math.round(w * 0.024)}px ${MONO}`;
    ctx.fillText(model.canon.label, pad, y);
    y += Math.round(w * 0.062);
  }

  if (model.mode === "locked") {
    const iconSize = Math.round(w * 0.075);
    drawPadlock(ctx, pad, y - iconSize, iconSize, INK_60);

    ctx.fillStyle = INK;
    ctx.font = `600 ${Math.round(w * 0.040)}px ${DISPLAY}`;
    ctx.fillText(model.teaser, pad + iconSize + Math.round(w * 0.035), y - Math.round(w * 0.012));
    y += Math.round(w * 0.085);

    if (model.cta) {
      ctx.fillStyle = CINNABAR;
      ctx.font = `600 ${Math.round(w * 0.032)}px ${DISPLAY}`;
      for (const line of wrapText(ctx, model.cta, maxW)) {
        ctx.fillText(line, pad, y);
        y += Math.round(w * 0.048);
      }
    }
    drawCaveat(ctx, model, w, h, pad, maxW);
    return ctx;
  }

  // Headline constructs — one per line, only what was measured.
  ctx.fillStyle = INK;
  const headSize = Math.round(w * 0.062);
  ctx.font = `600 ${headSize}px ${DISPLAY}`;
  if (model.anyRead) {
    for (const term of model.headline) {
      ctx.fillText(term, pad, y);
      y += Math.round(headSize * 1.28);
    }
  } else {
    ctx.font = `${Math.round(w * 0.036)}px ${DISPLAY}`;
    for (const line of wrapText(ctx, "Nothing in this photo could be read closely enough to summarise.", maxW)) {
      ctx.fillText(line, pad, y);
      y += Math.round(w * 0.05);
    }
  }

  y += Math.round(w * 0.02);

  // Coverage — the scope line, in the same numbers the app shows.
  ctx.fillStyle = INK_60;
  ctx.font = `${Math.round(w * 0.028)}px ${MONO}`;
  for (const item of model.coverage) {
    for (const line of wrapText(ctx, item, maxW)) {
      ctx.fillText(line, pad, y);
      y += Math.round(w * 0.045);
    }
  }

  if (model.emphasis) {
    y += Math.round(w * 0.03);
    ctx.fillStyle = INK;
    ctx.font = `${Math.round(w * 0.036)}px ${DISPLAY}`;
    for (const line of wrapText(ctx, model.emphasis, maxW)) {
      ctx.fillText(line, pad, y);
      y += Math.round(w * 0.052);
    }
  }

  /* Whole attributed readings — fitted or dropped, never trimmed.
   *
   * The budget stops at the caveat, which is pinned to the bottom. A line that
   * does not fit is left out entirely: truncating one would cut the end off a
   * sentence whose opening is its attribution, which is how a statement about
   * a tradition becomes a statement about the reader. Dropping loses content;
   * trimming changes meaning. */
  if (model.readings?.length) {
    ctx.font = `${Math.round(w * 0.032)}px ${DISPLAY}`;
    const lineH = Math.round(w * 0.046);
    const budget = h - Math.round(w * 0.30);
    for (const text of model.readings) {
      const lines = wrapText(ctx, text, maxW);
      if (y + lines.length * lineH > budget) continue;   // drop, do not trim
      y += Math.round(w * 0.028);
      ctx.fillStyle = INK;
      ctx.font = `${Math.round(w * 0.032)}px ${DISPLAY}`;
      for (const line of lines) {
        ctx.fillText(line, pad, y);
        y += lineH;
      }
    }
  }

  // Opt-in photo, drawn only when the user explicitly asked for it.
  if (photo) {
    const boxTop = y + Math.round(w * 0.04);
    const boxH = Math.max(0, h - boxTop - Math.round(w * 0.26));
    if (boxH > w * 0.2) {
      const pw = photo.width, ph = photo.height;
      const scale = Math.min(maxW / pw, boxH / ph);
      const dw = Math.round(pw * scale), dh = Math.round(ph * scale);
      ctx.drawImage(photo, pad, boxTop, dw, dh);
    }
  }

  drawCaveat(ctx, model, w, h, pad, maxW);
  return ctx;
}

/**
 * Caveat, pinned to the bottom so it survives any amount of content above, and
 * drawn by BOTH modes. A locked card is the one most likely to be posted
 * publicly, so it is the last place the disclaimer may be dropped.
 */
function drawCaveat(ctx, model, w, h, pad, maxW) {
  ctx.fillStyle = INK_60;
  ctx.font = `${Math.round(w * 0.026)}px ${DISPLAY}`;
  const caveatLines = wrapText(ctx, model.caveat, maxW);
  let cy = h - pad - (caveatLines.length - 1) * Math.round(w * 0.04);
  for (const line of caveatLines) {
    ctx.fillText(line, pad, cy);
    cy += Math.round(w * 0.04);
  }
}

/**
 * Render to a PNG blob. Browser-only (needs a canvas).
 *
 * @param {object} model
 * @param {"story"|"square"} variant
 * @param {HTMLCanvasElement|null} photo
 */
export async function renderShareBlob(model, variant = "story", photo = null) {
  const size = SIZES[variant] ?? SIZES.story;
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  drawShareCard(canvas.getContext("2d"), model, size, photo);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not render the share image."))),
      "image/png",
    );
  });
}

/**
 * Share the file, or save it locally when sharing is unavailable.
 *
 * Returns which path was taken so the caller can tell the user what happened,
 * rather than leaving a button that appears to do nothing.
 */
export async function deliver(file, { nav = globalThis.navigator, doc = globalThis.document } = {}) {
  const how = chooseDelivery(nav, file);
  if (how === "share") {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (err) {
      // A user dismissing the sheet is not a failure and must not be reported
      // as one; anything else falls back to a download rather than dead-ending.
      if (err?.name === "AbortError") return "cancelled";
      return saveLocally(file, doc);
    }
  }
  return saveLocally(file, doc);
}

function saveLocally(file, doc) {
  const url = URL.createObjectURL(file);
  const a = doc.createElement("a");
  a.href = url;
  a.download = file.name;
  doc.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next turn: revoking synchronously can cancel the download
  // in some browsers before it has started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}

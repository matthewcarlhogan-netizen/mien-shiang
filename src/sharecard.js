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

// ─────────────────────────────────── invite URL encode / decode ──────────────

/**
 * Build a shareable URL encoding the sender's Five Elements archetype.
 *
 * Only non-biometric tradition labels are encoded — the element name (e.g.
 * "wood") and face-shape name (e.g. "oblong"). No landmark coordinates, pixel
 * data, measurement deltas, or personal identifier of any kind are placed in
 * the URL. The receiving party sees only a tradition label, not a measurement.
 *
 * @param {object} reading  composeReading() output
 * @param {string} [base]   base URL; defaults to current page URL when called
 *                          in a browser, empty string in Node (returns "" then).
 * @returns {string}  full URL string, or "" when no Five Elements reading is
 *                    available or when the base URL cannot be parsed.
 */
export function buildInviteUrl(reading, base = globalThis.location?.href ?? "") {
  const fe = reading?.fiveElements;
  if (!fe?.available) return "";
  if (!base) return "";
  try {
    const url = new URL(base);
    url.search = "";
    url.hash = "";
    url.searchParams.set("partnerElement", fe.element);
    if (fe.shape) url.searchParams.set("partnerShape", fe.shape);
    return url.toString();
  } catch {
    return "";
  }
}

/**
 * Read invite params from a URL search string.
 *
 * Returns null when no invite params are present — a plain visit to the app.
 * The shape param is optional: it is carried for UI labelling only and must
 * never be used to skip a measurement.
 *
 * @param {string} search  e.g. window.location.search
 * @returns {{element:string, shape:string}|null}
 */
export function readInviteParams(search) {
  const p = new URLSearchParams(search);
  const element = p.get("partnerElement");
  if (!element) return null;
  return { element, shape: p.get("partnerShape") ?? "" };
}

// ──────────────────────────────────────────────────────── share card ─────────

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
 * @param {{ inviteUrl?: string }} [opts]
 *        inviteUrl — when present, the card gains an invite-to-compare CTA.
 *        Only the URL itself is stored; no copy that could constitute a verdict
 *        lives here.
 */
export function buildShareModel(reading, caveatText, { inviteUrl = "" } = {}) {
  const s = buildSummary(reading);
  return {
    wordmark: "面相",
    headline: s.headline.map((h) => `${h.label} ${h.hanzi}`),
    coverage: s.coverage,
    emphasis: s.emphasis,
    caveat: caveatText ?? "",
    /** Mirrors the summary: nothing read means nothing claimed. */
    anyRead: s.anyRead,
    /**
     * When present, a "Scan to compare" CTA is drawn on the card.
     * Null when the feature is not in use (plain share, no invite).
     */
    cta: inviteUrl || null,
  };
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

  // Invite CTA — drawn only when the caller supplies an invite URL.
  // The copy here is a prompt about the reading context, not a verdict.
  if (model.cta) {
    y += Math.round(w * 0.04);
    const ctaPad = Math.round(w * 0.032);
    const ctaH = Math.round(w * 0.14);
    const ctaY = y;
    ctx.fillStyle = "#1A2028";
    ctx.beginPath();
    const r4 = Math.round(w * 0.015);
    ctx.roundRect(pad, ctaY, maxW, ctaH, r4);
    ctx.fill();
    ctx.strokeStyle = CINNABAR;
    ctx.lineWidth = Math.round(w * 0.004);
    ctx.stroke();

    const ctaLineY = ctaY + ctaPad + Math.round(w * 0.028);
    ctx.fillStyle = INK;
    ctx.font = `600 ${Math.round(w * 0.031)}px ${DISPLAY}`;
    ctx.fillText("Scan your face to compare readings", pad + ctaPad, ctaLineY);

    ctx.fillStyle = INK_60;
    ctx.font = `${Math.round(w * 0.022)}px ${MONO}`;
    const urlLines = wrapText(ctx, model.cta, maxW - ctaPad * 2);
    let uy = ctaLineY + Math.round(w * 0.044);
    for (const line of urlLines.slice(0, 2)) {
      ctx.fillText(line, pad + ctaPad, uy);
      uy += Math.round(w * 0.032);
    }
    y = ctaY + ctaH + Math.round(w * 0.02);
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

  // Caveat, pinned to the bottom so it survives any amount of content above.
  ctx.fillStyle = INK_60;
  ctx.font = `${Math.round(w * 0.026)}px ${DISPLAY}`;
  const caveatLines = wrapText(ctx, model.caveat, maxW);
  let cy = h - pad - (caveatLines.length - 1) * Math.round(w * 0.04);
  for (const line of caveatLines) {
    ctx.fillText(line, pad, cy);
    cy += Math.round(w * 0.04);
  }
  return ctx;
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

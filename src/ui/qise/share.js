/*
 * A share card is an OUTPUT of the scanner, never another biometric record.
 *
 * Only the deterministic seal, bounded five-colour percentages, reading label
 * and dates cross this boundary. No image, raw metric, landmark, device
 * fingerprint or confidence scalar is copied into the model.
 */
import { GROUND, PALETTE } from "./palette.js";
import { sealModel } from "./seal.js";
import { isLowConfidence } from "../../qise/baseline.js";
import { compositionOf } from "../../qise/composition.js";

export const SHARE_CADENCES = Object.freeze({
  today: Object.freeze({ days: 1, label: "Today", title: "Your Qi Se today" }),
  week: Object.freeze({ days: 7, label: "7 readings", title: "Your seven-reading column" }),
  fortnight: Object.freeze({ days: 14, label: "14 readings", title: "Your fourteen-reading column" }),
});

const safeCadence = (cadence) => SHARE_CADENCES[cadence] ? cadence : "today";

const dateLabel = (timestampIso) => {
  const d = new Date(timestampIso);
  if (!Number.isFinite(d.getTime())) return "Undated reading";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(d);
};

const ascendantOf = (reading) => {
  const value = reading && reading.compass && reading.compass.ascendant;
  return value && (value === "ping" || PALETTE[value]) ? value : "ping";
};

const readingLine = (reading) => {
  if (!reading?.compass) return "Today’s five-colour impression";
  const ascendant = ascendantOf(reading);
  if (ascendant === "ping") return "Your reading is level.";
  const band = reading.compass && reading.compass.band;
  return `Your reading shows ${band ? `${band} ` : ""}${ascendant}.`;
};

function columnSummary(readings) {
  const counts = new Map();
  for (const reading of readings) {
    const key = ascendantOf(reading);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const orderedCounts = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!orderedCounts.length) return "No readings are recorded yet.";
  if (orderedCounts.length > 1 && orderedCounts[0][1] === orderedCounts[1][1]) {
    return `Across these ${readings.length} scans, no single showing appears most often.`;
  }
  const [name, count] = orderedCounts[0];
  const showing = name === "ping" ? "level" : name;
  return `Across these ${readings.length} scans, ${showing} appears most often (${count}).`;
}

function structuralShareLine(reading) {
  const element = reading?.integrated?.fiveElements;
  const palaces = reading?.integrated?.twelvePalaces;
  if (!element?.available) return null;
  const palaceLine = palaces?.supportedCount
    ? ` · ${palaces.measuredCount}/${palaces.supportedCount} supported palaces read`
    : "";
  return `${element.name} structure · ${element.shape} geometry${palaceLine}`;
}

/**
 * The closed, privacy-minimised model shared by canvas rendering and tests.
 */
export function shareCardModel(history, cadence = "today") {
  const key = safeCadence(cadence);
  const definition = SHARE_CADENCES[key];
  const readings = (Array.isArray(history) ? history : [])
    .filter((r) => r && r.timestampIso)
    .slice(-definition.days);
  const newest = readings[readings.length - 1] || null;
  const seals = readings.map((reading) => ({
    date: dateLabel(reading.timestampIso),
    ascendant: ascendantOf(reading),
    lowConfidence: typeof reading.confidence === "number"
      ? isLowConfidence(reading.confidence)
      : false,
    model: sealModel(reading, {
      lowConfidence: typeof reading.confidence === "number"
        ? isLowConfidence(reading.confidence)
        : false,
    }),
  }));

  const title = key === "today" && newest ? readingLine(newest) : definition.title;
  const composition = newest ? compositionOf(newest) : null;
  const summary = key === "today" && newest
    ? (newest.compass
      ? `A private face scan made on ${dateLabel(newest.timestampIso)}.`
      : `${composition.lead} leads, with ${composition.support} alongside — the first marks in a personal colour column.`)
    : columnSummary(readings);

  return {
    cadence: key,
    cadenceLabel: definition.label,
    title,
    summary,
    count: readings.length,
    seals,
    composition,
    structureLine: newest ? structuralShareLine(newest) : null,
    caption: key === "today" && newest
      ? (newest.compass
        ? "A private reflection on what shifted today."
        : "One mark. Three more to reveal what changes.")
      : "A private column, built one reading at a time.",
    privacyLine: "Made on-device · no face photo shared · compared only with your own scans",
    footer: "Mien Shiang · cultural entertainment, not a health assessment",
  };
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawSeal(ctx, seal, x, y, size) {
  const scale = size / seal.size;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.strokeStyle = PALETTE.hei.hex;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  seal.border.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
  ctx.stroke();

  for (const axis of seal.axes) {
    if (axis.score <= 0) continue;
    ctx.strokeStyle = axis.colour;
    ctx.lineWidth = axis.kind === "ring" ? 1.6 : 2.4;
    ctx.beginPath();
    if (axis.kind === "ring") {
      ctx.arc(seal.size / 2, seal.size / 2, axis.radius, 0, Math.PI * 2);
    } else {
      ctx.moveTo(seal.size / 2, seal.size / 2);
      ctx.lineTo(axis.x2, axis.y2);
    }
    ctx.stroke();
  }

  ctx.beginPath();
  seal.dot.bleed.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
  ctx.strokeStyle = seal.inkColour;
  ctx.fillStyle = seal.inkColour;
  ctx.lineWidth = 1.4;
  if (seal.hollow) {
    ctx.setLineDash([2, 2]);
    ctx.stroke();
  } else {
    ctx.fill();
  }
  ctx.restore();
}

function drawComposition(ctx, composition, x, y, width) {
  if (!composition) return y;
  const height = 24;
  let cursor = x;
  for (const [key, value] of Object.entries(composition.segments)) {
    const segmentWidth = width * (value / 100);
    ctx.fillStyle = PALETTE[key].hex;
    ctx.fillRect(cursor, y, segmentWidth + 1, height);
    cursor += segmentWidth;
  }
  ctx.fillStyle = "rgba(27,25,23,.68)";
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText(`${composition.lead} leads · ${composition.support} supports`, x, y + 62);
  return y + 76;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((value, i) => ctx.fillText(value, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

/** Render a 4:5 social card. The source model contains no biometric payload. */
export function renderShareCanvas(model, documentRef = document) {
  const canvas = documentRef.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = GROUND.hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(27,25,23,.22)";
  ctx.lineWidth = 3;
  roundedRect(ctx, 54, 54, 972, 1242, 22);
  ctx.stroke();

  ctx.fillStyle = PALETTE.chi.hex;
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText("MIEN SHIANG · QI SE", 96, 132);

  ctx.fillStyle = PALETTE.hei.hex;
  ctx.font = "600 64px Georgia, serif";
  const afterTitle = wrapText(ctx, model.title, 96, 230, 888, 76, 3);

  ctx.fillStyle = "rgba(27,25,23,.72)";
  ctx.font = "32px system-ui, sans-serif";
  const afterSummary = wrapText(ctx, model.summary, 96, afterTitle + 22, 888, 46, 3);

  let afterStructure = afterSummary;
  if (model.structureLine) {
    ctx.fillStyle = `${PALETTE.chi.hex}16`;
    roundedRect(ctx, 96, afterSummary + 18, 888, 68, 16);
    ctx.fill();
    ctx.fillStyle = PALETTE.hei.hex;
    ctx.font = "500 26px system-ui, sans-serif";
    ctx.fillText(model.structureLine, 120, afterSummary + 61);
    afterStructure = afterSummary + 92;
  }

  const afterComposition = model.cadence === "today"
    ? drawComposition(ctx, model.composition, 96, afterStructure + 20, 888)
    : afterStructure;
  const availableHeight = 1050 - afterComposition;
  const count = Math.max(1, model.seals.length);
  const columns = count === 1 ? 1 : (count <= 7 ? Math.min(count, 4) : 5);
  const rows = Math.ceil(count / columns);
  const gap = 22;
  const maxSealSize = count === 1 ? 460 : 340;
  const sealSize = Math.min(maxSealSize, (888 - gap * (columns - 1)) / columns,
    (availableHeight - gap * Math.max(0, rows - 1)) / rows);
  const gridWidth = columns * sealSize + (columns - 1) * gap;
  const gridX = 96 + (888 - gridWidth) / 2;
  const gridY = afterComposition + 40;

  if (model.seals.length === 1) {
    ctx.fillStyle = `${PALETTE[model.composition?.lead || "chi"].hex}18`;
    ctx.beginPath();
    ctx.arc(540, gridY + sealSize / 2, sealSize * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }

  model.seals.forEach((entry, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    drawSeal(ctx, entry.model, gridX + col * (sealSize + gap), gridY + row * (sealSize + gap), sealSize);
  });

  if (!model.seals.length) {
    ctx.font = "36px system-ui, sans-serif";
    ctx.fillStyle = "rgba(27,25,23,.62)";
    ctx.fillText("Complete a face scan to make your first seal.", 96, gridY + 100);
  }

  if (model.count) {
    ctx.fillStyle = PALETTE.hei.hex;
    ctx.font = "500 34px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(model.caption, 540, 1090);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = "rgba(27,25,23,.72)";
  ctx.font = "26px system-ui, sans-serif";
  wrapText(ctx, model.privacyLine, 96, 1160, 888, 36, 2);
  ctx.fillStyle = "rgba(27,25,23,.56)";
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText(model.footer, 96, 1250);
  return canvas;
}

const canvasBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Share image could not be created.")), "image/png");
});

/** Native share where possible; a local PNG download everywhere else. */
export async function shareReadings(history, cadence = "today", env = window) {
  const model = shareCardModel(history, cadence);
  if (!model.count) return { status: "empty", model };

  const canvas = renderShareCanvas(model, env.document);
  const blob = await canvasBlob(canvas);
  const file = new env.File([blob], `qise-${model.cadence}.png`, { type: "image/png" });
  const payload = {
    title: model.title,
    text: `${model.summary}\n${model.footer}`,
    files: [file],
  };

  if (env.navigator.share && (!env.navigator.canShare || env.navigator.canShare({ files: [file] }))) {
    try {
      await env.navigator.share(payload);
      return { status: "shared", model };
    } catch (error) {
      if (error && error.name === "AbortError") return { status: "cancelled", model };
      // Fall through to a recoverable local download for unsupported targets.
    }
  }

  const url = env.URL.createObjectURL(blob);
  const a = env.document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  env.URL.revokeObjectURL(url);
  return { status: "downloaded", model };
}

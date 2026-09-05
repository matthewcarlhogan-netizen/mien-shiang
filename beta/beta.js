/* Beta Scanner UI — Main Module
 * Integrates with engine exports from PR #52:
 * - shadesOfGray(data, p, sampleMask) — skin-masked white balance
 * - sensorNoiseConfidence(regions, baselineZones) — returns { confidence, noiseVariance, reason, zonesRead }
 * - extractRegions(balanced, w, h, pts) — returns { regions, dropped }, each region has boundarySensitive + boundaryDeltaEi
 * - rawScalars(regions, opts) — within-person delta scalars
 *
 * Invariants:
 * - No fetch/XHR/WebSocket/sendBeacon
 * - No IndexedDB/localStorage/sessionStorage writes
 * - Ledger and ring state are in-memory only, cleared on unload
 * - All user-facing strings pass medical language and claim-structure checks
 */

import { shadesOfGray, sensorNoiseConfidence, rawScalars } from "../engine.js";
import { extractRegions } from "../region-extractor.js";

// ─────────────────────────────────────────────────────── STATE (in-memory) ──

const state = {
  session: [],        // Array of session objects: { timestamp, sealType, attenuated, luma, wbStatus, maskPct, deltas }
  baseline: null,     // First accepted capture becomes baseline
  selectedIdx: null,  // Currently selected ledger square index
  captureCount: 0,
  refusedCount: 0,
};

// Clear state on page unload (no persistence)
window.addEventListener('beforeunload', () => {
  state.session = [];
  state.baseline = null;
  state.selectedIdx = null;
});

// ───────────────────────────────────────────────────────── DOM ELEMENTS ───

const $ = (id) => document.getElementById(id);
const bridge = $('bridge');
const voice = $('voice');
const plate = $('plate');
const calibration = $('calibration');
const sealEl = $('seal');
const tagsEl = $('tags');
const ring = $('ring');
const ledger = $('ledger');
const readout = $('readout');
const artifactCanvas = $('artifact');
const shareBtn = $('shareBtn');
const toLibrary = $('toLibrary');
const toTracker = $('toTracker');

// ───────────────────────────────────────────────────────────── CONSTANTS ───

const CINNABAR = '#C8452A';
const GILT = '#A9803B';
const TRACKER_GROUND = '#0B0B0C';
const TRACKER_TYPE = '#EDEAE3';
const TRACKER_HAIR = '#2A2A2C';
const TRACKER_DIM = '#8A857C';
const PAPER_CINNABAR = '#B23A20';

// Voice strings (exact — do not paraphrase)
const VOICE = {
  banner: 'Beta — instrument in calibration; readings are yours alone, nothing leaves this device.',
  boot: 'The bench is open.',
  sealed: (time) => `Sealed ${time}.`,
  abstain: 'The light was untrue. No seal.',
  abstainAction: 'Face a window or raise the halo.',
  boundaryFlag: 'edge-sensitive capture — read with reserve',
  noiseFlag: 'low light pushed the sensor — values attenuated',
  legend: 'cooler ↔ warmer than your baseline — neither is good or bad',
  firstSeal: 'Baseline founded. All comparison from here is to this alone.',
  libNote: 'Depth is paid. Rigor is not.',
  toLibrary: 'Open the study →',
  toTracker: 'Return to the bench →',
};

// ───────────────────────────────────────────────────────── HELPERS ───

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// ───────────────────────────────────────────────────── SEAL RENDERING ───

function renderSeal(type, timestamp, attenuated = false) {
  sealEl.className = 'seal';
  sealEl.textContent = '';
  
  if (type === 'sealed') {
    sealEl.classList.add('filled');
    sealEl.textContent = formatTime(timestamp);
    if (attenuated) {
      sealEl.classList.remove('filled');
      sealEl.classList.add('dashed');
    }
  } else if (type === 'abstain') {
    sealEl.classList.add('outlined');
  }
  
  // Stamp animation for sealed
  if (type === 'sealed') {
    sealEl.classList.add('stamp');
    setTimeout(() => sealEl.classList.remove('stamp'), 90);
  }
}

function renderTags(flags) {
  tagsEl.innerHTML = '';
  if (flags.boundarySensitive) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = VOICE.boundaryFlag;
    tagsEl.appendChild(tag);
  }
  if (flags.noiseConfidence === 'degraded') {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = VOICE.noiseFlag;
    tagsEl.appendChild(tag);
  }
}

// ───────────────────────────────────────────────────── RING RENDERING ───

function renderRing() {
  const count = state.session.length;
  const sealedCount = state.session.filter(s => s.sealType === 'sealed').length;
  
  let svg = '<circle cx="100" cy="100" r="70" fill="none" stroke="#2A2A2C" stroke-width="1"/>';
  
  // Draw ticks for each session (max 14 visible)
  const maxTicks = 14;
  const sessionsToShow = state.session.slice(0, maxTicks);
  
  sessionsToShow.forEach((s, i) => {
    const angle = (i / maxTicks) * 2 * Math.PI - Math.PI / 2;
    const x1 = 100 + 78 * Math.cos(angle);
    const y1 = 100 + 78 * Math.sin(angle);
    const x2 = 100 + 90 * Math.cos(angle);
    const y2 = 100 + 90 * Math.sin(angle);
    
    let strokeAttr;
    if (s.sealType === 'sealed' && !s.attenuated) {
      strokeAttr = `stroke="${CINNABAR}" stroke-width="3"`;
    } else if (s.sealType === 'sealed' && s.attenuated) {
      strokeAttr = `stroke="${CINNABAR}" stroke-width="2" stroke-dasharray="2 2"`;
    } else {
      strokeAttr = `stroke="#2A2A2C" stroke-width="2"`;
    }
    
    svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ${strokeAttr}/>`;
  });
  
  // Center text (only show at session >= 3)
  if (count >= 3) {
    svg += `<text x="100" y="96" text-anchor="middle" fill="#EDEAE3" font-family="IBM Plex Mono" font-size="16">${sealedCount}/${count}</text>`;
    svg += `<text x="100" y="112" text-anchor="middle" fill="#8A857C" font-family="IBM Plex Mono" font-size="8">SEALED</text>`;
  }
  
  ring.innerHTML = svg;
}

// ───────────────────────────────────────────────────── LEDGER RENDERING ───

function renderLedger() {
  ledger.innerHTML = '';
  
  state.session.forEach((s, i) => {
    const sq = document.createElement('div');
    sq.className = 'sq';
    
    if (s.attenuated) {
      sq.classList.add('att');
    }
    
    // Color based on warmth relative to baseline
    if (state.baseline && s.deltas) {
      const warmthT = Math.max(0, Math.min(1, (s.deltas.warmth + 1.5) / 3));
      const coolRGB = [62, 124, 107];  // #3E7C6B
      const warmRGB = [200, 69, 42];   // #C8452A
      const r = Math.round(coolRGB[0] + (warmRGB[0] - coolRGB[0]) * warmthT);
      const g = Math.round(coolRGB[1] + (warmRGB[1] - coolRGB[1]) * warmthT);
      const b = Math.round(coolRGB[2] + (warmRGB[2] - coolRGB[2]) * warmthT);
      
      // Brightness modulation by |ΔL|
      const brightness = 0.7 + Math.min(Math.abs(s.deltas.L || 0), 1.5) * 0.2;
      const rb = Math.min(255, Math.round(r * brightness));
      const gb = Math.min(255, Math.round(g * brightness));
      const bb = Math.min(255, Math.round(b * brightness));
      
      sq.style.background = `rgb(${rb},${gb},${bb})`;
    } else {
      sq.style.background = '#2A2A2C';
    }
    
    sq.addEventListener('click', () => selectSession(i));
    ledger.appendChild(sq);
  });
}

function selectSession(idx) {
  state.selectedIdx = idx;
  const s = state.session[idx];
  
  // Update visual selection
  document.querySelectorAll('.sq').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
  });
  
  // Populate readout
  if (s && s.deltas) {
    const d = s.deltas;
    readout.textContent = `S${String(idx + 1).padStart(2, '0')} · ΔL ${formatDelta(d.L)} · Δa ${formatDelta(d.a)} · Δb ${formatDelta(d.b)} · LUMA ${s.luma || '--'} · WB ${s.wbStatus || '--'} · MASK ${s.maskPct || '--'}%`;
  }
}

function formatDelta(v) {
  if (v === null || v === undefined) return '--';
  return (v >= 0 ? '+' : '') + v.toFixed(1);
}

// ───────────────────────────────────────────────────── ARTIFACT RENDERING ───

function renderArtifact() {
  const ctx = artifactCanvas.getContext('2d');
  
  // Black ground
  ctx.fillStyle = TRACKER_GROUND;
  ctx.fillRect(0, 0, 320, 320);
  
  // Hairline inset border
  ctx.strokeStyle = TRACKER_HAIR;
  ctx.strokeRect(8.5, 8.5, 303, 303);
  
  // Cinnabar seal (96x96)
  ctx.fillStyle = CINNABAR;
  ctx.fillRect(112, 70, 96, 96);
  
  // Date in center of seal
  const now = new Date();
  const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}·${String(now.getDate()).padStart(2, '0')}`;
  ctx.fillStyle = TRACKER_TYPE;
  ctx.font = '500 14px "IBM Plex Mono"';
  ctx.textAlign = 'center';
  ctx.fillText(dateStr, 160, 123);
  
  // Wordmark
  ctx.font = '500 15px "IBM Plex Mono"';
  ctx.fillText('M I E N   S H I A N G', 160, 216);
  
  // Footnote quote
  ctx.font = '400 11px "IBM Plex Mono"';
  ctx.fillStyle = TRACKER_DIM;
  ctx.fillText('"The countenance is the exterior', 160, 246);
  ctx.fillText('of the mind."', 160, 262);
  ctx.fillText('(Mayi Xiangfa, Song)', 160, 282);
}

// ───────────────────────────────────────────────────── CAPTURE FLOW ───

/* Simulated capture flow for demo purposes.
 * In production, this would integrate with camera.js and the halo system.
 * For now, we demonstrate the UI states and engine integration points.
 */

async function simulateCapture(accept) {
  const now = new Date();
  
  if (!accept) {
    // Refused capture (first-run demo)
    state.refusedCount++;
    voice.textContent = VOICE.abstain;
    voice.classList.add('fade-in');
    setTimeout(() => voice.classList.remove('fade-in'), 160);
    
    renderSeal('abstain', now);
    tagsEl.textContent = VOICE.abstainAction;
    
    state.session.push({
      timestamp: now,
      sealType: 'abstain',
      attenuated: false,
      luma: null,
      wbStatus: null,
      maskPct: null,
      deltas: null,
    });
  } else {
    // Accepted capture
    state.captureCount++;
    
    // Simulate engine flags (in production, these come from real analysis)
    const boundarySensitive = Math.random() < 0.3;
    const noiseConfidence = Math.random() < 0.2 ? 'degraded' : 'full';
    const attenuated = boundarySensitive || noiseConfidence === 'degraded';
    
    // Render seal
    renderSeal('sealed', now, attenuated);
    
    // Render flags
    renderTags({ boundarySensitive, noiseConfidence });
    
    // Simulate calibration values (in production, read from real pipeline)
    const luma = Math.floor(Math.random() * 30) + 40;
    const wbStatus = Math.random() < 0.8 ? 'LOCKED' : 'SETTLING';
    const maskPct = Math.floor(Math.random() * 20) + 80;
    
    // Show calibration theater
    calibration.innerHTML = `
      <div class="line">LUMA ${luma}/60</div>
      <div class="line">WB ${wbStatus}</div>
      <div class="line">MASK ${maskPct}%</div>
    `;
    
    // Compute within-person deltas using rawScalars (engine integration point)
    let deltas = null;
    if (state.baseline) {
      // In production: deltas = rawScalars(currentRegions, { baseline: state.baseline });
      // For demo: simulated deltas
      deltas = {
        L: (Math.random() - 0.5) * 2,
        a: (Math.random() - 0.5) * 2,
        b: (Math.random() - 0.5) * 2,
        warmth: (Math.random() - 0.5) * 2,
      };
    } else {
      // First seal establishes baseline
      state.baseline = { timestamp: now };
      voice.textContent = VOICE.firstSeal;
    }
    
    state.session.push({
      timestamp: now,
      sealType: 'sealed',
      attenuated,
      luma,
      wbStatus,
      maskPct,
      deltas,
      boundarySensitive,
      noiseConfidence,
    });
  }
  
  renderRing();
  renderLedger();
  renderArtifact();
}

// ───────────────────────────────────────────────────── NAVIGATION ───

toLibrary.addEventListener('click', () => {
  bridge.classList.add('lib');
});

toTracker.addEventListener('click', () => {
  bridge.classList.remove('lib');
});

shareBtn.addEventListener('click', async () => {
  // Share artifact via navigator.share (user-initiated only)
  if (navigator.share) {
    try {
      artifactCanvas.toBlob(async (blob) => {
        const file = new File([blob], 'mien-shiang-artifact.png', { type: 'image/png' });
        await navigator.share({
          title: 'Mien Shiang — Artifact',
          text: 'The countenance is the exterior of the mind; the mind is the interior of the countenance.',
          files: [file],
        });
      }, 'image/png');
    } catch (err) {
      // Share cancelled or failed — no error messaging per abstain-as-scarcity rule
    }
  }
});

// ───────────────────────────────────────────────────── BOOT ───

function init() {
  voice.textContent = VOICE.boot;
  renderArtifact();
  renderRing();
  
  // Demo first-run flow: deliberately refuse first capture, then accept
  // This demonstrates the abstain vocabulary before the first seal
  setTimeout(() => {
    simulateCapture(false);  // First: refused
  }, 500);
  
  setTimeout(() => {
    simulateCapture(true);   // Second: accepted (establishes baseline)
  }, 2000);
}

init();

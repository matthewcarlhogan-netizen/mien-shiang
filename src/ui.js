import { runAnalysis } from "./analysis.js";
import { renderGeometry } from "./debugview.js";
import { renderReading, renderModuleB } from "./readingview.js";
import { renderScienceLink, renderScienceScreen } from "./scienceview.js";

const $ = (id) => document.getElementById(id);
const CONSENT_KEY = "mienshiang.consent.v1";

let file = null;
let objectUrl = null;

// ----------------------------------------------------------------- consent --

const dlg = $("consent");
if (localStorage.getItem(CONSENT_KEY) !== "1") dlg.showModal();
$("agree").addEventListener("change", (e) => { $("accept").disabled = !e.target.checked; });
$("accept").addEventListener("click", () => {
  localStorage.setItem(CONSENT_KEY, "1");
  dlg.close();
});
// Affirmative acknowledgment only — Esc must not dismiss it.
dlg.addEventListener("cancel", (e) => e.preventDefault());

// -------------------------------------------------------------------- pick --

$("pick").addEventListener("click", () => $("file").click());

$("file").addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  file = f;

  // Object URLs are not garbage collected; revoke the previous one.
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(f);

  $("plate").innerHTML =
    `<div class="frame"><img id="shot" src="${objectUrl}" alt="" /></div>`;
  $("go").hidden = false;
  $("out").innerHTML = "";
});

// ----------------------------------------------------------------- analyse --

$("go").addEventListener("click", async () => {
  if (!file) return;
  const go = $("go");
  go.disabled = true;
  const say = (m) => { $("out").innerHTML = `<p class="mono">${m}</p><div class="scan"></div>`; };

  try {
    const r = await runAnalysis(file, $("mirror").checked, say);
    render(r);
  } catch (err) {
    $("out").innerHTML = `<div class="err"><p style="margin:0">${err.message}</p></div>`;
  } finally {
    go.disabled = false;
  }
});

// ------------------------------------------------------------------ render --

function render(r) {
  const { canvas, regions, result, baseline, notMeasured } = r;

  // Redraw the plate from the analysed canvas so the overlay lines up exactly
  // with what was measured (including un-mirroring).
  const flagged = new Set(
    result.referrals.flatMap(() => ["cheek_left", "cheek_right", "nose_bridge"])
  );

  const polys = Object.values(regions).map((reg) => {
    const pts = reg.hull.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const cls = flagged.size && !flagged.has(reg.key) ? "roi dim"
              : flagged.has(reg.key) ? "roi flag" : "roi";
    return `<polygon class="${cls}" points="${pts}" />`;
  }).join("");

  $("plate").innerHTML = `
    <div class="frame">
      <img src="${canvas.toDataURL("image/jpeg", 0.85)}" alt="" />
      <svg viewBox="0 0 ${canvas.width} ${canvas.height}"
           preserveAspectRatio="xMidYMid meet" aria-hidden="true">${polys}</svg>
    </div>`;

  const parts = [];

  for (const ref of result.referrals) {
    parts.push(`
      <div class="referral">
        <p class="eyebrow">Stop — see a clinician</p>
        <h3>${ref.referralTo === "dermatologist" ? "Out of scope for this tool" : "Worth a doctor's eyes"}</h3>
        <p>${ref.message}</p>
        <div class="prov"><b>rule</b> ${ref.rule}${ref.measured ? ` · <b>measured</b> ${ref.measured}` : ""}</div>
      </div>`);
  }

  if (result.halted) {
    parts.push(`<p class="halted">The traditional reading is paused for this photo.
      A referral takes precedence — the tool won't offer lifestyle advice that
      might read as reassurance.</p>`);
  }

  // What could and couldn't be measured. Stated plainly so nothing implies an
  // examination happened that didn't.
  const lowConf = baseline.regime === "low";
  parts.push(`
    <div class="limits ${lowConf ? "warn" : ""}">
      <p class="eyebrow">What this photo could and couldn't measure</p>
      ${baseline.reason ? `<p>${baseline.reason}</p>` : ""}
      <p class="notmeasured">Not checked: ${notMeasured.join(", ").replace(/_/g, " ")}</p>
      <p class="muted" style="font-size:.78rem">Those need a model trained on
      clinical images, which this build doesn't have. Nothing above is a check
      for them.</p>
    </div>`);

  // MODULE A — the reading. Rendered before anything else so it is what the
  // screen is about, and always accompanied by the science link.
  if (!result.halted) {
    parts.push(renderReading(r.reading));
    parts.push(renderScienceLink());
  }

  for (const rec of result.recommendations) {
    parts.push(`
      <article class="rec">
        <h3>${rec.name ?? rec.rule}</h3>
        <p>${rec.message}</p>
        ${rec.recommend.length ? `<ul>${rec.recommend.map((s) => `<li>${s}</li>`).join("")}</ul>` : ""}
        ${rec.sourcesDiffer ? `<p class="differ"><span class="differ-mark">⚖</span>${rec.sourcesDiffer}</p>` : ""}
        <div class="prov"><b>rule</b> ${rec.rule}${rec.measured ? ` · <b>measured</b> ${rec.measured}` : ""}</div>
      </article>`);
  }

  // MODULE B — separate block, own disclaimer, never inside the reading.
  // Empty string in an entertainment-only build, where these rules were never
  // composed into the set at all.
  parts.push(renderModuleB(result.advisories));

  parts.push(renderGeometry(r.geometry, r.expression, r.delegate));

  $("out").innerHTML = parts.join("");
  wireScienceScreen();
}

// ------------------------------------------------- what the science says --

/** One tap from the results screen. Not a menu, not an About page. */
function wireScienceScreen() {
  const open = $("science-open");
  if (!open) return;
  open.addEventListener("click", () => {
    const dlg = $("science");
    dlg.innerHTML = renderScienceScreen();
    dlg.showModal();
    dlg.querySelector("#science-close").addEventListener("click", () => dlg.close());
  });
}

// --------------------------------------------------------- offline support --

if ("serviceWorker" in navigator) {
  // The catch stays — an unhandled rejection here is worse than a logged one —
  // but it must not be empty. An empty handler is what hid a total service
  // worker install failure: no offline support, no error, nothing on screen.
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch((err) =>
      console.warn("Service worker registration failed; offline support is unavailable.", err)));
}

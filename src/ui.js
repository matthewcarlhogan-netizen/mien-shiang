import { runAnalysis } from "./analysis.js";
import { renderGeometry } from "./debugview.js";
import { renderReading, renderSummary } from "./readingview.js";
import { buildShareModel, renderShareBlob, deliver, buildInviteUrl, readInviteParams } from "./sharecard.js";
import { readCompatibility } from "./compatibility.js";
import { renderReferrals, renderHaltNotice, renderAdvisories, renderMeasurementLimits }
  from "./modulebview.js";
import { renderScienceLink, renderScienceScreen } from "./scienceview.js";
import {
  renderReportButton, renderReportForm, renderReportConfirmation,
  buildReportPayload, sendReport,
} from "./report.js";
import { renderAbout, loadBuildInfo } from "./about.js";

const $ = (id) => document.getElementById(id);
const CONSENT_KEY = "mienshiang.consent.v1";

let file = null;
let objectUrl = null;

// --------------------------------------------------------- invite params --

/**
 * Params set by the person who shared this link.
 * Null = ordinary visit; non-null = User B opening an invite.
 */
const inviteParams = readInviteParams(globalThis.location?.search ?? "");

// Show an invite banner before consent when the user arrived via a shared link.
// The banner is informational only — no measurement data from the sharer is
// shown here, only the tradition-level element label from the URL.
if (inviteParams) {
  const banner = document.createElement("div");
  banner.id = "invite-banner";
  banner.className = "invite-banner";
  banner.setAttribute("role", "status");
  // Element names are lowercase internal labels; capitalise for display.
  const partnerLabel = inviteParams.element
    ? inviteParams.element.charAt(0).toUpperCase() + inviteParams.element.slice(1)
    : "a friend";
  banner.innerHTML = `
    <p class="eyebrow">You've been invited</p>
    <p>Someone who read as <strong>${partnerLabel}</strong> in the Five Elements tradition has shared this link.
    Take a photo below to see how the classical texts relate your elements.
    Your scan happens entirely on this device — nothing leaves it.</p>`;
  document.querySelector("header")?.after(banner);
}

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

  // Build the invite URL for this reading now so the same value drives both
  // the share-card CTA and the invite-share button.
  const inviteUrl = buildInviteUrl(r.reading);

  // The receipt goes first, above everything. There is no ordering conflict
  // with Module B: a referral that halts the reading means `r.reading` is
  // never rendered at all, so a summary and a halt notice cannot both appear.
  if (!result.halted) {
    parts.push(renderSummary(r.reading, {
      caveatHtml: summaryCaveatHtml(),
      actionsHtml: shareControlsHtml(Boolean(inviteUrl)),
    }));
  }

  // Module B renders through its own module — its vocabulary lives with its
  // content, not on this Module A surface. All of these return "" when Module
  // B was not composed into the build.
  parts.push(renderReferrals(result.referrals));
  parts.push(renderHaltNotice(result.halted));
  // Stays DEFAULT-VISIBLE, directly under the receipt. The summary states
  // scope; this panel states what could not be measured at all. Neither
  // substitutes for the other.
  parts.push(renderMeasurementLimits(baseline, notMeasured));

  // MODULE A — the reading, in full, beneath the receipt.
  if (!result.halted) {
    parts.push(renderReading(r.reading));
    parts.push(renderScienceLink());
    parts.push(renderReportButton());
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
  parts.push(renderAdvisories(result.advisories));

  parts.push(renderGeometry(r.geometry, r.expression, r.delegate));

  // When User B arrived via an invite link, show the Five Elements interaction
  // reading for their pairing after their own results.
  if (inviteParams && r.reading?.fiveElements?.available) {
    parts.push(renderCompatibility(r.reading.fiveElements, inviteParams));
  }

  $("out").innerHTML = parts.join("");
  wireScienceScreen();
  wireReportControl();
  wireShare(r, inviteUrl);
}

/**
 * The summary's always-visible caveat, read from the disclaimer template in
 * index.html. It cannot be a literal in readingview.js or sharecard.js: the
 * copy lint buckets every prose string in a .js file as Module A copy, and the
 * wording uses a word the Module A blocklist forbids. One source, two consumers.
 */
function summaryCaveatHtml() {
  return $("tpl-summary-caveat")?.innerHTML ?? "";
}

function summaryCaveatText() {
  return ($("tpl-summary-caveat")?.content?.textContent ?? "").trim();
}

function shareControlsHtml(hasInviteUrl) {
  return `
    <div class="summary-actions">
      <button id="share-card" class="ghost" type="button">Save or share this reading</button>
      ${hasInviteUrl
        ? `<button id="share-invite" class="ghost" type="button">Invite someone to compare</button>`
        : ""}
    </div>
    <label class="toggle" style="margin-top:.55rem">
      <input type="checkbox" id="share-photo" />
      <span>Include my photo in the image — your face then leaves this device
        when you post it, which is your choice to make.</span>
    </label>`;
}

/**
 * Share is wired only after a reading exists, and never becomes a dead end:
 * where the OS cannot take a file, the same button saves a PNG instead.
 */
function wireShare(r, inviteUrl) {
  const btn = $("share-card");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const original = btn.textContent;
    try {
      const includePhoto = $("share-photo")?.checked === true;
      const model = buildShareModel(r.reading, summaryCaveatText(), { inviteUrl });
      const blob = await renderShareBlob(model, "story", includePhoto ? r.canvas : null);
      const imageFile = new File([blob], "mian-xiang-reading.png", { type: "image/png" });
      const how = await deliver(imageFile);
      btn.textContent = how === "downloaded" ? "Saved to your device" : original;
    } catch (err) {
      // Never swallow: a share that silently does nothing is worse than one
      // that says it failed.
      btn.textContent = "Couldn't make the image";
      console.error("share card failed:", err);
    } finally {
      btn.disabled = false;
      setTimeout(() => { btn.textContent = original; }, 4000);
    }
  });

  // Invite-to-compare button — shares the URL only, no image.
  const inviteBtn = $("share-invite");
  if (!inviteBtn || !inviteUrl) return;

  inviteBtn.addEventListener("click", async () => {
    inviteBtn.disabled = true;
    const original = inviteBtn.textContent;
    try {
      if (typeof navigator?.share === "function") {
        await navigator.share({ url: inviteUrl });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        inviteBtn.textContent = "Link copied";
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        // Clipboard may also be unavailable; fall back to telling the user
        // the URL so they can copy it themselves.
        console.warn("invite share failed:", err);
        inviteBtn.textContent = "Copy the URL from your address bar";
      }
    } finally {
      inviteBtn.disabled = false;
      setTimeout(() => { inviteBtn.textContent = original; }, 4000);
    }
  });
}

// ------------------------------------------------- compatibility panel --

/**
 * Renders the Five Elements compatibility reading between User B's own element
 * and the partner element supplied in the invite URL.
 *
 * Pure HTML-string output — same pattern as the other render helpers. Shown
 * only when User B completed a live scan via an invite link.
 *
 * Copy displayed here comes entirely from compatibility.js, which is a
 * registered Module A surface — the copy guard scans it.
 */
function renderCompatibility(myFe, partner) {
  if (!myFe?.available) return "";
  const compat = readCompatibility(myFe.element, partner.element);
  if (!compat) return "";

  const myLabel = `${myFe.name} ${myFe.hanzi}`;
  const partnerLabel = partner.element.charAt(0).toUpperCase() + partner.element.slice(1);

  return `
    <section class="compat-panel reading-block">
      <p class="eyebrow">Five Elements — elemental pairing</p>
      <h3>${myLabel} &amp; ${partnerLabel} — ${compat.title}</h3>
      <p>${compat.reading}</p>
      <div class="prov"><b>source</b> Classical Chinese Five Elements cosmology</div>
    </section>`;
}

// -------------------------------------------------- report this result --

/**
 * Google Play's AI-Generated Content policy requires a report control on every
 * generated result, reachable without leaving the app. This opens an in-app
 * dialog — nothing navigates away, nothing opens a mail client.
 */
function openReport() {
  const dlg = $("report");
  dlg.innerHTML = renderReportForm();
  dlg.showModal();
  dlg.querySelector("#report-cancel").addEventListener("click", () => dlg.close());
  dlg.querySelector("#report-submit").addEventListener("click", () => {
    // Built from the form fields only. The reading is not passed in and is not
    // in scope here: a function that cannot see face data cannot leak it.
    const payload = buildReportPayload(
      dlg.querySelector("#report-reason").value,
      dlg.querySelector("#report-note").value,
    );
    sendReport(payload);
    dlg.innerHTML = renderReportConfirmation();
    dlg.querySelector("#report-close").addEventListener("click", () => dlg.close());
  });
}

function wireReportControl() {
  $("report-open")?.addEventListener("click", openReport);
}

// ------------------------------------------------- what the science says --

/** Opens the science screen. Reused by the results screen and by About. */
function openScience() {
  const dlg = $("science");
  dlg.innerHTML = renderScienceScreen();
  dlg.showModal();
  dlg.querySelector("#science-close").addEventListener("click", () => dlg.close());
}

/** One tap from the results screen. Not a menu, not an About page. */
function wireScienceScreen() {
  $("science-open")?.addEventListener("click", openScience);
}

// ------------------------------------------------------------------ about --

/** Opens the About screen, and wires its two in-app controls. */
function openAbout() {
  const dlg = $("about");
  loadBuildInfo().then((info) => {
    dlg.innerHTML = renderAbout(info);
    dlg.showModal();
    dlg.querySelector("#about-close").addEventListener("click", () => dlg.close());
    dlg.querySelector("#about-science").addEventListener("click", () => {
      dlg.close();
      openScience();
    });
    dlg.querySelector("#about-report").addEventListener("click", () => {
      dlg.close();
      openReport();
    });
  });
}

$("about-open")?.addEventListener("click", openAbout);

// --------------------------------------------------------- offline support --

if ("serviceWorker" in navigator) {
  // The catch stays — an unhandled rejection here is worse than a logged one —
  // but it must not be empty. An empty handler is what hid a total service
  // worker install failure: no offline support, no error, nothing on screen.
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch((err) =>
      console.warn("Service worker registration failed; offline support is unavailable.", err)));
}

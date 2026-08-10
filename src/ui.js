import { runAnalysis } from "./analysis.js";
import { renderGeometry } from "./debugview.js";
import { renderReadingGated, renderSummary } from "./readingview.js";
import { buildShareModel, renderShareBlob, deliver } from "./sharecard.js";
import { renderReferrals, renderHaltNotice, renderAdvisories, renderMeasurementLimits }
  from "./modulebview.js";
import { renderScienceLink, renderScienceScreen } from "./scienceview.js";
import {
  renderReportButton, renderReportForm, renderReportConfirmation,
  buildReportPayload, sendReport,
} from "./report.js";
import { renderAbout, loadBuildInfo } from "./about.js";
import {
  isUnlocked, redeemPaymentParam, buildShareText, shareText,
  recordShare, getShareCount, resetUnlockState, simulateShares,
  getUnlockState, grantLifetime, grantSubscription, forceExpireSubscription,
  subscriptionRemainingMs,
} from "./shareGate.js";
import { CHECKOUT_LIFETIME_LINK, CHECKOUT_WEEKLY_LINK, CHECKOUT_CONFIGURED }
  from "./flags.js";

const $ = (id) => document.getElementById(id);
const CONSENT_KEY = "mienshiang.consent.v1";

let file = null;
let objectUrl = null;

// ─────────────────────────────────── payment redirect on page load ──────────
// Must run before any UI renders, per the unlock priority order.
if (redeemPaymentParam(location.search)) {
  // Remove the param so it doesn't persist in browser history.
  history.replaceState(null, "", location.pathname);
}

// Cached last result, used to re-render after an in-session unlock.
let lastResult = null;
let activeResultScreen = "overview";

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
  document.body.classList.remove("has-results");
  activeResultScreen = "overview";

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
    $("out").innerHTML = `<div class="err"><p id="analysis-error" style="margin:0"></p>
      <button id="analysis-retry" class="ghost" type="button">Choose another photo</button></div>`;
    $("analysis-error").textContent = err?.message || "This photo could not be read.";
    $("analysis-retry").addEventListener("click", () => $("file").click());
  } finally {
    go.disabled = false;
  }
});

// ------------------------------------------------------------------ render --

function render(r) {
  lastResult = r;
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

  const overviewParts = [];
  const readingParts = [];
  const detailsParts = [];

  // The receipt goes first, above everything. There is no ordering conflict
  // with Module B: a referral that halts the reading means `r.reading` is
  // never rendered at all, so a summary and a halt notice cannot both appear.
  if (!result.halted) {
    overviewParts.push(renderSummary(r.reading, {
      caveatHtml: summaryCaveatHtml(),
      actionsHtml: shareControlsHtml(),
    }));
  }

  // Module B renders through its own module — its vocabulary lives with its
  // content, not on this Module A surface. All of these return "" when Module
  // B was not composed into the build.
  overviewParts.push(renderReferrals(result.referrals));
  overviewParts.push(renderHaltNotice(result.halted));
  // Stays DEFAULT-VISIBLE, directly under the receipt. The summary states
  // scope; this panel states what could not be measured at all. Neither
  // substitutes for the other.
  overviewParts.push(renderMeasurementLimits(baseline, notMeasured));

  // MODULE A — the reading, gated when the user has not yet unlocked.
  // Five Elements (face shape) is always visible; the remaining sections are
  // shown only after sharing or paying.
  if (!result.halted) {
    const locked = !isUnlocked();
    readingParts.push(renderReadingGated(r.reading, {
      locked,
      overlayHtml: locked ? gateOverlayHtml(getShareCount()) : "",
      insightsCaveatText: insightsCaveatText(),
    }));
    detailsParts.push(renderScienceLink());
    detailsParts.push(renderReportButton());
  }

  for (const rec of result.recommendations) {
    detailsParts.push(`
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
  detailsParts.push(renderAdvisories(result.advisories));

  detailsParts.push(renderGeometry(r.geometry, r.expression, r.delegate));

  $("out").innerHTML = `
    <div class="result-shell">
      <div class="result-titlebar">
        <div><p class="eyebrow">Your reading</p><h2>Scan result</h2></div>
        <button id="new-scan" class="ghost result-new" type="button">New scan</button>
      </div>
      <nav class="result-tabs" role="tablist" aria-label="Reading screens">
        <button type="button" role="tab" data-result-target="overview">Overview</button>
        <button type="button" role="tab" data-result-target="reading"${result.halted ? " disabled" : ""}>Reading</button>
        <button type="button" role="tab" data-result-target="details">Details</button>
      </nav>
      <section class="result-panel" data-result-panel="overview" role="tabpanel">${overviewParts.join("")}</section>
      <section class="result-panel" data-result-panel="reading" role="tabpanel">${readingParts.join("")}</section>
      <section class="result-panel" data-result-panel="details" role="tabpanel">${detailsParts.join("")}</section>
    </div>`;
  document.body.classList.add("has-results");
  wireResultScreens();
  window.scrollTo({ top: 0 });
  wireScienceScreen();
  wireReportControl();
  wireShare(r);
  wireShareGate(r);
}

function wireResultScreens() {
  const select = (name, { scroll = true } = {}) => {
    const target = document.querySelector(`[data-result-panel="${name}"]`);
    if (!target) return;
    activeResultScreen = name;
    for (const panel of document.querySelectorAll("[data-result-panel]")) {
      panel.hidden = panel !== target;
    }
    for (const button of document.querySelectorAll("[data-result-target]")) {
      const selected = button.dataset.resultTarget === name;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  for (const button of document.querySelectorAll("[data-result-target]")) {
    button.addEventListener("click", () => select(button.dataset.resultTarget));
  }
  for (const chip of document.querySelectorAll(".summary-chip")) {
    chip.addEventListener("click", (event) => {
      event.preventDefault();
      const id = chip.getAttribute("href")?.slice(1);
      select("reading", { scroll: false });
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }));
    });
  }
  $("new-scan")?.addEventListener("click", () => {
    document.body.classList.remove("has-results");
    activeResultScreen = "overview";
    $("out").innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  select(activeResultScreen, { scroll: false });
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

/** Insights narrative caveat. Same arrangement, same reason — see above. */
function insightsCaveatText() {
  return ($("tpl-insights-caveat")?.content?.textContent ?? "").trim();
}

/** Share-card footer. Same arrangement, same reason — see above. */
function shareCardCaveatText() {
  return ($("tpl-sharecard-caveat")?.content?.textContent ?? "").trim();
}

function shareControlsHtml() {
  return `
    <div class="summary-actions">
      <button id="share-card" class="ghost" type="button">Save or share this reading</button>
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
function wireShare(r) {
  const btn = $("share-card");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const original = btn.textContent;
    try {
      const includePhoto = $("share-photo")?.checked === true;
      // The card mirrors the gate: locked unless this device has unlocked.
      const model = buildShareModel(r.reading, shareCardCaveatText(), {
        unlocked: isUnlocked(),
        url: location.href.replace(/[?#].*$/, ""),
      });
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
}

// ----------------------------------------------- share-to-unlock gate ------

/**
 * HTML for the frosted overlay that sits over the gated reading sections.
 * Rendered purely — no DOM access. Injected via renderReadingGated.
 *
 * All strings here are UI chrome (buttons, counts, a short prompt). They are
 * not Module A reading copy and carry no health vocabulary.
 *
 * @param {number} shareCount  shares completed so far (0, 1, or 2)
 */
function gateOverlayHtml(shareCount) {
  const remaining = Math.max(0, 2 - shareCount);
  const progressLabel = shareCount >= 2
    ? "Shared"
    : shareCount === 1 ? "1 of 2 shared" : "0 of 2 shared";

  /* Paid options render as disabled buttons until the checkout links are real.
   * Sending someone to a placeholder checkout that cannot complete is worse
   * than showing the price and saying it is not ready — the first looks like a
   * payment failure and the second is simply true. CHECKOUT_CONFIGURED is
   * derived from the links themselves, so this cannot drift out of step. */
  const payCard = (id, href, price, note, popular) => {
    const inner = CHECKOUT_CONFIGURED
      ? `<a class="gate-btn gate-btn-pay" href="${href}">${price}</a>`
      : `<button id="${id}" class="gate-btn gate-btn-pay" type="button">${price} (coming soon)</button>`;
    return `
      <div class="gate-opt${popular ? " gate-opt-popular" : ""}">
        ${popular ? '<p class="gate-flag">Most popular</p>' : ""}
        ${inner}
        <p class="gate-note">${note}</p>
      </div>`;
  };

  return `
    <div class="gate-card">
      <p class="gate-title">Unlock the full reading</p>
      <p class="gate-sub">Three Courts, Qi Se and Twelve Palaces</p>
      <div class="gate-opts">
        <div class="gate-opt">
          <button id="gate-share" class="gate-btn gate-btn-share" type="button">
            Share with ${remaining} friend${remaining !== 1 ? "s" : ""}
          </button>
          <p class="gate-note">Free &middot; <span class="gate-progress">${progressLabel}</span></p>
        </div>
        ${payCard("gate-notify-lifetime", CHECKOUT_LIFETIME_LINK, "Unlock forever &mdash; $4.99", "One-time", true)}
        ${payCard("gate-notify-weekly", CHECKOUT_WEEKLY_LINK, "Weekly access &mdash; $2.99", "Renews weekly", false)}
      </div>
      <p class="gate-caveat">For entertainment and self-reflection only.
        Unlocks are stored on this device, so clearing your browser clears them.</p>
    </div>`;
}

/**
 * Wire the share-gate overlay buttons after render.
 *
 * The share button calls shareText with a tradition-framed message (no score,
 * no health claims), records the share, and re-renders on unlock.
 */
function wireShareGate(r) {
  const shareBtn = $("gate-share");
  if (!shareBtn) return; // not rendered (user is already unlocked)

  shareBtn.addEventListener("click", async () => {
    shareBtn.disabled = true;
    const settledLabel = () => {
      const remaining = Math.max(0, 2 - getShareCount());
      return `Share with ${remaining} friend${remaining !== 1 ? "s" : ""}`;
    };

    // Extract face shape name if available — tradition-attributed framing only.
    const faceShapeName = r.reading?.fiveElements?.available
      ? r.reading.fiveElements.name
      : null;
    const url = location.href.replace(/[?#].*$/, "");
    const text = buildShareText(faceShapeName, url);

    try {
      const result = await shareText(text);
      if (result === "shared" || result === "copied") {
        const { unlocked } = recordShare();
        shareBtn.textContent = result === "copied" ? "Link copied!" : "Shared!";
        if (unlocked && lastResult) {
          // Re-render the full reading now that the gate is open.
          setTimeout(() => render(lastResult), 800);
        } else {
          // Update the overlay count without a full re-render.
          const prog = document.querySelector(".gate-progress");
          if (prog) prog.textContent = `${getShareCount()} of 2 shared`;
          const rem = Math.max(0, 2 - getShareCount());
          shareBtn.textContent = `Share with ${rem} friend${rem !== 1 ? "s" : ""}`;
        }
      } else if (result === "cancelled") {
        shareBtn.textContent = settledLabel();
      } else {
        shareBtn.textContent = "Could not share";
      }
    } catch (err) {
      shareBtn.textContent = "Could not share";
      console.error("share gate failed:", err);
    } finally {
      shareBtn.disabled = false;
      setTimeout(() => {
        if (shareBtn.isConnected) shareBtn.textContent = settledLabel();
      }, 3500);
    }
  });

  // Present only while the checkout links are still placeholders.
  for (const id of ["gate-notify-lifetime", "gate-notify-weekly"]) {
    const btn = $(id);
    if (!btn) continue;
    btn.addEventListener("click", () => {
      btn.textContent = "We\u2019ll let you know when it\u2019s ready";
      btn.disabled = true;
    });
  }
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

// ----------------------------------------------------------- dev panel ------
// Triggered by 7 rapid taps on the wordmark. Hidden from normal users.
// Shows reset controls for the share-gate unlock state.

(function wireDevPanel() {
  const wordmark = document.querySelector(".wordmark");
  if (!wordmark) return;

  let tapCount = 0;
  let tapTimer = null;

  wordmark.addEventListener("click", () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 2000);

    if (tapCount >= 7) {
      tapCount = 0;
      clearTimeout(tapTimer);
      openDevPanel();
    }
  });
})();

function openDevPanel() {
  const dlg = $("dev-panel");
  if (!dlg) return;

  /* Loud on purpose. This panel hands out every unlock state for free, so the
   * one thing that must never happen is it shipping unnoticed. A console line
   * survives minification, shows up in a remote debugging session on a real
   * handset, and costs nothing when the panel is absent. */
  console.warn("\u26A0\uFE0F DEV PANEL ACTIVE \u2014 remove before production release");

  // Interpolated below: all three come from this module's own constants or are
  // numbers, so there is no user-supplied text on this path.
  const state = getUnlockState() ?? "locked";
  const remaining = subscriptionRemainingMs();
  const days = remaining === null ? null : (remaining / 86400000).toFixed(2);

  const actions = [
    ["dev-reset", "Reset all unlock state"],
    ["dev-simulate", "Simulate share \u00D7 2"],
    ["dev-subscribe", "Start weekly subscription"],
    ["dev-expire", "Force expire subscription"],
    ["dev-lifetime", "Force paid-lifetime"],
    ["dev-consent", "Reset consent"],
  ];

  dlg.innerHTML = `
    <div class="consent" style="min-width:0">
      <h2 style="font-size:1rem;margin-bottom:.75rem">Dev: unlock state</h2>
      <p style="font-size:.85rem;color:var(--ink-60);margin:.4rem 0">
        Current state: <code>${state}</code> &middot;
        shares: <code>${getShareCount()}</code>${
          days === null ? "" : ` &middot; expires in <code>${days}d</code>`}
      </p>
      <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:1rem">
        ${actions.map(([id, label]) =>
          `<button id="${id}" class="ghost" type="button">${label}</button>`).join("")}
        <button id="dev-close" class="ghost" type="button" style="margin-top:.5rem">Close</button>
      </div>
    </div>`;

  dlg.showModal();

  // Every action re-renders, so the panel never leaves the screen showing
  // state it has just invalidated.
  const act = (id, fn) => dlg.querySelector(`#${id}`)?.addEventListener("click", () => {
    fn();
    dlg.close();
    if (lastResult) render(lastResult);
  });

  dlg.querySelector("#dev-close").addEventListener("click", () => dlg.close());
  act("dev-reset", resetUnlockState);
  act("dev-simulate", simulateShares);
  act("dev-lifetime", grantLifetime);
  act("dev-subscribe", () => grantSubscription());
  act("dev-expire", () => {
    // Reports rather than failing silently: expiring is a no-op unless a
    // subscription is actually live, and a dead button reads as a bug.
    if (!forceExpireSubscription()) {
      console.warn("Dev panel: no live subscription to expire. Start one first.");
    }
  });
  act("dev-consent", () => {
    localStorage.removeItem(CONSENT_KEY);
    location.reload();
  });
}

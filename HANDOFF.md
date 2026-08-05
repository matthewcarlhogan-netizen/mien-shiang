# HANDOFF.md

Rolling state of the build. Updated at the end of every phase.
Full evidence for Phase 0 lives in [AUDIT.md](AUDIT.md).

---

## Current position

**Phase 0 (repo audit) — complete.** No feature work done; `src/` untouched.

Environment for all Phase 0 verification: Windows 11 Pro 10.0.26200,
PowerShell 5.1, Node v24.19.0, npm 11.17.0, run on the user's own machine
(no sandbox divergence). Desktop only — no mobile device was touched.

---

## Verified this session

- **Test suite: `tests 57 / pass 56 / fail 1`.** The one failure is the known,
  documented `copy-guard` failure caused by `rules.js:183`
  (`TCM-202-DAMP-HEAT.recommend[1]` names "anaemia" and "thyroid"). Not a
  regression. Discovery floor check fired (`Running 4 test file(s):`).
- **PWA manifest complete** — served 200 as `application/manifest+json`, no
  required fields missing, three correctly-sized icons (192/512/512 maskable,
  dimensions read from the PNG headers).
- **Service worker healthy** — exactly 1 registration at scope `/`, active,
  all 10 precache entries present. Precache ↔ disk checked both directions;
  no missing assets, no orphans.
- **Offline shell works** — verified with a paired positive/negative control in
  one run: an uncached same-origin probe threw a network error (origin genuinely
  down) while `/engine.js` still returned `HTTP 200, 14366 bytes`. Page
  re-rendered and `ui.js` executed from cache.
- **No attractiveness/rank scalar exists** anywhere in `src/`.
- **All eight CLAUDE.md load-bearing constraints hold** in the current code.
- **18 of 63 user-facing strings carry health vocabulary** — full inventory,
  string by string, in AUDIT.md §1.9.

## Reported but unverified

- The whole capture → landmark → measure → rules path on a **real photo**.
  Nothing was analysed this session.
- GPU delegate on real hardware; engine parity with the original Python
  (a bare code comment, no test); colorimetry on real skin.
- CI matrix — **no git remote is configured, so CI has never run once.**
- Bubblewrap/TWA and all iOS behaviour.

## Unknown / gaps

Largest first:

1. **No Module A / Module B boundary.** `RULES` is one flat array; `category`
   is a seam, not a boundary. No feature flag, no separate copy deck, no About
   screen. The colorimetry engine is shared by both modules, so the split has to
   sit at the interpretation layer.
2. **Offline analysis is broken.** The MediaPipe WASM and the 3.76 MB `.task`
   model are not precached — verified `NOT CACHED`. First-run-offline renders a
   shell and then fails to read. Phase 4's exit criterion is not met today.
3. **Copy lint scope.** `copy-guard.test.js` imports only `RULES`. `index.html`,
   `ui.js` and `engine.js` strings — the consent gate and footer included — are
   entirely unscanned.
4. Phase 1: no CPU fallback, no blendshapes, no geometry of any kind.
5. Phase 2: no Five Elements, Three Courts, Twelve Palaces, qi se, or science
   screen.
6. Phase 3: no attractiveness guard, no egress guard, no report control, no
   privacy policy, no `COMPLIANCE.md`.
7. Phase 4: nothing hosted, packaged or installed.

## Positioning note (not blocking)

The master prompt positions the product as **entertainment**; CLAUDE.md
positions it as a **general wellness tool** and calls that load-bearing for TGA
exclusion 14B. These reconcile — an entertainment reading making no health claim
is not a medical device at all, which is safer than relying on the carve-out,
and Module B keeps the existing conforming referral design. But CLAUDE.md is
explicit that intended purpose is evidenced by documentation as well as code, so
README, `package.json`, the manifest description, the status bar, the footer and
all five consent clauses must be rewritten **in step with** the code, not after.

## Two traps for whoever works on this next

- A scan that reports "no violations" is more likely broken than clean. The
  first framing scan this session returned a false "0 of 63" because `\b` did
  not survive shell quoting and became a backspace. **The Phase 3 lint must ship
  with a canary** that fails loudly when it cannot find a term known to be
  present.
- `fetch(url, {cache:'no-store'})` does **not** bypass a service worker. An
  offline check built on it returns 200 from cache and proves nothing. Probe an
  *uncached* same-origin URL instead.

---

## Exact next action

**Phase 1 — capture and analysis core.** In order:

1. Add an explicit CPU fallback to `getLandmarker()` (`analysis.js:29`) and
   exercise both delegate paths, rather than assuming GPU is available.
2. Enable `outputFaceBlendshapes: true`; wire the 52 coefficients to
   expression/asymmetry only — never to personality.
3. Build the geometry layer: facial thirds, facial fifths, forehead /
   bizygomatic / bigonial widths, face length — from the existing 478-point set.
4. Build the rule-based face-shape classifier so every classification names the
   ratio that triggered it, and expose that in a debug view.
5. Decide and document the fWHR definition (landmark indices + formula, in code
   comments and docs), or omit it. Never present it as a dominance signal.

Phase 1 exit: single-selfie capture → landmark set → geometry report, verified
on real device photos in varied lighting, with GPU **and** CPU paths both
exercised.

Nothing in Phase 1 should touch the copy until the Module A/B boundary exists —
otherwise the strings get written twice.

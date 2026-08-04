# CLAUDE.md

Context for working on this repo. Read before changing anything in `src/`.

## What this is

A Progressive Web App that measures facial skin regions from a photo and
interprets them through a Traditional Chinese Medicine (Mien Shiang) rule base.
Runs entirely in the browser on the user's phone — no server, no upload, no
account. Installs to the Android home screen.

**Positioning is load-bearing, not marketing.** This is a *general wellness
tool*. It is not a medical device and must never present itself as one. Several
design decisions below exist purely to keep that true; if you undo them you
change the product's regulatory status, not just its tone.

## Commands

```bash
npm start     # dev server on http://localhost:5173 (honours PORT)
npm test      # 56 tests, node:test, no dependencies
```

There is no build step and no npm dependencies. `src/` ships as-is. The
`package-lock.json` exists only so `npm ci` works in CI; it locks nothing.

56 = 44 science/rules tests + 12 server traversal tests. If you see 44, the
traversal suite is not being discovered.

## Architecture

```
src/
  index.html    UI + all styles (single file, no framework)
  ui.js         screen wiring, overlay rendering, consent gate
  analysis.js   MediaPipe landmarking, ROI hull masking, orchestration
  engine.js     colorimetry + texture measurement  ← the science
  rules.js      facial zone definitions + forward-chaining rule engine
  sw.js         offline cache (app shell + WASM + model)
  manifest.webmanifest   PWA metadata; must be served as application/manifest+json
  icon-192.png           install icon (purpose: any)
  icon-512.png           install icon (purpose: any)
  icon-512-maskable.png  install icon (purpose: maskable) — placeholder art
scripts/
  serve.js      local dev server ONLY — never deployed
  run-tests.js  test discovery; exits 1 on zero files found
tests/
  engine.test.js          colorimetry, detectors, self-reference
  rules.test.js           gate precedence, chaining, pixels-to-referral
  serve.traversal.test.js raw-socket path traversal + positive control
```

The icons are valid and correctly sized but are **placeholder art**, not
branding. Replace before any public listing.

Data flow:

```
photo → canvas → un-mirror → Shades-of-Gray white balance (WHOLE FRAME, ONCE)
      → MediaPipe 478 landmarks → per-zone convex hull + mask
      → colorimetry/texture per zone → Δ vs subject's own baseline
      → observation facts → forward-chaining rules → referrals + advice
```

MediaPipe (`@mediapipe/tasks-vision@0.10.18`) and the 3.76 MB face model load
from CDN and are cached by the service worker for offline use.

---

## Things that will silently break if you "clean them up"

These are not stylistic. Each was a real bug, caught by testing, and each has a
test pinning it. If a test in this list fails, you have reintroduced a defect —
do not adjust the test.

### 1. White balance is applied ONCE to the whole frame

`analysis.js` calls `shadesOfGray()` on the full canvas before extracting
zones. **Never apply colour constancy to an individual region.** Normalising
each region separately drives them all toward grey and erases exactly the
between-region colour differences the entire method measures. When this was
wrong, a visibly red patch measured ΔEI of exactly `0.000`.

### 2. Erythema sign convention is red-over-green

`EI = 100·log₁₀(R_red / R_green)`. The literature genuinely conflicts here —
some sources quote Diffey–Farr inverted. Flipping the ratio inverts every
result in the app and makes the malar safety gate fire on *pale* skin.
Pinned by `erythema sign convention is redness-increasing`.

### 3. ITA uses `atan2`, never `atan` with a clamped b*

`ITA = atan2(L*−50, b*)·180/π`. An earlier revision clamped `b*` positive,
which broke quadrant resolution and mis-binned cool-toned skin toward *lighter*
strata — desensitising the erythema safety gates in exactly the wrong
direction.

### 4. Ridge detection uses a FIXED structureness normaliser

`RIDGE_STRUCTURE_SCALE = 1.0`, and `ridgeResponse()` returns **mean vesselness**,
not area above a threshold. The original used the region's own 97th percentile,
which is self-normalising: flat noisy skin scored *higher* than drawn furrows.

This constant is specific to the 3-point Laplacian used here. The Python version
used `cv2.Sobel(ksize=5)` with far larger kernel gain and a constant of `120`;
copying that value makes the response vanish. **If you change the derivative
kernel, re-derive the constant by measuring structureness on noise vs furrows.**

### 5. Cheek laterality is subject-anatomical

MediaPipe names sides from the subject's perspective. Verified against its own
`FaceLandmarksConnections`:

```
FACE_LANDMARKS_RIGHT_EYE contains 33, 133
FACE_LANDMARKS_LEFT_EYE  contains 263, 362
```

So index `234` is the subject's **right** cheek (Lung) and `454` the subject's
**left** (Liver). The original spec had these swapped. Front cameras mirror the
preview, which inverts laterality *again* — hence the un-mirror toggle, applied
before landmarking.

### 6. The baseline is PERIPHERAL, not whole-face

`BASELINE_ZONES = ["center_forehead", "chin"]`. A malar rash spans both cheeks
and the nose bridge; a whole-face average would fold the rash into its own
control and mask the exact thing the safety gate looks for.

### 7. No test glob may reach a shell — discovery happens in Node

`"test": "node scripts/run-tests.js"`. That script walks `tests/` itself and
passes explicit file paths to `node --test`, then **exits 1 if it finds zero
files**. Do not replace it with a glob, quoted or otherwise.

The history, because the failure mode is silent and it has already shipped once:
the script was `node --test 'tests/**/*.test.js'`. npm runs scripts through
`cmd.exe` on Windows, which does not strip single quotes, so Node received a
literal `'tests/**/*.test.js'`, matched no files, and reported **0 tests with
exit code 0** — a green run that asserted nothing. Double-quoting fixed that
particular case (both `cmd` and POSIX `sh` strip double quotes), but it still
relies on shell quoting behaviour and on Node ≥21 for glob arguments. Doing
discovery in Node removes both dependencies.

A passing run must print `Running N test file(s)` with N > 0. CI asserts that
line is present precisely so a reversion to a glob cannot pass quietly.

### 8. `serve.js` resolves ROOT with `fileURLToPath`, never `.pathname`

On Windows `.pathname` yields `/C:/Users/...` — leading slash, forward slashes,
percent-encoded spaces. `join()` then rewrites that to `\C:\Users\...`, which
fails the `startsWith(ROOT)` traversal guard, so **every** request 403s and the
app is entirely unservable. The guard appearing to "block traversal" on Windows
was meaningless: it was blocking everything, including `index.html`.

**ROOT ends with a path separator, and that is the whole guard.** Because the
URL is `"../src/"`, `fileURLToPath` returns `...\src\`, so `startsWith(ROOT)`
cannot match a sibling like `src-old` or `src.bak`. Do **not** "harden" this to
`startsWith(ROOT + sep)`: ROOT already has one, the doubled separator matches
nothing `join()` ever produces, and you are back to 403-on-everything. `serve.js`
now throws at startup if the trailing separator is ever lost, so the sibling
hole cannot open silently. `tests/serve.traversal.test.js` covers both the
escape vectors and the sibling case over raw sockets — `fetch`, PowerShell and
plain `curl` all normalise `/../` before it reaches the wire, so a traversal
test built on those proves nothing.

## The measurement layer

| Condition | Method | Source |
|---|---|---|
| erythema | ΔEI vs own baseline | Dawson 1980 → Takiwaki 1998 → Yamamoto 2008 |
| pallor | negative ΔEI | same measurement, reversed |
| hyperpigmentation | ΔMI vs own baseline | MI = 100·log₁₀(1/R_red) |
| deep_rhytide_* | multi-scale Hessian ridge, orientation-gated | Frangi 1998; HHF, Ng et al. ACCV 2014 |
| xerosis | GLCM contrast vs own baseline | Haralick 1973, d=1, 4 orientations |

**Self-reference is the bias defence.** Nothing is compared to a population
scale. Every value is a difference between one region and peripheral regions of
the *same* face. Subtracting the subject's own baseline cancels the melanin term
and most of the illumination term simultaneously. The technique dates to
Jansen's 1950s reflectance work and remains standard in rosacea trials as ΔEI.
Its known weakness: it assumes melanin is roughly constant between region and
reference.

### The dark-skin limit is enforced in code

Lee et al., *J Invest Dermatol* 2026 (15,000+ spectra, 2,000+ participants):
haemoglobin's spectral features fall below the noise floor beneath melanin's
broadband absorption, and the attenuation is steeper on the face than the palm
because light double-passes melanin-rich epidermis. Their wording: this "is not
a calibration problem that better instruments could solve."

Corroborated: Wilkes et al. (n=503) found device erythema readings spuriously
correlated with the subject's *own* melanin (ρ up to 0.78); a melanometry review
found melanin–erythema crosstalk |R|>0.70 in 6 of 7 commercial device
comparisons.

So `erythemaConfidence()` returns three regimes keyed on ITA band:

- **full** — absolute and relative both usable
- **relative** — within-face differences only, confidence downgraded to 0.55
- **low** — **no erythema or pallor observation is emitted at all**, and the
  user gets a plain-language explanation

Two tests pin this: the refusal, and that suppression does *not* take
luminance-based measures (ridges, texture) with it.

The ITA→regime mapping is a judgement call, not a published result. It errs
toward declaring low confidence early — the safe direction.

### What is deliberately never measured

`UNAVAILABLE` in `engine.js`: acne, acne_cystic, comedone, ulcer, dermatitis,
focal_pigmented_lesion, telangiectasia, edema, diagonal_crease.

These need a model trained on labelled clinical images (edema needs 3D data a
flat photo cannot supply). They are never emitted, dependent rules never fire,
and the UI lists them under "not checked". **Emitting a low score would be worse
than silence** — it would let the interface imply an examination happened.

Training path if you add them: SCIN (facial + Monk + Fitzpatrick, diverse) and
Fitzpatrick17k for breadth, DDI to validate FST V–VI specifically, ACNE04 for
acne severity. None is a purpose-built facial-severity set, so a bespoke
labelled corpus will be needed.

### Severity scaling is uncalibrated — the honest gap

`DELTA_EI_FULL_SCALE`, `DELTA_MI_FULL_SCALE`, `RHYTIDE_FULL_SCALE`,
`TEXTURE_CONTRAST_FULL_SCALE` convert physical quantities to 0–1.

**These are reasoned starting points, not fitted constants.** There is no
labelled ground truth in this repo. The measurements are real; the grades are
provisional. Before presenting anything as a clinical grade, fit isotonic (or
Platt, for small samples) calibration *per tone stratum*, and report
per-stratum ECE rather than a pooled figure.

**Decided in advance of any fitting: the deep-skin stratum gets three
constants, not four.** Do not fit `DELTA_EI_FULL_SCALE` for it. Drop it
structurally rather than fitting it and letting it land near zero — a fitted
near-zero constant makes the system represent *"we measured redness and found
none"*, which is a clinical claim with no basis behind it and exactly what the
referral constraint exists to prevent. Absence of measurement and a measurement
of absence are different objects, and only the first is honest here. So the
model has a **different shape per stratum, not merely different values.**

Confirmed against the code, since this turns on which constants are
erythema-derived: `DELTA_EI_FULL_SCALE` is the only one, but it drives **two**
observations — erythema via `sev(dEi, …)` and pallor via `sev(-dEi, …)`. The
low-confidence regime suppresses both, so removing that single constant removes
both observations together. Four-and-three is the right split; it is one
constant carrying two suppressed observations, not one carrying one.

---

## Regulatory constraints on wording

**No user-facing string may name a disease.**

Under s41BD of the Australian *Therapeutic Goods Act 1989*, software meeting the
medical device definition needs ARTG inclusion unless excluded. The relevant
carve-out is **exclusion 14B** (general health or wellness). Two features drive
the design:

1. It does not apply to software making any claim about a **serious** disease,
   condition, ailment or defect.
2. **Every** function must independently meet the criteria — one
   non-conforming feature voids the exclusion for the entire product.

So the malar gate fires on exactly the clinical criteria and halts all TCM
output, but tells the user only: *"a pattern of facial redness a clinician
should look at"* plus what to mention. Clinical function preserved; no disease
opinion rendered. `referral never names a disease` enforces this.

Note that intended purpose is evidenced by documentation and marketing, not only
code. Keep any copy you write aligned with the payload.

Also relevant: exclusion is not exemption — Australian Consumer Law still
applies. And the FTC/ACCC standard for objective efficacy claims is competent
and reliable scientific evidence, which the organ-to-region correspondences do
not have. Hence the in-app framing "in the Mien Shiang tradition, this is read
as…", which must be mirrored in any external copy.

---

## Privacy posture

No account, no server, no upload, no storage. The photo is drawn to a canvas,
measured, and discarded. There is deliberately no persistence layer for images.

This matters more than it looks: a face photo tied to an identity is biometric
data. In Australia that is *sensitive information* under the Privacy Act; in the
US, Illinois BIPA carries a private right of action with per-violation statutory
damages, and Washington's My Health My Data Act is broader still. The safest
way to hold biometric data is not to.

**If you add progress tracking** — the obvious next feature — store the derived
observation vectors, not the images. Trends compute fine from those, and they
are not biometric identifiers.

---

## Deploying

Needs **https** — Android will not install a PWA over plain http, and
`getUserMedia` won't run. `localhost` counts as secure, so `npm start` is fine
for desktop testing but not for phone testing.

- **Netlify Drop** (`app.netlify.com/drop`) — drag `src/`, get an https URL
- **GitHub Pages** — push, enable Pages, serve from the repo root

Install on Android: open the URL in Chrome → ⋮ → *Add to Home screen*.

---

## Known gaps / good next tasks

- **Android packaging is blocked on HTTPS hosting, not on code.** The PWA layer
  is complete and verified on `localhost`: manifest valid, one service worker
  activated at scope `/`, all ten precache entries present, and the app renders
  with the dev server killed. What remains is entirely environmental —
  a real HTTPS origin, then Bubblewrap for a TWA. Trusted Web Activity rejects
  HTTP origins outright, so there is no local shortcut.

  Two things to check on the host *before* building anything: that it serves
  `/.well-known/assetlinks.json` (some static hosts silently 404 dotted
  directories), and that Digital Asset Links verification actually passes — if
  it fails the app still runs but shows a browser address bar, and it fails
  quietly. If you use Google Play App Signing, the fingerprint in
  `assetlinks.json` must be the one Play shows in the console, not the one from
  the local keystore; that mismatch is the usual cause of a shipped address bar.
  For a sideloaded APK the local keystore fingerprint is the correct one.
- **Calibrate the severity constants** against labelled data, per tone stratum.
  Highest-value single improvement *to the science*.
- **Deep-learning wrinkle segmentation.** Classical filters miss fine wrinkles
  and degrade off the forehead — HHF's headline 75.67% Jaccard is
  forehead-specific; whole-face is ~31.7%, against 93% human inter-coder
  agreement.
- **Explainability of the perception layer.** The overlay traces *rule*
  provenance faithfully (conclusion → rule → observations → regions), but it
  does not explain the measurement itself. Don't describe it to users as showing
  "what the AI looked at".
- **No Five Element morphology classifier.** The engine supports `constitution`
  facts but nothing emits them.
- **Frank's sign is unimplementable here** — MediaPipe's face mesh has no
  earlobe landmarks; the oval terminates near the tragus. Extrapolating from
  234/454 lands in hair. Needs a separate ear detector.
- **No monetisation.** A prior iteration had Stripe billing with an append-only
  credit ledger; it required a server and is not part of this build. If you
  resurrect it, keep it billing-only — do not duplicate the measurement code
  server-side, or the two copies will drift.

## Style

Australian English in user-facing copy. Plain language over clinical register —
the app talks to a person, not a chart. Comments explain *why*, especially where
a line looks redundant but is load-bearing (see the six items above).

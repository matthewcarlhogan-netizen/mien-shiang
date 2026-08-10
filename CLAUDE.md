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
npm start        # dev server on http://localhost:5173 (honours PORT)
npm test         # 571 tests, node:test, no dependencies
npm run build    # dist/ — copy of src/, Module B stubbed in the entertainment flavour
npm run lint:bundle   # compliance guards, run against dist/ not src/
node scripts/qise-bakeoff.mjs --self-test   # Phase 5b decision table
```

There is a build step now, and still no npm dependencies. It was added in
Phase 3 because the compliance guards must run on the ARTEFACT — a term in a
file that never ships is not a finding — and because the entertainment flavour
needs Module B genuinely absent from the bundle, not merely unreachable, before
its Google Play Health declaration is true. `scripts/build.js` performs no
transform: `dist/` is a copy of `src/` with three Module B files replaced by
stubs when the flag is off.

`package-lock.json` exists only so `npm ci` works in CI; it locks nothing.

571 across forty-three files — 317 in `tests/`, 254 in `tests/qise/`. Those two
subtotals are the useful sentinels: if you see 317 the tracker's tree is not
being discovered, and if you see 254 the top-level suite is not. Both are
measurable directly (`node --test tests/*.test.js`, `node --test
tests/qise/*.test.js`), so a drifted figure here is checkable rather than
folklore — the previous version of this line quoted counts from three phases
back and had stopped meaning anything.

**All 571 pass.** The long-standing `copy-guard` failure on
`TCM-202-DAMP-HEAT.recommend[1]` is resolved — that line moved to Module B in
the Phase 2 split (see item 19). If a test fails, it is a real defect.

The Qi Se longitudinal tracker (`src/qise/`, `src/ui/qise/`, `src/qise.html`) is
a second feature with its own entry point, its own module tree and its own six
compliance gates. Its working notes, its disagreements with the brief that
specified it, and — importantly — the list of things that could NOT be verified
without a phone live in `docs/QISE_NOTES.md`. Read that before touching it.

## Architecture

```
src/
  index.html    UI + all styles (single file, no framework)
  ui.js         screen wiring, overlay rendering, consent gate
  analysis.js   MediaPipe landmarking, ROI hull masking, orchestration
  flags.js      build flavour: does Module B ship? (ASCII-only, see item 17)
  zones.js      ROI geometry — measurement config, owned by neither module
  roi.js        hull + drop decision for a zone  ← pure, no DOM (see item 23)
  adapters/
    entertainment.js  MODULE A boundary — raw scalars -> glow/vitality values
    safety.js         MODULE B boundary — raw scalars -> referral thresholds
  rules.js      composition root — decides which rules exist; contains NO copy
  rules-a.js    MODULE A reading content
  rules-b.js    MODULE B safety content + MODULE_B_DISCLAIMER
  rule-engine.js  matching/chaining machinery, owned by neither module
  reading/      MODULE A reading layer (all pure, no DOM)
    five-elements.js  qi-se.js  three-courts.js  twelve-palaces.js
    summary.js        the reading receipt — measured values only (see item 24)
    harmony.js        canon-match proportions — about the canons, NOT the face
    science.js        "What the science says" content
  readingview.js  renders Module A, + Module B under its own disclaimer
  sharecard.js    on-device canvas share image; photo EXCLUDED by default
  scienceview.js  the science screen
  landmarker.js GPU→CPU delegate fallback (factory INJECTED, so it is testable)
  geometry.js   facial proportions + face-shape classifier  ← pure, no DOM
  expression.js blendshapes → expression/asymmetry STATE (never traits)
  debugview.js  renders the geometry trace  ← pure, no DOM
  engine.js     colorimetry + texture measurement  ← the science
  utils/
    calibrationEngine.js  adaptive ridge scale, per-zone constants, dynamic
                          blur, melanin crosstalk  ← pure, owned by NEITHER module
    insights.js           MODULE A shape narrative; teaser free, report gated
    textureAnalyzer.js    oriented GLCM, robust statistics  ← pure, same
  rules.js      facial zone definitions + forward-chaining rule engine
  sw.js         offline cache (app shell + WASM + model)
  manifest.webmanifest   PWA metadata; must be served as application/manifest+json
  icon-192.png           install icon (purpose: any)
  icon-512.png           install icon (purpose: any)
  icon-512-maskable.png  install icon (purpose: maskable) — placeholder art
  qise.html     Qi Se tracker entry point; consent gate copy lives here, marked
                as a disclaimer (one wording, two consumers — see item 24)
  qise/         THE QI SE LONGITUDINAL TRACKER — all pure, all DOM-free
    consent.js    unbundled opt-in; withdraw() REQUIRES an eraser (item 37)
    color.js      sRGB->Lab, ITA, dE76, dE2000, sCWeight, von Kries
    rois.js       eight regions; `mirrored` is required, never defaulted
    sclera.js     four-filter illuminant estimate + personal drift baseline
    gates.js      ten capture gates, each with a normalised margin
    camera.js     burst capture; every browser object INJECTED (item 14)
    pose.js       head pose from landmarks; an unmeasured axis is null (item 43)
    metrics.js    hueVector/ming/run/han/xue, computed twice (raw + corrected)
    baseline.js   median/MAD baseline, five-colour compass, `ping` default
    store.js      IndexedDB; toRecord() is a pure allow-list (item 39)
    passages.js   attributed passage corpus, composed from three keyed parts
    patterns.js   frequency-only statements, n >= 5, n always shown
  ui/qise/      the tracker's view layer — pure models, string renderers
    palette.js    five colours + Su Wen similes; emits the CSS custom properties
    seal.js       the compass as a carved seal, seeded from the timestamp
    screens.js    reading-screen order, gauges, courts strip, sparkline
    app.js        DOM wiring ONLY; MediaPipe is a dynamic import (item 41)
scripts/
  serve.js      local dev server ONLY — never deployed
  run-tests.js  test discovery; exits 1 on zero files found
  qise-bakeoff.mjs  Phase 5b: decides raw vs sclera-corrected by measurement
tests/
  engine.test.js          colorimetry, detectors, self-reference
  calibration.test.js     adaptive scale, per-zone scales, blur, crosstalk, gating
  texture.test.js         oriented GLCM, normalisation, robust statistics
  harmony.test.js         canon matching, dropped components, no-verdict guard
  sharecard-modes.test.js locked/unlocked card, whole-reading guard
  rules.test.js           gate precedence, chaining, pixels-to-referral
  roi-extraction.test.js  every ROI encloses area; the malar gate is reachable
  insights-view.test.js   teaser renders free, full report renders gated
  capture-flow.test.js    the flow affordances ui.js cannot be tested through
  serve.traversal.test.js raw-socket path traversal + positive control
  fixtures/
    canonical-face.js     MediaPipe's reference mesh — never a real subject
  qise/                   the tracker's suite, including its six compliance gates
    no-network.test.js            no fetch/XHR/WebSocket/sendBeacon/EventSource
    no-medical-language.test.js   the vocabulary that keeps TGA item 14B available
    no-absolutes.test.js          no ITA, no MI proxy, no cross-user comparison
    persistence-shape.test.js     no image/pixel/landmark/embedding may be stored
    consent-precedes-inference.test.js  behavioural AND static: every door gated
    discovery-guard.test.js       the runner fails on zero discovered files
    fixtures/
      ciede2000-sharma.js   the 34 published CIEDE2000 pairs, committed verbatim
      synthetic.js          synthetic frames built from the canonical mesh
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

**Superseded as the operative normaliser, not as the reasoning.** `rawScalars()`
now derives a per-image scale (item 27) and `RIDGE_STRUCTURE_SCALE` is its
fallback — used whenever the estimate has too few samples or too few zones to be
trusted. Every word above still governs: the noise-versus-furrow measurement is
what anchors `NOISE_FLOOR_STRUCTURENESS`, and the adaptive path is safe only
because it is pooled and clamped. Read item 27 before touching either.

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

### 19. Module A copy obeys four rules, all of them enforced

`rules-a.js` and everything under `reading/` is the entertainment module. Every
string there must:

1. **Be tradition-attributed, never assertive.** Not "you are steady" but
   "the classical association is with steadiness".
2. **Name its source inline** — "In Mian Xiang", "Classical Chinese face
   reading", "Lavater (1778)", "Both Chinese and Western traditions". A generic
   "tradition" does not satisfy the guard.
3. **Carry no health vocabulary.** The blocklist includes `circulation`, `iron`
   and `blood` because Module B's relocated advisory uses them — they are the
   marker of content that belongs on the other side of the boundary. It also
   includes `treat`, which catches the ordinary English sense; four such slips
   were caught writing the Phase 2 content and rewritten to "regard".
4. **Never deliver a verdict**, negative or otherwise, about a person.

**Symptom:** a reading that asserts a fact about the reader, or that quietly
reads as health advice.
**Pinned by:** `tests/copy-guard.test.js`, which scans every registered Module A
surface via `MODULE_A_COPY`. **If you add a reading surface, register it there**
— an unregistered surface ships unscanned, which is how the original defect
reached production.

Module B may use clinical vocabulary. Neither module may name a disease.

### 20. Where classical sources disagree, the UI says so

The mappings genuinely conflict between texts, most sharply on Five Elements
face-shape assignment — the square face is Earth in many Mian Xiang texts and
Metal in others, and "oval" is a modern styling category with no classical
equivalent at all.

**Symptom:** a contested mapping presented as settled.
**Cause:** picking one reading silently because the code needs a single answer.
**Pinned by:** `where classical sources disagree, Module A says so` (every rule
must carry a `sourcesDiffer` note) and `every Five Elements mapping names its
source and its disagreement` (every shape must also name a competing element).
`readingview.js` renders them all through one pattern, `sourcesNote()`.

### 21. The copy lint has THREE buckets, and the exemptions are narrow

`scripts/copy-scan.js` buckets user-facing text by its `data-copy` marker:

| Bucket | Blocklist | Assertive guard | Disease names |
|---|---|---|---|
| (unmarked) — Module A copy | enforced | enforced | rejected |
| `disclaimer` — consent gate, footer | **exempt** | enforced | rejected |
| `legal` — privacy.html, terms.html | **exempt** | **exempt** | rejected |

**Why the exemptions exist.** The wellness disclaimer cannot be written without
"diagnose", "treat", "cure" and "disease"; a terms page has to be able to say
"rights you have under consumer law". Weakening either to satisfy a vocabulary
lint would trade a real legal disclosure for a green test.

**Symptom of misuse:** a reading marked as a disclaimer, and health vocabulary
walks straight into Module A.
**Pinned by:** `only the two legal pages use the legal exemption` (an exact
list, not a pattern) and `the disclaimer exemption is narrow and cannot be
applied to a reading`, which asserts no file under `reading/` carries a marker.

Disease names are rejected in EVERY bucket. TGA exclusion 14B does not survive
a disease claim on any surface of the product.

### 22. Guards run on `dist/`, and a string literal is not what a regex thinks

`scripts/lint-bundle.js` scans the built artefact. Writing its scanner surfaced
three defects worth remembering, because each produced confident wrong output:

1. **A naive `/"..."/` regex spans the code between two literals.** JavaScript
   alternates strings and code, so quote-to-quote matching happily captured
   `, severity: s, confidence: conf, tone, measured: {` and reported it as
   user-facing copy. Fixed with a real tokeniser (`tokeniseStringLiterals`).
2. **Regex literals contain quotes.** `/[&<>"]/g` opened a phantom string that
   swallowed hundreds of characters. The tokeniser now skips regex literals,
   resolving the division ambiguity the usual way.
3. **Banning the bare word "score" is wrong here.** MediaPipe's blendshape
   categories carry a `score` field. Banning it would force renaming a
   third-party API to satisfy a lint about English. Person-scoped compounds
   (`overallScore`, `beautyScore`) are matched instead.

The lint also exits non-zero if it scans zero files or if its canary term is
not found — a guard that passes by scanning nothing is the false-green this
repo has shipped twice.

**Documentation links are not egress.** The Apache-2.0 attribution URL and
RevenueCat's policy link are navigations the user initiates. They are
allowlisted separately and only with no query string and no fragment, since
either could hand a value to a third party in a URL the user is invited to tap.

### 9. The disease-name guard scans EVERY rule, not one fired path

`tests/copy-guard.test.js` walks all of `RULES` and fails if any payload string
names a disease. Do not narrow it back to a single scenario.

**Symptom:** a disease name reaches the screen while the older
`referral never names a disease` test still passes.
**Cause:** that test fires only the malar gate and screens only the lupus
family, so it inspects the *referral* path. It never looks at the *advice*
path — and `ui.js:119` renders `rec.recommend[]` verbatim into `innerHTML`, so
wellness advice is exactly as user-facing as a referral.

Not hypothetical. `TCM-202-DAMP-HEAT` recommendation `[1]` currently reads
*"…anaemia and thyroid problems present this way…"* — two disease names plus an
assertion that they present as the measured facial pattern. **The guard fails on
it today.** The copy is unfixed pending a wording decision.

The term list deliberately excludes "ulcer" (a lesion, not a disease) and the
organ correspondences like "Heart — cardiovascular" (framed as tradition, not
asserted as a finding). Widen it on purpose, not by accident.

### 10. fWHR has exactly ONE definition here, and a test pins it

`geometry.js` measures it as **bizygomatic width ÷ (upper eyelid → upper lip)** —
the eyelid-based convention. The competing nasion-based convention measures the
denominator from the bridge of the nose and yields systematically different
numbers.

**Symptom:** stored or displayed fWHR values silently stop being comparable
with every earlier one, and with the literature you think you are matching.
**Cause:** someone swapped the denominator because both are "obviously" fWHR.
**Pinned by:** `fWHR uses the eyelid-based definition and pins it in the
payload`, which asserts on the `definition` string as well as the number. If
you change the definition, change it in `geometry.js`, in that test, and here,
in the same commit.

It is also never to be surfaced as a dominance, aggression or trustworthiness
signal, and never mapped to a trait. The published correlations are small
(r ≈ 0.10–0.16) and contested. `fwhr().presentAs` carries that constraint next
to the number so it cannot be picked up without it.

### 11. Roll is normalised before ANY measurement is taken

`geometryReport()` calls `normaliseRoll()` first, rotating the set so the
inter-ocular axis is horizontal.

**Symptom:** results drift with head tilt; the facial fifths shear worst,
because they are taken from x ordering.
**Cause:** measuring on raw landmarks. On a head tilted 20° the fifths are
visibly wrong while every width still looks plausible, so it reads as noise
rather than as a bug.
**Pinned by:** `roll normalisation makes the measurements invariant to head
tilt`, which measures the same synthetic face upright and rotated 20° and
requires the fifths to agree to 1e-6.

### 12. The facial fifths SORT the eye corners by x — never assign them by index

Which of 33/133 is the medial corner is not hardcoded anywhere. `fifths()`
sorts the four corner landmarks by x and takes them in order.

**Symptom:** the fifths come out mirrored or interleaved on some frames.
**Cause:** hardcoding medial/lateral. It is then wrong on any mirrored frame,
and the front-camera path mirrors by default (see item 5).
**Pinned by:** `fifths are correct on a MIRRORED frame — corners are sorted,
not assumed`.

### 13. "oval" is the RESIDUAL class, not a positive finding

`classifyFaceShape()` returns `oval` with `residual: true` and an empty
`because` array when no rule matched. It does not mean the face was measured as
oval; it means nothing else fired.

**Symptom:** the commonest output silently becomes the least examined one, and
the UI presents "oval" with the same confidence as a rule-backed label.
**Cause:** treating the fallthrough as a sixth rule.
**Pinned by:** `oval is the RESIDUAL class and says so` and, on the view side,
`the residual class is labelled as residual, not as a finding`.

### 14. The delegate fallback takes its factory as an ARGUMENT

`createLandmarkerWithFallback()` receives `FaceLandmarker.createFromOptions`
rather than importing it. That is the only reason the GPU→CPU fallback can be
tested: `analysis.js` imports the MediaPipe bundle from a CDN at module scope,
so it cannot be loaded under `node --test` at all.

**Symptom:** the fallback is never executed by anything, then breaks silently,
and the first person to discover it is a user with no WebGL.
**Cause:** "simplifying" by importing the factory directly, which drags the CDN
import into the module graph and makes the file untestable.
**Pinned by:** `tests/landmarker.test.js`, which drives GPU to throw and
asserts CPU is genuinely reached, and that a double failure reports BOTH errors.

Same reasoning puts `geometry.js`, `expression.js` and `debugview.js` outside
`ui.js`: all three are pure, so they are testable with no browser and — this is
the point — **no face photo**.

### 15. Bump `CACHE` in sw.js whenever `SHELL` changes

The activate handler deletes every cache whose name is not the current `CACHE`.
Adding a file to `SHELL` without bumping the version leaves users on the old
cache, which does not contain the new module.

**Symptom:** returning users get a white screen or a module-not-found after a
release that works perfectly on a fresh install.
**Cause:** new entry in `SHELL`, unchanged `CACHE` name.

Currently `mienshiang-v6` (bumped when `reading/summary.js` and
`sharecard.js` were added).

### 16. The module boundary sits BELOW labelling, not at it

`engine.js` exposes two layers, and which one you consume decides whether the
Module A/B boundary is real:

- `rawScalars()` — neutral physical quantities (`deltaEi`, `deltaMi`,
  `deltaContrast`, `ridgeDelta`, `L`, `b`). No condition names.
- `analyse()` — the same numbers LABELLED: `condition: "erythema" | "pallor" |
  "hyperpigmentation" | "xerosis" | "deep_rhytide_*"`.

Those labels are clinical vocabulary. **Module A must consume `rawScalars()`
and must never consume `analyse()`.**

**Symptom:** clinical terms appear inside the entertainment module, and the
Play Health declaration and the TGA posture both stop being answerable, while
the file layout still looks correctly separated.
**Cause:** wiring `adapters/entertainment.js` to `analyse()` because it is the
existing entry point and returns "the same data".
**Pinned by:** `Module A output carries no clinical vocabulary, in keys OR
values` (walks the whole returned object) and `Module A does not import the
labelled path`.

`analyse()` is built on top of `rawScalars()` so there is exactly one place a
delta is computed — two passes over the same pixels would drift, and the ridge
response is the most expensive operation in the app to run twice. Neither
module owns either function; both live in `engine.js`.

### 17. The feature flag must gate EVERY door into Module B

Module B is reachable two ways: `adapters/safety.js`, and the `safety_gate`
rules inside `rules.js`. Both consult `MODULE_B_SAFETY_REFERRALS`.

**Symptom:** the About screen says "entertainment-only" and the flavour string
agrees, while the app still renders referrals.
**Cause:** gating the adapter only. `runRules()` kept emitting `safety_gate`
referrals through the legacy path, so the flag was a label with nothing behind
it. This was real, not hypothetical — it was the state of the code between the
adapter landing and the gate being added.
**Pinned by:** `the flag gates the LEGACY rule path too, not only the adapter`.

Verified by flipping the real constant, not a stub:

```
flag true  -> flavour wellness            adapterReferrals 1  legacyReferrals 1  halted true
flag false -> flavour entertainment-only  adapterReferrals 0  legacyReferrals 0  halted false
```

Note what the flag does NOT do: it removes Module B's behaviour, not its bytes.
There is no build step, so `safety.js` still ships. See the limitation section
in `flags.js` before answering anything on a store declaration.

`flags.js` is **ASCII-only on purpose** — a build script that flips the flag
through PowerShell 5.1 `Get-Content`/`Set-Content` reads non-ASCII as ANSI and
writes it back double-encoded. That corrupted the file once already. Pinned by
`flags.js stays pure ASCII`.

### 18a. A test file that cannot import a module does not cover it

`src/analysis.js` imports the MediaPipe bundle from a CDN at module scope, so
it cannot be imported under `node --test`. Every test file works by importing
what it tests, so analysis.js was covered by **nothing**.

**Symptom:** the full suite passes and the app does not start at all.
**Cause:** a hard syntax error in analysis.js — two `const raw` bindings in one
function, added when the module boundary landed. `ui.js` imports analysis.js,
so the import chain died at the entry point and the screen stayed blank. 155
tests were green while this was true.
**Pinned by:** `tests/source-integrity.test.js` → `every source file parses`,
which runs `node --check` over every file in `src/` whether or not anything can
import it. It also checks that every `sw.js` SHELL entry exists and every local
import resolves.

The general rule: coverage is what the tests can reach, and a module nothing
imports is a module nothing tests. Check the tree, not the import graph.

### 18b. Never round-trip a source file through PowerShell 5.1

`Get-Content -Raw` reads as ANSI by default and `Set-Content -Encoding utf8`
writes back UTF-8, so every non-ASCII character is double-encoded.

**Symptom:** em-dashes render as `â€"` and middle dots as `Â·` on screen.
**Cause:** a script that edits a file in place — flipping the build flag, say —
without specifying the read encoding. It has damaged two files here: `flags.js`
(caught at once) and `ui.js` (which **shipped** in the Phase 1 commit).
**Pinned by:** `no source file contains double-encoded UTF-8`, plus
`flags.js stays pure ASCII` for the file most likely to be script-edited.
Use Node (`fs.readFileSync(p, "utf8")`) for in-place edits instead.

### 18. `glowIndex` is only comparable within its `basis`

Module A's composite rescales over the components it could actually measure. In
the low-confidence regime the warmth component is **dropped, not zeroed** —
zeroing would systematically score deeper skin tones lower, which is the exact
bias the self-referencing measurement design exists to prevent.

The consequence is easy to miss: dropping a below-average component makes the
index go **up**. A face measuring 97 with warmth included reads 100 with it
dropped, and nothing about the complexion changed.

**Symptom:** a glow-over-time chart shows a step change whenever lighting moves
the subject between confidence regimes, and it reads as a real change in the
person.
**Cause:** comparing two indices computed over different component sets.
**The guard:** every result carries `basis` (the sorted component key, e.g.
`clarity+evenness+luminosity+smoothness`). Any history or trend feature must
group by it and refuse to plot across a change. Relevant the moment Phase 5
adds history.
**Pinned by:** `glowIndex is tagged with its basis, because rescaling makes
regimes incomparable`.

### 27. The adaptive ridge normaliser is safe ONLY because it is clamped

`utils/calibrationEngine.js` replaces the static `RIDGE_STRUCTURE_SCALE` with a
per-image one: `scale = 2 · (p90(structureness) / 0.06)`, pooled **across
zones**. Two guards make that legitimate rather than a re-run of item 4, and
both are load-bearing.

**Pooling across zones, never per zone.** Per-zone percentile normalisation is
item 4's defect verbatim — a region normalised by its own content lets furrows
raise their own divisor. Pooling works only because furrows are a minority of
*pooled* face-skin pixels.

**A ceiling, because pooling is not sufficient on its own.** Measured on twelve
synthetic zones, varying how many carry furrows, delta between a furrowed zone
and the plain baseline:

| furrowed zones | 1/12 | 3/12 | 6/12 | 9/12 | 12/12 |
|---|---|---|---|---|---|
| ceiling 4 | 6.90e-2 | 6.90e-2 | 6.90e-2 | 6.90e-2 | 6.91e-2 |
| uncapped | 7.45e-2 | 2.65e-3 | 2.48e-4 | 1.61e-4 | 1.09e-4 |

Uncapped, **the face with the most furrows reports the fewest** — a 680-fold
collapse. The ceiling is the only thing in front of that.

**Symptom:** wrinkle readings that fall as a face ages, or that vanish on the
most textured faces while looking perfectly plausible on smooth ones.
**Cause:** removing the clamp, raising it far, or moving the percentile back
inside a zone.
**Pinned by:** `a heavily furrowed face does not normalise its own furrows away`
and `adaptation separates furrows from grain better than a static scale`.

Two consequences that are easy to undo separately:

- `RIDGE_SCALE_MIN_ZONES = 6`. Pooling's premise is a statement about zone
  *count*; at three zones with one furrowed, a third of the pool is the signal.
  Below the floor the static constant is used. Removing this broke three
  existing tests.
- **A clamped scale reaches the confidence.** At the rail, a high-ISO capture
  and a genuinely textured face are indistinguishable — p90 rises identically
  for both — so rhytide confidence drops to `RHYTIDE_CLAMPED_CONFIDENCE`.

### 28. An adaptive parameter with a fixed reference is a constant at a rail

`calculateBlurSigma(area, referenceArea)` takes the reference as an argument,
and `rawScalars()` passes **the median zone area of that image**.

A fixed reference cannot work and fails silently. ROI areas scale with capture
resolution, so against a fixed 1000 px every zone of every real photo lands
above the ceiling: the "adaptive" sigma is constant, and constant at 2.0 rather
than the 1.2 the detector was derived at.

**Symptom:** furrows stop being detected after a change that looks like pure
parameterisation. Measured when this was wrong: the pre-blur smeared 3-pixel
furrows, the glabella reading fell ~360×, and three tests failed.
**Pinned by:** `the blur reference is image-relative, not a fixed pixel count`,
which asserts the same face at two capture resolutions blurs identically.

Because sigma now varies per zone, `ridgeDelta` compares two responses taken at
different spatial scales. Each zone carries `blurSigma` and `blurMatched` so a
consumer can refuse the comparison — same hazard as `basis` on `glowIndex`
(item 18).

### 29. Quantisation changes rescale a Haralick feature — normalise or re-derive

GLCM is now 16 levels at d=2, and `cooccurrence()` divides contrast by
`(levels-1)²`.

Raw Haralick contrast scales with the **square** of the level count, so 8 → 16
multiplies it by ~4 with nothing about the skin changing. Left raw,
`TEXTURE_CONTRAST_FULL_SCALE` would saturate immediately — silently, and in the
over-reporting direction. The constant was re-derived once for the normalised
units (0.35 raw-8-level → **0.006** normalised) and is now quantisation-independent.

**Symptom:** every zone reports dry skin after a "sensitivity improvement".
**Pinned by:** `contrast is normalised, so the level count can change without
rescaling`, which asserts 8, 16 and 32 levels agree within 2×.

Related, and the reason orientation is kept: **excess contrast that runs in one
direction is probably a furrow the ridge measurement already counted.** Xerosis
severity is attenuated by `isotropyWeight(directionality)`, floored at 0.4 —
attenuate, never erase, because a ratio of four noisy numbers must not be able
to delete a measurement. `axisDegrees` is the **argmin** of contrast (structure
varies least *along* a furrow); reporting the argmax names the perpendicular and
is wrong by exactly 90°, which reads as plausible either way.

### 30. The trim window is not what protects a localised patch

The audit finding was that a 10–90 trimmed median "discards real pathology". It
does not, and narrowing it to 20–80 does not fix anything: the median of a
**symmetric** trim is the median, because trimming removes the same count from
each side of the middle. A patch covering under half a region does not move it
either way.

The statistic that does see one is `focalExcess()` — how far the region's high
tail sits above its own centre. A uniformly ruddy region has a high median and a
small focal excess; an ordinary region with one raised area has an ordinary
median and a large one. **Two numbers separate shapes that either alone cannot.**
Carried as `focalEi`, measured only, ungraded pending labelled data.

**Symptom:** the trim window being widened or narrowed again in the belief that
it does something it does not.
**Pinned by:** `the trim window barely moves the centre, whichever width is
used` and `focal excess sees the localised patch the median cannot`.

### 31. Melanin crosstalk is asymmetric, and the term must be normalised

`crosstalkConfidence(kind, ita)` replaces the hard-coded 0.55 in the relative
regime.

Two corrections were needed before the brief's formula was evaluable, and both
are the kind that look like nitpicks and are not:

1. **The term must be normalised.** `melaninIndex()` here is `100·log₁₀(1/R_red)`
   — unbounded, routinely 20–120. `0.55 · (1 + 0.2 · 70)` is **8.25**, which is
   not a confidence. `melaninProxy(ita)` maps ITA into [0,1] instead.
2. **The sign was inverted.** Wilkes et al. (n=503) found device erythema
   readings correlated with the subject's *own* melanin at ρ up to 0.78, and
   **positively** — melanin pushes the redness reading *up*. So confidence must
   fall as melanin rises, not climb.

The asymmetry (0.2 vs 0.1) is kept exactly, and it is the point: erythema fails
toward a **false positive**, which is the direction that ends in an unwarranted
referral, so it is degraded faster. Pallor fails toward a false negative, the
safer direction, so it is degraded more slowly.

**Pinned by:** `the crosstalk term is normalised, so confidence stays a
confidence` and `melanin degrades erythema confidence faster than pallor, and
downward`.

### 32. The ridge orientation gate is a taper, not a boundary

The old gate was binary — `|Ixx| > |Iyy|`, a hard cut at 45° — so an oblique
crow's foot or nasolabial fold contributed exactly zero.

**Replacing it with a *narrower* hard cut at ±30° would be worse, not better: a
narrower hard gate discards more.** What was wanted is a plateau to 30°, a
cosine taper to zero at 60°. An oblique furrow is now attenuated in proportion,
and the response no longer steps discontinuously as a head rotates.
Perpendicular is still weighted zero, which is what keeps glabella furrows from
reading as forehead lines.

Orientation comes from `hessianOrientation()` — the **double-angle** form
`½·atan2(2·Ixy, Ixx−Iyy)`, the eigenvector angle of a symmetric 2×2. An
`atan2(dy, dx)` over two positions answers a different question. The result is
an **axis**, meaningful only mod π; `axisSeparationDegrees()` wraps accordingly,
and getting that wrap wrong is invisible in any test using angles near zero.

**Pinned by:** `the orientation gate attenuates an angled furrow instead of
discarding it`, `axis separation wraps modulo 180`, and `the Hessian axis is the
double-angle one`.

### 33. The harmony value is about the canons, not about the face

`reading/harmony.js` reports how closely measured proportions sit to what
**named historical canons** treated as ideal. That is a statement about the
canons. It is not a rating of a person, and the distinction is not a wording
trick — it changes what the number can be wrong about. *"These proportions are
0.62 of the way to the neoclassical figure"* is checkable against the arithmetic
and the cited convention; *"this face is a 62"* is a claim no measurement here
supports.

Four properties keep that true, and each is pinned:

- **No comparison between people.** No percentile, no rank, no "above average".
  There is no population in this repo to be average against.
- **Each ratio is measured against ITS OWN canon.** Only mouth-to-nose is a
  golden-section claim; the middle court is 1/3 and the central fifth is 1/5.
  Scoring all three against φ is not a stricter test, it is a false one.
- **Symmetry is dropped, not guessed, on a turned head.** A flat photo cannot
  separate genuine asymmetry from yaw. `symmetryIndex()` returns
  `reliable: false` above the `frontality()` threshold and the reading drops the
  component.
- **`basis` travels with the value**, exactly as on `glowIndex` (item 18) — and
  with the same trap: dropping a below-average component makes the composite go
  **up**. Group by `basis` before comparing two results, and never plot across a
  change.

**Symptom:** a harmony figure presented as a verdict, or two figures compared
across different component sets.
**Pinned by:** `the harmony value describes canons and never ranks a person`,
`each ratio is measured against its OWN canon, not all against phi`, `symmetry
refuses to report from a turned head`, and `a dropped component changes the
basis, and the basis travels`.

The weights (40/30/20/10) are **editorial, not measured** — no data here
supports one split over another, so they sit in one declared table rather than
inside an expression. `treat` was caught by the copy guard while writing this
file, in its ordinary English sense, exactly as item 19 warns; it is now
"regard".

### 34. The unlock gate is soft, and saying so is the feature

`shareGate.js` has three unlock states and no backend. Every one lives in
localStorage, so anyone with devtools can grant themselves any of them, and the
redeem URL can be shared by hand. **Nothing there is an entitlement; it is a
courtesy latch.**

That is not a defect awaiting a fix — it follows directly from no-account,
no-server, nothing-leaves-the-device. The only real fix is a server that
verifies a receipt, which means an account, which is what the privacy posture
exists to avoid. What follows:

- Nothing goes behind the gate that would be harmful to leak.
- **Module B is never behind it** (`MODULE_B_IS_NEVER_MONETISED`). Safety
  content is not paid content.
- Do not add obfuscation that makes it look authoritative. A latch that
  pretends to be a lock invites someone downstream to trust it.

Two failure directions were chosen deliberately: a subscription whose expiry is
missing or unparseable **fails closed**, and expiry **clears** the stored state
rather than being recomputed each read — otherwise a lapsed week reopens by
moving a clock the user controls.

**Pinned by:** `a weekly window is open inside its term and shut after it`
(asserts the exact boundary instant), `a subscription with a missing or corrupt
expiry fails CLOSED`, and `expiry clears the stored state rather than leaving it
to be re-read`.

The checkout host is allowlisted with a pattern anchored at both ends whose path
segment cannot contain `?` or `#`. A checkout URL is the one place it would feel
natural to append context, and any such value would be face-derived data handed
to a third party in a URL the app invites the user to open. The regex makes that
unrepresentable rather than merely discouraged.

### 35. The share card is the most public surface, and it drops rather than trims

`sharecard.js` has a locked and an unlocked mode. Three constraints, all pinned:

- **Locked is the default.** `buildShareModel()` returns `mode: "locked"` unless
  told otherwise, and the locked card must not contain the gated prose — if it
  did, the gate would be decorative.
- **Readings are carried WHOLE or dropped entirely.** The brief asked for "the
  first line of the narrative", which is item 24's defect exactly: every Module
  A string opens with its attribution, so cutting at a line, a sentence or a
  character count strands the opening and turns a statement about a tradition
  into a statement about the reader. A line that does not fit the canvas is left
  out. Dropping loses content; trimming changes meaning.
- **The canon value is never drawn without its label.** A bare `82/100` beside a
  face shape, on an image about to be posted publicly, reads as a rating of a
  person — which consent clause 04 promises the app does not produce. The label
  is not decoration around the figure, it is what makes the figure true.

**The padlock is vector, not an emoji.** This file loads no fonts on purpose; an
emoji is the same hazard in different clothes, because where the codepoint is
missing the card rasterises a tofu box in the middle of an image nobody can
inspect afterwards. Pinned by a test asserting no pictographic character is ever
drawn as text.

**The footer wording lives in `index.html`, not here.** "Not a clinical reading"
contains `clinical`, and `lint-bundle.js` buckets every prose string in a `.js`
file as Module A copy with no disclaimer bucket for JS. Verified in both
directions: as a literal it fails with
`[copy-blocklist] sharecard.js: "clinical" in: Entertainment only. Not a clinical reading.`,
and injected from the marked template all four guards pass. Same arrangement as
the summary caveat (item 24) — one wording, two consumers.

### 36. The dev panel expires the model that ships

`forceExpireSubscription()` moves the stored **expiry** into the past. The brief
specified winding a `subscriptionStart` back by eight days, which describes a
different model from the one in `shareGate.js`: this stores an absolute expiry,
not a start plus a duration.

The difference is the point. With a start time, "expired" is recomputed on every
read from a clock the device owns, so a lapsed week reopens the moment the
system date moves — which is why item 34 stores the expiry and clears it on
lapse. A test harness that fakes a start time would be exercising a model the
app does not have.

`console.warn` on open is deliberate and survives minification: the panel hands
out every unlock state for free, so the one thing that must not happen is it
shipping unnoticed.

**Pinned by:** `dev: force-expire lapses a live subscription and only a live
one` and `dev: the three grants are mutually exclusive, last one wins` — the
second guards a stale expiry following the state that replaced it, which would
give a lifetime unlock someone else's deadline.

### 37. A rank test is degenerate on a flat region

The sclera's specular filter was "top 5% luminance AND bottom 20% chroma AND
near a local maximum" — three rank tests. Where every pixel has the same L*,
every pixel is simultaneously in the top 5% and a local maximum, so the filter
**deleted all 524 pixels of an evenly lit synthetic sclera**. Evenly lit is the
BEST case for this measurement, not the worst.

A catchlight is defined by contrast, not by rank. The bright cut is now
`max(p95, median + SPECULAR_MIN_CONTRAST_L)`, which also fixes the opposite
failure the pure rank had: a catchlight covering less than 5% of the region sits
ABOVE the 95th percentile, so the rank cut lands on ordinary sclera and misses
the glint entirely. A peak must additionally be strictly brighter than at least
one sampled neighbour, or a flat patch is one continuous plateau of "maxima".

**Symptom:** a sclera estimate that refuses on good photographs and works on bad
ones, or a correction that silently includes the catchlight.
**Pinned by:** `a neutral sclera yields near-unity gains and enough surviving
pixels` and `the corneal catchlight is dropped, and the filter reports having
done it`.

Percentiles are taken on the GEOMETRIC set, before the luminance trim. After the
trim the catchlight's core is already gone and only its penumbra remains — which
is dimmer than the pixels the trim kept and so can never be in anybody's top 5%.
The penumbra is exactly what a trim cannot catch and exactly what this filter is
for.

### 38. A pixel count is not a darkness check

A closed eye, a deep lid shadow or a mis-placed triangle yields ~500 pixels, all
near black. Near black the three channels are equal because 8-bit quantisation
flattened them, **not** because the light is neutral — so `sampleSclera` returned
a confident 1.00/1.00/1.00 and every downstream correction became a no-op
justified by nothing.

**Symptom:** an illuminant correction that does nothing, on exactly the captures
where it was most needed, while reporting full confidence.
**Cause:** guarding on sample SIZE when the hazard is sample CONTENT.
**Pinned by:** `the refusal distinguishes 'too dark' from 'too few pixels'`,
which asserts the pixel count is HEALTHY in the dark case.

Keep the two refusal reasons apart. They point at different bugs: too dark is a
capture problem, too few pixels is a landmark problem. This is the same argument
as `zoneNotExtracted` vs `colourNotMeasurable` in item 23.

### 39. A spread is not an allow-list

`store.js` builds its record field by field precisely so nothing unexpected is
persisted — and then wrote `components: { ...r.compass.components }`. That is a
copy of a map of five numbers right up until something hangs a debug payload off
it, at which point the spread carries landmark data straight through the
allow-list the rest of the function exists to be.

**Symptom:** none. The record looks correct, the guard reads as thorough, and
the data this product promises never to hold is on the disk.
**Cause:** an explicit allow-list at the top level with a spread one level down.
**Pinned by:** `a nested payload welded onto a sub-object does not survive the
write`, and by `findForbiddenKeys` walking to arbitrary depth.

Every map persisted from that file passes through `scalarMap`, which keeps
numbers, booleans, strings and null and drops objects and arrays. A nested
structure inside one of those maps is not data the record may hold.

Related, and the reason the guard is worth having twice: `sclera.pixelCount`
matches `/pixel/i`. It is a scalar integer, it is harmless, and it is not on the
brief's persist list — so the FIELD was dropped, not the pattern loosened.
Loosening it is how the next thing called `...Pixels` gets through.

### 40. The rating lint matches identifier SEGMENTS, not substrings

`scripts/lint-bundle.js` matched `\w*rating\w*` and reported
`CALIBRATING_READINGS` as a rating-like scalar. So would `operatingMode`,
`generatingFn` and `decoratingStyle`. This is item 22's class of defect — a
scanner confidently wrong about code it misread — and it offers the same wrong
fix, which is renaming working code to satisfy a lint about English.

A term must now START a segment, where segments are split on camelCase,
underscores and `$`. Prefix rather than equality, so `rankings` still matches
`rank` and `attractivenessIndex` still matches `attractiveness`.

**Symptom:** a lint finding on an identifier that has nothing to do with rating
people, and a maintainer who renames a good name to make CI green.
**Pinned by:** `the bundle lint matches rating terms at SEGMENT boundaries, not
as substrings`, which names the four false positives explicitly and re-asserts
seven true positives.

### 41. Two doors into biometric processing, and both are gated

Consent guards the camera AND the mesh. Guarding only `getUserMedia` leaves the
landmarker reachable from a still image nobody thought about — and generating a
478-point facial mesh IS the collection, whatever the pixels came from.

The assertion THROWS rather than returning false: a boolean can be ignored by a
caller who forgot to check it.

**Symptom:** a consent gate that is genuinely enforced on the path somebody
wrote a test for, and absent on the one added afterwards.
**Pinned by:** `consent-precedes-inference.test.js`, which is behavioural AND
static. The behavioural half drives the real modules; the static half walks
every file in both trees, fails any that touches `getUserMedia`,
`FaceLandmarker`, `createFromOptions` or `detectForVideo` without an assertion,
and pins the list of touching files to exactly two — so the list growing is a
deliberate review rather than a silent one.

`ui/qise/app.js` reaches MediaPipe through a **dynamic** `import()` inside a
function, never at module scope. Item 18a is the reason: a module-scope CDN
import is why `analysis.js` cannot be loaded under `node --test` and how it
shipped a hard syntax error behind 155 green tests. It also means the CDN is not
touched until after consent exists, which is the behaviour the gate is for.

### 42. The motion gate is 6px because 2px is below human physiology

Breathing moves the head, and so does ballistocardiographic motion — the cranial
displacement driven by blood ejection from the aortic arch, which is involuntary
and continuous. Sub-2px stillness is not achievable handheld by anyone, so a 2px
gate is not a strict gate, it is a gate nobody passes.

**Symptom:** a capture flow that never fires, reported as "the app doesn't work".
**Cause:** picking a threshold from what a tripod can do.
**Pinned by:** `gate: motion — 6px, because 2px is below the floor human
physiology allows`, which also asserts that a 3px drift — ordinary stillness —
is accepted.

Stability is bought by burst capture instead: fifteen frames and a median across
them, which averages out exactly the motion this gate would otherwise forbid.

Related, same file, same class: the `distance` gate is measured on the OUTER
canthi. On the canonical mesh at nominal framing the outer span is ~35% of frame
width and the inner span ~15%, so reading a 22% threshold against the inner
canthi rejects every correctly framed capture — and presents as a user who can
never get close enough.

### 43. A gate fed a literal is a gate that can never fire

`src/qise/gates.js` shipped correct, with ten gates and paired controls for
each — and the capture loop passed it `pose: { yaw: 0, pitch: 0, roll: 0 }`. So
the pose gate reported itself passing on every frame and contributed a constant
to the ring. Correct, tested, dead: item 23's shape exactly.

**Symptom:** none from the inside. The tests pass because the gate is right;
the app "works" because nothing ever fails; the only tell is a margin that
never moves.
**Cause:** a placeholder at the call site, in a file no test can reach.
**Pinned by:** `tests/qise/pose.test.js` → `a real posed mesh drives the gate
end to end`, which rotates a synthetic mesh by known angles and requires the
gate to trip.

Two things learned building the fix, both of which look right and are not:

- **Orthonormality cannot disambiguate a matrix layout.** Reading a rotation
  matrix row-major when it is column-major yields its TRANSPOSE, and the
  transpose of an orthonormal matrix is orthonormal — so "keep whichever
  reading is orthonormal" passes for both and silently returns the first. That
  guard was written here and only a compose-then-recover test caught it. There
  is also no canonical decomposition to recover: twelve Tait-Bryan orderings
  exist and disagree by tens of degrees on a turned head.
- **An unmeasured axis is not a zero.** `Math.abs(null)` is 0, so feeding an
  unmeasured axis into the gate reports it as perfectly straight. `headPose()`
  returns `null` per axis and carries `axesMeasured`; the gate judges only what
  was measured and records which. Same distinction as `basis` on `glowIndex`
  (item 18) and `zoneNotExtracted` on the safety adapter (item 23).
- **Per-axis tests pass while a CROSS-TERM hides.** The projected inter-ocular
  angle is not the roll: under yaw *b* and pitch *a* it reads
  `c + atan(tan b · sin a)`. That bias is zero whenever either yaw or pitch is
  zero, so every single-axis test is exact and the error only exists where no
  test looked. It reaches 3.45 deg over the gate's window — enough that yaw −12
  / pitch −11 / roll −10 projected to −7.68 and cleared the 8-degree limit.
  Subtracting the cross term takes the worst error to 0.105 deg.

  The mitigation first written here was that yaw would have failed by then. It
  would not: `marginBelow(12, 12)` is **0**, and 0 passes. A margin of exactly
  zero is a PASS at the threshold — worth remembering before leaning on "the
  other gate catches it" anywhere else.

### 44. A correct flag over an incorrect buffer

`rois.js` takes a required `mirrored` flag precisely so laterality cannot
invert (item 5). The Qi Se capture loop passed it correctly — and drew the
measurement canvas with `ctx.scale(-1, 1)` under a comment about "un-mirroring"
the preview.

The preview's mirroring is a CSS `transform` on the `<video>`. **A CSS
transform does not touch the pixels `drawImage` and `detectForVideo` see**;
both already receive the un-mirrored stream. So the flip un-mirrored nothing
and instead put the pixel buffer in the opposite space from the landmarks:
every off-midline region sampled its own reflection, and `quan_l`/`quan_r`
swapped.

**Symptom:** none available to the test suite. `rois.js` was handed a correct
flag and correct landmarks and did exactly the right thing with them; the lie
was in the pixels underneath. Every laterality test passes, because they build
their own image.
**Cause:** treating a display transform as if it were a pixel transform.
**Not regression-tested** — it lives in `ui/qise/app.js`, which nothing can
import. The defence is that the file stays thin enough to read, which is the
standing reason everything else in that tree is a pure function elsewhere.

### 45. The capture flow's affordances are markup, because behaviour is untestable

`ui.js` imports `analysis.js`, which imports MediaPipe from a CDN at module
scope, so nothing about the flow can be driven under `node --test` (item 18a).
The flow therefore degrades the way item 43 describes: silently, with every
test still green, because the page renders and the buttons still work.

Four properties are pinned from `index.html` instead, by
`tests/capture-flow.test.js`:

- **`#go` precedes `#pick` in source order, and ships without `ghost`.** Once a
  photo exists, "Read this photo" is the primary action and the picker is
  demoted. Both facts are needed: `ghost` in the markup makes the promotion a
  no-op, and the wrong source order renders the promoted primary *underneath*
  the demoted secondary — where the only button that still looks primary is the
  one offering to discard the photo just chosen.
- **The step rail has three steps, exactly one starts current, and the current
  one carries `aria-current`.** Colour alone is not a state; the rail tints
  cinnabar, which is nothing to a screen reader.
- **Framing guidance lives OUTSIDE `.empty`.** It used to live inside, and
  `ui.js` replaces that node with the chosen image — so the advice was
  destroyed at exactly the moment the user could still act on it and retake.
- **The un-mirror toggle stays `checked`.** Item 5 is the whole reason: front
  cameras mirror the preview, so defaulting this off swaps the subject's left
  and right cheeks — Lung read as Liver — on the capture path most people use.

**Symptom:** a flow that works and feels broken. The tap that does the work
renders its result below the fold, so the app appears not to respond to it.
**Cause:** treating capture chrome as decoration. It is the only part of this
product most users will ever consciously operate.

Related, same file, not pinned by anything: `render()` scrolls only on the
analyse path. It is also called to redraw after an unlock and from the dev
panel, and yanking the viewport on a redraw the user did not ask for is its own
defect.

### 46. A label restored from a snapshot goes stale

The share-gate button captured `const original = shareBtn.textContent` at click
time and restored it 3.5 seconds later. On a share that counted but did not
unlock, the handler correctly relabelled the button to the new remaining count
— and the restore then overwrote that with the pre-click label.

**Symptom:** the button reads "Share with 2 friends" beside a progress line
reading "1 of 2 shared". Both are drawn by the same handler, in the same
function, 3.5 seconds apart.
**Cause:** a snapshot captured before an operation whose entire purpose is to
change the thing snapshotted.
**The fix:** `settledLabel()` recomputes from `getShareCount()`. A derived
label cannot go stale; a captured one always can.
**Not regression-tested** — same reason as item 45, and the same defence: the
handler stays short enough to read.

### 24. The summary may only repeat what was measured

`reading/summary.js` builds the receipt shown above the detailed sections. It is
the one place in the app where the format actively wants to lie: a headline
wants a single confident value, and the readings underneath are routinely
partial.

The previous summary card built its subtitle by **truncating a reading to 90
characters**, or by taking `reading.split(".")[0]`. Every Module A string opens
with its attribution — "In Mian Xiang…", "Classical Chinese face reading…" — so
cutting at a fixed offset can strand that attribution and turn a statement about
a tradition into a statement about the reader. The copy guards never saw it:
they scan the source strings, not what a view does to them afterwards.

So the summary **repeats measured values and never excerpts prose.** Its one
sentence is composed from the constructs that were read, with the attribution
built in.

**Symptom:** a confident headline the sections below do not support — an element
named for a face whose shape was refused, a glow index with no note that the
basis was short, or a reading paragraph beheaded mid-attribution.
**Cause:** treating the summary as a presentation layer over prose rather than
as a second consumer of the same measured values.
**Pinned by:** `tests/summary.test.js` — `the summary names only constructs that
were actually read`, `an unread construct gets a neutral not-read chip, never a
value`, `a partial colour basis is stated as scope, never rounded up`, and `the
summary never excerpts a reading paragraph`.

Related, and easy to undo by accident: **the summary's always-visible caveat
lives in `index.html`, not in a module.** The wording is "Entertainment, not
diagnosis. Everything here describes a tradition, not you." — and `diagnosis` is
on the Module A blocklist. `scripts/lint-bundle.js` buckets *every* prose string
in a `.js` file as Module A copy and has no disclaimer bucket for JS, so the
sentence can only exist inside the marked block in the HTML. `ui.js` reads that
template and passes it to `renderSummary()` and to the share card, so there is
one copy of the wording and two consumers. Move it into a module and
`npm run lint:bundle` fails — which is the intended alarm, not an obstacle.

### 25. Caveats may collapse, but collapsing is not deleting

The four "Sources differ" notices are now `<details>` disclosures, and exactly
**one — whichever renders first — is open by default**. Four identical open
boxes read as boilerplate and stop being read at all, which costs the honesty
they exist to buy; four *closed* boxes would hide it. One open is the point.

The text is unchanged and stays in the document whether open or shut, so search
and screen readers still reach it. The global "what this photo could and
couldn't measure" panel stays **default-visible** and is not a disclosure.

**Symptom:** a reading that looks more settled than the sources are.
**Pinned by:** `exactly one 'sources differ' notice starts open, and none are
dropped`, which asserts four render and one is open.

### 26. Share excludes the photo by default, and never dead-ends

`sharecard.js` draws the receipt to a canvas on the device. Two constraints:

- **`includePhoto` defaults to false.** "No photo leaves your device" survives
  right up until the user posts an image with their face in it. Defaulting to
  include would convert a privacy guarantee into a privacy hazard at the moment
  the user is least likely to be thinking about it. The toggle is opt-in and
  says what posting the image does.
- **`chooseDelivery()` takes the navigator as an argument**, for the same reason
  `createLandmarkerWithFallback()` takes its factory: the fallback is the path
  that matters (Firefox has no `share`, iOS and desktop Safari refuse files, and
  some in-app browsers *throw* from `canShare` rather than returning false), and
  a fallback nothing can execute is a fallback nobody has run. It returns
  `"share"` or `"download"` and nothing else.

The card draws with the system font stack and vector shapes only — no webfont,
no image asset — so there is nothing to preload and nothing new in the precache
beyond the two modules. A canvas drawn before a webfont resolves rasterises
blank boxes; the repo removed its webfont on purpose (see the top of
`index.html`), which is what makes that whole class of bug unreachable here.

**Pinned by:** `share falls back to download rather than dead-ending` (four
platform shapes, including the throwing one) and `the share card carries the
caveat and only measured values`.

### 23. An ROI's landmarks must enclose AREA, or the zone is silently deleted

`nose_bridge` was defined as `[6, 197, 195, 5, 168]` — five points on the
vertical midline of the nose. A convex hull of collinear points has no width,
`pad` expands about the centroid so a sliver stays a sliver, and
`extractRegions()` drops anything under `MIN_ROI_PX` (8px) per side. The zone
was therefore **dropped on every real face**: 4.2px wide on a 768×1024 working
canvas, and *exactly 0px* on MediaPipe's bilaterally symmetric canonical mesh.

That deleted the Module B malar gate, which reads `nose_bridge`.
`evaluateSafety()` got `undefined?.deltaEi`, returned
`{assessable: false, reason: "colourNotMeasurable"}`, and never evaluated the
pattern. The legacy `safety_gate` rule in `rules-b.js` needs a `nose_bridge`
erythema observation, so the second door into Module B was dead too — meaning
item 17's "the flag gates both doors" was, for a time, passing **vacuously**:
both doors were gated and both were already bricked up.

**Symptom:** the safety gate never fires, for anyone, and the app looks like it
is honestly declining to measure. `complexion.zonesRead` is 11 where `ROIS` has
12 — the only visible tell, and nothing asserted on it.
**Cause:** an ROI landmark set that is collinear (or near enough) along one
axis. Midline zones are where this lurks, because their anatomical landmarks
genuinely do run down the centre.
**Why it survived 199 tests:** every fixture supplied `nose_bridge` by hand —
`tests/adapters.test.js:57`, `tests/rules.test.js:117`, `tests/engine.test.js:186`.
Nothing built a region set from `ROIS` + landmarks, so the geometry that killed
the zone was never executed. Coverage is what the tests can reach (item 18a).
**Pinned by:** `tests/roi-extraction.test.js` — `EVERY zone in ROIS survives
extraction on the canonical face` and `no ROI is degenerate`, which assert
against MediaPipe's published `canonical_face_model.obj` (committed as
`tests/fixtures/canonical-face.js`; a reference mesh, never a real subject's —
a 478-point mesh of a real face is a biometric template and does not belong in
this repo). `Module B can REACH a decision when the zones it needs are
extractable` is the one that would have caught the dead gate.

Two structural changes exist to stop the next one being silent:

- `src/roi.js` holds the hull and the drop decision, **pure and DOM-free**, for
  the reason `geometry.js` is outside `ui.js` — `analysis.js` imports MediaPipe
  from a CDN at module scope and cannot be loaded under `node --test`. Anything
  left inside it is untestable by construction.
- `extractRegions()` returns `{regions, dropped}` and `runAnalysis` surfaces
  `droppedRegions`. A dropped zone is now reported with a reason
  (`no_hull` / `too_small`) rather than skipped by a bare `continue`.
- `adapters/safety.js` distinguishes `zoneNotExtracted` (a bug) from
  `colourNotMeasurable` (the honest deep-skin refusal). Collapsing those two is
  what made a dead gate indistinguishable from a working one. **Do not merge
  them back.** The deep-skin refusal itself is correct and must not be weakened.

**If a zone goes missing, fix its landmarks — never lower `MIN_ROI_PX`.** Below
8px there are too few pixels for the colorimetry to mean anything, so relaxing
the floor buys a zone whose measurements are noise.

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
  facts but nothing emits them. The geometry it would need now exists
  (`geometry.js`: thirds, fifths, the three widths, face shape with a traceable
  reason) — what is missing is the interpretation layer on top, which is
  deliberately not in `geometry.js`. Keep it that way: the measurement must stay
  checkable independently of the reading laid over it.
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
a line looks redundant but is load-bearing (see the eight items above).

---

## Verification Protocol

This repo has twice shipped something that looked correct and was not: a test
runner reporting 0 tests with exit code 0, and a server returning 403 to every
request while its traversal test "passed". Both were green. Follow this.

### 0. Declare the environment first, before any other work

State host OS, shell, and whether commands run on the user's machine or in a
separate sandbox. **If they differ, every verification is invalid until re-run
on the target.** Say so and stop treating sandbox results as evidence.
Cross-platform defects are invisible to a single-platform check, and a
single-platform check that looks green is worse than no check.

### 1. No unverified success claims

A claim of success must quote the output that proves it. Not "tests pass" —
`tests 44 / pass 44 / fail 0`. Not "traversal is blocked" — the status code next
to the byte count of what came back.

"Verified", "confirmed", "working", "all green", "should work", "N passing" are
banned unless immediately followed by pasted evidence. If output was not
observed **this session**, the correct phrasing is *"not verified — here is what
would need to be run."*

### 2. Exit code 0 is not a pass

Assert on counts and content, never on exit status alone.

- A test run reporting 0 tests is a hard failure. Check the count every time.
- A build producing 0 artifacts is a failure.
- An empty grep/glob means *the pattern is wrong*, not *the code is clean*.

If a runner can succeed while doing nothing, add a floor check that fails on
zero. `scripts/run-tests.js` is that floor check — see item 7.

### 3. Negative controls require a paired positive control

Never report that a guard blocks bad input without proving good input gets
through **in the same run**. "Traversal returns 404" is meaningless if every
route returns 404 — that is precisely the bug that shipped. Report both halves
or neither.

Test guards with a client that cannot pre-normalise the input: raw sockets, or
`curl --path-as-is`. PowerShell and most HTTP libraries silently rewrite URLs
and will hide the bug you are looking for.

### 4. Test the artifact you ship, not the tree you built in

Before calling any package complete: extract it to a fresh directory outside the
working tree, run the documented commands verbatim from the README, hit the
running app and confirm real content comes back, then diff the extracted file
list against what the docs claim. Directory structure, path separators and file
inclusion do not survive packaging by default — this repo already lost its
entire `src/ tests/ scripts/` layout once in a zip.

### 5. Every referenced file must be proven to exist

Check both directions: for every path referenced in code (precache lists,
imports, `<link>`, config, dataset paths in docs) confirm the file is there; and
for every file present, confirm something references it. Report missing ones
explicitly rather than assuming they were lost in transit. `sw.js` precaching
three nonexistent icons is what silently killed offline support.

### 6. No swallowed errors

`.catch(() => {})`, bare `except: pass` and `|| true` are forbidden in new code
and must be flagged when found. At minimum, log. An empty catch on the service
worker registration is what hid a total install failure.

Atomic batch operations (`cache.addAll`, `Promise.all`, bulk inserts) fail
entirely on one bad element. Where partial success is acceptable use the
per-item form (`allSettled`) and report what failed.

### 7. Report blockers immediately; do not explore around them

Credits are finite. When something is ambiguous, missing, or needs a judgement
call that is properly the user's — branding, copy, data, product scope — stop
and ask in one short message. Do not generate placeholders, try three
approaches, or investigate adjacent code speculatively. Prefer one targeted
command to three exploratory ones; if a command's output will not change what
you do next, do not run it.

### 8. Definition of done — state each line before claiming completion

```
[ ] Host OS/shell stated; sandbox-vs-target divergence resolved
[ ] Test count > 0 and quoted verbatim
[ ] Positive + negative controls both run, both quoted
[ ] Shipped artifact extracted to a clean dir and run from README commands
[ ] Every referenced file confirmed present (both directions)
[ ] No new swallowed errors; existing ones flagged
[ ] Anything unverified listed under "NOT VERIFIED" with the exact command
```

Any unchecked box must appear in the final message. A completion report with no
"NOT VERIFIED" section is only credible if every box is genuinely ticked.

### 9. Close the loop on the docs

When a cross-cutting defect is found, add it above in the "will silently break
if you clean it up" format: symptom, cause, and the test that pins it.
**A constraint without a failing test to protect it will be tidied away.**

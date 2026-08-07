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
npm test         # 217 tests, node:test, no dependencies
npm run build    # dist/ — copy of src/, Module B stubbed in the entertainment flavour
npm run lint:bundle   # compliance guards, run against dist/ not src/
```

There is a build step now, and still no npm dependencies. It was added in
Phase 3 because the compliance guards must run on the ARTEFACT — a term in a
file that never ships is not a finding — and because the entertainment flavour
needs Module B genuinely absent from the bundle, not merely unreachable, before
its Google Play Health declaration is true. `scripts/build.js` performs no
transform: `dist/` is a copy of `src/` with three Module B files replaced by
stubs when the flag is off.

`package-lock.json` exists only so `npm ci` works in CI; it locks nothing.

217 across fifteen files. If you see 44, the traversal suite is not being
discovered.

**All 217 pass.** The long-standing `copy-guard` failure on
`TCM-202-DAMP-HEAT.recommend[1]` is resolved — that line moved to Module B in
the Phase 2 split (see item 19). If a test fails, it is a real defect.

## Architecture

```
src/
  index.html    UI + all styles (single file, no framework)
  ui.js         screen wiring, overlay rendering, consent gate
  analysis.js   MediaPipe landmarking, ROI hull masking, orchestration
  flags.js      build flavour: does Module B ship? (ASCII-only, see item 17)
  zones.js      ROI geometry — measurement config, owned by neither module
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
    science.js        "What the science says" content
  readingview.js  renders Module A, + Module B under its own disclaimer
  sharecard.js    on-device canvas share image; photo EXCLUDED by default
  scienceview.js  the science screen
  landmarker.js GPU→CPU delegate fallback (factory INJECTED, so it is testable)
  geometry.js   facial proportions + face-shape classifier  ← pure, no DOM
  expression.js blendshapes → expression/asymmetry STATE (never traits)
  debugview.js  renders the geometry trace  ← pure, no DOM
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

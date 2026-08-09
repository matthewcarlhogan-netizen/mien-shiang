# QISE_NOTES

Working notes for the Qi Se (氣色) longitudinal tracker. The brief asked that
every point of disagreement be recorded here rather than silently substituted,
and that the device-testing results live here too. Both sections follow.

---

## 0. Environment declaration

Stated first because everything below depends on it.

| | |
|---|---|
| Host OS | Linux (`6.18.5-fc-v20`, x86_64) |
| Shell | POSIX `sh`/`bash` |
| Node | v22.22.2, npm 10.9.7 |
| Where commands ran | An ephemeral cloud sandbox, **not** the user's machine |

**The brief names a Windows dev machine. This is not one.** Every result below
was produced on Linux, and the three defects this repository has shipped that
were invisible on Linux — the quoted test glob, the `.pathname` ROOT, and the
PowerShell encoding round-trip — are exactly the class a single-platform run
cannot see. The CI matrix (ubuntu/windows/macos × Node 20/22/24) is what covers
that gap; nothing here has been observed on Windows.

There is no phone attached to this sandbox and no camera. Everything requiring
either is listed under §4 as NOT VERIFIED.

---

## 1. Where this implementation disagrees with the brief

Implemented as specified in every case unless the entry says otherwise.

### 1.1 Git protocol — branch name

The brief says `git checkout -b feat/qi-se-tracker`. The session's own
instructions mandate `claude/new-session-su5jz7` and say never to push
elsewhere. The session instruction wins. Conventional commits, one logical unit
per phase, no history rewriting — all as specified.

### 1.2 The passage corpus is composed, not flat

The brief asks for templates keyed on `(ascendant, magnitudeBand, ming/run
direction)` with ≥5 variants per cell. Written flat that is 6 × 3 × 5 = 90 cells
and 450 passages of 40–70 words. The honest consequence of writing 450 of
anything is that most are the same paragraph with two adjectives moved.

A passage is instead assembled from three keyed parts — the colour's reading,
the strength of its showing, and the course of 明/潤. Selection is still keyed on
the full triple, and **every cell realises 125 distinct passages** rather than
the five asked for. All 12,000 realisations are checked exhaustively for length,
attribution and vocabulary rather than sampled.

### 1.3 `huang` is the centre of the seal, not a fifth spoke

The brief says "five colour axes". The classical compass has four directions and
a centre: qing east, chi south, bai west, hei north — and **huang at the centre,
which has no direction at all**. Drawing it as a spoke would point it somewhere
the tradition does not. It renders as a ring about the middle whose radius grows
with its score. Five colours, five axes, the fifth where the texts put it. South
is at the top, per the Chinese cartographic convention.

### 1.4 The no-network lint scans `src/ui/qise/**` as well

The brief scopes rule 1 to `src/qise/**`. But an analytics beacon gets added next
to a button handler, not next to a colour-space conversion, so a guard that
exempts the view layer is aimed away from the risk. Both trees are scanned, and
the one legitimate remote dependency (MediaPipe's two hosts, already on the
repo's egress allowlist) is asserted by allow-list rather than by exemption.

### 1.5 The distance gate is measured on the OUTER canthi

The brief says "interocular ≥ 22% frame width" without saying which span. On
MediaPipe's canonical mesh at nominal framing the outer-canthi span is ~35% of
frame width and the inner-canthi span ~15%. Read against the inner canthi, a 22%
threshold **rejects every correctly framed capture**, and presents as a user who
can never get close enough. Outer canthi (landmarks 33 and 263) it is.

### 1.6 `melaninIndexProxy` was derived from the brief's own fixture table

The brief gives an "MI proxy" column but not its formula. Solving against the
four fixture rows gives `100·log₁₀(100/L*)`, which reproduces all four to
4.9e-5. That is also the same functional form as the repo's existing
`melaninIndex`, so it is very likely what was intended.

### 1.7 Margin semantics were defined here

The brief says "return the margin per gate" and that the ring is driven by the
worst one, but not what a margin is. Defined as a **normalised** signed
quantity: 0 exactly on the threshold, positive passing, clamped to [-1, 1].
Without normalisation "worst margin" is meaningless — one gate counts degrees,
another pixels, another a variance.

Related: a gate whose input is missing reports a **failure**, not a pass.

### 1.8 Overall `frameJitter` is the median across regions

The brief says to store per-ROI IQR as `frameJitter` and that reading confidence
uses "inverse frameJitter", which needs one number. Median, not maximum: ROI
validity already handles a region that has genuinely gone bad, and firing both on
the same event double-counts it.

### 1.9 `sclera.pixelCount` is not persisted

It matches `/pixel/i` and trips the Phase 7 guard on its first run. It is a
scalar integer and harmless in itself, and it is **not on the brief's persist
list**. The field is dropped rather than the pattern loosened — loosening it is
how the next thing called `...Pixels` gets through.

### 1.10 `han` and `xue` have no user-facing label

Both are measured and stored. Neither is reported by the pattern engine, because
neither has a name that is both accurate and safe: `xue`'s classical name refers
to something this product must never claim to observe, and an invented English
label would imply the measurement means more than it does. `ming` and `run` are
the reportable pair, which is what the brief's own example sentence uses.

### 1.11 Additions the brief did not ask for, all of them floors

- **Median-L\* floor on the sclera estimate.** A pixel count alone is not a
  sufficient guard — see §3.2.
- **MAD floors** on the sclera channels and on every compass axis. Without them
  a flat history gives MAD = 0 and every subsequent reading is infinitely
  remarkable, which is the exact failure `ping` exists to prevent.
- **`RHYTIDE`-style contrast floor on the specular filter** — see §3.1.
- **`scalarMap` in the store**, after the Phase 7 guard found a real hole — §3.3.

### 1.12 Typography: the families are declared, the fonts are not shipped

**This is an outstanding gap, not a design decision.** See §5.

---

## 2. What was verified, and how

All figures below were observed in this session on the host in §0.

### Test suite

```
Running 28 test file(s)
# tests 551
# pass 551
# fail 0
```

Baseline before this work was `# tests 312 / # pass 312 / # fail 0`.

### Colour maths (Gate 1)

- All four brief fixture rows reproduce end to end, worst deviation **4.88e-5**
  against a 1e-3 tolerance.
- ΔE00 against the 34 published Sharma–Wu–Dalal pairs, fetched from the authors'
  page and committed as `tests/qise/fixtures/ciede2000-sharma.js`: worst
  deviation **4.95e-5** against values published to 4 dp, i.e. exact agreement.
- Transfer function round-trip over all 256 values: worst error **2.84e-14**.
- Von Kries recovery reproduces every figure in the brief exactly:
  warm Lab (67.8598, 21.4994, 23.1188); uncorrected ΔE76 **11.3950**; recovered
  gains (0.831849, 0.981582, 1.283541); like-for-like residual ΔE76 **0.3408**.

  This settles an ambiguity in the brief: *like-for-like* means **both sides
  normalised by their own sclera**. Comparing a corrected sample against an
  uncorrected reference measures the grey-world shift as well as the illuminant
  and reports **0.8883**, about 2.6× too large.

### Region geometry (Gate 2)

Every one of the eight regions encloses area on MediaPipe's canonical mesh; none
is dropped. Bounding boxes at a 768×1024 working canvas:

| region | box | | region | box |
|---|---|---|---|---|
| tian | 364×73 | | quan_l | 158×33 |
| yintang | 84×67 | | quan_r | 158×33 |
| shangen | **28×61** | | dige | 210×37 |
| zhuntou | 92×43 | | periorbital | 68×14 + 68×14 |

`shangen` is the CLAUDE.md item 23 trap — a midline structure whose anatomical
landmarks genuinely do run down the centre. It uses the sidewall-spanning set.

Sclera sampling on the canonical mesh yields 524 geometric pixels across the four
triangles, comfortably over the 150 floor after filtering.

### Bake-off script (Gate 5b)

`node scripts/qise-bakeoff.mjs --self-test` produces a decision table and exits
0. **The self-test decision is not the architectural decision** — see §4.2.

### The app in a real browser

Served locally and driven with Chromium via Playwright:

- `/qise.html` → HTTP 200, `<title>Qi Se tracker</title>`.
- All 17 modules in the graph → HTTP 200 (16 feature modules plus `src/roi.js`).
- Negative control: `/definitely-not-here.txt` → **404**, so the server is not
  returning 200 to everything.
- **No page errors, no failed requests.** This matters specifically: a missing
  named export is a link-time failure that takes out the whole module graph with
  nothing wrong in any single file (CLAUDE.md item 18a).
- The palette injects — 708 characters into `#qise-palette`, and `--chi` resolves
  to `#B0392A` in computed style.
- Consent gate renders and is the active screen; first Tab stop is the grant
  button, with a visible focus ring.
- **Horizontal overflow at a 360px viewport: 0px**, on both the consent screen
  and the reading screen.
- Reading screen drawn from a seeded 30-day history: seal SVG present, verdict
  "A clear showing of hei — dark varnish.", passage 59 words, both gauges
  measured with IQR bands, courts strip 2/2, 3/4, 1/1, 30-row history column
  with 1 hollow row.

One 404 appears intermittently in the browser console: `/favicon.ico`, which no
page in this repository declares and which the browser requests on its own. It
predates this work and affects `index.html` identically.

### Bundle lint, both flavours

```
Bundle lint — flavour: wellness, 57 files scanned
  660 user-facing strings extracted
  copy blocklist    ok      attractiveness    ok
  egress allowlist  ok      biometric egress  ok

Bundle lint — flavour: entertainment-only, 57 files scanned
  650 user-facing strings extracted     [all four guards ok]
```

---

## 3. Defects found while building this, and what they cost

Each of these produced confident wrong output and was caught by a test rather
than by reading the code.

### 3.1 A rank-based specular filter deletes an evenly lit sclera

"Top 5% luminance AND bottom 20% chroma AND near a local maximum" is three rank
tests, and rank is **degenerate on a flat region**: where every pixel has the
same L\*, every pixel is simultaneously in the top 5% and a local maximum. It
removed **all 524 pixels** of an evenly lit synthetic sclera — the best case for
this measurement, not the worst.

The bright cut is now `max(p95, median + 2 L*)`, which also fixes the opposite
failure: a catchlight smaller than 5% of the region sits *above* the 95th
percentile, so a pure rank cut lands on ordinary sclera and misses the glint
entirely. A peak must also be strictly brighter than at least one neighbour, so
a flat patch is not one continuous plateau of maxima.

### 3.2 A pixel-count guard is not a darkness guard

A closed eye yields ~500 pixels, all near black. Near black the three channels
are equal because 8-bit quantisation flattened them, **not** because the light is
neutral — so the estimate came back as a confident 1.00/1.00/1.00 and every
downstream correction became a no-op justified by nothing. There is now a
median-L\* floor, and the refusal names which of the two conditions it hit
(`too_dark` vs `too_few_pixels`); they point at different bugs.

### 3.3 A spread is not an allow-list

`toRecord` built an explicit record and then wrote `components: {...r.compass.components}`.
That looked like a copy of a map of five numbers, and it is — right up until
something hangs a debug payload off it, at which point the spread carries
landmark data straight through the allow-list the rest of the function is built
on. The Phase 7 guard caught it three levels down. Every map persisted from that
file now passes through `scalarMap`, which keeps scalars and drops objects.

### 3.4 The rating lint matched English inside unrelated identifiers

`scripts/lint-bundle.js` matched `\w*rating\w*`, a substring test, and reported
`CALIBRATING_READINGS` as a rating-like scalar. So would `operatingMode`,
`generatingFn`, `decoratingStyle`. Same class as CLAUDE.md item 22, and the same
wrong fix was available — renaming working code to satisfy a lint about English.
The guard now requires a term to **start an identifier segment** (camelCase,
snake_case or SCREAMING_CASE), as a prefix rather than an equality so `rankings`
still matches `rank`. Pinned by a regression test naming the false positives.

### 3.5 `treat`, in its ordinary English sense

"the classical texts **treat** that pair as one observation" tripped the Module A
blocklist, exactly as CLAUDE.md items 19 and 33 warn. Five occurrences across the
passage corpus, all now "regard".

---

## 4. NOT VERIFIED

Everything in this section needs hardware this sandbox does not have. Each entry
gives the exact command or protocol.

### 4.1 Gate 4 — real Android device

**Not run.** `captureMode` and `frameJitter` cannot be recorded without a phone.

To close it: serve over HTTPS (a TWA and `getUserMedia` both require it —
`localhost` counts for desktop but not for the phone), open `/qise.html` in
Chrome on Android, complete a reading, and record here:

- the `captureMode` achieved (`locked` / `partial` / `auto`) and which of
  `whiteBalanceMode` / `exposureMode` actually stuck per `getSettings()`;
- the per-ROI `frameJitter` and the overall median across a burst of 15.

Assume `auto` is the common case. Every downstream metric is valid without
locking; locking is an improvement, never a precondition.

### 4.2 Gate 5b — the bake-off, on real data

**The script runs; the decision has not been made.** The self-test uses a
synthetic **diagonal** illuminant model, which assumes away the local-tone-mapping
effect the real bake-off exists to measure. Its output exercises the script and
nothing else:

```
| metric    | pipeline  | within-setting SD (mean) | between-setting spread |
| hueVector | raw       |                   0.0903 |                 1.1409 |
| hueVector | corrected |                   0.1099 |                 0.0968 |
| run       | raw       |                   0.0812 |                 0.6962 |
| run       | corrected |                   0.0788 |                 0.0471 |
DECISION: ship the CORRECTED pipeline.   [SELF-TEST ONLY — NOT THE DECISION]
```

To close it: 5 readings in each of 4 lighting settings (daylight window, warm
indoor lamp, cool LED, mixed) inside a 30-minute window, export via
`store.exportAll()`, tag each reading with its `lightingSetting`, then

```
node scripts/qise-bakeoff.mjs readings.json
```

Ship whichever pipeline has the lower between-setting spread on `hueVector` **and**
`run`. If corrected wins by less than 25%, ship raw. Record the real table here,
replacing the block above.

**Phases 6–9 must not be built against a pipeline that has not won this.** They
are built against `corrected` today only because both are stored and switching is
a one-line change; nothing downstream assumes it.

### 4.3 Real-world gate rejection rate

**Not measured.** Needs ≥20 genuine attempts across ≥4 lighting settings.
Record the overall rate, and the rate **stratified by the user's own baseline ITA
band**.

Two stop conditions, both product decisions rather than thresholds to loosen:

- Overall rejection > 40% → the daily-ritual framing does not hold and the
  feature needs repositioning as weekly.
- **Rejection materially higher in darker ITA bands → blocking fairness defect.**
  Fix the ROI/landmark handling. Do not ship. This is why `melaninIndexProxy`
  and `ita` exist at all, and why they are never rendered.

### 4.4 Windows and macOS

Not run here. CI covers all three platforms × Node 20/22/24.

### 4.5 Anything involving a camera

`getUserMedia`, the MediaPipe landmarker, the un-mirror path and the burst on
real frames are all unexercised. The *fallbacks* around them are tested against
injected fakes — the browser that strips a constraint, the browser that throws,
the browser that supports neither — but no real camera has run this code.

---

## 5. Outstanding: the fonts

The brief specifies **Bricolage Grotesque** (display), **EB Garamond**
(passages), **IBM Plex Mono** (numerics) and **Noto Serif SC** (CJK), self-hosted
as subset woff2 and preloaded.

The families are declared in `src/ui/qise/palette.js` and one edit switches them
on. **No `@font-face` rule is emitted and no woff2 file is committed**, because
emitting one for files that do not exist is worse than the gap: four 404s on
every load, four missing entries in the service-worker precache, and
`tests/source-integrity` asserting against files nobody can produce from this
repository.

Google Fonts is not the fallback. It is a third-party request on every load for a
product whose whole claim is that nothing leaves the device, the webfont import
was removed from `index.html` for that reason, and the egress guard treats
`fonts.googleapis.com` as a failure rather than an exception.

What is needed: the four families' licences checked, the glyph sets subset, the
woff2 files committed under `src/ui/qise/fonts/`, `@font-face` and `<link
rel="preload">` added, and the files added to the SHELL in `sw.js` with a `CACHE`
bump.

---

## 6. Definition of done

```
[x] Host OS/shell stated; sandbox-vs-target divergence resolved  (§0 — divergence
      STATED, not resolved: Windows is covered only by CI)
[x] Test count > 0 and quoted verbatim                            (551 / 551 / 0)
[x] Positive + negative controls both run, both quoted            (§2)
[x] Shipped artefact built and linted, both flavours              (§2)
[x] Every referenced file confirmed present (both directions)     (source-integrity
      + the 17-module browser load in §2)
[x] No new swallowed errors                                       (every catch logs)
[ ] Gate 4 — real Android device                                  (§4.1)
[ ] Gate 5b — bake-off on real data, and the pipeline decision    (§4.2)
[ ] Real-world gate rejection rate, stratified by ITA band        (§4.3)
[ ] Fonts subset, committed and precached                         (§5)
[ ] Windows / macOS observed                                      (§4.4 — CI only)
```

Five boxes unchecked. Four need a phone; one needs font binaries and a licence
review. None is blocked on code.

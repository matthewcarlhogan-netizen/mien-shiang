# AUDIT.md — Phase 0 repo audit

Inventory of the repository as it actually is, against the target product
(on-device Mian Xiang reading PWA, entertainment-positioned, Module A/B split).

**No feature work was done in this phase.** Nothing in `src/` was modified.

Every claim below is filed under exactly one of three headings:

- **Verified** — a command was run *this session* on the target machine and the
  output was observed. Output is quoted.
- **Reported but unverified** — documented in the repo or asserted in a code
  comment, but not exercised this session.
- **Unknown / gap** — required by the target product and absent, or present but
  unmeasured.

---

## 0. Environment (Verification Protocol §0)

| | |
|---|---|
| Host OS | Microsoft Windows 11 Pro, 10.0.26200 |
| Shell | PowerShell 5.1.26100.8972 (plus Git Bash for POSIX scripts) |
| Node | v24.19.0 |
| npm | 11.17.0 |
| Repo | `C:\Users\DELL\.claude\New folder\mien-shiang` |
| Sandbox divergence | **None.** Commands ran on the user's own machine. |

The desktop verifications below are therefore valid for this machine. They are
**not** evidence for Android or iOS behaviour — no mobile device was touched
this session, and nothing here should be read as a mobile result.

---

## 1. VERIFIED

### 1.1 Test suite — 57 tests, 56 pass, 1 fail

`npm test` output, verbatim:

```
ℹ tests 57
ℹ suites 0
ℹ pass 56
ℹ fail 1
```

Discovery floor check fired correctly (`Running 4 test file(s):`), so this is a
real run, not the 0-tests-exit-0 failure mode described in CLAUDE.md item 7.

**The single failure, with its cause:**

```
✖ no rule payload names a disease, on any path (tests/copy-guard.test.js:37)
  AssertionError: user-facing rule copy names a disease
    TCM-202-DAMP-HEAT .1 contains "anaemia"
    TCM-202-DAMP-HEAT .1 contains "thyroid"
```

Cause: `src/rules.js:183`, `TCM-202-DAMP-HEAT.recommend[1]` reads *"If fatigue
is the dominant symptom rather than the skin, get bloods done — anaemia and
thyroid problems present this way and this tool can't see them."*

This is the **known, documented** failure — CLAUDE.md §9 states it explicitly
and says the copy is unfixed pending a wording decision. It is not a regression
introduced here. Under the new product definition this string is health-adjacent
content sitting in what will become Module A, so it is resolved by the Module
A/B split rather than by a wording tweak alone. Deferred to Phase 2/3.

**Doc drift found:** CLAUDE.md and README.md both say "56 tests". The true total
is now **57** (56 + the copy-guard test added in commit `d9de32b`). CLAUDE.md's
arithmetic note "56 = 44 science/rules + 12 server traversal" is stale.

### 1.2 PWA manifest — complete

Fetched live from the running dev server:

```
manifestStatus       : 200
manifestContentType  : application/manifest+json
manifestMissing      : []          (checked: name, short_name, start_url,
                                    display, icons, background_color, theme_color)
manifestIcons        : ["192x192 any", "512x512 any", "512x512 maskable"]
```

All Phase 4 required fields are present and the content-type is correct.

**Two defects found:**

1. **`theme_color` mismatch.** `manifest.webmanifest` declares `#1f2933`;
   `index.html`'s `<meta name="theme-color">` declares `#14181D`. Verified:
   `MATCH: false`. Android uses these in different places (task switcher vs.
   status bar), so this shows as a visible seam.
2. **`description` does not describe the product.** It currently reads
   *"Offline skin-tone and surface observation tool."* CLAUDE.md notes that
   intended purpose is evidenced by documentation and marketing, not only code —
   so this string is load-bearing, not cosmetic.

### 1.3 Icon set — real, correctly sized, placeholder art

PNG headers parsed directly from the files:

```
icon-192.png           192x192   13543 bytes
icon-512-maskable.png  512x512   30149 bytes
icon-512.png           512x512   37002 bytes
```

Dimensions match their declared `sizes`. Per CLAUDE.md these are **placeholder
art, not branding** — that remains true and blocks any public listing.

### 1.4 Service worker — one registration, correct scope, 10/10 shell entries

```
registrationCount : 1
scopes            : ["http://localhost:5173/"]
active            : true
cacheNames        : ["mienshiang-v1"]
```

Precache list ↔ disk checked **in both directions** (Protocol §5):

- All 10 `SHELL` entries in `sw.js` resolve to files that exist — no repeat of
  the "three nonexistent icons" defect.
- No orphans: every file in `src/` is referenced by something.

### 1.5 Offline cold start — the app shell works; **the analysis path does not**

The dev server was stopped, then probed with a **paired positive and negative
control in the same run** (Protocol §3), because "everything returns 404" and
"offline works" look identical from a single check.

```
uncachedOriginProbe : server is DOWN (network error): Failed to fetch   ← negative control
cachedAssetViaSW    : HTTP 200, 14366 bytes                            ← positive control
```

The negative control uses an *uncached* same-origin URL, so the service worker
has no hit and must fall through to the network. It threw — the origin is
genuinely down. In the same run a cached asset still resolved.

An earlier attempt at this control used `fetch(..., {cache:'no-store'})` and
returned `200`. That was **invalid** — `no-store` does not bypass a service
worker, so the SW answered from cache and the probe proved nothing. Recorded
here because it is exactly the class of false-green this repo has shipped twice.

With the origin down, the page reloaded and rendered, and `ui.js` executed
(`consentDialogOpen: true` — the ES module chain loaded from cache).

**The gap.** The MediaPipe WASM runtime and the 3.76 MB `.task` model are **not
precached**:

```
cache:MODEL.task      : NOT CACHED
cache:wasm runtime    : NOT CACHED
anyWasmOrTaskCached   : []
```

`sw.js` caches them stale-while-revalidate on first *successful fetch*, but
`getLandmarker()` only fetches them when the user presses "Read this photo".
So a user who installs the app, goes offline, and takes their first photo gets a
shell that renders and an analysis that fails. Phase 4's exit criterion —
"completes a reading offline after first load" — is **not met today**, and this
would not have been caught by checking that the shell renders.

### 1.6 MediaPipe integration — partially aligned with Phase 1

Read from `src/analysis.js:29-39`:

| Phase 1 requirement | Current state |
|---|---|
| `@mediapipe/tasks-vision` FaceLandmarker | ✅ v0.10.18, via `FilesetResolver.forVisionTasks` |
| `face_landmarker.task` float16 | ✅ float16 model URL |
| `runningMode: "IMAGE"` on a single still | ✅ already correct — not LIVE_STREAM |
| `delegate: "GPU"` | ✅ set |
| **explicit, tested CPU fallback** | ❌ **absent** — no fallback path exists at all |
| `outputFaceBlendshapes: true` | ❌ **not enabled** |
| 478-landmark assertion | ✅ `EXPECTED_LANDMARKS = 478`, throws on mismatch |

The two ❌ rows are code that does not exist, not code that is untested.

### 1.7 Colorimetry engine — implemented, and the documented constraints hold

Verified by reading `src/engine.js` against CLAUDE.md's eight load-bearing items:

- White balance applied once to the whole frame (`analysis.js:168`), before
  region extraction. Not per-ROI. ✅
- Erythema sign convention red-over-green (`engine.js:57`). ✅
- `itaDegrees` uses `atan2`, no clamped `b*` (`engine.js:79`). ✅
- `RIDGE_STRUCTURE_SCALE = 1.0`, `ridgeResponse` returns mean vesselness
  (`engine.js:127`, `:266`). ✅
- Cheek laterality subject-anatomical: `cheek_right` uses landmark 234 (Lung),
  `cheek_left` uses 454 (Liver) — `rules.js:46-55`. ✅ Pinned by a passing test.
- `BASELINE_ZONES = ["center_forehead", "chin"]` — peripheral, not whole-face. ✅
- Dark-skin limit enforced: `erythemaConfidence()` returns `low` for
  brown/dark ITA bands and `analyse()` emits **no** erythema *or* pallor
  observation in that regime (`engine.js:346`). ✅ Two tests pin it, both passing.
- `UNAVAILABLE` conditions are never emitted. ✅

The erythema-derived severity constant is **not** fitted to zero for deep skin —
it is structurally skipped, which is the required posture.

### 1.8 No attractiveness or ranking scalar exists

Searched all of `src/` for attractiveness/beauty/rating/ranking/score/percentile
terms. 2 hits, **both inside comments** (`engine.js:135` "Fabricating a low score
would…", `engine.js:228` "region's own percentile"). No code path computes a
global rating. The Phase 3 guard will be codifying a property the repo already
has, not fixing a violation.

### 1.9 Framing-discipline violations — 18 of 63 user-facing strings

Full inventory produced by a scanner run this session. **Every string below is
user-facing.** Under the target product these split into two classes: legitimate
Module B copy, and Module A copy that must lose its health register entirely.

> Scanner note: the first version of this scan reported "0 of 63" — a false
> clean. The `\b` word-boundary escape did not survive shell quoting and became
> a backspace character. The working version carries a self-check that fails
> loudly if it cannot find a term known to be present. The Phase 3 lint must
> ship with that canary, or it will pass by being broken.

**`src/index.html` — 9 strings**

| Location | Terms | Copy |
|---|---|---|
| status bar | wellness | "GENERAL WELLNESS" |
| status bar | diagnostic | "NOT A DIAGNOSTIC DEVICE" |
| header | diagnostic | "It measures the classical **diagnostic** zones against each other…" |
| footer | wellness | "General wellness tool." |
| footer | diagnose, treat, cure, disease, medical, doctor, health | "Not intended to diagnose, treat, mitigate, cure or prevent any disease…" |
| consent 01 | diagnose, treat, cure, disease, medical, wellness | "This is a general wellness tool. It is not a medical device…" |
| consent 03 | symptom, clinician, doctor | "Nothing here substitutes for a clinician…" |
| consent 04 | clinician | "…that's a clinician's call." |
| consent label | diagnosis, wellness | "…this is a wellness tool, not a diagnosis." |

**`src/rules.js` — 6 strings**

| Location | Terms | Class |
|---|---|---|
| `SG-001-MALAR.message` | clinician, wellness | Module B (legitimate) |
| `SG-003-PIGMENT.message` | doctor, dermatologist | Module B (legitimate) |
| `TCM-102-STOMACH-HEAT.recommend[2]` | ulcer, doctor | **Module A violation** |
| `TCM-202-DAMP-HEAT.recommend[0]` | treat | Module A — "Treat these as one thing" is a false positive (verb sense), but the lint must handle it |
| `TCM-202-DAMP-HEAT.recommend[1]` | symptom, anaemia, thyroid | **Module A violation — this is the failing test** |
| `ROIS.glabella.correspondence` | detoxification | **Module A violation** — "Liver — detoxification, emotional regulation" asserts a physiological function |

**`src/ui.js` — 3 strings**

| Location | Terms |
|---|---|
| referral heading | "Stop — see a clinician" (Module B, legitimate) |
| not-measured note | "…a model trained on **clinical** images…" |
| null-result note | "…not a clean bill of **health**…" |

**Trait copy lacking tradition attribution — 3 of 7 rule messages**

`SG-001-MALAR` and `SG-003-PIGMENT` are Module B and correctly *not*
tradition-framed. The genuine violation is:

- `TCM-202-DAMP-HEAT` — *"Digestive and rest-related patterns appearing together
  are read as Damp-Heat…"* — passive "are read as" with no named tradition. The
  other four TCM rules do this correctly ("In the Mien Shiang tradition…").

**Assertive second-person claims: 0 genuine.** The single scanner hit ("If you
have a health concern, see a doctor") is a false positive — the Phase 3 lint
needs a tighter pattern than `\byou (are|have)\b`.

### 1.10 Repository state

- Working tree clean; branch `main`; 3 commits (`d9de32b`, `3286df4`, `2aa2799`).
- **No git remote configured.** Consequence: the CI matrix in
  `.github/workflows/ci.yml` (ubuntu/windows/macos × Node 20/22/24) has
  **never executed**. Its content is sound on inspection — it asserts the
  discovery line, pins `PORT`, and includes a positive control on the smoke
  test — but "CI green" is currently unverifiable, and would fail today anyway
  on the copy-guard test.
- ~~`mien-shiang-deploy.zip` (98 KB) is a build artifact committed to the repo.~~
  **Resolved.** Contents were verified at the time: 10 flat entries (the
  contents of `src/`, no directory prefix) — correct for Netlify Drop, but a
  second copy of the app that can drift from `src/` silently. Removed from the
  tree; `*.zip` is now in `.gitignore`.
- Third-party origins referenced from `src/`: `cdn.jsdelivr.net` (MediaPipe),
  `storage.googleapis.com` (model), `fonts.googleapis.com` (Google Fonts
  `@import` in `index.html`). `fonts.gstatic.com` also appears at runtime —
  observed in the SW cache. None carries user-derived data, so constraint 1 is
  intact, but each is a third-party request from a privacy-positioned app and
  each is a cold-start dependency.

---

## 2. REPORTED BUT UNVERIFIED

Documented or asserted, but **not exercised this session**. None of these should
be treated as working.

| Claim | Where asserted | Why unverified |
|---|---|---|
| Landmarking works on a real photo | CLAUDE.md architecture | No photo was analysed. Requires a face image + a network fetch of the 3.76 MB model. **The entire capture→landmark→measure→rules path is untested end-to-end this session.** |
| GPU delegate works on target hardware | `analysis.js:34` | Never run. There is also no CPU fallback to fall back *to*. |
| Engine is numerically identical to the Python original | `engine.js:4` — "Verified numerically against the Python output" | No Python source in this repo and no parity test. This is a bare comment claim. |
| Colorimetry is correct on real skin | measurement-layer table | Tests use synthetic images. No real-photo validation exists, and severity constants are uncalibrated by design (CLAUDE.md says so plainly). |
| Rules produce sensible readings on real faces | — | Only synthetic pixel fixtures exercised. |
| CI matrix passes | `.github/workflows/ci.yml` | No remote; never run. |
| Bubblewrap/TWA flow | DEPLOY.md | Nothing built. DEPLOY.md's two blockers (interactive `bubblewrap init`, no HTTPS origin) were not re-tested but are consistent with the tooling. |
| iOS Safari behaviour | — | Untouched. |

---

## 3. UNKNOWN / GAP

Required by the target product, absent today.

### Product boundary (the largest single gap)

- **No Module A / Module B separation exists.** `RULES` in `rules.js` is one
  flat array mixing safety gates (`category: "safety_gate"`) and TCM readings
  (`category: "tcm"`); `runRules()` returns one object; `ui.js` renders both
  from it. The `category` field is a useful seam but is not a boundary — there
  is no separate code path, no separate copy deck, no separate disclaimer.
- **No feature flag**, so the two build flavours are not distinguishable at
  compile time and Module B cannot be disabled for a clean entertainment build.
- **No About screen**, so no place to surface the flag state.
- The colorimetry engine is shared by both modules (it feeds both the malar gate
  and the future qi se reading). The boundary therefore has to sit at the
  *interpretation* layer, not the measurement layer — worth deciding explicitly
  before Phase 2 rather than discovering during it.

### Positioning conflict to resolve (documentation, not code)

The master prompt positions the product as **entertainment**; CLAUDE.md
positions it as a **general wellness tool** and calls that positioning
load-bearing for TGA exclusion 14B.

These are **reconcilable, not contradictory**: an entertainment reading that
makes no health claim is not a medical device at all, which is a strictly safer
position than relying on the 14B carve-out. Module B keeps the existing
14B-conforming referral design. So no work is blocked.

But CLAUDE.md is explicit that intended purpose is evidenced by documentation
and marketing, not only code — so `README.md`, `package.json` description,
`manifest.webmanifest` description, the status bar, the footer and all five
consent clauses currently assert the wellness positioning and will need to be
rewritten in step with the code. Flagging it here so it is a deliberate change
rather than an accidental one.

### Phase 1 gaps

- Blendshapes not enabled; no expression/asymmetry reading.
- No geometry outputs whatsoever: no facial thirds (Three Courts), no facial
  fifths, no forehead/bizygomatic/bigonial widths, no face length.
- No face-shape classifier, and therefore no explainability view for one.
- No fWHR (and no decision recorded on which upper-face-height definition to use).
- No debug/inspection view.

### Phase 2 gaps

- No Five Elements typing. CLAUDE.md confirms: "No Five Element morphology
  classifier" — `engine.js` supports `constitution` facts but nothing emits them.
- No Three Courts, no Twelve Palaces.
- No qi se / glow reading — the colorimetry outputs are clinical observations
  (erythema, pallor, hyperpigmentation, xerosis, rhytides), not vitality copy.
- No "What the science says" screen.
- No handling of sources disagreeing on a mapping.

### Phase 3 gaps

- **Copy lint is partial and its scope is the problem.** `copy-guard.test.js`
  imports **only** `RULES` from `rules.js`. Verified by reading its imports. So
  `index.html` (9 flagged strings), `ui.js` (3) and `engine.js` reason strings
  are entirely unscanned — including the whole consent gate and footer. The
  blocklist is also narrower than the master prompt's.
- No attractiveness-score guard (the property holds; nothing pins it).
- No egress guard.
- No "report this result" control anywhere in the UI.
- No privacy policy page, in-app or hosted.
- No `COMPLIANCE.md`; no Data safety answers; no Health declaration answers.
- Photo input uses `<input type="file" accept="image/*" capture="user">`. On the
  Android/TWA path this needs checking against the Photo Picker requirement so
  `READ_MEDIA_IMAGES` is never declared.

### Phase 4 gaps

Nothing exists: no hosting, no `assetlinks.json`, no Bubblewrap project, no
signed APK/AAB, no device install. DEPLOY.md is a written plan, not a result.

### Phase 5

Not started, correctly — it is gated behind Phases 0–4.

---

## 4. Exit criteria

| Phase 0 exit criterion | Status |
|---|---|
| `AUDIT.md` exists | ✅ this file |
| Tests run green, **or** failures enumerated with causes | ✅ 57 tests, 56 pass, 1 fail; the single failure is enumerated with its cause, file and line in §1.1 |

## 5. NOT VERIFIED — exact commands that would close each gap

- **End-to-end analysis on a real photo** — requires a face image and network
  access for the model. Command: `npm start`, open `http://localhost:5173`,
  accept consent, choose a photo, press "Read this photo".
- **CPU fallback** — cannot be verified; the code path does not exist yet.
- **Offline first-analysis** — will fail today (§1.5). Re-test after the model
  and WASM are added to the SW precache: load once online, clear the cache,
  reload offline, run an analysis.
- **CI matrix** — requires a git remote: `git remote add origin <url> && git push -u origin main`.
- **Android install, camera permission, TWA address bar** — requires HTTPS
  hosting and a physical device.
- **iOS camera in an installed PWA** — requires a physical device.

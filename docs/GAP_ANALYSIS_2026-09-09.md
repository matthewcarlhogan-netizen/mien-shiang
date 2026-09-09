# Gap analysis & blindspot report — 9 September 2026

Requested by the product owner before merging PR #62: a brutally honest read on how far this
product actually is from shippable, independent of the governance/decision work just closed.
Every claim below was checked against the current repository state this session — a real command
run, a real grep, a real file read — not recalled from earlier context. Where something was **not**
independently re-verified this pass, that is stated rather than implied.

**The one-sentence version:** governance is in good shape; the product is not close. Roughly half
of the six reading families now have real interpretive prose (as of this session's Twelve Palaces
work); every one of them is commercially blocked regardless; Daily Portrait is a specification with
zero code; and the four-store release gate fails on infrastructure that has not been started, not
on anything content-related.

---

## 1. The content void

| Surface | Status | Evidence |
|---|---|---|
| Five Elements (`src/reading/five-elements.js`) | **Complete.** Five real, tradition-attributed readings (wood/fire/earth/metal/water), each naming its source and disagreement. | Read in full this session; no stub or null anywhere in the five entries. |
| Qi Se / complexion (`src/reading/qi-se.js`) | **Complete.** Three real band readings (bright/steady/quiet), sources-differ note present. | Read in full this session. |
| Twelve Palaces (`src/reading/twelve-palaces.js`) | **10 of 12 real, as of this session's own commit.** Wealth and Property deliberately withheld — this project's own primary source disagrees with the received layout on where they are, and the app now says so rather than guessing. Before today's work, **all twelve** were withheld. | `heritageStatus: "RUNTIME_PROSE"` on 10 entries, `"WITHHELD_STRUCTURAL_DISAGREEMENT"` on 2, verified by reading the current file and its passing tests (`tests/reading.test.js`, `npm test` 1403/1403). |
| Three Sections (`src/reading/three-courts.js`) | **Permanently empty by design, not by omission.** `BALANCED_READING = null`, with a comment: "not cleared for runtime: its attribution and predicate are contradicted in the inspected witness." This is the R1 finding — the only source for the balanced-thirds maxim has a contested attribution, so the module measures real geometry but asserts no heritage claim. | Read in full; `heritageReading: null` unconditionally in `readThreeCourts()`. |
| Proportion Harmony (`src/reading/harmony.js`) | **No prose at all, also by design.** Returns a 0–100 number plus a component breakdown and a sources-differ note — never a written sentence. CLAUDE.md item 33 states this is deliberate ("about the canons, not about the face"), so this is not a gap to fill, it's a boundary to preserve. Worth naming anyway, because a reviewer skimming the UI could easily mistake "no prose" for "unfinished." | Read `computeHarmony()` in full; no `reading`/`text` field anywhere in its return shape. |
| Reflection Engine's own Twelve Palaces note (`src/qise/reflection-corpus.js:261`) | **Fixed, same session (commit `4d040a7`).** This is a *separate*, hand-authored copy surface from `src/reading/twelve-palaces.js` (the Qi Se tracker's own heritage-flavour text layer). It previously said the body locator "remains unresolved," which stopped being the strongest available statement once this session found and verified a real, citable locator (`docs/heritage-evidence/SOURCE_ACQUISITION_FINDINGS_2026-09-09.md`). Now states that finding, graded provisional — not upgraded past what the evidence supports. | `grep -n "twelvePalaces" src/qise/reflection-corpus.js`, re-checked after the fix. |
| Daily Portrait (any file) | **Zero code, anywhere.** `grep -ri "dailyportrait\|daily-portrait" src/` returns no matches. Everything under `docs/DAILY_PORTRAIT_ARCHITECTURE.md`, `docs/DECISION_CARDS.md` Cards 1–5, and today's charter amendment is specification and governance, not implementation. | Direct grep, this session — zero hits. |
| Insights / face-shape narrative (`src/utils/insights.js`) | **Populated** — 340 lines, registered in `copy-guard.test.js` as `INSIGHTS_COPY`. Not independently re-read line-by-line this session; treated as complete based on size, registration, and passing tests, not a full re-audit. | Line count + registration check only. |
| Science screen (`src/scienceview.js`) | **Not independently re-verified this pass** — 39 lines, small by design (it renders `SCIENCE_POINTS`/`SCIENCE_INTRO` from `reading/science.js`, which was not read in full this session). Flagged as an open item rather than asserted either way. | Not checked beyond a line count. |

**Net read:** the "content void" is real but narrower than it might look from one session's work on
Twelve Palaces alone. Five of six reading families have real prose today. The two genuinely empty
surfaces (Three Sections, Harmony) are empty by a considered evidentiary decision, not neglect —
collapsing that distinction in a future roadmap would mean "fixing" something that isn't broken.
Daily Portrait is the one surface that is a void in the ordinary sense: specified in detail, built
not at all.

---

## 2. The IP/sourcing trap

**The premise needs correcting before the question can be answered.** Card 11 (Kanripo) is not the
only thing blocking commercial use of Twelve Palaces content — it is one gate among five, and all
six content families fail the same five-gate standard regardless of which source text is used.
Confirmed by running the actual release gate just now:

```
npm run audit:release
Release gate: BLOCKED
  - twelve-palaces-v1: rights-not-cleared — family rights determination is not cleared
  - twelve-palaces-v1: citation-source-required:mianxiang-unspecified — no source identified for the claim
  - twelve-palaces-v1: source-rights-unverified:mianxiang-unspecified — no rights basis recorded
  - twelve-palaces-v1: manifest status is pending
  [... identical five-part failure repeated for five-elements-v1, three-courts-v1, twelve-palaces-v2,
       qi-se-reading-v1, harmony-v1, qise-passages-v1 ...]
```

Even the two source texts already confirmed **public domain by age with no Kanripo involvement at
all** (靈樞·陰陽二十五人 for Five Elements, 素問 ch.17 for Qi Se) are still blocked — not on rights, but
on the other three gates: no signed contributor agreement for the English commentary, no written
legal sign-off, no hashed manifest entry. **Switching away from Kanripo does not, by itself, unblock
anything.** The full five-part evidence standard (`docs/commercial-rights-audit.md`) applies
regardless of source.

**What Kanripo specifically encumbers — and an UNRESOLVED PROPOSAL for a clean-room strategy, not
a conclusion anyone should build on.** Kanripo's CC BY-SA 4.0 declaration is at the organisation
level, over their *surrogate* — the specific scanned/transcribed digital file (`docs/DECISION_CARDS.md`
Card 11). Card 11 explicitly requires "product-owner and/or counsel review" before any of this
project's Kanripo-sourced content is treated as commercially cleared, and **that review has not
happened.** Nothing below changes that status. It is offered as a starting hypothesis for whoever
does that review, not as permission to proceed without it:

- **Proposed distinction, not yet confirmed by counsel:** the CC BY-SA declaration may be read as
  covering Kanripo's specific *expression* — their transcription text, OCR output, scan images —
  rather than the underlying historical text itself, which is centuries old and public domain by
  age independently of who digitised it. If that reading holds, restating a documented historical
  fact in independently-composed prose, rather than reproducing Kanripo's transcription verbatim or
  near-verbatim, would sit outside what the declaration restricts.
- **This session's Twelve Palaces content was written consistent with that proposed distinction**
  (independently composed sentences describing a name, a location, a domain of life; source cited by
  title; no verbatim reproduction) — but this is reported as a fact about how the content was
  written, not as evidence that doing so is legally sufficient. **The distinction above is this
  report's own reasoning, not a cleared legal opinion, and must not be relied on as one.** Card 11's
  required review is the only thing that can actually close this gap; until it happens, all six
  content families remain `Blocked` regardless of how any individual piece of content was drafted.
- **A separate, independently-sourced alternative exists for some claims**: this session's own
  research (`SOURCE_ACQUISITION_FINDINGS_2026-09-09.md`) found the Three Sections maxim and a Twelve
  Palaces chapter body via Wikisource/Wikimedia Commons, not Kanripo. This does not sidestep the need
  for review either — Wikimedia Commons' own licensing terms for those specific scans were **not
  independently verified this session** (Commons hosts a mix of public-domain and CC-licensed scans;
  which applies to these particular files was not confirmed), so this alternative has its own
  unresolved rights question, not a cleaner one by default.

**The gap nobody has named yet:** *"Repository editorial copy has no recorded contributor
agreement"* (`docs/commercial-rights-audit.md`). That line predates this session, but it is no
longer abstract — a real, substantial volume of English interpretive prose has now been written
(five element readings, three qi se bands, ten palace readings, the insights narrative, the harmony
framing). None of it has a contributor agreement on file. If any of that prose was written by an AI
agent under instruction rather than a named human author, that itself may be a fact the legal-sign-off
gate needs to know, not just an administrative gap to paper over later.

---

## 3. Unbuilt engineering — Daily Portrait

Everything below is **zero-code, spec-only**, verified by direct grep this session. This is not a
small remaining task; it is most of a second product feature, and treating it as a follow-up commit
to PR #62 rather than its own phase would badly understate it.

**Storage layer — entirely new, not an extension of Qi Se's store:**
- A separate IndexedDB object store from `src/qise/store.js`, with its own allow-list guard modelled
  on (not merged with) `FORBIDDEN_KEY_PATTERN`/`findForbiddenKeys()` — none of this exists.
- The full 14-field record schema `docs/DAILY_PORTRAIT_ARCHITECTURE.md` specifies (`sourceCaptureId`,
  `timelineFrameId`, `measurementRecordId`, `canonicalDay`, `captureTimestampIso`,
  `captureTimezoneOffsetMinutes`, `captureClass`, `imageFormatVersion`, `orientation`,
  `alignmentTransform`, `integrityHash`, `localStorageStatus`, `cloudBackupStatus`,
  `baselineSegmentRef`, `measurementRecordRef`) — none implemented.
- `captureTimezoneOffsetMinutes` specifically **does not exist anywhere in the repository today** —
  confirmed by the architecture doc itself, which calls this out as a real, currently-unclosed gap
  in how `canonicalDay` is computed (`src/ui/qise/app.js:895` derives it from the raw device clock
  with no offset persisted at all).

**Processing layer:**
- A canonical-day/slot-planning utility. The architecture doc gives two conforming options (extract
  a shared utility from Qi Se's `planSegment()` with a parity test, or build an independent one to
  the same behavioural contract) — neither has been started.
- An alignment/crop pipeline (stable eye-line rotation, consistent face scale, consistent crop
  window) — this is real computer-vision work, not wiring. Zero code.
- The explicit constraint that alignment must never feed back into the Qi Se measurement path is a
  design rule with three named required tests (`docs/DAILY_PORTRAIT_ARCHITECTURE.md`) — none written,
  because nothing exists yet to test.

**Product/UI layer:**
- Thumbnail/preview tier, lazy decoding, bounded-memory prefetch, a virtualised timeline (not one DOM
  node per day), a then/now pair view, `prefers-reduced-motion` equivalents for any animated
  playback — all unbuilt. No timeline screen exists in any form.

**Governance already cleared, not yet spent:** Cards 1–5 (charter amendment, consent-domain shape,
canonical-only retention, generated recovery key, one-active-writer v1) are approved *shapes* for
this engineering — they remove decision-blockers, they do not remove build time. Nothing about
today's decisions makes this smaller than a multi-week, dedicated engineering effort with its own
branch, its own tests, and its own review — which is exactly why it wasn't attempted inside this
session's decision-closure work.

---

## 4. Infrastructure & regulatory blindspots

**CI: the `runner_id: 0` issue, still unresolved.** Recurred identically on three consecutive pushes
to this branch across roughly five hours (confirmed again minutes before this report, job
102528002121: 2-second completion, `runner_id: 0`, empty `runner_name`). Local verification has been
green throughout (`npm test`, `npm run build`, `npm run lint:bundle` all pass on every commit) — this
is an account-level GitHub Actions scheduling problem, not a code defect, and it is outside what I
can fix from here. It needs the account owner to check Actions billing/status directly. PR #62 has
been mergeable-by-content but not CI-green this entire session as a result.

**The four-store release gate fails almost entirely on things that have not been started, not on
content:**
```
npm run audit:release
  ...
  - real-device performance evidence is not approved
  - google-play: store evidence is not approved
  - samsung-galaxy-store: store evidence is not approved
  - oppo-software-store: store evidence is not approved
  - apple-app-store: store evidence is not approved
```
Concretely, per `docs/STORE_RELEASE_GATES.md`:
- `src/.well-known/assetlinks.json` still has the literal placeholder `com.example.mienshiang` and a
  zero certificate fingerprint.
- **No Android wrapper or signed bundle exists at all.** Given `DR-2026-09-07-DUAL-STORE-DISTRIBUTION-GOAL`
  names Google Play as the *first* target, this is the single largest gap between stated priority and
  actual repository state.
- **No iOS project, privacy manifest, or signed archive exists.** Apple is the *second* named target
  and has zero engineering start.
- No production billing/entitlement service exists — `shareGate.js`'s unlock mechanism is explicitly
  a `localStorage`-only "courtesy latch" (CLAUDE.md item 34), not a real entitlement system; anyone
  with devtools can grant themselves any tier today.
- No real-device evidence exists for the required low-end/Samsung/OPPO profiles. This connects
  directly to CLAUDE.md's own flagged gap: the `underexposed` capture gate's metric is confounded
  with skin reflectance and has never been re-derived against physical-device evidence across tone
  strata — there is no path to closing that without exactly the device-testing program that doesn't
  exist yet.

**ZKT telemetry is a scope document only** (`docs/ZKT_TELEMETRY_SCOPE.md`: "No code exists yet, no
test has been relaxed, no copy has changed"). This matters here specifically because it means there
is **no mechanism at all**, today, for the "real-device performance evidence" gate above to ever be
satisfied except by a manual device-testing program — nothing in the repo currently collects that
data even opt-in.

**A stale citation, small but real:** `docs/ZKT_TELEMETRY_SCOPE.md` cites `docs/PHASE_0_BLOCKER_REPORT.md`
by name. That file does not exist anywhere in the repository — confirmed by direct grep, zero other
references either. A broken citation in exactly the kind of place CLAUDE.md's Verification Protocol
(§5, "every referenced file must be proven to exist") warns about.

**Beta and production are not at feature parity**, which matters if beta is being used for real user
testing under the assumption it represents the shipping surface:
```
src/beta/       6 files   1053 lines (beta.js)
src/ui/qise/    9 files   1764 lines (app.js) — includes palace-experience.js, heritage-view.js,
                                                  exposure-halo.js, which beta has no equivalent of
```
Any user-facing testing done against `/beta` is testing a materially smaller surface than what
`/qise` (production) actually implements.

**e2e coverage is entirely capture-flow-shaped, not reading-content-shaped.** All 8 Playwright specs
(`qise-benchmark`, `qise-integration`, `qise-redesign`, `beta-visual`, `beta-capture-finalisation`,
`beta-capture`, `beta-camera-integration`, `qise-capture-finalisation`) exercise the camera/capture
pipeline. **None render the actual Module A reading screen in a real browser** — five-elements,
three-courts, twelve-palaces and harmony rendering are covered only by unit tests
(`reading.test.js`, `summary.test.js`) against hand-built fixtures, never by an end-to-end check that
the real `renderReading()` output looks right in an actual page. Today's Twelve Palaces content
change shipped with strong unit coverage and zero browser-level visual confirmation.

**Card 6 (Qi Se safety-gate authorisation) remains `NOT_GRANTED`, by design** — worth naming here
because it is a standing ceiling on any future "richer" Stage 3 heritage presentation, not a bug,
and easy to forget is still open once the more visible Twelve Palaces work is merged.

---

## Roadmap to completion, sequenced

Ordered by actual dependency, not by convenience. Each phase names what blocks the next one.

**Phase 0 — unblock CI (no dependency on anything else).**
Get a human to check the GitHub Actions billing/status page for this account. Nothing else in this
roadmap can be verified by real CI runs, only by local checks, until this clears. Low effort, but it
is the one item nobody except the account owner can act on.

**Phase 1 — DONE, same day (commit `4d040a7`).** Both cheap gaps this report originally flagged
here are closed: `src/qise/reflection-corpus.js`'s stale Twelve Palaces note now states the locator
this session found (graded provisional, not upgraded past what the evidence supports), and the
broken `PHASE_0_BLOCKER_REPORT.md` citation in `ZKT_TELEMETRY_SCOPE.md` is repointed to
`docs/STORE_RELEASE_GATES.md`, which actually exists. Left here, struck through in effect, so a
later reader sees the phase was real and closed rather than wondering why it's missing.

**Phase 2 — the rights chain, because it gates every content family regardless of what's written.**
Pick one content family (Five Elements is furthest along — locator and rights already "Have" per
`commercial-rights-audit.md`) and drive it through all five gates end to end: confirm the edition
citation is independently verifiable, get a written rights/public-domain determination, get a signed
contributor agreement covering the English commentary, get legal sign-off on the reduction claim,
record hashed evidence in `commercial-rights-manifest.json`. Treat this as a template — closing one
family for real teaches what the other five actually need, which nothing so far has tested against
a real signature.

**Phase 3 — reading-surface e2e coverage, before adding more content.**
Add Playwright coverage that actually renders `renderReading()` in a browser and asserts on the
Twelve Palaces, Five Elements and Qi Se sections — today's content change has none. Cheap relative
to what it protects, and it should exist before Daily Portrait adds a second major screen with the
same risk.

**Phase 4 — Daily Portrait, as its own dedicated effort.**
Not a follow-up commit. Suggested internal order: storage schema + allow-list guard first (it gates
everything else and is the one piece with the clearest existing pattern to follow, `store.js`) →
canonical-day/timezone logic (the one piece with a real, described, currently-open correctness gap)
→ alignment/crop pipeline → UI. Each needs its own tests before the next layer builds on it, per the
architecture doc's own required-test list.

**Phase 5 — store infrastructure, once there is a device to point it at.**
Real Android package ID, signing fingerprints, and `assetlinks.json` values (currently placeholder)
before any Play Store work is meaningful; a genuine iOS target before any Apple work starts at all.
This is the largest raw engineering gap relative to the stated Play-then-Apple priority, and nothing
upstream of it (content, Daily Portrait) blocks starting it in parallel once there's a device to
test the wrapper on.

**Phase 6 — device evidence and the entitlement system.**
Only meaningful once Phase 5 produces something installable: real low-end/Samsung/OPPO device runs
(feeding the `underexposed` gate re-derivation CLAUDE.md already flags as needed), and a real
billing/entitlement backend to replace `shareGate.js`'s courtesy latch before any paid tier ships.

Phases 2 and 3 can run in parallel with each other and with Phase 0. Phase 4 and Phase 5 can also run
in parallel once Phase 1 is done, since they touch almost entirely disjoint code. Phase 6 is the one
genuinely blocked on Phase 5 producing a real artifact to test.

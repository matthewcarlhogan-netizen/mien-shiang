# Daily Portrait / timeline architecture

**Status: product-owner-directed architecture, 30 August 2026, implementing
`docs/PRODUCT_NORTH_STAR.md`.** This document is written so that PR C is mechanical: an
implementer should not need to decide what "one frame a day" means, what a missed day is, whether
timeline alignment may touch measurement pixels, or where photographs live. Those decisions are
made here. Decisions this document deliberately leaves open are named as open decision cards in
`docs/DECISION_CARDS.md`, not silently assumed.

**Nothing in this document is implemented by this PR.** PR A specifies schema, rules and tests;
no code path in this session writes an image to disk. See `docs/DECISION_CARDS.md`'s "charter
amendment" card for the one product-owner approval PR C's implementation is gated on.

## Why this is a separate architecture from Qi Se, on purpose

`docs/PRODUCT_NORTH_STAR.md` makes Daily Portrait a first-class pillar, not a wrapper around Qi
Se. Concretely, that means:

> **Daily Portrait remains useful even when no Qi Se result can be produced.** The timeline is a
> real visual-history product in every one of: calibrating (no Qi Se baseline yet), a capture that
> is valid for the portrait but whose measurement is unavailable under a future policy, no
> historical Qi Se record at all, and — if `docs/DECISION_CARDS.md`'s consent-separation card is
> later approved — Qi Se processing consent absent while portrait storage consent is present. Qi
> Se enriches the timeline. It is never structurally required for the timeline to exist.

This has a direct code consequence, stated precisely because it is easy to get backwards:
`planSegment()` in `src/qise/baseline.js:274` already implements exactly the behavioural contract
Daily Portrait needs for "one record per canonical day, with deterministic retake replacement"
(`replacedTimestampIso`). **Daily Portrait adopts that exact behavioural contract. It does not
gain a code dependency on `src/qise/baseline.js`.** PR C has two conforming options, and must pick
one rather than importing the Qi Se baseline engine to decide which photograph occupies a
timeline day:

1. Extract a genuinely neutral, shared canonical-day/slot-planning utility, used by both Qi Se and
   Daily Portrait, proven behaviourally/fixture-equivalent to today's `planSegment()` for Qi Se's
   existing callers (a byte-for-byte parity test against the current `planSegment()` behaviour,
   run before and after the extraction, is the acceptance bar); or
2. An independent portrait-slot planner, pinned to the identical behavioural contract via shared
   test fixtures, with no import from `src/qise/baseline.js`.

Either way, a Daily Portrait frame can exist with `qiSeRecordId: null`.

## The two epistemically distinct objects (read this before anything else)

This is the single most load-bearing rule in this document, so it is stated first and referenced
everywhere else.

**The measurement input** is whatever pixels Qi Se actually processed to produce a reading (its
own capture path, already specified by `src/qise/camera.js`, `src/qise/rois.js`, `src/qise/
sclera.js` and unchanged by this program).

**The timeline display frame** is a separate artefact, derived for visually stable playback:
alignment (stable eye line, scale, crop, rotation), possibly exposure/contrast normalisation for
consistent viewing, possibly downscaling for storage/performance tiers.

**No display normalisation performed for timeline aesthetics may feed back into the Qi Se
measurement path, unless that exact operation is already part of the approved measurement
pipeline** (i.e., `CLAUDE.md`'s documented white-balance-once-per-frame step, which is Qi Se's own
pipeline and is unaffected by this program). Concretely:

- Aligning, cropping, or colour-adjusting a frame for the timeline must never be the same
  operation, on the same buffer, that feeds Qi Se's `regionStats`/`computeReadingMetrics` path.
  They read from the same original capture but diverge into two independent derived artefacts
  immediately after acquisition.
- Restoring a timeline display frame (from local storage, from a backup) must never trigger a
  Qi Se recomputation. A stored Qi Se reading's `metrics`/`compass`/`deltas` are historical facts
  about the day they were taken and are immutable on restore (see "Restore preserves epistemic
  history" below).
- A display frame being available, or looking stable, is not evidence that the original capture
  passed Qi Se's own quality gates. `gateMargins`/`captureTier`/`confidence` remain Qi Se's own
  fields, computed once, at capture time, from the measurement input — never re-derived from a
  display frame.
- Measurement metadata (which gates passed, at what margin, at what confidence) retains its own
  provenance record, independent of the display frame's own transform history.

**Tests PR C must add**, named here so they cannot be designed away in the implementation: (1) a
test that mutates only the display-frame alignment/crop path and asserts no Qi Se metric changes
as a result, on a fixed real capture; (2) a test that restores a stored Daily Portrait frame from
an export/backup and asserts the associated Qi Se record's `metrics`/`compass`/`deltas` are
byte/value-identical to what was stored, never recomputed; (3) a test that a display-only
operation (alignment, crop, exposure normalisation, stabilisation) never appears in the same
function or call path as any function already exercised by `tests/measurement-invariance.test.js`
or `tests/qise/metrics.test.js`.

## Canonical daily slot schema

Derived from what `src/qise/store.js`'s `toRecord()` already distinguishes (timestamp, canonical
day, capture class/tier, lineage, baseline version, confidence — see that file for the exact
allow-list this pattern extends) rather than invented fresh. A Daily Portrait record is a
**separate object in a separate store** (see "Where this lives" below), conceptually
distinguishing:

| Field | Distinguishes | Notes |
|---|---|---|
| `sourceCaptureId` | the raw capture event | one per press-the-shutter attempt, including failed/retaken ones, ephemeral — never itself persisted with pixel data beyond the active session |
| `timelineFrameId` | the frame that occupies a canonical day slot | stable once a day is "closed"; changes only on an explicit user-initiated retake within the same day |
| `measurementRecordId` | the associated Qi Se reading, if any | nullable — see "remains useful with no Qi Se result" above |
| `canonicalDay` | the day this frame belongs to, `YYYY-MM-DD` | decided once at capture time per the timezone rules below; never recomputed from a later timezone |
| `captureTimestampIso` | the actual capture instant | full ISO-8601 UTC instant, immutable |
| `captureTimezoneOffsetMinutes` | the device's UTC offset at the moment of capture | **new field — see "the timezone gap" below; this does not exist anywhere in the repo today** |
| `captureClass` | `"auto" \| "assisted" \| "manual-upload"` | mirrors Qi Se's existing `captureTier`/`captureMode` vocabulary, does not require Qi Se to run |
| `imageFormatVersion` | e.g. `"portrait-v1"` | so a future format change can be migrated deliberately, per `docs/BACKUP_ARCHIVE_FORMAT.md`'s versioning discipline |
| `orientation` | EXIF-equivalent orientation already applied at capture time | display frames are always stored orientation-corrected; no consumer re-applies orientation |
| `alignmentTransform` | the exact affine transform applied to derive the display frame from the raw capture | recorded so alignment is reproducible/auditable, never silently re-derived differently later |
| `integrityHash` | a content hash of the stored display-frame bytes | corruption detection, per `docs/BACKUP_ARCHIVE_FORMAT.md`'s failure matrix |
| `localStorageStatus` | `"present" \| "evicted" \| "deleted"` | distinguishes a real gap (never captured) from a local-storage loss (was captured, is now gone) — a different fact, must not be conflated |
| `cloudBackupStatus` | `"local-only" \| "pending" \| "backed-up" \| "verification-failed" \| "disconnected" \| "conflict" \| "restore-required"` | mirrors `docs/BACKUP_ARCHIVE_FORMAT.md`'s state model exactly — one vocabulary, not two |
| `baselineSegmentRef` | which Qi Se baseline segment (lineage) this day belongs to, if a measurement was taken | nullable, mirrors `lineageId` in `src/qise/store.js` |
| `measurementRecordRef` | optional link to the full Qi Se reading | nullable, see above |

This is the **minimal correct schema** given what already exists; PR C may discover a field is
unnecessary or that one more is required by a real implementation constraint, but any such change
is a deliberate amendment to this table, not a silent addition made while writing code.

## One day = one primary frame

Deterministic rules, extending `planSegment()`'s existing shape (`{ reset, history, lineageId,
replacedTimestampIso }`) to the Daily Portrait's own equivalent outcome shape (name to be decided
in PR C; behaviour is fixed here):

- **First capture of a canonical day** creates a new `timelineFrameId` for that day. No prior
  record for that day exists.
- **Retake within the same canonical day, before the day is "closed"** (see timezone section for
  what "closed" means) replaces the existing frame for that day: the old `timelineFrameId`'s
  stored bytes are deleted, not archived, not kept as a "previous version" — mirroring
  `planSegment()`'s `replacedTimestampIso` behaviour exactly. **No unnecessary face-image
  accumulation**: five retakes in one day must never leave five stored images.
- **Deletion** (explicit, user-initiated, of a single day's frame) removes that day's
  `timelineFrameId` and its bytes, and leaves `canonicalDay` as a genuine gap — it does not shift
  any other day's data.
- **Failed capture** (gate failure, camera error, user cancellation) never creates a
  `timelineFrameId` at all. There is nothing to clean up because nothing was written.
  `sourceCaptureId` may exist ephemerally in-session for retry bookkeeping, but nothing persists
  from a failed attempt.
- **Canonical-frame selection**, when more than one valid capture exists for a day (a same-day
  retake before close): the **most recent successful capture for that day** is the canonical
  frame. This mirrors the existing Qi Se retake-replacement semantics and is the least surprising
  rule — "the last one you took today is the one that counts."

## The timezone gap, closed

`canonicalDay` exists in the current code (`src/ui/qise/app.js:895`) but is derived from the raw
device clock with **no timezone offset persisted anywhere in the repository** — verified this
session. This is a real gap this document closes before PR C can rely on day boundaries:

- **The actual capture timestamp (UTC) and the device's UTC offset at the moment of capture are
  both stored, always, per frame.** `canonicalDay` is derived once, at capture time, from
  local-wall-clock date at that offset, and is then **frozen** — it is a fact about the day the
  photograph was taken, not a live computation.
- **A later timezone change never rewrites an existing frame's historical date.** If a user flies
  from Sydney to London, every frame captured before the flight keeps the `canonicalDay` it was
  assigned in Sydney time, regardless of what the device's timezone reads afterward. This is the
  direct analogue of "restore preserves epistemic history" (below) applied to the clock instead of
  the measurement.
- **Two captures near local midnight, in different offsets, must not silently collide or silently
  split.** Because `canonicalDay` is frozen at capture using the offset recorded *at that instant*,
  a capture at 23:58 local and a second at 00:02 local (a different offset because of travel
  crossing the boundary at exactly that moment) are evaluated independently — each gets its own
  correct local calendar day, and the "one day = one primary frame" rule above applies per
  resulting `canonicalDay`, not per UTC day.
- **Daylight-saving transitions** are just a special case of "the offset changes" — the same
  frozen-offset-at-capture rule handles them with no special-casing needed.
- **Device clock correction** (the user's clock was wrong and later fixes itself, e.g. via NTP)
  is a known hazard: if it moves the day boundary for an in-flight capture, the frozen offset and
  timestamp already recorded make the discrepancy visible and auditable rather than silently wrong
  — this is a "recorded honestly" guarantee, not a "corrected automatically" one; auto-correcting
  a clock discrepancy risks silently reassigning a day, which is explicitly forbidden above.
- **The same canonical day, captured from two devices** (one canonical day, both machines think
  it is "today" in their own local time) is a multi-device conflict, handled by
  `docs/BACKUP_ARCHIVE_FORMAT.md`'s conflict policy, not by this schema — this schema only
  guarantees each device's own frozen local-day computation is internally consistent and honestly
  recorded; reconciling two devices' claims on the same day is a sync-layer decision.

## Alignment is a capture advantage, never a face edit

The guided capture system's existing constraints (stable framing, gate-checked distance/pose —
`src/qise/gates.js`) already produce more consistent raw captures than an arbitrary selfie app.
The Daily Portrait display-frame derivation may add: a stable eye-line rotation, a stable face
scale (crop to a consistent apparent size), a stable crop window, a predictable aspect ratio.

It must never: reshape the face, beautify, smooth skin, reconstruct geometry, alter facial
proportions, or synthesise any missing content. The flick-book feels stable because capture and
alignment are consistent, never because an algorithm changed what the face looks like. This is a
copy and an implementation constraint simultaneously: any alignment step that could be described
as "correcting" or "improving" the face rather than "stabilising the frame" is out of scope for
this feature, full stop, and any such request routes to a new product-owner decision, not a
default extension of "alignment."

## No appearance judgment from the timeline

Direct consequence of `docs/PRODUCT_NORTH_STAR.md`'s non-goals. The timeline may show that a face
changed. It may never, in copy, iconography, sorting, or any UI affordance, imply: "better",
"worse", "younger", "older than expected", attractiveness, weight change, health, stress, beauty,
or symmetry quality. The archive shows change; it does not evaluate it. PR C's language gate
(extending the existing `no-medical-language.test.js`/`no-absolutes.test.js` pattern under
`tests/qise/`) must include this vocabulary explicitly.

## Accessibility and performance

**Accessibility** — any animated timeline playback (flip, crossfade, year timelapse) must respect
`prefers-reduced-motion` and provide an equivalent static control: date scrub, frame-by-frame
step, and a then/now pair view that requires no animation at all. Animation is never the *only*
way to reach a piece of history. Controls are keyboard- and touch-accessible.

**Performance** — a multi-year archive cannot load thousands of full-resolution frames
simultaneously. PR C's design must include a thumbnail/preview tier for scrubbing, lazy decoding,
bounded-memory nearby-frame prefetch, a virtualised timeline (not a DOM node per day), and
off-main-thread decode work where the platform allows it. Benchmarks are run against this repo's
existing low-end Playwright target (`npm run benchmark:low-end`), not assumed from desktop
performance — desktop numbers are not evidence for mobile behaviour on this codebase's own stated
verification protocol.

## Where this lives (forward reference to A3/A4)

The Daily Portrait archive is a **separate module tree and a separate IndexedDB object store**
from `src/qise/store.js`, with its own allow-list guard modelled on (but not merged with)
`FORBIDDEN_KEY_PATTERN`/`findForbiddenKeys()`. This is a direct consequence of a fact established
by reading the code this session: `src/qise/store.js` refuses any record key matching
`/image|pixel|landmark|embedding|blob|dataUrl/i` **on every write**, pinned by
`tests/qise/persistence-shape.test.js`, and that guard is not to be loosened — a Daily Portrait
image is exactly the kind of data that guard exists to keep out of the Qi Se store. Full storage,
backup, and privacy architecture for this new store is specified in
`docs/LOCAL_AND_CLOUD_DATA_ARCHITECTURE.md`, `docs/BACKUP_ARCHIVE_FORMAT.md`, and
`docs/SECURITY_PRIVACY_THREAT_MODEL.md`. Whether it may be written at all is gated on the charter
amendment decision card in `docs/DECISION_CARDS.md`.

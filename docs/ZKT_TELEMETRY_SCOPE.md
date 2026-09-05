# Zero-Knowledge Telemetry (ZKT) — scope document, NOT a decision

**Status: proposal only. Nothing in this document is implemented. No code
exists yet, no test has been relaxed, no copy has changed.** This exists so a
go/no-go decision can be made against a concrete scope instead of an
abstract one. Written in parallel with, and not blocking or blocked by, the
three lighting-consistency engine changes on this branch.

## Why this exists

The lighting-consistency review (this branch) established that the app has
no way to learn how it actually behaves on real customer hardware — no
device is more real than the synthetic fixtures in `tests/` and
`scripts/engine-bench.mjs`. Per the Phase 0 audit already on this repo
(`docs/PHASE_0_BLOCKER_REPORT.md`), there is currently no signed Android
candidate, no iOS target, and no store listing either — so even if ZKT ships
today, there is no installed base to generate data from until distribution
catches up. This is worth building for when that changes, not for an
immediate result.

## What this is not

Not a reversal of the privacy posture. `README.md`, `src/index.html`, and
`src/qise.html` all currently assert, in slightly different words, that
**nothing leaves the device** — that is not marketing copy, it is the
premise the TGA exclusion 14B positioning and the Apple/Play "not collected"
privacy tables in `COMPLIANCE.md` are built on. This document proposes a
narrow, named, auditable exception to that premise. It does not propose
relaxing the premise itself, and if the scope below can't be kept narrow, the
right answer is not to ship it, not to widen it quietly.

## 1. What would be collected — the allowlist

No images. No pixels. No landmarks. No raw scalar measurements (`deltaEi`,
`ita`, anything colour- or geometry-derived). Everything below is either a
platform string or a boolean/small-integer outcome of a check that already
runs on-device today.

| Field | Type | Source |
|---|---|---|
| `deviceModel` | string | `navigator.userAgentData` / UA string, best-effort |
| `browserEngine` | string | derived from UA, coarse (`"blink"`, `"webkit"`, `"gecko"`) |
| `avgFrameProcessTimeMs` | number | already-measured capture-loop timing |
| `applyConstraintsSupported` | boolean | result of the existing `negotiateCaptureMode()` attempt (item 53) |
| `isoEstimate` | `"full"` \| `"degraded"` \| `"unknown"` | `baseline.sensorNoiseConfidence` — Initiative 2 on this branch, already computed on-device |
| `wasmExecutionTimeMs` | number | already-measured MediaPipe init timing |
| `delegateUsed` | `"GPU"` \| `"CPU"` | `getActiveDelegate()`, already exposed for the debug view |

That is the complete list. Nothing else may be added to it without a new
version of this document and a new sign-off — an allowlist that can grow by
a single unreviewed commit is not an allowlist, it is a suggestion.

## 2. The consent model — extend the existing pattern, don't invent one

`src/qise/consent.js` already implements "unbundled opt-in; `withdraw()`
requires an eraser" for the Qi Se tracker's own consent gate. ZKT would be a
**second, separate opt-in toggle** on that same screen — off by default,
never bundled with the existing camera/analysis consent, with its own
withdraw path that stops any further collection immediately. It reuses that
file's existing shape (a boolean state plus a documented eraser) rather than
introducing a new consent primitive.

## 3. The test that would need to change, precisely

**Not a rewrite of `tests/qise/no-network.test.js`.** That file's own header
is explicit: *"Not telemetry, not runtime fonts, not anything... the only
way that claim survives contact with a future contributor is if breaking it
turns CI red."* Its guard is a static source scan —
`/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource)\b/` — matched
against every file in `src/qise/` and `src/ui/qise/`, with **zero**
exceptions today. Repurposing that file to parse and allow SOME network
calls contradicts its own stated purpose and turns a hard static guarantee
("no such identifier exists in this tree") into a soft one ("such an
identifier exists, and we hope it always behaves"). That is a strictly
weaker guarantee, and it is not what should happen to this specific test.

The precise, narrower change:

1. **`no-network.test.js` gets one named exemption**, not a parsing rewrite:
   a single new file — proposed path `src/qise/zkt-analytics.js` — is
   excluded from the `NETWORK` regex scan **by exact filename**, matching
   this repo's own established idiom for narrow exemptions ("only the two
   legal pages use the legal exemption" — item 21/40's "an exact list, not a
   pattern"). Every other file in both trees stays covered with zero
   exceptions, exactly as today.
2. **A new, separate test — `tests/qise/zkt-payload-shape.test.js`** — reads
   `src/qise/zkt-analytics.js` and statically asserts that the object literal
   passed to its one `fetch`/`sendBeacon` call site has keys that are a
   **subset of the table in §1**, by name, using the same `stripComments`
   tokenising approach `scripts/copy-scan.js` and `no-network.test.js`
   already use. This is a shape check on one file's one call site, not a
   runtime payload parser — decidable, mechanical, and it fails closed if
   the file structure changes in a way the checker doesn't recognise.
3. Both tests together are what "zero PII, zero biometric data, zero images"
   means in an enforceable sense: not a promise in a comment, a build
   failure if violated.

## 4. Exact copy diffs

Quoted from the current source, verbatim, so this is reviewable against real
strings rather than a paraphrase.

**`README.md:6`**
```diff
- Runs entirely in the browser — no server, no upload, no account. Installs to an
+ Runs entirely in the browser — no upload, no account, no image or biometric
+ data ever leaves the device. Installs to an
```
(Drops the blanket "no server" claim, since an opt-in telemetry endpoint
would exist; keeps the actually-load-bearing guarantee front and centre.)

**`src/index.html:27`** (inside the no-webfont rationale comment — code
comment, not user-facing copy, but the reasoning it documents needs the same
update)
```diff
- product whose whole claim is that nothing leaves the device, and it is a
+ product whose whole claim is that no image or biometric data leaves the
+ device, and it is a
```

**`src/qise.html:26`** (same pattern, same file class)
```diff
- nothing leaves the device, and the egress guard treats it as a failure. -->
+ no image or biometric data leaves the device, and the egress guard treats
+ anything outside the ZKT allowlist as a failure. -->
```

**`COMPLIANCE.md`** — the Apple "not collected" table (§c, lines ~146-159)
needs new rows added rather than edited, since it is currently "every row is
not collected" and that sentence becomes false the moment ZKT ships:

```diff
+ | Diagnostics — device model, performance metrics | Yes (opt-in) | No | No |
```
with the "every row is not collected" lead sentence rewritten to name the
one exception explicitly, not softened into a generality.

**TGA 14B posture (`COMPLIANCE.md` §"Australian TGA note", lines ~131-142)**
— no wording change proposed. Performance/device-diagnostic telemetry is not
a health claim and does not touch the exclusion's "serious disease" or
"every function must independently qualify" conditions on its own reading —
but this is exactly the item the user themselves flagged as needing
**explicit regulatory-counsel sign-off before shipping**, not an engineering
judgement call. This document does not substitute for that.

## 5. What is still undecided, by design

- Whether `deviceModel`/`browserEngine` collection needs its own explicit
  consent copy naming what a "device model" string can reveal (some UA
  strings are near-unique), or whether the existing camera-consent copy's
  general framing covers it.
- Retention window and deletion mechanism for whatever collects this
  server-side (no server exists yet — this is a v-next-of-v-next problem).
- Whether `isoEstimate` derived from Initiative 2's confidence signal counts
  as "performance" or edges toward "camera capability," which could change
  which store-privacy-label row it belongs under.

None of these block writing the code once greenlit — they block calling the
result *done*.

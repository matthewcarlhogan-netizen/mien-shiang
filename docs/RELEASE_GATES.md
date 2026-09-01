# Release gates

The repository has two intentionally separate release lanes. A disclosed beta
can exercise the core scanner while the commercial-store lane remains blocked.
Passing the beta lane is not a rights clearance, store approval, or readiness
decision for the Qi Se longitudinal tracker and heritage connector depth.

## GATE 1 — DISCLOSED BETA

The beta artefact contains the core scanner only. Its entry point is the legacy
scanner at `index.html`; the Qi Se tracker, heritage connector code, and their
UI/module trees are omitted from `dist-beta/`. The Qi Se safety-authorization
signal remains unset and any connector composition remains fail-closed.

Build and verify it with:

```bash
npm run build:beta
npm run lint:beta
npm run audit:beta
```

The beta must be described as a small, disclosed, entertainment-only test of
the on-device scanner. Its content and limitations must be disclosed to
testers; the beta command does not waive the commercial evidence requirements.

## GATE 2 — FULL PRODUCT / COMMERCIAL STORE

The full product target remains Qi Se measurement + personal history + Heritage
+ Reflection Engine. It requires the rights-clearance and citation-provenance
record for every content family, plus the app-store and real-device evidence in
[`STORE_RELEASE_GATES.md`](STORE_RELEASE_GATES.md).

### Open requirements

| Requirement | State |
|---|---|
| Engine correctness, coverage, traceability, variation | **Closed** — `docs/PARITY_2026-08-17.md`, 10/10 gates |
| Class-A dispositions R1–R14 | **Closed** — `DR-2026-08-17-B020-CLASS-A` |
| Su Wen edition, designated edition families | **Closed** — `docs/EDITION_DECISIONS.md` |
| Three Sections primary source | **Open** — `docs/ACQUISITION_THREE_SECTIONS.md` |
| Twelve Palaces chapter body | **Open** |
| Corpus ownership determination | **Open** — Track 1, `docs/LEGAL_PARALLEL_TRACK.md` |
| Legal requirement 5 × 6 families | **Open** — Track 2 |
| Evidence hashed into the manifest | **Open** |

### Commercial release condition

All content families must be `cleared` in
`docs/commercial-rights-manifest.json`, with citation provenance and hashed
evidence verified by `npm run audit:commercial`. The store and device gates
must also pass. `npm run release:check` is the strict candidate gate and must
remain green before generating or uploading a paid store candidate.

## Audit commands

- `npm run audit:release` reports both lanes without changing their status.
- `npm run audit:beta` requires a correctly built, core-scanner-only beta
  artefact.
- `npm run audit:commercial` reports the full rights/store gate.
- `npm run release:check` fails closed when the commercial gate is not ready.

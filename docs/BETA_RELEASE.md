# Disclosed beta release lane

This lane is for a small, disclosed beta of the on-device core scanner. It is
not a commercial rights clearance, an app-store approval, or a readiness claim
for the Qi Se longitudinal tracker and heritage connector depth.

## Artefact scope

`npm run build:beta` writes `dist-beta/` with the core scanner entry at
`index.html`. The build omits:

- the Qi Se tracker page and module tree;
- the heritage connector and reflection UI tree; and
- the Qi Se connector's optional composition path.

The beta manifest starts at `index.html`, and its service worker does not
precache the omitted feature. `build-info.json` records the `disclosed-beta`
profile and `qiseFeatureEnabled: false`. `npm run audit:beta` checks these
properties and fails if the artefact drifts.

## Required checks

```bash
npm run build:beta
npm run lint:beta
npm run audit:beta
```

`npm run audit:release` also prints the beta and commercial results together.
The commercial result is expected to remain `BLOCKED` until rights-clearance,
citation-provenance, app-store, and device evidence is complete. Use
`npm run release:check` for the strict commercial candidate decision.

## Safety and disclosure

The beta must retain the existing entertainment and limitation disclosures. It
must not present the Qi Se longitudinal or heritage-connector feature as
available. The Qi Se safety-authorization signal is deliberately unset in
production; the connector composition seam therefore remains fail-closed.

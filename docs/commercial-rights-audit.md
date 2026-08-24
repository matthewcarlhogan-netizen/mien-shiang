# Commercial rights audit

Status: **BLOCKED — not commercially cleared**

Last reviewed: 23 August 2026

This document is the release record, not an assertion that unfinished work is
complete. No paid build or store submission may describe the six reading
families as commercially cleared while the manifest and provenance registry
remain pending.

| Content family | Translation/edition rights | Legal approval | Release |
|---|---|---|---|
| Five Elements | Evidence required | Evidence required | Blocked |
| Three Sections | Evidence required | Evidence required | Blocked |
| Twelve Palaces | Evidence required | Evidence required | Blocked |
| Qi Se reading | Evidence required | Evidence required | Blocked |
| Proportion harmony | Evidence required | Evidence required | Blocked |
| Composed Qi Se passages | Evidence required | Evidence required | Blocked |

## Evidence standard

Each family needs all of the following before its status can become `cleared`:

1. a named edition and page/chapter locator for every tradition claim;
2. a written translation/publication licence or a documented public-domain
   determination for every source text and translation;
3. a signed contributor agreement for modern commentary;
4. written legal approval covering the intended paid territories and stores;
5. evidence files recorded in `commercial-rights-manifest.json` with SHA-256
   hashes so the approval checked for release is the approval actually signed.

The release check validates the evidence paths and hashes. Changing a status
word without supplying the signed evidence does not open the gate.

## Current source defects

- The Mian Xiang source is unspecified.
- The Su Wen edition is recorded, but the citation has not been independently
  verified and its public-domain basis is not commercial/legal clearance.
- The neoclassical proportion record now points to modern anthropometric studies
  that challenge the canons as population norms. Those studies are negative
  evidence, not a heritage source or a publication-rights clearance.
- Four classical construct records now have source-level public-domain-by-age
  evidence, but scan/surrogate terms, project translation rights, contributor
  agreements and written legal approval remain separate gates.
- Repository editorial copy has no recorded contributor agreement.


Until those defects are resolved, the product may be tested as an unreleased
experience but must not enter a paid or store-production release lane.

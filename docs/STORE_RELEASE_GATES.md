# Four-store release gates

Status: **BLOCKED — evidence incomplete**

These are the commercial-store gates. They are intentionally separate from the
disclosed core-scanner beta lane described in [`BETA_RELEASE.md`](BETA_RELEASE.md);
a beta pass does not satisfy any gate on this page.

Target: Q4 paid global release

The web scanner is not itself a four-store release. This repository currently
has no signed Android AAB, no iOS target, placeholder Digital Asset Links, no
store-account review records, and no real low-end-device report. Those are
release blockers, not paperwork to complete after launch.

## Shared pass conditions

- Commercial content gate is green with hashed legal, translation and cultural
  approvals.
- Current consent is required before camera, face-map generation, or reading
  access; withdrawal erases local history and consent.
- Release artifact has a verifiable source commit and only same-origin,
  hash-pinned inference assets.
- Store declarations match a network trace and dependency inventory from the
  signed candidate.
- Physical-device report includes model, OS, memory tier, capture path,
  completion rate, failures, p50/p95 capture-to-reading time, long tasks and
  thermal observations. A desktop-throttling result is supporting evidence,
  never a substitute.

## Store-specific evidence

| Store | Required evidence before status becomes approved |
|---|---|
| Google Play | Signed API-compatible AAB; real package ID and signing fingerprints; Play pre-launch report; privacy policy; accurate Data safety form including SDK behavior; camera/consent/deletion test; billing and entitlement restoration for paid digital content. Google states that even apps collecting no data must complete Data safety and provide a privacy policy, and that on-device-only processing is outside its definition of collected data. <https://support.google.com/googleplay/android-developer/answer/10787469> |
| Samsung Galaxy Store | Signed Galaxy candidate; Seller Portal review; privacy-policy URL and in-app policy; country/legal review; Samsung device matrix. Samsung's distribution guide requires a privacy policy for apps that access or process user data and compliance with local law and GDPR. <https://developer.samsung.com/galaxy-store/distribution-guide.html?lang=en> |
| OPPO Software Store | Signed Android candidate; China counsel decision on distribution entity, filings and data handling; Chinese privacy notice/consent; OPPO privacy scan report; OPPO physical-device results. OPPO's developer terms require disclosure of purpose/necessity and consent before personal or sensitive-information processing, and its platform offers an official privacy-detection service. <https://open.oppomobile.com/wiki/index> <https://open.oppomobile.com/audit-open/audit-front-open/privacy/app-manage/AppInitial> |
| Apple App Store | Native iOS target and signed archive; camera usage description; PrivacyInfo.xcprivacy; App Privacy answers; reviewer flow; purchase restoration; device matrix. ATT is not requested when the candidate does not track or access the advertising identifier; any later tracking changes this gate. Apple requires app-level privacy answers including third-party SDK behavior and valid privacy manifests where applicable. <https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy> <https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk> <https://developer.apple.com/app-store/user-privacy-and-data-use/> |

## Current blockers

- `src/.well-known/assetlinks.json` still uses `com.example.mienshiang` and a
  zero certificate fingerprint.
- No Android wrapper or signed bundle exists.
- No iOS project, privacy manifest or signed archive exists.
- No production billing/entitlement service exists.
- No real-device evidence is recorded for the required low-end, Samsung and
  OPPO profiles.
- No store-console declaration or review evidence is recorded.

`npm run release:check` must be green before generating or uploading a paid
candidate. The manual store-release workflow runs the same gate before it will
produce a release artifact.

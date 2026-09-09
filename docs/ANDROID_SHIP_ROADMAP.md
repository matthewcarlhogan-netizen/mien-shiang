# Mien Shiang — scanner-first Android ship roadmap

Status: execution document. Updated 10 August 2026.

## Product boundary

Mien Shiang remains a face scanner. The scanner is the product's entry point,
its evidence source and the origin of every personal seal. The library,
history and share card deepen a scan; none replaces it.

The product does **not** use a face scan to diagnose health, rate appearance,
identify a person, predict an event or infer a stable personality trait. The
reading may address the user directly ("your reading") while attributing the
interpretation to a tradition. Module B remains present as a separately gated,
non-billed safety resource and is never driven by image inference.

The supplied roadmap's Barnum strategy is doomed. Deliberately flattering,
unfalsifiable copy produces a short conversion spike at the cost of trust,
store risk and repeatability. The pivot is deterministic observation,
visible abstention and attributed interpretation—not a weaker scanner.

## Shipped product loop

1. **Consent:** one unbundled decision before camera or MediaPipe startup.
2. **Face scan:** live preview, pose/light/coverage guidance, automatic capture
   only when the frame passes.
3. **Evidence meter:** readable regions and confidence are visible. A hollow
   seal is a product state, not a hidden failure.
4. **Personal reading:** direct, bounded language about the reading; no raw
   scanner decimals, health state, attractiveness, ranking or future claim.
5. **Personal column:** longitudinal comparison is only against the user's own
   prior scans and never interprets a trajectory.
6. **Optional share:** today, seven readings or fourteen readings. The PNG
   contains deterministic seals and bounded copy only—no face image, raw
   measurement, landmark map, device fingerprint or unlock reward.
7. **Scan again:** the return action is always another face scan.

No notification streak, streak loss, invite quota or share-to-unlock ships in
version 1. Sharing is expression, not payment.

## Corrected technical decisions

### Camera and WASM

- Do not promise 30–60 fps or zero camera failures. Launch gates are p95 time
  to a valid capture, main-thread long tasks, peak memory and crash-free scan
  completion on a declared device matrix.
- Keep the current live scanner as the primary path. Prototype worker-based
  inference behind a flag and retain it only if real-device traces improve
  responsiveness without breaking MediaPipe/WebGL compatibility.
- Add a still-photo capture fallback for `NotAllowedError`, `NotReadableError`,
  camera interruption and repeated context loss. It is a fallback, not a claim
  of universal compatibility, and it must use the same consent, local-only
  processing, gates and immediate disposal rules as live capture.
- Close the landmarker, stop every media track, cancel animation frames and
  release canvases after success, navigation, backgrounding or error.
- Cache a pinned MediaPipe runtime and model under versioned names. A first run
  still requires a network until those assets are bundled or hosted on the
  owned origin; the store listing must not claim fully offline first use before
  that is fixed.

### Reading integrity

- Propagate observation validity, confidence and gate margin into eligibility.
  A readable observation near a decision boundary is not an eligible signal.
- Show multiple blocker causes internally and a priority-ordered primary cause
  to the user. Occlusion, light and instability may coexist.
- A retry only resets the anti-reroll counter when at least one signal changes
  from blocked to eligible. A flickering state label is not material progress.
- Bound the reachable composed reading space and enumerate the fixed point from
  seed facts in CI. The forward-chaining rule engine cannot be audited by
  cross-multiplying declared outputs.
- Remove raw measurements from consumer templates and share artifacts.

### Monetisation

- Do not ship the $3.99/week subscription in version 1. The current client has
  no verified entitlement service, purchase restoration, cancellation path or
  validated value loop. A blurred report and local entitlement are theatre.
- Version 1 proves scan completion, retake stability, voluntary share rate and
  seven/fourteen-reading return. Only then test an annual or one-time library
  purchase with named contributors and cleared rights.
- Any Android digital-content purchase must use a Play-compliant billing route,
  server-side purchase verification and restoration. Payment Request alone is
  not an Android Play billing implementation.
- Price, renewal period, trial conversion, next charge and cancellation path
  must be adjacent to the purchase action. No preselected trial and no forced
  continuity.

## Release gates

| Gate | Pass condition | Current state |
|---|---|---|
| Product integrity | Scanner → evidence → reading → optional share works with no forced gate | In progress; share slice implemented |
| Privacy boundary | No image, landmark, embedding or raw metric in persistence/share; consent precedes inference | Automated persistence/share checks present |
| Reading quality | Test-retest agreement measured on real faces and capture-condition matched | Not run |
| Fairness | Completion and abstention rates reported by device/lighting and reviewed across skin-tone bands; no visibly degraded paid experience | Not run |
| Android camera | Successful live and still-fallback scans on low/mid/high Android devices | Not run |
| Performance | p95 scan completion ≤12 s after camera permission; no >250 ms long task during guidance; ≥99% crash-free scan sessions in closed test | Not run |
| PWA | Installable, no console errors, service worker update works, second launch completes offline after assets are cached | Partially automated |
| Store wrapper | Signed AAB targets API 36, Digital Asset Links verify, no Custom Tab chrome | Not started |
| Store policy | Data safety, Health declaration, privacy URL, content rating, camera disclosure and deletion instructions agree with artefact | Not started |
| Closed test | If the account is a new personal account: 12 opted-in testers continuously for 14 days, feedback logged and fixes released | Unknown account status |

Any failed privacy, real-device camera, fairness or store-policy gate blocks
production. A failed share-rate or conversion target changes positioning; it
does not justify manipulative mechanics.

## Execution sequence

### Milestone 0 — release truth (now, 1–2 days)

- Make `qise.html` the Android product start surface.
- Finish the optional daily/seven/fourteen-reading share card and native-share
  fallback.
- Remove raw values and health-adjacent trait language from the consumer view.
- Add UI tests for privacy-minimised share models and direct-but-bounded copy.
- Update the service-worker shell and perform mobile/desktop visual checks.

Exit: all repository tests, artefact lint and build pass; no new network host.

### Milestone 1 — scanner reliability (3–5 days)

- Add a `CaptureSession` lifecycle owner for stream, landmarker, animation frame,
  canvas and cancellation state.
- Add still-photo fallback with explicit error states and a manual retry.
- Record local-only diagnostic events: gate mask, confidence bucket, duration
  bucket, capture path and terminal outcome. Never record an image, coordinate,
  raw colour value or stable device identifier.
- Run 30 repeated scans across at least three Android performance tiers and
  three lighting conditions. Publish completion, abstention and p95 latency.

Exit: the Android camera and performance gates pass on physical devices.

### Milestone 2 — interpretation integrity (parallel, 1–3 weeks)

- Audit every scientific citation for existence, claimed use and sign
  convention.
- Audit every tradition claim. Unsourced prose is unpublished content, not a
  source.
- Start contributor agreements, rights clearance
  governance immediately; this is the longest-lead workstream.
- Introduce source IDs and contributor attribution without calling commissioned
  commentary "scholarship" in store copy.

Exit: every shipped interpretation is sourced, attributed or explicitly marked
as modern commentary; contested interpretations are visible.

### Milestone 3 — Android wrapper (2–3 days after HTTPS origin exists)

1. Deploy the tested `dist/` artefact to an owned HTTPS origin.
2. Generate a TWA project from the deployed manifest with Bubblewrap.
3. Set package ID, versioning, minimum SDK and **target SDK 36**.
4. Generate upload signing material outside Git; enrol in Play App Signing.
5. Publish `/.well-known/assetlinks.json` with both local upload and Play app
   signing fingerprints during their respective test paths.
6. Build a signed AAB, install a debug/release candidate, confirm Digital Asset
   Links verification and run a complete physical-device scan.

Representative commands (values must be supplied from the owned origin and
Play Console):

```powershell
npm test
npm run build
npm run lint:bundle
npx @bubblewrap/cli init --manifest=https://YOUR_ORIGIN/manifest.webmanifest
npx @bubblewrap/cli build
Set-Location android
.\gradlew.bat bundleRelease
```

Do not commit the keystore, passwords, Play service credentials or generated
face data.

#### Deployment detail (merged from `DEPLOY.md`, 9 September 2026)

Two hard blockers, both confirmed rather than assumed, are why this milestone
needs a human at a real terminal rather than an agent session: **Bubblewrap's
first run is interactive** (`bubblewrap init` walks through package id, app
name, colours and signing details; run non-interactively it dies with
`ERR_USE_AFTER_CLOSE: readline was closed`), and **there is no HTTPS origin
yet** — TWA rejects HTTP outright, and creating a hosting account is a
product-owner action. Bubblewrap manages its own JDK/Android SDK versions on
first run; do not pre-install them.

**Hosting choice is not arbitrary — pick Netlify or Cloudflare Pages, not a
GitHub Pages *project* site.** Digital Asset Links must be served from the
origin **root** (`https://<host>/.well-known/assetlinks.json`). Netlify
(`yoursite.netlify.app`) and Cloudflare Pages (`yourproject.pages.dev`) each
give you the root of that subdomain. A GitHub Pages project site
(`username.github.io/mien-shiang/`) has its origin root — `username.github.io`
— served by a *different* repository you don't control from here, so
`assetlinks.json` cannot be placed for it and TWA verification cannot pass,
unless you also own that user-site repo or attach a custom domain. **Publish
directory is `src/`** — `scripts/serve.js` is a local dev server only, never
deployed.

After deploying, verify by hand before building anything:
```bash
curl -i https://<your-host>/manifest.webmanifest     # expect 200, application/manifest+json
```
Then open the URL on an Android phone in Chrome — it should offer *Install
app* / *Add to Home screen*. If not, stop; the APK will not work either, and
the reason is in the Manifest panel of remote DevTools
(`chrome://inspect` with the phone connected).

**Digital Asset Links is where this usually goes wrong, and fails silently:**
if verification fails, the app still runs, but with a browser address bar
across the top — which defeats the whole point. Get the fingerprint with
`bubblewrap fingerprint --help` and check what your installed version
actually does: Google's own ChromeOS documentation says Bubblewrap no longer
generates `assetlinks.json` and directs you to the `fingerprint` command,
while several current third-party guides still describe it as generating the
file — trust your installed binary over either. Place the result at
`src/.well-known/assetlinks.json`, redeploy, then confirm it is actually
reachable (`curl -i https://<your-host>/.well-known/assetlinks.json`) — some
static hosts silently 404 dotted directories.

**The fingerprint gotcha:** if you ever enrol in Google Play App Signing,
Play re-signs your upload with a *different* key, and the fingerprint in
`assetlinks.json` must then be the one shown in the Play Console — not the
one from your local keystore. This is the single most common cause of a TWA
shipping with a visible address bar. For a sideloaded APK, the local keystore
fingerprint is correct.

**The gate, on a physical device:** opens full screen with no address bar
(if there is one, back to the Digital Asset Links step), shows the icon on
the home screen, still renders in airplane mode. **Back up the keystore the
moment it is created** — losing it means never shipping an update under the
same identity; it is already in `.gitignore`, keep it that way.

The three icons are valid and correctly sized but remain **placeholder art**
— replace them before any public listing; the icon is the app's only
branding surface on a home screen. Before any Play Store listing: Google
applies additional policy to health-related apps, and in some jurisdictions a
skin-assessment tool can fall within medical device regulation — the
constraint that referral output never names a disease is deliberate and
load-bearing (see CLAUDE.md); do not weaken it to make a listing more
compelling, and treat store-policy fit as a question for a qualified adviser,
not something to resolve in code.

### Milestone 4 — Play Console and closed test (minimum 14 days when required)

- Create the listing with face-scanner screenshots from a real release build.
- Use an active public HTML privacy-policy URL and provide in-app access.
- Complete Data safety even if no data leaves the device. Declare the actual
  local collection/processing and camera use; do not equate "not uploaded"
  with "not collected."
- Complete the Health apps declaration accurately. If the artefact contains no
  health feature, certify that; if Module B or any copy crosses that boundary,
  declare it and satisfy the resulting requirements.
- Run internal test, Play pre-launch report, then the required closed test.
- Give testers a script covering consent, denied camera, live scan, low light,
  hollow seal, today/week/fortnight share, offline second launch, export and
  deletion.

Exit: no critical pre-launch finding, no disclosure mismatch, required testing
period complete, and all launch gates have recorded evidence.

### Milestone 5 — staged production

- Release to 5%, hold for 72 hours, then 20%, 50% and 100% only if crash-free
  scans, capture completion, deletion and share paths stay within gate.
- Roll back on privacy regression, camera crash cluster, Digital Asset Links
  failure, interpretation/citation defect or disclosure mismatch.
- Weekly product review uses scan completion, voluntary share, seven/fourteen
  reading return and abstention—not streaks, notification opens or invite spam.

## Next five commits

1. `feat: ship private Qi Se share cards from the face scanner`
   - Daily, seven-reading and fourteen-reading cards; native share or PNG.
   - No face photo, raw metric, landmark, fingerprint or reward gate.
2. `fix: own and dispose the complete scanner lifecycle`
   - One capture session controls stream, frame loop, MediaPipe task and canvas.
   - Adds cancellation on navigation/background/error and memory regression tests.
3. `feat: add consent-preserving still-photo scanner fallback`
   - Handles unavailable/interrupted live camera without changing local-only
     processing or evidence gates.
4. `test: add real-face repeatability and Android capture gate harness`
   - Produces local aggregate reports for stability, abstention, fairness and
     performance without retaining face data.
5. `chore: generate API-36 TWA and Play closed-test release workflow`
   - Adds Android wrapper, Digital Asset Links checks, signed-AAB workflow and
     human-held Play signing boundary.

## Current external requirements

- Google Play requires new apps and updates to target Android 16/API 36 from
  31 August 2026: <https://support.google.com/googleplay/android-developer/answer/11926878>
- A new personal developer account may require 12 opted-in closed testers for
  14 continuous days before applying for production:
  <https://support.google.com/googleplay/android-developer/answer/14151465>
- Every published app completes Data safety and supplies a privacy policy, even
  when it declares no collected/shared data:
  <https://support.google.com/googleplay/android-developer/answer/10787469>
- Every published app completes the Health apps declaration, including an app
  certifying that it has no health features:
  <https://support.google.com/googleplay/android-developer/answer/14738291>
- TWA ownership depends on Digital Asset Links; failed verification degrades to
  a Custom Tab:
  <https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities>

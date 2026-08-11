# COMPLIANCE.md

Store declaration answers, derived from the actual implementation.

**Every answer below describes what the app does today.** Where a planned
integration does not exist yet, the answer says so rather than describing it as
live — a Data Safety form that declares collection which does not happen is as
wrong as one that omits collection which does.

Two build flavours, produced by `npm run build` and distinguished by
`MODULE_B_SAFETY_REFERRALS` in `src/flags.js`:

| | Entertainment | Wellness |
|---|---|---|
| Flag | `false` | `true` |
| `build-info.json` flavour | `entertainment-only` | `wellness` |
| Module B in the artefact | stubbed out (3 files) | shipped |
| Health declaration | does not exhibit health features | health-adjacent |

Verify which one you built before submitting: `dist/build-info.json` records it,
and the About screen displays it.

---

## a. Google Play — Data Safety form

### Does your app collect or share any user data?

**No.** Not in either flavour, as currently built.

The form's definition of "collect" is transmission off the device. Nothing is
transmitted. Answer **No** to collection and **No** to sharing for every data
type, including the ones a reviewer will expect a face app to declare:

| Data type | Collected | Shared | Notes for the reviewer |
|---|---|---|---|
| Photos | No | No | Processed on-device, held in memory for one reading, discarded. No upload endpoint exists. |
| Face / biometric data | No | No | 478 landmark coordinates plus colour and texture values, computed on-device, never transmitted, never written to storage. |
| Personal identifiers | No | No | No account, no sign-in, no device or advertising identifier. |
| Health & fitness | No | No | See the Health declaration below. |
| App activity / analytics | No | No | No analytics SDK of any kind. |
| Crash logs | No | No | **Not integrated.** See "If Sentry is added" below. |
| Purchases | No | No | **Not integrated.** No payment code in the build. |
| Location, contacts, messages, files | No | No | Not accessed. |

**Evidence:** `scripts/lint-bundle.js` runs on every build and fails it if any
network destination outside the allowlist appears in the artefact, or if any
`fetch`/`sendBeacon`/`XHR` call references a value from the analysis pipeline.
The allowlist contains only the MediaPipe WASM runtime and model — two static
asset downloads that send nothing about the user.

### Is all user data encrypted in transit?

The honest answer, and the one to give: **no user data is transmitted, so this
question does not apply.** Play's form does not have a clean "not applicable"
for this, so if a value is forced, answer **Yes** — every request the app makes
is HTTPS — and use the free-text field to state that the requests are asset
downloads carrying no user data.

Do not answer "Yes, encrypted in transit" without that clarification. It implies
user data is in transit.

### Do you provide a way for users to request that their data be deleted?

**Yes.** No image or landmark map is retained and nothing is stored on a
server. The Qi Se tracker stores a small derived reading record in the user's
browser. “Withdraw consent and delete everything” clears those records and the
consent record together; uninstalling or clearing site data also removes them.

A contact address for requests is published in the privacy policy
(`privacy@[yourdomain].com`, 30-day response commitment), because the right to
make a request exists whether or not we hold anything to act on.

### If Sentry is added later

Change this section before enabling it, not after. Declare:

- **Crash logs — collected, not shared.** Device model, OS version, app version,
  anonymised stack trace. Purpose: app functionality and diagnostics. Not linked
  to identity. Not used for tracking.
- Add `*.ingest.sentry.io` to `EGRESS_ALLOWLIST` in `scripts/lint-bundle.js`;
  until then the guard will fail the build, which is intended.
- Update `src/privacy.html` — the "Not currently active" block must go, and the
  policy must be republished before the first crash report is sent.

---

## b. Google Play — Health apps declaration

### Entertainment build (`MODULE_B_SAFETY_REFERRALS = false`)

> **Does not exhibit health features.** The safety referral module exists in
> source but is compiled out via feature flag. The app makes no health claims,
> collects no health data, and provides no diagnostic, treatment, or
> condition-detection functionality.

**This is now literally true of the artefact, not just of its behaviour.** The
build replaces `adapters/safety.js`, `rules-b.js` and `modulebview.js` with
stubs, so the referral logic, its thresholds and its copy are absent from the
shipped files. Confirmed by inspection of `dist/`: none of "circulation",
"iron levels", "dermatologist" or "not as a diagnosis" appears.

What remains, and is not a health feature:

- A **disclaimer** stating the app is not a medical device and does not
  diagnose, treat, cure or prevent disease. Saying what the app is not is not a
  health claim.
- A line in the consent gate advising a user to see a doctor if a symptom
  worries them. This is a safety statement, not a health function: it is
  unconditional copy shown to everyone and is not produced by any analysis.

### Wellness build (`MODULE_B_SAFETY_REFERRALS = true`)

> **Contains health-adjacent features** (complexion safety referral). Not
> regulated as a medical device. Provides traditional wellness context and
> refers users to healthcare professionals where indicated. Does not diagnose,
> treat, or detect conditions.

Supporting detail if asked:

- The referral fires on measured colour criteria and tells the user only that a
  clinician should look, plus what to mention. It never names a disease —
  enforced by `tests/copy-guard.test.js` across every rule payload in both
  modules.
- Referrals are **never billed, paywalled or placed behind a subscription**, in
  either flavour. There is no price, tier or entitlement parameter anywhere in
  `adapters/safety.js`, and a test asserts none can be added.
- The referral pre-empts the reading rather than sitting beside it, so a user is
  never shown reassuring entertainment content next to a referral.

### Australian TGA note (not a Play question, but the same evidence)

The wellness flavour is positioned under the general health/wellness exclusion
(exclusion 14B, s41BD *Therapeutic Goods Act 1989*). Two features of that
exclusion drive the design: it does not apply to software making claims about a
**serious** disease, and **every** function must independently qualify or the
exclusion is void for the whole product. Hence the absolute prohibition on
disease names in any module, and the module split itself.

The entertainment flavour does not rely on the exclusion at all: with no health
claims and no health function, it is not a medical device to begin with. That is
the stronger position, which is why the flag exists.

---

## c. Apple App Store — privacy nutrition labels

For the current build, every row is **not collected**. Listed exhaustively
because "not collected" is only credible if the list is complete.

| Data type | Collected | Linked to identity | Used for tracking |
|---|---|---|---|
| Contact info (name, email, phone, address) | No | — | No |
| Health & fitness | No | — | No |
| Financial info | No | — | No |
| Location (precise or coarse) | No | — | No |
| Sensitive info | No | — | No |
| Contacts | No | No | No |
| User content — **photos** | **No** | — | No |
| User content — audio, other | No | — | No |
| Browsing / search history | No | — | No |
| Identifiers (user ID, device ID) | No | — | No |
| Purchases | No | — | No |
| Usage data | No | — | No |
| Diagnostics (crash, performance) | No | — | No |
| Other data | No | — | No |

**Apple's "Data Not Collected" declaration is available and correct**, because
no data is transmitted off the device.

Two points a reviewer may raise:

- **Photos.** The app uses the camera. Apple's label concerns data *collected by
  the developer*, and the photo never reaches the developer. Answer "not
  collected" and be ready to explain the on-device pipeline.
- **The `sessionId` in a user report.** Random per session, regenerated every
  page load, derived from nothing about the device or person, and not currently
  transmitted anywhere. It is not an identifier under the label definitions. If
  Sentry is enabled, reclassify **Diagnostics** as collected / not linked /
  not used for tracking, and revisit this row.

---

## d. Regulatory posture summaries

### Illinois BIPA

All facial analysis happens on the user's own device. No image, face map or
biometric identifier is transmitted to us or to any third party, and images and
maps are destroyed after measurement. The Qi Se tracker retains only allow-
listed derived values in the user's local browser database. Those values are
not linked to identity, because the app has no accounts or sign-in, and they can
be deleted in the app. Nothing is sold, leased, traded or otherwise profited
from. Written notice and consent are obtained before the camera is first used.
This is recorded as disclosure, not as a claim of exemption.

### California CCPA/CPRA

We do not sell or share personal information, and never have. Because no sale or
sharing occurs, no "Do Not Sell or Share My Personal Information" link is
required; the privacy policy states that explicitly rather than leaving its
absence to be inferred. Facial geometry is treated as sensitive personal
information and is processed solely to deliver the reading the user asked for,
on their own device, with no retention and no secondary use. Rights to know,
delete and correct are honoured through the published contact address, with the
truthful answer in almost every case being that we hold nothing about the
requester.

### EU/UK GDPR

The facial image and the measurements derived from it are special category data
(biometric data processed to uniquely identify — treated as such conservatively,
even though no identification occurs here). The lawful basis is **explicit
consent** under Article 9(2)(a), obtained on a blocking screen before first
camera use, with affirmative action required and no pre-ticked boxes. Consent is
withdrawable at any time by revoking camera permission or deleting the app.
Processing is on-device, so there is no controller-held personal data, no
international transfer, and no processor. Data minimisation and storage
limitation are satisfied structurally rather than by policy: the data cannot be
retained because nothing writes it anywhere. Rights of access, rectification,
erasure, restriction, objection and portability are honoured via the published
contact address.

### Australian Privacy Act 1988 (APPs)

The Privacy Act definition of **sensitive information** includes biometric
templates and biometric information used for automated biometric verification
or identification. This product does neither, but treats the temporary face map
conservatively: consent precedes processing, collection is minimised, the map
exists only in memory, and persisted derived readings are allow-listed and
user-deletable. No cross-border disclosure occurs because neither the map nor
the readings leave the device. This is a privacy-by-design posture, not a claim
that local execution automatically satisfies every APP obligation. Note that exclusion from medical-device
regulation is not exemption from the Australian Consumer Law — the reading is
presented as tradition, and objective efficacy claims are avoided precisely
because the organ-to-region correspondences have no competent and reliable
scientific evidence behind them.

---

## Verification

These answers are checked by code, not memory:

```bash
npm run build        # writes dist/ and build-info.json
npm run lint:bundle  # egress, blocklist, attractiveness, biometric-egress
npm test             # includes the copy, report and about guards
```

`npm run lint:bundle` must be run against **both** flavours before a submission
that claims either declaration.

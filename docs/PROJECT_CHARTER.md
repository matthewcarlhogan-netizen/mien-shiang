# Project charter

## Product

Mien Shiang is a scanner-first, on-device entertainment and self-discovery experience inspired by classical Chinese face-reading traditions. It turns eligible facial geometry and personal colour-baseline signals into reflective, non-diagnostic readings. It does not identify a person or determine health, attractiveness, destiny, protected traits or fixed character.

The live product should run its capture, measurement, eligibility and interpretation logic on the customer's device. Raw camera frames are processed in volatile memory, are not uploaded and are not persisted. Only explicitly allow-listed derived records may be stored locally.

## Experience standard

The interface must feel authored, restrained and premium: high-contrast editorial composition, deliberate typography, deep neutrals, subtle material texture, exact spacing, sharp geometry and legible data visualisation. Avoid generic mystical imagery, purple glow, stock starfields, arbitrary gradients, glass-card grids, default component-library styling and decorative charts without information value.

Design review asks whether every screen expresses this product's specific ideas—regions, balance, change, attention and reflection—rather than whether it merely looks polished. For the detailed visual-research, authorship and review requirements, read `docs/VISUAL_DIRECTION.md` before changing any user-facing visual experience.

## Personalisation standard

The product should feel bespoke because it reflects the person's eligible observations and their own history over time—not because it pretends to know hidden traits, predict outcomes or generate ungrounded claims.

Each daily reading should reveal depth in controlled layers:

1. A concise daily reflection.
2. A plain-language account of the approved, eligible observations and/or personal-history pattern that selected it.
3. Optional cultural or symbolic context, clearly distinguished from observation.
4. An optional gentle ritual or journalling prompt.

Personalisation must be deterministic, traceable and bounded. Reading assembly uses approved, stable copy modules and evidence-backed eligibility rules; it must not rely on free-form improvisation to manufacture specificity. Each user-facing variant requires a stable ID, a clear selection reason, safe copy and an abstention/fallback state.

Writing must be intriguing, precise and humane—not cryptic for its own sake, generic therapeutic affirmation or an interchangeable horoscope. A passage should reward a second reading through a concrete image, a considered turn of phrase or a useful question; it must not intensify certainty beyond its evidence. If the same wording could be pasted unchanged into any generic astrology, wellness or AI app, it fails the specificity review.

When evidence is weak, incomplete or ineligible, the experience should remain graceful and valuable through an honest reflection or calibration prompt. It must never simulate bespoke certainty.

## Technical posture

The current repository is a plain-JavaScript PWA with a copy-style build, MediaPipe Tasks Vision and Playwright. Do not describe it as React/Vite or dependency-free. A framework migration requires an approved decision record and migration plan.

The Android direction is a Trusted Web Activity distributed through Google Play. It requires HTTPS hosting, service-worker/offline correctness, lifecycle cleanup, real-device evidence and Play-compliant billing if paid digital features are introduced. “Zero runtime cost” is an objective, not permission to omit required security, billing verification or operational controls.

## Content and evidence

- Approved source families currently include *Shen Xiang Quan Bian*, *Ma Yi Shen Xiang*, *Ling Shu*, and the limited source uses recorded in the repository.
- *Su Wen* must be cited with the relevant chapter and is not authority for modern medical claims. Chapter 17 palette similes do not authorise diagnosis.
- The Five Mountains/Five Stars geometry is distinct from the Twelve Palaces. In that system the nose/central mountain is Earth.
- Source disagreement must be retained as disagreement, not silently normalised.
- Exact landmark mappings require implementation evidence. Unknown indices use `needsVerification: true` and are ineligible for production readings.

## Commercial posture

No ads and no weekly subscription are the present product direction. Exact prices, launch SKUs and entitlement design are not implemented facts unless recorded as approved in `docs/DECISION_REGISTER.md`. Paid digital access on Android must use a compliant billing and entitlement model, including restore/recovery behaviour.

## Compliance posture

Maintain the repository's blocked divination, medical and protected-trait language rules. On-device processing reduces data exposure but does not cure deceptive copy or consumer-law risk. Any EU AI Act Article 50 notice requirement remains subject to documented legal/product classification; do not state a conditional legal conclusion as settled law.


## Amendments — 17 August 2026

Recorded under `DR-2026-08-17-B020-CLASS-A`. Where these conflict with anything
above, these govern.

### Safety gates

The charter previously named two critical safety gates that override
interpretation. **One of them has never been able to run.**

- **Diagonal earlobe crease — WITHDRAWN from v1.** The MediaPipe canonical face
  model contains no auricle geometry: no helix, antihelix, tragus, concha or
  lobule vertex, and only ten of its 468 vertices sit posterior to z = −1.5. The
  gate cannot be evaluated from a front-facing capture and never could.
  `src/engine.js:227` already recorded `diagonal_crease: "needs an ear detector;
  the face mesh has no earlobe points"`. Reinstating it requires a separate ear
  detector, a separate capture pose, its own consent and its own failure mode —
  a project, not a fix.
- **Malar rash — RETAINED, with non-specific copy.** The gate suppresses all
  downstream output and shows a generic message. **It does not name the
  finding.** Naming a clinical sign is a device claim regardless of the wrapper,
  so the user is told the image cannot be analysed and that a professional may
  be worth speaking to — not what was seen.
- **Gate precedence is programmatic.** Any fired gate suppresses everything
  downstream, heritage content included, enforced by a negative test rather than
  by convention.
- **假神 (false shen) is removed from the rule system.** Its cardinal sign is
  malar flush — the same pixels the malar gate owns — and 靈樞·五色 attaches an
  explicit mortality prediction to that appearance.

### Constructs

- The six enduring constructs are **Three Sections 三停, Five Elements 五形人,
  Twelve Palaces 十二宮, Five Mountains 五岳, Four Rivers 四瀆, Five Officers
  五官**. "Three Courts" is withdrawn as an unattested English rendering.
- **Harmony is not one of them.** It is a computed proportion score and is
  labelled as our own measure, not a tradition claim.
- **Five Elements ships as five types** with the source's twenty-five-type
  structure stated openly. The tonal subdivision has no visual correlate.
- **北岳 = 頦**; 頷 and 地閣 versioned as alternatives. **中岳 = 鼻**, abstaining
  because prominence is not recoverable front-on.
- **Laterality is subject-side**, enforced by a CI mirroring test. The 男左女右
  rule is rejected: unattested, and it would make output depend on declared
  gender.

### Claims

The fourteen prohibited inferences in `docs/OPTION_B_020_DOSSIER.md` §10.2 are
absolute product constraints in every mode, free or paid. No lifespan,
mortality, prognosis, wealth, rank, character, intelligence, criminality, race,
emotion or named-condition output.

### Engine posture

The Reflection Engine is the **internal development default**. Public release
behaviour remains the passage engine until the heritage rights and legal gates
close: source edition and precise locator, translation/publication rights or a
recorded public-domain determination, signed contributor agreement for modern
commentary, written legal approval, and evidence hashed into the manifest. The
split is enforced by origin allowlist so that a misconfigured build fails closed.

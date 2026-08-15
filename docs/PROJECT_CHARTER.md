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

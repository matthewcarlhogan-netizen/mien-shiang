# Proposal: Spiritual Scanner — Definition & Purpose

## Provenance and authority

- **Status:** proposed, not approved
- **Captured:** 15 August 2026
- **Origin:** conversation-derived text supplied by the product owner during cloud-agent planning
- **Verification state:** the source was not verified against the repository before it was written
- **Authority:** this file preserves an idea for a product decision. It is not a specification, implementation fact, source record, legal conclusion or instruction to an agent. `AGENTS.md`, the project charter and the decision register take precedence.

The source is retained verbatim below so its useful product intent is not lost. It must be read with the following corrections and conflicts.

## Known disproven or conflicting claims

Claims in the preserved source:

- It names `verify-release.mjs` as the release gate. That file does not exist; the repository uses `scripts/check-release.js`.
- It names seven build-time roles. The approved operating model currently defines ten roles with different names and ownership.
- It calls the enduring layer “four structural families” while listing six.
- It places five-element face-shape typing in the backlog, but the repository already implements and tests that reading family.
- It describes a fully transient-gated, parallel corpus across structural constructs. Qi Se already implements personal-baseline history and intensity bands, but the proposed Shen burst-variance measurement, baseline-relative tension delta and cross-construct transient corpus are not established production contracts.
- Phrases such as “who you tend to be”, “temperament” and “disposition” may conflict with the charter's prohibition on fixed character judgements. They require an explicit product and compliance decision, not merely softer copy.
- Its EU AI Act summary and proposed belief-language boundary are conversation claims, not settled repository legal conclusions. The decision register keeps the classification unresolved.

Disproven claims from the surrounding conversation that are not all repeated in the verbatim source:

- The shipped stack is a plain-JavaScript PWA, not Vite.
- The copy scanner already uses word-boundary matching; it is not a naive substring scan.
- The exact identifiers `intensityBand`, `historyStage` and `transientTrigger` are not current repository contracts. This does not mean Qi Se history or banded daily comparison is absent.

## Decision this proposal raises

The actionable question is not whether to accept this document wholesale. It is whether the product should remain an enduring portrait enhanced by the existing Qi Se longitudinal comparison, or expand into a daily loop requiring additional verified transient measurements and parallel corpora. That decision is recorded as `DR-2026-08-15-DAILY-LOOP` in `docs/DECISION_REGISTER.md`.

---

## Verbatim conversation-derived source

Mien Shiang: Spiritual Scanner — Definition & Purpose

What it is

An on-device face-reading app that functions as an alternative to horoscopes — swapping birth-time as the input for facial geometry as the input. Using on-device computer vision (MediaPipe FaceLandmarker: 478 landmarks, iris tracking, 52 blendshapes; no server, no uploads, no account), it reads the face through a layered stack of classical Mian Xiang constructs and reflects back a person's temperament, disposition, and inner orientation as personal, meaningfully vague insight grounded in the classical texts.

The constructs — two layers, doing different jobs

The enduring portrait — structural, stable, read once and deepened over time:

Three Courts — vertical proportion, the overall register of a face

Twelve Palaces — life-domain regions

Five Elements — Wood/Fire/Earth/Metal/Water temperament

Five Officers (五官) — examining/eyes, judging/nose, communication/mouth, shielding/brows, hearing/ears

Five Mountains (五嶽) — structural prominence: forehead, chin, left cheek, right cheek, nose

Four Rivers (四瀆) — receptive apertures: ears, eyes, mouth, nose (nose sits deliberately in both Mountains and Rivers — structure versus aperture, two qualities of one feature)

The daily weather — what actually makes a daily scan worth taking:

Qi Se (氣色) — complexion as deviation from the user's own baseline (客色 against 主色), never a score

Shen (神) — gathered, scattered, or veiled: gaze stability and presence, measured as variance across the capture window

Tension delta — micro-asymmetry at jaw and mouth, read against the user's own structural asymmetry baseline

Intensity and history — where today sits against the user's own past readings

Each of the four structural families carries its own parallel insight corpus, and every insight is gated on transient state. The reading is the intersection: a stable Southern Mountain crossed with scattered Shen produces something neither says alone.

Purpose

Orientation, not prediction. The enduring portrait tells you who you tend to be. The daily scan tells you where you are today against that — which palace is lit, how your Qi has shifted, whether your spirit is gathered or scattered, what you're holding in your jaw. The same psychological job a horoscope does: a small, dignified ritual that gives shape to a day and a vocabulary for a mood. Rooted in your face rather than your birth chart, and in a tradition with two thousand years behind it rather than a content calendar.

Bespoke, not AI slop — and how that's actually achieved

No runtime AI, no LLM call, no server. Every line is hand-authored against a named classical source and assembled deterministically. Distinctiveness comes from four places, none of them generation:

Permutation depth — nineteen structural construct-states, each with its own corpus, crossed with four transient variables and personal history. Specificity emerges from the intersection, not from the sentence.

Attribution as craft — claims carry their source in-string. The precise thing generic AI copy structurally cannot do.

Self-comparison only — indexed against the user's own history, never other users, never a norm. Nobody else can receive your reading.

Editorial severity — brutalist dark-mode typography, monochrome, film grain, sharp geometry. No glowing orbs, no purple gradients, no default shadows. The visual language of a well-made almanac, not a wellness app.

The standing tension worth holding: aphoristic, confronting copy pulls against in-string attribution. The resolution is craft, not compromise — attribution woven into the line rather than bolted after it.

Positioning and boundaries

Entertainment and self-discovery. Not diagnosis, not prediction, not a score. Architectural as much as legal: nothing leaves the device, no fate/destiny/fortune/luck vocabulary, no organ or health mapping, no attractiveness rating, no streaks, no loss-guilt, no comparison to other users.

The app reads temperament, attention, and inner orientation — how a person processes, weights, and attends. It reads Shen as presence and vitality. It does not infer, assert, or imply what anyone believes: no religion, no philosophy of life, no politics. That boundary is enforced in the blocklist at the level of belief-attribution language, not left to the corpus author's judgement.

Excluded constructs (genuine collision risk): 13-position age-map, mole reading, nasolabial authority lines, philtrum reading, five-eye proportion.

Backlog, gated behind corpus authoring catching up: eyebrow sub-typology, five-element face-shape typing.

How it gets built

A team of specialised agents, each owning one domain — Chief Architect, Geometry Engineer, Qi Se Engineer, Corpus Author, Compliance Auditor, Interface Engineer, Release Gatekeeper — writing the actual logic and content the app runs on.

Critically, this is a build-time authoring team, not a runtime architecture. Their output is static, deterministic JavaScript and JSON that ships and runs entirely client-side, gated by verify-release.mjs before anything reaches a user. Zero agent calls, zero LLM calls, zero server, at runtime. The intelligence goes in during authoring; what ships is craft, frozen.

Sources: EU AI Act Regulation (EU) 2024/1689, Art 5(1)(g) (prohibited biometric categorisation inferring race, political opinions, trade union membership, religious or philosophical beliefs, sex life, sexual orientation; in force 2 February 2025) and Art 50(3) (deployer disclosure obligation for biometric categorisation, applicable 2 August 2026). Given the stakes and that this reverses a decision in your document, verify the Art 5(1)(g) reading against current Commission guidance or counsel before locking the corpus rules — I'd rather you check me than take it on my word.

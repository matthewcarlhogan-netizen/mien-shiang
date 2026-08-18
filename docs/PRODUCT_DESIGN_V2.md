# mien-shiang — product design v2

**The best version of this app, given what B-020 established.**

Status: proposal. Supersedes nothing until the product owner accepts it.
Base: `main` @ `66d43b1`. Written 17 August 2026.

---

## 0. The one decision everything else follows from

The app currently has one implicit claim: *we measure your face and tell you
something true about you.* B-020 killed that claim. Face-to-trait inference sits at
51.1% against 50% chance with a Bayes factor over 1000 for the null. Shen has never
been operationalised. The tension signal is smaller than the lens distortion in a
selfie.

**But the product doesn't need that claim, and it's stronger without it.**

There is exactly one measurement in this codebase that survives the evidence review,
and you already built it:

> **Qi Se is a within-subject, self-referenced, longitudinal comparison against the
> user's own personal baseline.** It never claims to know what a face *means*. It
> claims only that today's reading differs from your own recent readings, by this
> much, with this confidence.

That is a defensible measurement. Every criticism in the dossier — physiognomy,
ancestry confounding, between-subject trait inference, personality determinism —
attacks *between-subject* claims. A within-subject delta against your own baseline
is immune to all of them, because the confound is held constant: it's the same face.

So the architecture splits cleanly, and it splits along a line your code already has:

| Layer | Directory | What it is | What it claims |
|---|---|---|---|
| **Measurement** | `src/qise/*` | Qi Se: colour and lustre, self-referenced, personal baseline, day-over-day | "This differs from your own baseline by X, confidence Y" |
| **Heritage** | `src/reading/*` | Twelve Palaces, Three Sections, Five Elements, Five Mountains, Four Rivers, Five Officers | "This is what 太清神鑑 says about this region. Here is the text. Here is where sources disagree." |

**Two layers, two epistemics, never blended.** The measurement layer is honest
because it's within-subject. The heritage layer is honest because it's attributed,
sourced, and framed as what a text claims rather than what your face means.

**Commercially this is the moat, not the compromise.** Every competitor
(`jenova.ai`, `facereading.online`, the App Store cohort) ships confident
between-subject claims with no sources. Not one of them can show you a Ming edition
table of contents, tell you that 目 is 淮 in one lineage and 河 in another, or admit
that the cheekbone reading can't be done from a selfie. **Scholarly honesty is a
differentiator nobody else in this category can copy, because copying it means
giving up their claims.**

---

## 1. Product definition

**mien-shiang is a daily self-observation ritual with a Chinese physiognomy
heritage layer.**

- **The measurement** is your own face against your own recent baseline.
- **The heritage** is sourced classical text, presented as culture and history.
- **The bridge between them is explicitly a poetic one, and the app says so.**

Category: General Wellness / Entertainment. Not a medical device. Not a
personality test. Not a fortune-teller.

### The three sentences that must appear in the product

1. "We compare today's reading to your own recent readings — not to anyone else's."
2. "The traditional interpretations are what these texts say. They aren't
   measurements of you."
3. "Where the sources disagree, we show you the disagreement."

If a screen can't survive those three sentences being true, the screen is wrong.

---

## 2. What ships — dispositions applied

Applying my recommendations from §12 of the dossier. **Each is a product-owner
decision; this is the design if they're accepted as written.**

| Construct | Ships? | Form |
|---|---|---|
| **Qi Se** (colour/lustre) | ✅ Core | The measurement. Personal baseline, `captureClass`, `lineageId`, confidence, abstention. |
| **Three Sections** 三停 | ✅ | Renamed from "Three Courts" (R1). Ships with the 麻衣神相 maxim shown *as a maxim*, one line, attributed, with the disputed-authorship note. **No wealth/rank output** (P4). |
| **Five Elements** 五形人 | ✅ | 5-type reduction, with the source's own 25-type structure stated (R7). **Geometry only — colour excluded from the classifier** (R9). Virtue and fortune overlays dropped as physiognomic accretion. |
| **Twelve Palaces** 十二宮 | ✅ Partial | 妻妾宮 and 奴僕宮 suppressed from output (R8), retained in the source notes. Zi Wei Dou Shu discriminator on every corpus ID. 疾厄宮 keeps its literal name — "Health Palace" is the euphemism that creates exposure. |
| **Five Mountains** 五岳 | ✅ Partial | 南岳/北岳/中岳 ship. **東岳/西岳 abstain** — cheekbone *bone* prominence is not recoverable from surface landmarks. 北岳 = 頦 (R4), 中岳 = 鼻 (R5), variants versioned. |
| **Four Rivers** 四瀆 | ✅ Partial | 濟 (nose), and 河/淮 (eye, mouth) **carrying both lineages** (R3). **江 (ear) permanently abstains** — the mesh has no auricle geometry. |
| **Five Officers** 五官 | ✅ Partial | Physiognomic membership (R6). **保壽官 ships as a name only — its longevity semantics are stripped** (P1). |
| **Shen** 神 | ❌ Not as a score | Heritage entry only. No numeric shen. 失神/假神/神亂 excluded entirely. |
| **Tension** | ❌ | Replaced by one-tap self-report (§5.4). |
| **Harmony** | ✅ | Kept, but relabelled as what it is: a computed proportion score, not a traditional construct (R2). |

**Abstention is not a failure state. It is the most valuable thing the app does.**
An app that says "your ears aren't visible in this photo, so the Yangtze reading is
unavailable" is telling the user something no competitor will.

---

## 3. Safety gates — amended

The current charter is wrong in writing and needs amending before B-025.

| Gate | Current design | Amended design |
|---|---|---|
| **Malar rash** | Detect → name it → advise doctor | **Detect → suppress ALL output → generic message, finding NOT named.** "This tool can't analyse this image. If you have a health concern, consider speaking with a healthcare professional." Naming the sign is a device claim. |
| **Diagonal earlobe crease** | Detect from face mesh → override TCM logic | **WITHDRAWN from v1.** The MediaPipe canonical mesh has no auricle geometry — no helix, tragus, or lobule vertex. This gate has never been able to run. Charter must be amended to say so. |
| **假神 / false-shen** | (implicit in shen work) | **Removed from the rule set entirely.** Its cardinal sign is malar flush — the same pixels the malar gate owns. |

### Gate precedence — as a test, not a convention

```
captureQualityGate → safetyGate → measurementLayer → heritageLayer
```

Any gate firing suppresses **everything downstream**, including heritage content.
This must be enforced by a negative test that fails if heritage output survives a
fired gate — conventions rot, tests don't.

---

## 4. The reading experience

### 4.1 The daily loop

```
open → consent state → capture (guided) → quality gates → safety gates
     → Qi Se delta vs personal baseline → confidence band
     → today's heritage passage → optional depth → log → close
```

Under 60 seconds by default. Depth is opt-in, never in the path.

### 4.2 The reading screen — three tiers

**Tier 1 — the delta (always shown).**
One sentence. Today versus your own baseline. A confidence band, never a bare
number. Abstention stated plainly where it applies.

> "Today reads a little warmer than your last two weeks. Moderate confidence —
> the light was dimmer than usual."

**Tier 2 — the heritage card (always shown, one per day).**
One construct, one region, one sourced passage. Attributed to text and edition.
Framed in the third person about the text, never the second person about the user.

> **中岳 · The Central Peak**
> 太清神鑑 says of the nose: 「鼻為嵩嶽，欲得高而峻」 — *the nose is Mount Song;
> it should be high and steep.*
> This is what the text asks for. It is not a measurement of you — nasal
> projection can't be recovered from a front-facing photo.

**Tier 3 — depth (tap to open).**
The scholarly layer. This is the "most optioned" part and it's where the product
becomes something people keep.

- **Source panel** — text, edition, date, authorship status (attributed / disputed /
  pseudepigraphic), and the retrieval status from the dossier.
- **Disagreement panel** — where lineages differ, shown side by side. The Four
  Rivers 目/口 split is the flagship example. **Nobody else has this.**
- **Availability panel** — which regions this capture could and could not support,
  and why. Turns a limitation into transparency.
- **Original text** — Chinese with pinyin, our own translation (clean rights),
  never a copyrighted one.

### 4.3 History

Personal baseline visualised as a band, today's reading as a point on it.
Segment boundaries visible where `captureClass` changed or a 45-day gap reset the
lineage — the user should be able to see *why* their baseline reset.

**No streaks. No notifications. No gamified daily pressure.** This is a
self-observation tool; manufacturing compulsion contradicts the wellness framing
and invites the exact scrutiny §10 warns about.

---

## 5. The options layer

"Most optioned" done properly: depth on demand, defaults that stay simple.

### 5.1 Reading depth

| Mode | Behaviour |
|---|---|
| **Ritual** (default) | Tier 1 + Tier 2. Under a minute. |
| **Study** | Tiers 1–3 always expanded. Source panels open by default. |
| **Minimal** | Tier 1 only. The delta and nothing else. |

### 5.2 Heritage rotation

User picks which constructs appear in the daily card: all six, a chosen subset, or
a single construct studied in sequence over weeks. Default: rotate all six.

### 5.3 Capture options

- Guided (default) — pose, lighting and neutral-expression coaching.
- Retake within the same canonical day (already implemented via `planSegment`).
- Capture class selection (front camera / rear camera / uploaded) — already drives
  baseline segmentation.
- **Pose and illumination normalisation is mandatory, not optional.** Parte et al.
  (2026) found pose and resolution outweigh demographic attributes as error sources.

### 5.4 Self-report — the replacement for the tension feature

One tap, optional, after the capture: energy, sleep, jaw tension, mood.
**More valid, more reliable, cheaper and more defensible than any pixel
measurement** — and it gives the longitudinal layer something real to correlate the
Qi Se delta against. This is the honest version of the feature B-040 was reaching for.

### 5.5 Data

Local-first, IndexedDB, on-device. Export (JSON + human-readable), delete-all,
withdraw consent — all already wired through `consent.withdraw()` / `store.deleteAll()`
after PR #31. **Add an e2e assertion that the withdraw button empties the store** —
your handoff flagged this as the last open gap.

### 5.6 Language

English and Chinese (traditional + simplified). Classical passages always shown in
original characters regardless of UI language. Our own translations only — no WHO
terminology (CC BY-NC-SA, NonCommercial, incompatible with a paywall) and no
Unschuld/Bridges renderings.

### 5.7 Accessibility

Full text alternatives for every visual reading. Nothing conveyed by colour alone —
which matters doubly here, since colour is the measurement. Reduced-motion honoured.
Offline-complete after first launch.

---

## 6. What monetises

Given `SpiritMaxx Monetization Architecture` exists, the framing that survives §10:

**Free:** daily capture, Tier 1 delta, one Tier 2 heritage card, 30 days of history.

**Paid:** Study mode (full Tier 3 depth), unlimited history, export, all six
constructs simultaneously, the disagreement library as a browsable reference.

**What must never be paywalled:** the safety gates, consent withdrawal, data export,
data deletion. Paywalling any of those converts a wellness product into something
indefensible.

**Critical rights constraint:** every family in `commercial-rights-audit.md` is
currently `Blocked`, and B-020 closes only evidence items (1) and (2) of six.
**No paid release until a named cultural reviewer's log and written legal approval
exist, hashed into `commercial-rights-manifest.json`.** The dossier does not open
that gate; it only supplies material toward it.

---

## 7. Bias mitigation — corrected

The charter targets Fitzpatrick coverage. The evidence says that's aiming at the
wrong variable.

- Parte et al. (2026): **pose and image resolution substantially outweigh demographic
  attributes**; controlling for them, gender and race disparities vanish — while an
  **age effect persists**.
- Two 2025 *npj Digital Medicine* papers: Fitzpatrick is an inadequate fairness
  stratifier on its own.

**So:** normalise pose and resolution first, stratify evaluation by **age** as well
as skin tone, and use a better tone measure than Fitzpatrick alone. And because the
measurement is within-subject, the fairness question is not "does it score groups
equally" but **"is the delta equally reliable across groups"** — a different and
more tractable test.

---

## 8. Build order

Everything below is either already in the repo or unblocked by this document.

| Stage | Work | Option B |
|---|---|---|
| **0** | Amend the charter: earlobe gate withdrawn, malar gate copy made non-specific, two-layer split recorded. `DECISION_REGISTER` entries for R1–R14. | — |
| **1** | Gate precedence + negative tests. Withdraw 假神. E2E withdraw-empties-store assertion. | closes handoff gaps |
| **2** | Coverage matrix with abstention as a first-class state; 江瀆 and 東岳/西岳 permanently abstaining. | B-025 |
| **3** | Heritage layer rebuild: source panel, disagreement panel, availability panel. Corpus schema with lineage provenance. | B-140 prep |
| **4** | Self-report capture, replacing the tension candidate. | B-040 (as a negative result + replacement) |
| **5** | Reading screen tiers, depth modes, history band with segment boundaries. | B-150 |
| **6** | Bias evaluation harness: pose/resolution normalisation, age-stratified, within-subject reliability. | B-070/B-080 |

---

## 9. What this design refuses

Recorded so it can't drift back in:

- No numeric shen score, no tension score, no asymmetry trend line.
- No between-subject comparison, ranking, or "normal range."
- No personality, character, longevity, wealth, or fortune output.
- No named clinical finding, ever — including in the safety gates.
- No colour-derived typing.
- No streaks, no notifications, no compulsion loops.
- No copyrighted translation, no scraped ctext corpus, no WHO terminology in a paid build.
- No claim of clinical validation, accuracy, or "2,000 years of evidence."

---

## 10. The honest pitch

> *A daily face reading that tells you the truth about what it can and can't see.*
>
> We compare today's photo to your own recent photos — never to anyone else's face,
> never to a "normal." When the light is wrong or your ears aren't visible, we say so
> instead of guessing.
>
> Alongside it, the classical texts: what 太清神鑑 and 人倫大統賦 actually say about
> each region of the face, with the edition, the date, and the places where the
> lineages disagree with each other. Presented as what it is — a thousand years of
> a way of seeing, not a diagnosis.

That's a product that can be defended in front of a regulator, a cultural reviewer,
and a sceptical user, and it's one no competitor in this category can copy without
dismantling their own claims.

# Cultural review brief — Mian Xiang source and representation

**For:** a named, qualified reviewer in Chinese physiognomy (面相) and/or classical Chinese medical and divinatory texts.
**Prepared:** 17 August 2026. **Version:** 1.
**Commissioned by:** the product owner, mien-shiang.

---

## What you are being asked to do

Four specific judgements, and a per-family review. Everything you need is in
this document. **You should not have to read our research programme to
understand what you are approving** — where a passage matters, it is quoted here
in the original with our translation beside it.

Estimated time: **half a day** for Part 1, **one to two days** for Part 2.

## What you are NOT being asked to do

- Endorse the product, or the idea that a phone camera should read faces at all.
  A reviewer who thinks the whole premise is unsound can say so, and that is a
  useful finding rather than a failed review.
- Validate any measurement. Nothing here claims a face reveals anything about a
  person. The product's measurement layer compares a user to their own previous
  photographs and makes no traditional claim; the heritage layer reports what
  texts say and is explicitly separated from it.
- Certify our translations as scholarly editions. We ask only whether they
  mislead.

## Ground rules we are holding ourselves to

- **We cannot record your disposition for you.** Our programme
  (`docs/OPTION_B_EXECUTION_PLAN.md`) reserves that for the independent
  reviewer, and our commercial-rights audit requires a named reviewer with a log
  of contested interpretations. Nothing ships as culturally reviewed on our own
  say-so.
- **Our proposed dispositions are already built into a flagged internal build.**
  That is a build artefact so the engine could be tested, not an approval, and
  not pressure. If you disagree with one, we change it.
- **Disagreement is the deliverable.** Where sources conflict, we would rather
  present the conflict than resolve it. Tell us where we have flattened
  something.

---

# PART 1 — the four blocking questions

## Q1 (R3) — Four Rivers 四瀆: the 目 / 口 disagreement

### The passages

**太清神鑑, *Siku Quanshu* recension, 四瀆 section — retrieved verbatim:**

> 地之四瀆者，所以相朝以接其流通，人之形貌亦有像焉。且**鼻為濟，目為淮，耳為江，口為河**。故四瀆欲得端直清大，明淨流暢，涯岸成就者，則應於神，故貴而多智也。

*Our translation:* The four waterways of the earth flow toward one another and
join; the human form has its likeness of this. The nose is the Ji, the eye the
Huai, the ear the Yangtze, the mouth the Yellow River. The four should be
straight, clear and broad, bright and freely flowing, with formed banks.

**神相全編, via 欽定古今圖書集成 藝術典 vol. 632 — retrieved verbatim:**

> 四瀆 — **耳為江，目為河，口為淮，鼻為濟。**

*Our translation:* The ear is the Yangtze, the eye the Yellow River, the mouth
the Huai, the nose the Ji.

**人倫大統賦, 薛延年 commentary (preface dated 皇慶二年 / 1313):**

> **四瀆者，耳為江，口為河，眼為淮，鼻為濟。**

Reinforced independently in the same commentary: 「四瀆，耳為江，口為河，若耳珠朝於口者為朝海也」.

**神異賦 commentary, 藝術典 vol. 636:** 「**眼為四瀆之官河也**」 — and it places 口
outside the four rivers entirely, as 海 (sea).

### The conflict

| Feature | 太清神鑑 / 人倫大統賦 | 神相全編 / 神異賦注 |
|---|---|---|
| 耳 | 江 | 江 |
| 鼻 | 濟 | 濟 |
| **目** | **淮** | **河** |
| **口** | **河** | **淮** |

Ear and nose are unanimous. Eye and mouth swap. Both readings are internally
reinforced — the 1313 commentary's 朝海 gloss only makes sense with 口 as the
great river reaching the sea; the 神異賦 commentary independently states 眼…河.

### Our proposed disposition

Carry **both**, tagged by lineage, and surface the disagreement to the user as
part of the reading.

### Our rationale

Selecting one silently asserts a resolution we have no standing to make.
Contemporary Chinese-language sources reproduce the split without appearing to
notice it, so web consensus is not evidence. The disagreement is also, in our
view, the most interesting thing we can show a user.

### The question for you

1. Is presenting both lineages defensible, or does it misrepresent a tradition
   in which one reading is in practice standard and the other marginal?
2. If one should be primary, **which, and on what basis** — earliest witness,
   dominant transmission, or contemporary practice?
3. Is our framing of the disagreement ("neither is a corruption of the other")
   accurate?

**What changes:** if you select one lineage, `sourceLineage` stops being a
reading dimension and the corpus loses one heritage variant.

---

## Q2 (R6) — 五官: which construct is meant?

### The passages

**Physiognomic five** — attested across three independent Chinese sources, but
**we could not verify the classical locus.** Every retrievable host was a forum,
a content farm, or blocked. Closest scholarly authority: Livia Kohn, *Asian
Folklore Studies* 45 (1986), confirming that the *Shenxiang quanbian*
systematically analyses 五官.

| Feature | Title | Gloss |
|---|---|---|
| 耳 | 採聽官 | information-gathering |
| 眉 | 保壽官 | longevity-preserving |
| 眼 | 監察官 | inspection |
| 鼻 | 審辨官 | discernment |
| 口 | 出納官 | receipts and disbursements |

**Medical five — 靈樞·五閱五使, retrieved verbatim:**

> 鼻者，肺之官也；目者，肝之官也；口唇者，脾之官也；舌者，心之官也；耳者，腎之官也。

**Membership: 鼻、目、口唇、舌、耳 — tongue in, eyebrow out.**

We also note an internal inconsistency in the medical source: 素問·金匱真言論 gives
「南方赤色，入通於心，開竅於**耳**」 — heart opening to the ear, not the tongue.

### Our proposed disposition

Ship the **physiognomic** membership. **Strip 保壽官's longevity semantics** —
the title is retained as a name, the meaning is not rendered.

### Our rationale

Three reasons, in order of weight. The Neijing set is explicitly
organ-correspondence doctrine, and rendering it in a general-wellness product
would be a health claim we are prohibited from making. The tongue is not visible
in a face photograph. And 保壽官 is literally "longevity-preserving officer" —
lifespan output is prohibited absolutely in our product.

### The question for you

1. Is it accurate to treat these as **two different constructs sharing a name**,
   rather than variants of one? We have written it that way and it is
   load-bearing.
2. Is shipping the physiognomic five, and never the medical five, a
   misrepresentation of 五官 to a user who knows the medical sense?
3. Is retaining 保壽官 **as a name only**, with its meaning withheld, honest — or
   is a title with its content removed worse than omitting the feature?
4. Variants we found and treated as niche — 人中 (philtrum) as 保壽官; a
   zone-based set 眉、鼻、顴、頜、下停; a tongue-inclusive 品味官 — should any of
   these be treated as a live lineage rather than a curiosity?

**What changes:** answers 2 or 3 could remove a feature or require different
copy.

---

## Q3 (R8) — Twelve Palaces: 妻妾宮 and 奴僕宮

### The problem

Two of the twelve palace names are, in their classical form:

- **妻妾宮** — "wife-and-concubine palace". Explicitly polygynous.
- **奴僕宮** — "slaves-and-servants palace".

The modern Chinese renamings in circulation are **夫妻宮** (spouse) and, variously,
**交友宮** or **雇用宮**. These are substitutions, not translations.

We could not retrieve the 十二宮相論 chapter body — we verified the chapter exists
at position 9 in the 神相全編 table of contents, but three primary hosts blocked
retrieval. **So we are asking about names we have from secondary sources.**

### Our proposed disposition

**Suppress both from user-facing output.** Retain them in the source notes as
historical record, visible in the study tier.

### Our rationale

Rendering 妻妾宮 literally to a modern user is offensive. Rendering it as "Spouse
Palace" is a silent editorial act that misrepresents what the source says.
Suppression is the only option we could see that is neither.

### The question for you

1. Is suppression the right call, or is it a form of sanitising that a
   scholarly-honest product should avoid?
2. If they should be shown, **how** — literal with historical context, modern
   name with a note, or something else?
3. Are the modern renamings we found (夫妻宮, 交友宮) established enough in
   practice that using them is normal rather than revisionist?
4. Same question for 疾厄宮. We kept the literal "illness-and-calamity" sense
   rather than the common "Health Palace", on the reasoning that the euphemism
   *increases* medical-claim exposure by inviting a health reading. Is that
   right?

**What changes:** the Twelve Palaces entry, and how many of the twelve we ship.

---

## Q4 (R9) — colour as a classifier input

### The passage

**靈樞·陰陽二十五人** defines the five forms partly by **complexion**:

> 木形之人…其為人**蒼色**… 火形之人…其為人**赤色**… 土形之人…其為人**黃色**… 金形之人…**白色**… 水形之人…**黑色**…

Colour (五色: 蒼/赤/黃/白/黑) is not decoration in this passage. It is a defining
criterion, alongside face shape.

### Our proposed disposition

**Exclude colour from the Five Elements classifier entirely.** Geometry only.

We should be direct that this row is **not a free choice for us**. EU AI Act
Regulation 2024/1689 Art. 5(1)(g) prohibits outright — not risk-tiers, prohibits
— biometric categorisation systems that infer race from biometric data. A
classifier that assigns a person to a colour-defined type from a face photograph
sits close enough to that prohibition that we will not build it.

### Our rationale

A faithful implementation of this passage is bias-generating by construction.
Separately, published work (*npj Digital Medicine*, 2025) finds the Fitzpatrick
scale inadequate as a fairness stratifier, so we could not even measure the harm
reliably.

### The question for you

1. With colour removed, is what remains **still 五形人**, or have we kept a name
   while discarding half the construct? If the latter, we would rather rename it
   than misrepresent it.
2. Is there a defensible reading of the passage in which the colours are
   *seasonal or situational* rather than constitutional — which would change the
   analysis?
3. How should we describe the omission to a user? Our current wording says the
   classifier uses shape only; we do not currently explain why.

**What changes:** possibly the construct's name; certainly the copy.

---

# PART 2 — requirement 4, per family

Our commercial-rights audit requires, per family, "review by a named, qualified
Mian Xiang cultural reviewer, including a log of contested interpretations and
the resulting wording decisions."

For each family below: the claims we make, the sources we rest them on, and what
we know is weak. **Please log contested interpretations as you go** — the log is
the artifact, more than the verdict.

| Family | What we claim | Rests on | Known weakness |
|---|---|---|---|
| **Five Elements** | Five forms with face descriptors; source defines 25 | 靈樞·陰陽二十五人, verbatim | We ship 5 and say the source has 25. Colour excluded (Q4). |
| **Three Sections** | Balanced thirds are auspicious | **One 8-character maxim, two secondary sources, no primary edition retrieved** | **Weakest family.** See `docs/ACQUISITION_THREE_SECTIONS.md`. Also a wealth claim we may only cite, never render. |
| **Twelve Palaces** | Twelve named regions with life domains | 神相全編 ToC verified; **chapter body not retrieved** | Q3. Also: all twelve names are shared verbatim with Zi Wei Dou Shu astrology. |
| **Qi Se reading** | Colour and lustre against personal baseline | Our own measurement; vocabulary from 望診 / 五色 | 靈樞·五色 attaches a mortality prediction to malar erythema. We suppress it absolutely. |
| **Five Mountains** | Five peaks; centre as balance point | 太清神鑑, 神相全編, 人倫大統賦 — all verbatim | 北岳 target differs across sources (頷 / 頦 / 地閣); we chose 頦. Left/right convention unattested. |
| **Four Rivers** | Four waterways | As above, verbatim | Q1. Also the ear cannot be measured at all from our capture. |

### Three cross-cutting questions

1. **Is the separation honest?** The product keeps Observation (what we
   measured), Heritage (what a text says) and Reflection (our own symbolic
   join) as visibly distinct layers, and the joining sentence says the join is
   ours. Does that read as respectful use, or as decoration?
2. **Abstention.** Where the camera cannot support a traditional observation —
   the ear, cheekbone prominence, nasal projection — we say so and read nothing.
   Is a partial reading, honestly marked, acceptable? Or does a tradition that
   reads the whole face lose its meaning when read in pieces?
3. **What have we got wrong that we have not asked about?** This is the most
   valuable question in the document.

---

# PART 3 — what to return

For each of Q1–Q4 and each family in Part 2:

- **Disposition:** `approved` / `revise` / `rejected`
- **If revise or rejected:** what specifically, and what would be acceptable
- **Contested interpretations log:** where sources disagree, what you consider
  the weight of each, and whether our handling misrepresents it
- **Wording decisions:** any copy that must change

Please also state your **name, qualifications and any interest to declare** —
our audit requires a *named* reviewer, and the record is part of the evidence.

Return as a signed document. We will hash it into
`docs/commercial-rights-manifest.json` unaltered. **We will not paraphrase your
findings into an approval.**

---

## Appendix — what already binds us regardless of your answers

So you know which constraints are not up for discussion, and need not spend time
on them:

- No lifespan, mortality or prognosis output. No wealth, rank or class claim. No
  character, intelligence or criminality inference. No race or ancestry
  inference. No named clinical condition, ever — including in our safety gates.
- No copyrighted translation is reproduced. All English renderings are original.
  We do not use WHO terminology (NonCommercial licence, incompatible with a paid
  build) and we do not scrape ctext.org.
- Modern 點校 editions are treated as in copyright, per 中華書局 v. 國學時代,
  Beijing First Intermediate People's Court, 2013.

Full list: `docs/OPTION_B_020_DOSSIER.md` §10.2.

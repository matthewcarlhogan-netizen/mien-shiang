# B-020 — Source and terminology dossier

**Task:** B-020 (Option B execution plan). Source and terminology dossier for the six
enduring constructs plus the Shen and tension hypotheses.
**Owners:** Geometry Researcher + Corpus Research Editor.
**Base:** `main` @ `66d43b1`. Compiled 17 August 2026.
**Status:** draft — awaiting evidence/source record completion (§10).

---

## 0. How to read this document

Every factual claim carries one of three labels:

- **VERIFIED** — retrieved and read this session; source in §11.
- **UNVERIFIED** — located but not retrievable, or asserted only by low-authority
  secondary sources. Named so it can be closed later, not so it can be relied on.
- **NEGATIVE** — searched for and not found. Recorded because absence of evidence
  is itself evidence for a compliance file.

**Retrieval posture.** Three of the highest-value primary-text hosts blocked
automated retrieval: `ctext.org` (HTTP 403), `shidianguji.com` (robots.txt),
`baike.baidu.com` (robots.txt). Chapter *existence* was verified via independently
hosted tables of contents and edition catalogues; **character-level verbatim text
could not be retrieved from any Ming or Qing edition of 神相全編 or 麻衣相法.**
Where verbatim classical text does appear below, it came from Chinese Wikisource
recensions of the *Siku Quanshu* and the *Gujin Tushu Jicheng*, which were retrieved.

**Nothing in this dossier is reconstructed from model memory without a label.**

`AGENTS.md` forbids reconstructing project decisions from chat memory; this
document is a research artefact, not a decision record. Decisions go to
`DECISION_REGISTER.md`.

---

## 1. Scope

Six enduring constructs, per `docs/OPTION_B_GAP_LEDGER.md` §6:

| # | Construct | Implementation state |
|---|---|---|
| 1 | Twelve Palaces 十二宮 | implemented (`src/reading/twelve-palaces.js`) |
| 2 | Three Courts 三停 | implemented (`src/reading/three-courts.js`) |
| 3 | Five Elements 五形人 | implemented (`src/reading/five-elements.js`) |
| 4 | Five Officers 五官 | **absent** — gates B-025 |
| 5 | Five Mountains 五岳 | **absent** — gates B-025 |
| 6 | Four Rivers 四瀆 | **absent** — gates B-025 |

Plus two hypotheses: **Shen 神** (§8) and **facial tension** (§9), gating B-030
and B-040 respectively.

`Harmony` (`src/reading/harmony.js`) is excluded: it is a computed aesthetic
score, not a traditional construct with a source text. **Owner confirmation
required** — if Harmony is intended to be source-backed, B-020 is incomplete.

---

## 2. Construct 1 — Twelve Palaces 十二宮

**Term.** 十二宮 / 十二宫 · *shí'èr gōng* · Wade–Giles *shih-erh kung* ·
Jyutping *sap6 ji6 gung1*.

**Homonym hazard — VERIFIED, and load-bearing.** 十二宮 is *also* the standard
term for the twelve houses of Zi Wei Dou Shu 紫微斗數 natal astrology and for the
twelve zodiacal signs. Twelve palace names — 命宮, 財帛宮, 夫妻宮, 疾厄宮, 遷移宮,
官祿宮, 福德宮, 父母宮, 兄弟宮, 田宅宮, 子女宮, 奴僕宮 — are **shared verbatim**
between the two systems. Consequences: (a) any corpus scraped from Chinese sources
will silently mix physiognomy with birth-chart astrology; (b) users who know Zi Wei
Dou Shu will read our labels as birth-chart claims. Corpus IDs must carry a
system discriminator.

### Primary sources

| Text | Status |
|---|---|
| **神相全編** *Shenxiang quanbian* | **Compilation VERIFIED.** Kohn (1986): originally compiled by **Yuan Zhongche 袁忠徹 (1367–1458)**, early Ming. Ming 致和堂藏板 edition, 十二卷首一卷, recorded by Shuge as 「旧题宋陈抟撰，明袁忠彻订正」. The Chen Tuan (d. 989) attribution is a **lineage claim, not authorship**. Mei Chun (2016) goes further: even the Yuan Zhongche editorship is tenuous; earliest extant preface is by **Ni Yue (1444–1501)**. **Contains the construct — VERIFIED:** chapter **十二宮相論** is at position 9 in the retrieved table of contents. **Chapter body — NOT RETRIEVED. Do not quote it.** |
| **麻衣相法** *Mayi xiangfa* | Attribution to 麻衣道者 is **legendary**; historicity not established. Whether it independently defines the Twelve Palaces — **UNVERIFIED**. |
| **柳莊相法** *Liuzhuang xiangfa* | Catalogued 「旧题明袁珙撰」 — the 旧题 formula is the standard Chinese marker for an attribution the cataloguer does not endorse. Twelve Palaces content — **UNVERIFIED**. |
| **水鏡集** *Shuijing ji* | Existence VERIFIED indirectly (Xing Wang's Oxford thesis cites *Shuijing shenxiang* juan 2). Date, authorship, content — **UNVERIFIED**. |
| **冰鑑** *Bingjian* | **NEGATIVE — VERIFIED.** Its framework is seven topics (神骨、剛柔、容貌、情態、鬚眉、聲音、氣色). It contains **no** 十二宮 or 三停 discussion. The Zeng Guofan 曾國藩 attribution is also **a misattribution** (吳榮光 recorded an unsigned copy; 夏天鑑 named a different author). **Any source citing 冰鑑 as authority for a facial-zone system is wrong on both author and content. Treat that citation as a marker of an unreliable source.** |

### Terminology — the translation problem is a compliance problem

| Chinese | Renderings in circulation | Issue |
|---|---|---|
| 命宮 | Life / Destiny / Fate Palace | "Destiny"/"Fate" carry determinist framing. Prefer "Life". |
| 妻妾宮 → 夫妻宮 | "Wife-and-Concubine" (literal) / Spouse / Marriage | The classical name is **explicitly polygynous**. 夫妻宮 is a **modern substitution, not a translation.** Shipping "Spouse Palace" silently modernises the source. |
| 奴僕宮 | Servants / Subordinates / "Employment" | Literal rendering is socially archaic; renamings are idiosyncratic. |
| 疾厄宮 | Health Palace / "Illness-and-Calamity" (literal) | **Rendering it "Health Palace" is a euphemism that *increases* medical-claim exposure**, because it invites a health reading of a region whose classical semantics are calamity and misfortune. |
| 官祿宮 → 事業宮 | Career / "Office-and-Emolument" | 事業宮 is a modern rename. |
| 男女宮 / 子女宮 / 兒女宮 | Children Palace | **Three different Chinese names for the same region.** |
| 相貌宮 vs 父母宮 | Appearance vs Parents | **Some lineages give 相貌宮 as the twelfth instead of 父母宮.** The set is not closed. |

### Modern measurement evidence — NEGATIVE

No peer-reviewed attempt to operationalise, segment, or validate the twelve-palace
partition was located. Searches returned only commercial products (`jenova.ai`,
`astrologyapi.com`, `faceinsight.net`, `facereading.online`) and SEO content.
Computational TCM face diagnosis exists (Zhang, Dong & Huang, IEEE review) but
does **not** use this construct.

---

## 3. Construct 2 — Three Courts 三停

**Term.** 三停 · *sān tíng* · sub-terms 上停 / 中停 / 下停. Body variant 身相三停.

**The English name we ship is unattested — flag for the reviewer.**
"Three Courts" could not be verified against any scholarly source. 停 does not
mean "court". Working hypothesis (**hypothesis, not finding**): contamination from
Western aesthetic-proportion English. **"Three Sections" or "Three Divisions" is
defensible; "Three Courts" is not, on current evidence.** This is a rename decision
for the product owner.

### Primary sources

- **神相全編** — whether it contains a dedicated 三停 chapter: **CONFLICTING
  EVIDENCE, unresolved.** Note the ToC does contain 十三部位總歌, a *different*
  facial-division scheme.
- **麻衣神相** — the maxim **「三停平等，富貴榮顯」** ("if the three sections are
  equal, wealth, rank and honour are manifest"), cited by two independently
  retrieved secondary sources. Attribution **VERIFIED as an attribution**; the text's
  own authorship remains disputed.

**This eight-character line is the entire evidential basis for the "balanced thirds
are auspicious" claim.** One maxim, from a text of disputed authorship, retrieved
only via secondary sources. **It is not a system, and must not be presented as one.**

### Prohibited inference specific to this construct

「富貴榮顯」 is a **wealth and social-rank claim**. Any output that maps thirds-balance
to prosperity, success, or status is unsubstantiable and reads as fortune-telling.

---

## 4. Construct 3 — Five Elements 五形人

**Term — critical homophone.** The Neijing uses **形** (*xíng*, "form/shape"):
五形之人. Popular physiognomy substitutes **行** (*xíng*, "phase"): 五行人.
**Both are romanised *wǔ xíng*. Any database keyed on romanisation will conflate
them.**

### Primary source — VERIFIED VERBATIM

**黃帝內經·靈樞·陰陽二十五人 (Lingshu ch. 64).** Anonymous, composite, pseudepigraphic
(Yellow Emperor / Qi Bo dialogue). Retrieved text:

> 岐伯曰：「先立五形金木水火土，別其五色，異其五形之人，而二十五人具矣。」

Facial descriptors are sparse and specific:

| Type | Face | Complexion |
|---|---|---|
| 木形之人 | 長面 (long) | 蒼 greenish |
| 火形之人 | 脫面 (contested; commonly glossed thin/tapering) | 赤 red |
| 土形之人 | 圓面 (round) | 黃 yellow |
| 金形之人 | 方面 (square) | 白 white |
| 水形之人 | 面不平 (uneven) | 黑 black |

**Two findings that change the implementation:**

1. **The construct is 25 types, not 5.** Each form is subdivided by the five
   pentatonic tones (上角/上徵/上宮/上商/上羽 + four sub-tones each) into 25.
   Modern wellness writing drops the 25 and keeps the 5. **Presenting "five types"
   as *the* Neijing typology misrepresents the source.**
2. **It is whole-body morphology** (shoulders, back, belly, thighs, hands, feet,
   gait, voice) with a one-clause facial descriptor. Relocating it onto the face
   is **a modern editorial act, not a translation.**

**A competing Neijing typology exists.** 靈樞·通天 defines 五態之人 (太陰/少陰/太陽/
少陽/陰陽和平) — a yin-yang five-type scheme with **no** five-phase mapping. The
canonical source carries two unreconciled constitutional typologies.

### Disagreement — the mapping has no consensus ground truth

- Neijing: **Metal = square, Earth = round.**
- Epoch Times physiognomy column: **Metal = 頭黃面圓 (round)**, Earth = 面呈田字
  (squarish) — **inverts the Neijing.**
- lnka.tw: Metal = square, **Water = round and full** — contradicts the Epoch Times.

**Two mainstream Chinese-language popular sources disagree with each other and with
the Neijing on the single most computable feature: face-shape aspect ratio.**
For a MediaPipe rule engine there is no agreed answer to "which element does a
round face indicate."

**Physiognomic accretions absent from the Neijing:** the 仁/義/禮/智/信 virtue
overlay, explicit wealth and longevity claims, and 五行生剋 generation/overcoming
readings. **This layer generates the character-determinism and employability risk.**

### The bias problem is structural, not incidental

**Complexion (五色: 蒼/赤/黃/白/黑) is a defining criterion of the classical
typology.** Any faithful implementation is bias-generating by construction. The
defensible design drops colour from the classifier entirely and uses geometry alone
— and even then face-shape metrics carry ancestry signal. Fitzpatrick alone is
documented as an inadequate fairness stratifier (*npj Digital Medicine*, 2025, two
papers). **This must be tested for, not assumed away.**

---

## 5. Construct 4 — Five Officers 五官

**Term.** 五官 · *wǔ guān*. 官 = "office/official" — the face as a ministry.

**"Five sense organs" is a category error.** That is the ordinary modern meaning
(五官科 = ENT + ophthalmology), but the physiognomic list includes the **eyebrow**,
which is not a sense organ, and excludes the **tongue**, which is.

### The physiognomic five — VERIFIED across three independent sources

| Feature | Title | Gloss |
|---|---|---|
| 耳 ear | 採聽官 | information-gathering |
| 眉 eyebrow | 保壽官 | longevity-preserving |
| 眼 eye | 監察官 | inspection |
| 鼻 nose | 審辨官 | discernment |
| 口 mouth | 出納官 | receipts and disbursements |

**Classical locus — UNVERIFIED.** The canonical-sounding formula
「夫五官者，一曰耳為採聽官…」 returns results, but every retrievable host was a forum,
a content farm, or blocked. Closest authority retrieved: **Kohn (1986)**, confirming
the *Shenxiang quanbian* systematically analyses 五官.

### The other 五官 — VERIFIED VERBATIM, and it is a different construct

**靈樞·五閱五使:**

> 鼻者，肺之官也；目者，肝之官也；口唇者，脾之官也；舌者，心之官也；耳者，腎之官也。

**Membership: 鼻、目、口唇、舌、耳 — tongue IN, eyebrow OUT.**

**These are not variant wordings of one list. They are two different constructs
sharing a name.** Any copy saying "the Five Officers in TCM are eyebrows, eyes,
nose, mouth, ears" conflates a divination taxonomy with a medical one.

**The medical source contradicts itself.** Standard assignment is heart→tongue
(五閱五使, 脈度, 陰陽應象大論), but **素問·金匱真言論** gives 「南方赤色，入通於心，
開竅於**耳**」 — heart opens to the ear.

**Further variants (all low-authority, flag as niche, do not present as co-equal):**
tongue substituted in as 品味官 with eyebrow dropped; 人中 (philtrum) as 保壽官
instead of 眉; an entirely zone-based set 眉、鼻、顴、頜、下停.

### Modern measurement evidence — NEGATIVE

No validation of the Five Officers' membership, semantics, or any feature-to-meaning
mapping. See §9.4 for the decisive general evidence against the underlying premise.

---

## 6. Construct 5 — Five Mountains 五岳

**Term.** 五岳 / 五嶽 · *wǔ yuè*. **Disambiguation hazard:** 衡山 and 恆山 are both
*héng* in Pinyin and are routinely confused. **Disambiguate by character or
direction, never by Pinyin.** Also: "Five Mountain System" in English most often
means the *Gozan* 五山 Zen monastery ranking — unrelated.

### Primary sources — VERIFIED VERBATIM

**太清神鑑, *Siku Quanshu* recension:**

> 故**額為衡嶽**，欲得方而廣；**頷為恒嶽**，欲得圓而厚；**左顴為泰嶽**，**右顴為華嶽**，
> 左右欲得圓而正；**鼻為嵩嶽**，欲得高而峻。

**Attribution demonstrably false, and the *Siku* editors said so.** The 提要
(September 1781; 紀昀, 陸錫熊, 孫士毅) states the text is 舊本題後周王朴撰, argues
Wang Pu never lived at 林屋洞 as the preface claims — 「其為依托無疑」 — and concludes
「疑亦出自宋人」. **The editors deleted Wang Pu's name from the title.** Treat as an
anonymous Song-era compilation, not a 10th-century work.

**神相全編, via 欽定古今圖書集成 藝術典 vol. 632** (imperially compiled 1726 — a
reliable, datable witness): 額為衡山，頦為恆山，鼻為嵩山，左顴為泰山，右顴為華山.

**人倫大統賦, 張行簡, with 薛延年 commentary — the best-attested source in this
dossier.** 張行簡, 大定十九年 (1179) *jinshi*, 禮部尚書, biography in the *Jin shi*;
commentary preface signed 皇慶二年 (1313). **Jin-dynasty verse, Yuan-dynasty
commentary.** The *Siku* editors do note 「意欲自神其術，中間不無語涉虛夸」.

### Coverage matrix

| Peak | Dir. | Mountain | 太清神鑑 | 神相全編 | 人倫大統賦注 | 神異賦注 | 雜說中篇 |
|---|---|---|---|---|---|---|---|
| 東岳 | E | 泰山 | 左顴 | 左顴 | 左顴 | 左顴 | 左顴 |
| 西岳 | W | 華山 | 右顴 | 右顴 | 右顴 | 右顴 | 右顴 |
| 南岳 | S | 衡山 | 額 | 額 | 額 | 額 | 額 |
| 北岳 | N | 恆山 | **頷** jaw | **頦** chin | **頦** chin | **地閣** zone | **地角** |
| 中岳 | C | 嵩山 | 鼻 | 鼻 | 鼻 | 鼻 | **準頭** tip |

**Left/right cheekbone assignment is unanimous across every primary source
retrieved.** That is the stable part.

### Disagreements

1. **北岳 is genuinely unstable** — 頷 (mandibular contour) vs 頦 (menton point) vs
   地閣 (a *region*, defined in the same volume as 「在承漿之下，頤頦之間」). For a
   landmark implementation these are three different targets.
2. **中岳 is nose vs nose-tip** (準頭 / pronasale) in the 雜說中篇 line.
3. **Zone-level vs point-level assignment will contradict** if flattened into a
   one-feature-one-peak table: the 靈臺秘訣 material in 薛延年's commentary places
   the **mouth** in the northern zone while the same commentary assigns 北嶽 to 頦.
4. **The 青龍/白虎/朱雀/玄武 overlay is NOT in the primary texts.** In 太清神鑑 the
   Four Symbols appear as six qi-colours (六氣), not peak assignments. **Modern
   popular elaboration — do not ship as classical.**
5. **Left/right orientation convention is unspecified in every text retrieved.**
   Neither subject-side nor the gendered 男左女右 rule could be verified.
   **Implementation hazard: MediaPipe indices are in image space, mirrored relative
   to the subject — a naive mapping inverts 東岳/西岳 for every user.**

### Anatomical availability (front-facing selfie, Face Mesh)

Verified against MediaPipe's `canonical_face_model.obj` (468 vertices).

| Peak | Region | Availability |
|---|---|---|
| 南岳 | 額 | **Available, capture-fragile.** 44 vertices above the brow; top vertex idx 10. Frequently occluded by hair, fringe, headwear, hijab. |
| 北岳 | 頦/頷/地閣 | **Available.** Menton idx 152. But pick one of the three textual variants and document it — do not average. |
| 中岳 | 鼻 | **Best-resolved** (tip idx 1). **But the criterion is 高隆/峻 — prominence, a depth judgment. MediaPipe z is relative, not calibrated. Nasal projection is not reliably recoverable front-on.** |
| 東/西岳 | 左/右顴 | **Surface points available; the construct is NOT.** The texts judge 顴**骨** — *bone* prominence. Surface landmarks cannot separate zygomatic projection from soft tissue. **Low confidence. Must abstain.** |

---

## 7. Construct 6 — Four Rivers 四瀆

**Term.** 四瀆 / 四渎 · *sì dú*. Etymology supplied by 薛延年 citing the *Erya*:
「水注澮曰瀆。又四瀆，江、淮、河、濟也。」 Rendering 瀆 as "sewer/drainage channel" is
etymologically defensible but unusable in product copy. Also collides with the
state-cult category in Chinese religion — disambiguate.

### Coverage matrix — VERIFIED VERBATIM from four sources

| Feature | 太清神鑑 | 神相全編 | 人倫大統賦注 | 神異賦注 |
|---|---|---|---|---|
| 耳 ear | **江** Yangtze | **江** | **江** | — |
| 鼻 nose | **濟** Ji | **濟** | **濟** | — |
| 目 eye | **淮** Huai | **河** Yellow | **淮** | **河** |
| 口 mouth | **河** Yellow | **淮** Huai | **河** | (海 "sea") |

**This is the sharpest textual disagreement in the dossier, read in the primary
texts, not in summaries.**

- **Stable:** 耳 = 江, 鼻 = 濟. Implement with confidence.
- **Directly contradictory:** 目 and 口 swap between 河 and 淮 by lineage.
  - **太清神鑑 line:** 目 = 淮, 口 = 河. Reinforced by the 1313 commentary's
    independent gloss 「耳珠朝於口者為朝海」.
  - **神相全編 line:** 目 = 河, 口 = 淮. Reinforced by the 神異賦 commentary's
    「眼為四瀆之官河也」.

**Two live traditions. The coverage matrix must carry both and tag lineage
provenance. Do not silently pick one.** Contemporary Chinese web sources reproduce
the split without noticing it — **web consensus is not evidence here; there is none.**

### Anatomical availability — one hard blocker

| River | Region | Availability |
|---|---|---|
| 濟 | 鼻 | Available. But 「不露」 concerns **nostril exposure, which is pose-dependent** — a chin-up capture manufactures 露竅. Pose normalisation mandatory or this is noise. |
| 河/淮 | 目 | Well-resolved. **But the criterion 深 (deep-set) is orbital depth — a z-judgment front capture estimates poorly.** 長/大/小 recoverable; 深/淺 not. |
| 淮/河 | 口 | Well-resolved. **Confounded by expression** — the texts assume repose. Require neutral expression or reject the capture. |
| 江 | 耳 | **NOT AVAILABLE — hard blocker.** |

**The 江瀆 blocker, verified empirically against the canonical mesh:** the MediaPipe
face model contains **no auricle geometry whatsoever**. The most lateral vertices
(127/356 at \|x\|=7.74; 234/454 at 7.66; 93/323 at 7.54) all sit at z between −2.44
and 0 — the pre-auricular silhouette plane. Only 10 of 468 vertices lie posterior
to z = −1.5. **There is no helix, antihelix, tragus, concha, or lobule vertex.**

Two consequences:

1. **四瀆 cannot be fully instantiated from Face Mesh.** At most 3 of 4. Any
   "complete Four Rivers reading" claim would be false. **B-025 must record 江瀆 as
   permanently abstaining on this capture modality.**
2. **The diagonal earlobe crease safety gate cannot run on Face Mesh at all.**
   This is the more important finding and it contradicts the current architecture.
   That gate needs (a) a separate ear detection/segmentation model and (b) a capture
   protocol that shows the ear — profile or three-quarter, since front capture
   occludes the auricle behind hair and presents the lobe nearly edge-on.
   **Treat ear capture as a distinct pipeline with its own consent and failure mode,
   not a field on the face-mesh output.**

Whole-construct note: the criterion is 「四瀆最宜深且闊」 — **depth** and breadth.
Depth is the axis a single front-facing RGB capture is structurally worst at.
**四瀆 as a whole is less recoverable from a selfie than 五岳.**

---

## 8. Hypothesis 1 — Shen 神

**Term.** 神 · *shén*. Compounds 望神, 得神, 失神, 假神, 少神, 神亂.

**The ambiguity is a property of the term, not a translation defect.** Hsu (2000,
*Culture, Medicine and Psychiatry* 24(2):197–229) documents that *shen* is used
with deliberately different precision depending on the speaker's authority
structure: in charismatic healing "vagueness in terminology can be useful"; in
literati contexts it is "not only vague, but notoriously polysemous"; only in
modern bureaucratic TCM is it pushed toward explicit definition. **We cannot
engineer this away, and a single operational definition is a novel construct of
ours, not the classical one.**

### Primary sources — VERIFIED VERBATIM

**素問 ch. 13, 移精變氣論:** 「閉戶塞牖，繫之病者，數問其情，以從其意，**得神者昌，
失神者亡。**」

**Read the context:** this is embedded in a passage about *interviewing the patient
in a closed room*. The shen judgement is made in relational clinical encounter, not
static visual inspection. **The classical warrant for reading shen off a photograph
is weaker than face-reading popularisations imply.**

**靈樞 ch. 80, 大惑論:** 「目者，心使也。心者，神之舍也。」

**素問 ch. 17, 脈要精微論:** 「夫精明五色者，氣之華也…」 — and note its operational
test of 精明 is **functional** (can the person distinguish black from white, judge
lengths), not an appearance judgment. **Modern face-reading apps invert this.**

### The five-category taxonomy is NOT classical

得神 / 少神 / 失神 / 假神 / 神亂 appears in contemporary PRC 中醫診斷學 textbooks.
**得神 and 失神 were located in the Neijing directly. A pre-modern locus for 少神,
假神 or 神亂 as a formal five-way taxonomy was NOT retrieved.** Best described as a
**20th-century PRC textbook systematisation.** Any claim that "the classics define
five states of shen" is **UNVERIFIED**.

### Modern measurement evidence — effectively absent

- **O'Brien et al. (2009)**, *JACM* 15(7):727–734. n=45, 3 practitioners. "Detection
  of the presence of shen" was among features described as "highly objective and
  repeatable." **Caveats that must travel with this:** the kappa/ICC values could
  **not** be retrieved; single study, single cohort, **no replication located**; and
  high agreement on a *binary present/absent* judgment in a mostly-healthy cohort is
  trivially achievable by base rate. **Rest nothing heavy on it.**
- **Jacobson et al. (2019)**, *JACM* 25(11):1085–1096. Systematic review, 21 studies.
  **Mean pairwise agreement 57%; mean Cohen's κ 0.34 (range 0.07–0.59).**
  **This is the correct baseline expectation for any TCM inspection sign.** Two
  qualified practitioners looking at the same patient frequently disagree.
- **Li Yafang et al. (2025)** proposes eye-tracking as an operationalisation of 望神.
  **It is a review/proposal with no new measurements.** Cite only as evidence the
  proposal exists.

**Honest statement: shen has not been operationalised or validated as a measurable
quantity. Anything the app computes and calls "shen" is our novel construct.**

### The 假神 collision — architectural, not editorial

**假神's cardinal sign is 兩顴泛紅如妝 — sudden malar flush in a previously dull
patient, read as 回光返照, imminent death.** That is **exactly** the appearance the
malar-rash safety gate exists to catch. Biomedically the same appearance indicates
mitral stenosis, CO₂ retention, SLE, fever or rosacea.

**Any shen module and the malar-rash gate compete for the same pixels. The gate
must win, by hard-coded precedence. 假神 must be removed from the rule set entirely.**

Separately: 「赤色出兩顴，大如拇指者，病雖小愈，必卒死」 (靈樞·五色) is an explicit
classical mortality prediction about malar erythema. **Under no circumstances may
any classical gloss be surfaced alongside the gate. Gate copy stays entirely
separate from the TCM content layer.**

---

## 9. Hypothesis 2 — facial tension / mouth–jaw asymmetry

### 9.1 The hypothesis, stated precisely

For individual *i* at time *t*, a landmark-derived asymmetry index *A(i,t)* from a
single 2D capture carries information about concurrent state *S(i,t)*, over and
above stable structural asymmetry *A_trait(i)* and measurement noise *ε*.

**This requires Var(A_state) to be non-trivial relative to Var(A_trait) + Var(ε),
and A_state to covary with S. None of the three has been demonstrated. The first
and second fail on retrieved evidence.**

### 9.2 State vs trait — the literature is about trait

Facial asymmetry research is dominated by **directional asymmetry** and
**fluctuating asymmetry** — the latter an index of *developmental* stability
accumulated over a lifetime (Ekrami et al. 2018, *PLOS ONE* 13(12):e0207895).
**Neither is a state marker. Both are, by construction, properties that do not
change day to day.**

**Shackelford & Larsen (1997)**, *JPSP* 72(2):456–466, is the paper that looks
supportive. It is not: the authors **explicitly conceptualise asymmetry as
fluctuating asymmetry, "a stable developmental trait."** The headline correlations
(r = .51–.70) come from **male subsamples of n=16 and n=18**, against a large
battery (BDI, EPQ, NPI, MMPI, LOT, ECQ, BSI, daily mood, daily symptoms, cardiac
recovery), sex-split. **Textbook small-sample effect inflation. No direct
replication located.**

**Ekman, Hager & Friesen (1981)** — the widely reported result is that asymmetry is
characteristic of **deliberate/posed** actions rather than spontaneous emotional
ones. **If correct, this actively undermines the hypothesis: a user posing for a
selfie is producing exactly the deliberate condition.** (Abstract fetch returned
403 — **finding UNVERIFIED**, flagged for retrieval.)

### 9.3 The noise floor exceeds the signal

- **Adel et al. (2025)**, *J Clin Med* 14(20):7172. **Cheilion (mouth-corner)
  asymmetry: median 2.77 mm manual vs 2.30 mm automated — two competent 3D methods
  disagreed by ~0.5 mm on a ~2.5 mm quantity (p=0.0081).** Intra-rater ICC as low
  as 0.62. Cited threshold: asymmetry <3 mm is generally undetectable in a normal face.
- **Wang et al. (2017)**, *Aesthetic Surgery Journal* 37(4):375–385. Perceptual
  detection threshold at the oral commissure: **3 mm.** "The perfectly symmetrical
  face does not exist."
- **Cummaudo et al. (2013)**, *Int J Legal Med* 127(3):699–706. Frontal-view
  landmark reliability: **jaw angle and cheekbone prominence are in the *least
  reliable* set** — the exact landmarks a jaw-tension feature would need.
- **Derakhshan et al. (2023)**, *The Laryngoscope*, PMID 37543968. **At 8 inches,
  12–19% vertical stretching of the midface; 18% with a smartphone; still 12% at
  12 inches.** Applied off-axis, this **manufactures asymmetry that is entirely an
  artefact of how the phone was held.**
- **Frajtag et al. (2025)**, arXiv:2507.18248, evaluates **MediaPipe directly**:
  landmark SD increases with rotation angle (Spearman ρ up to 0.9); at 73° yaw,
  repeatability 40% over 10 attempts; under weaker illumination, detection fell to
  30% of cases at just **30° pitch**.
- **Parte et al. (2026)**, arXiv:2604.06961. **Head pose and image resolution
  "substantially outweigh demographic attributes in impact"**; after controlling for
  them, gender and race disparities vanish while an **age bias persists**.

**Arithmetic: a 12–19% geometric distortion dwarfs a 2–3 mm signal. This is not a
tuning problem. It is a signal-to-noise impossibility at single-capture resolution.**

### 9.4 The general premise, and the decisive evidence against it

- **Barrett et al. (2019)**, *Psychological Science in the Public Interest*
  20(1):1–68. Similar facial configurations "variably express instances of more than
  one emotion category"; lab findings frequently fail to generalise.
- **Jaeger et al. (2024)**, *European Journal of Personality* 38(6). No meaningful
  relationship between face-based personality judgments and self-reported traits
  (b = 0.011, p = .648; **BF₀₁ > 1000, "decisive evidence for the null"**).
  Forced-choice extraversion accuracy **51.10%** vs 50% chance.
- **Foo et al. (2022)** meta-analysis on trustworthiness impressions — "kernel of
  truth or modern physiognomy?" — answer: barely.

**This directly falsifies the class of claim the Five Officers make (eyes →
judgment, nose → discernment, mouth → resource management) and any tension-to-state
inference.** Note the distinction that must never be blurred: **evidence exists that
faces drive impressions; evidence does not exist that impressions are accurate.**

### 9.5 What is real, and does not help

- **Stress ↔ bruxism:** Chemelo et al. (2020), *Front Neurol* 11:590779.
  **OR 2.07 [1.51–2.83]**, 3 studies, N=836, **GRADE certainty LOW**,
  cross-sectional, bruxism ascertained by exam or self-report, **not** by PSG/EMG.
  The chain stress → bruxism → masseter change → **visible asymmetry** has evidence
  only for the first link.
- **Fatigue IS visible — but not as asymmetry.** Sundelin et al. (2013), *Sleep*
  36(9):1355–1360. 31 h deprivation, **n=10 faces**, human raters. Significant:
  hanging eyelids, redder/more swollen eyes, darker circles, paler skin, droopier
  mouth corners. **Bilateral droop, not asymmetry. And the one tension-like item
  tested — "tense lips" — showed no effect (p>0.05).**
- **Facial EMG** tracks affective valence — but it detects **sub-visible electrical
  activity via skin electrodes**, says nothing about what a camera can see, and
  nothing about left–right asymmetry.

### 9.6 Confounders that individually exceed the hypothesised signal

Camera distance; focal length; head yaw/pitch/roll (**a few degrees of yaw
mechanically produces mouth-corner asymmetry through pure perspective**); image
resolution; illumination direction; front vs rear camera and vendor computational
photography; baseline structural asymmetry (~2–3 mm); **habitual chewing side**
(Heikkinen et al. 2022, *Acta Odontol Scand* 80(3):197–202 — chin volume larger on
the side *opposite* the habitual chewing side, OR 1.95; **asymmetry most pronounced
in the lower face and jaw, precisely our ROI**); dental occlusion and TMJ history;
sleep posture (UNVERIFIED); diurnal oedema, hydration, sodium, alcohol, crying,
exercise (UNVERIFIED); age; facial hair, glasses, makeup, hair covering one side;
neurological asymmetry; **posed expression induced by the act of taking the selfie**.

**A single uncontrolled capture cannot separate any of these from a hypothesised
state signal — not "poorly", but in principle, because the confounders are larger
than the signal and not independently observable from the same frame.**

### 9.7 The honest ceiling

1. ✅ "We measure the geometric symmetry of the landmarks detected in this image."
2. ✅ "Nearly everyone's face is somewhat asymmetric; this is normal."
3. ✅ "Measurements from phone photos are strongly affected by how you hold the
   camera, lighting, and head tilt — differences between two of your own photos
   usually reflect the photos, not you." **This is honest *and* differentiating.**
4. ⚠️ Sleep loss can change how a face looks — with the n=10 / human-rater /
   extreme-deprivation / **bilateral-not-asymmetric** caveats intact.
5. ❌ Everything else.

**If a tension feature is wanted at all, the only honest architecture is to ask the
user. A one-tap self-report of perceived jaw tension is more valid, more reliable,
cheaper and more defensible than any pixel measurement — and squarely inside
General Wellness.**

---

## 10. Prohibited inferences — consolidated

### 10.1 Regulatory basis

**FDA General Wellness.** A revised guidance was issued **6 January 2026**
(secondary summary retrieved; **FDA primary document NOT retrieved — verify before
relying on specifics**). Two permitted categories: software solely for maintaining a
healthy lifestyle unrelated to disease, and helping users live well with certain
chronic conditions through lifestyle choices. Prohibited: naming specific diseases;
claims of clinical accuracy, equivalence or "medical grade"; outputs that prompt or
guide specific clinical action. **Permitted with care:** a notification that
professional evaluation *may be helpful*, **provided it does not name a disease or
characterise the finding as abnormal.**

**FTC Health Products Compliance Guidance (20 December 2022).** Health claims
require "competent and reliable scientific evidence"; RCTs are the expected standard.
**Given §§2–9 record no validation for any construct, no health benefit claim is
substantiable.** **Implied claims count**, judged on the ad's **overall net
impression** — including imagery. **Lab coats, "clinically-inspired", medical-looking
mesh overlays or organ diagrams create implied disease claims even with a disclaimer.**

**EU AI Act, Regulation 2024/1689, Art. 5(1).**
- **(g)** prohibits biometric categorisation to infer **race**, political opinions,
  union membership, religious belief, sex life or sexual orientation.
- **(f)** prohibits emotion inference in workplace and education contexts.
- **(d)** prohibits criminal-risk prediction from profiling or personality traits.
- **Verified nuance, stated plainly:** the Act does **not** blanket-ban inferring
  character from faces in general consumer contexts. **Do not over-claim that it
  bans physiognomy outright — it doesn't.** The bans are the specific ones above.

### 10.2 Absolute exclusions

| # | Excluded | Why |
|---|---|---|
| P1 | Any lifespan, mortality or prognosis output | 得神者昌，失神者亡; 保壽官 (literally "Longevity Official"); 目…淺則短命; 圓則多夭; 中嶽不及…止中壽; 北嶽尖陷，末主無成. Prognosis is a device claim and unsubstantiable. |
| P2 | 失神, 假神, 神亂 as output categories | Map to obtundation/delirium/shock, imminent death, and mania/epilepsy/dementia. Named clinical conditions. |
| P3 | Any organ or disease mapping | The Neijing 五官 correspondence (鼻→肺, 目→肝, 口唇→脾, 舌→心, 耳→腎) is **pathophysiological doctrine**. "Your nose indicates lung health" is a diagnostic claim. Surface only as historical doctrine, past tense, attributed, no inference about the user. |
| P4 | Wealth, rank, class, career or fortune | 三停平等，富貴榮顯; 財穀有成; 家必富; 為賤類. Fortune-telling framing plus unsubstantiable benefit claims. |
| P5 | Character, morality, intelligence, criminality | 心惡毒，無慈愛; 醜而不端，則為愚人; 聰明壽考. Falsified by Jaeger et al. (2024). Note 「醜而不端」 also implicates **facial difference and disfigurement** — a protected characteristic in several jurisdictions. |
| P6 | Race, ethnicity or ancestry — inferred, displayed **or internally derived** | EU AI Act Art. 5(1)(g) is an outright prohibition. Eyelid morphology, nasal bridge and ear form are ancestry-correlated. **Thresholds tuned on one population will systematically shift officer/peak scores across ancestries. Test for it; make the test a release gate.** |
| P7 | Emotion or mental-health inference | Depression, anxiety, burnout, "emotional exhaustion". Barrett et al. (2019); Art. 5(1)(f). |
| P8 | Bruxism, TMD/TMJ, clenching, facial palsy, Bell's palsy, stroke | Named clinical conditions. A false negative on palsy is dangerous. |
| P9 | Numeric shen or tension "scores" presented as measurements | No validated scale exists. A number implies a measurement that does not. |
| P10 | Day-over-day asymmetry or shen trend lines | Plotting camera-hold variance and calling it the user's inner life. **The most seductive and least defensible feature in this design space.** |
| P11 | Thresholds or alerts on any of the above | Prompting specific action on an invalid measurement. |
| P12 | "Clinically validated", "medical grade", "AI-detected", accuracy percentages, "2,000 years of clinical evidence" | Prohibited claim categories. The antiquity claim is also partly false — the Wang Bing 762 CE layer is inseparable, and the five-shen taxonomy is 20th-century. |
| P13 | Consequential use: hiring, promotion, tenancy, lending, insurance, admissions, security screening | Art. 5(1)(d). **Ban explicitly in ToS; do not expose an API that makes it easy.** |
| P14 | Population comparison or "normal range" for asymmetry | Structural asymmetry is individual and partly determined by chewing side and dental history. Tells the user nothing except how their jaw grew. |

### 10.3 Safety-gate finding that contradicts current architecture

**A gate that says "malar rash detected → see a doctor" is itself a
diagnostic-adjacent output.** Naming "malar rash" or "diagonal earlobe crease" tells
the user a clinical sign was detected — a device claim.

**Defensible construction:** the gate suppresses all wellness output and shows a
generic, non-specific message — "this tool can't analyse this image; consider
speaking with a healthcare professional" — **without naming the finding.**

**And per §7: the diagonal earlobe crease gate cannot run on Face Mesh at all.**

---

## 11. Rights status — consolidated

### Public domain / usable

| Asset | Basis |
|---|---|
| 黃帝內經 (Suwen, Lingshu), 太清神鑑, 神相全編, 麻衣相法, 人倫大統賦, 欽定古今圖書集成 — **original Chinese** | PD by age. |
| Chinese Wikisource recensions of 太清神鑑 (四庫全書本), 人倫大統賦 (四庫全書本), 欽定古今圖書集成 藝術典 相術部 | Verified `{{PD-old}}` in page wikitext. **Best clean-rights quotation source.** |

**Caveat — machine punctuation.** The Wikisource *GJTSJC* pages carry a
`{{Machine punctuation}}` template crediting an external tool. **The punctuation
layer is separately sourced; the characters are PD.**

### In copyright — do not reproduce or closely paraphrase

| Work | Holder |
|---|---|
| Unschuld & Tessenow, *Huang Di Nei Jing Su Wen*, UC Press 2011, ISBN 9780520266988 | UC Press |
| Unschuld (trans.), *Huang Di Nei Jing Ling Shu*, UC Press 2016, ISBN 9780520292253 | UC Press |
| Lillian Bridges, *Face Reading in Chinese Medicine*, 2nd ed., ISBN 9780702043147 | Elsevier |
| Joey Yap, *Face Reading Essentials — Palaces & Positions*, ISBN 9789670310169 | JY Books |
| Patrician McCarthy, *The Face Reader*, ISBN 9780525950004 | Penguin Random House |
| Lillian Too / Lily Young, *Secrets of the Face*, ISBN 9780340349076 | Hodder |
| Chiu-Alexander Kuei, *The Secret Language of Your Face* | Profile |
| Kohn, "A Textbook of Physiognomy…", *Asian Folklore Studies* 45 (1986) | Nanzan. **Free PDF ≠ reuse licence — no CC statement located.** |
| Mei Chun, *Asia Major* 29.1 (2016) | Academia Sinica |
| Xing Wang, *Physiognomy in Ming China*, Brill 2020, ISBN 9789004429543 | Brill |
| Modern 點校 / 白話 editions: 神相水鏡集全編 四卷（點校本）(范文園); 人倫大統賦（白話評注本）; 圖解神相全編 | Various |

**點校 editions attract copyright in China — VERIFIED.** *China Book Corporation
(中華書局) v. Beijing Guoxue Era Communication Co.*, Beijing First Intermediate
People's Court, 2013 (古籍點校第一案): collators express their own understanding
through segmentation and punctuation. **Work from PD source text, not from
punctuated editions.**

### Two live commercial hazards

1. **WHO *International Standard Terminologies on TCM* (2022) is CC BY-NC-SA 3.0
   IGO. NonCommercial. This product has a paywall architecture
   (`SpiritMaxx Monetization Architecture` doc). WHO terminology cannot be embedded
   in a paid product without separate permission.**
2. **ctext.org prohibits automated bulk download** and states content "may not be
   republished without express written permission." **Do not scrape ctext for a
   corpus.** Quotation of reasonable excerpts is permitted.

**"Mien Shiang"** is used as an institutional brand by the Mien Shiang Institute.
A trademark registration could **not** be verified — **UNVERIFIED**. Given the
uncertainty, avoid the spelling; use 面相 / *miànxiàng* / "Chinese face reading".

**No public-domain English translation of 神相全編, 麻衣相法, 太清神鑑, 人倫大統賦 or
冰鑑 was located.** English classical text must be commissioned or translated
in-house — which also gives clean title.

**This closes none of the six defects in `docs/commercial-rights-audit.md`.** That
document requires a named edition and page/chapter locator per claim, a written
licence or PD determination, a contributor agreement, a named cultural reviewer's
log, legal approval, and SHA-256-hashed evidence files. **This dossier supplies
material toward (1) and (2) only. All six families remain `Blocked`.**

---

## 12. Evidence record — TO BE COMPLETED
Per B-020's acceptance criteria, the Geometry Researcher and Corpus Research Editor
complete the source and terminology dossier.

| # | Item for record | Status | Date |
|---|---|---|---|
| R1 | Is "Three Courts" retained, or renamed to "Three Sections"? The English name is unattested. | | |
| R2 | Is Harmony in or out of the six enduring constructs? | | |
| R3 | 四瀆 lineage: carry both 目/口 traditions, or select one with recorded rationale? | | |
| R4 | 北岳 target: 頷 (mandible) / 頦 (menton) / 地閣 (zone)? | | |
| R5 | 中岳 target: 鼻 (whole nose) or 準頭 (pronasale)? | | |
| R6 | 五官: which membership ships — physiognomic (with 眉) or Neijing (with 舌)? They are different constructs. | | |
| R7 | Five Elements: is the 25-type structure acknowledged, or is the 5-type reduction shipped with a stated caveat? | | |
| R8 | Are the polygynous (妻妾宮) and servile (奴僕宮) palace names shipped literally, modernised, or suppressed — and is that decision recorded as an editorial act? | | |
| R9 | Colour (五色) as classifier input: confirm exclusion. | | |
| R10 | Left/right convention: subject-side or image-side, and is 男左女右 adopted? Unattested in every source retrieved. | | |
| R11 | Confirm all 14 prohibited inferences (§10.2) are acceptable as absolute product constraints. | | |
| R12 | Confirm the malar-rash gate is renamed to a non-specific message (§10.3). | | |
| R13 | Confirm 假神 is removed from the rule set and gate precedence is hard-coded. | | |
| R14 | Confirm the earlobe-crease gate is re-scoped to a separate ear pipeline or withdrawn. | | |

---

## 13. Consequences for downstream tasks

**B-025** (Five Mountains / Five Officers / Four Rivers coverage matrix):
- 江瀆 (ear) must be recorded as **permanently abstaining** on front-facing capture —
  the mesh has no auricle geometry.
- 東岳/西岳 (cheekbone *bone* prominence) must be **low-confidence or abstaining** —
  surface landmarks cannot separate bone from soft tissue.
- 中岳 prominence and 目 depth are **z-axis judgments** MediaPipe estimates
  non-metrically. `needsVerification` at minimum.
- The 四瀆 lineage split and the three 北岳 variants must be **versioned as
  alternatives with provenance**, not averaged.

**B-030** (neutral gaze / burst contract): the Neijing's own test of 精明 is
**functional**, not appearance-based. Shen is not an observable. The traditional
label is not an observable — consistent with the plan's existing wording.

**B-040** (`mouthJawAsymmetryShift`): §9 is a negative result. The measurement
error of a single uncontrolled 2D capture exceeds the hypothesised signal by a wide
margin, and no state component has been demonstrated to exist. **"Tension" must
remain an unapproved display label, and B-040 should record the honest ceiling in
§9.7 rather than a candidate contract — or record the self-report architecture
instead.**

**B-140** (corpus): every reachable variant needs stable ID, source, rights and
cultural status. §11 shows **no source family can currently be marked `cleared`**.

**Bias mitigation (project charter):** Parte et al. (2026) indicates the dominant
error sources are **pose and resolution**, with a persistent **age** effect, and
that apparent race/gender disparity may be pose/resolution confounding. **Fitzpatrick
work must be paired with pose and resolution normalisation and age-stratified
evaluation, or we will be measuring the wrong bias.**

---

## 14. Sources

**Primary text, retrieved and read:**
- 欽定古今圖書集成／博物彙編／藝術典／第632卷 (相術部彙考二／神相全編二) — Chinese Wikisource, `{{PD-old}}`
- 欽定古今圖書集成／藝術典／第636卷 (神異賦), 第637卷 (人倫大統賦上), 第639卷 (袁柳莊雜論中篇)
- 太清神鑑 (四庫全書本)／全覽 — Chinese Wikisource, incl. the 四庫 提要
- 人倫大統賦 (四庫全書本)／全覽 — Chinese Wikisource, incl. 提要 and 薛延年 commentary
- 黃帝內經·靈樞 ch. 64 陰陽二十五人; ch. 49 五色; ch. 80 大惑論; 素問 ch. 13 移精變氣論; ch. 17 脈要精微論
- 論《內經》五臟主五竅 — 北京中醫藥大學 (verbatim 靈樞·五閱五使, 脈度; 素問·金匱真言論)
- 人相水鏡集全編 — Chinese Text Project (uncorrected OCR, fragmentary)
- 神相全編 — 書格 (Ming 致和堂藏板 scan; ToC verified, chapter body not retrieved)

**Scholarship:**
- Kohn, L. (1986), "A Textbook of Physiognomy: The Tradition of the *Shenxiang quanbian*", *Asian Folklore Studies* 45:227–258
- Mei Chun (2016), *Asia Major* 29.1:73–100
- Xing Wang (2020), *Physiognomy in Ming China*, Brill
- Hsu, E. (2000), *Culture, Medicine and Psychiatry* 24(2):197–229, DOI 10.1023/A:1005529514427

**Measurement and psychology:**
- Jacobson et al. (2019), *JACM* 25(11):1085–1096, DOI 10.1089/acm.2019.0197
- O'Brien et al. (2009), *JACM* 15(7):727–734, DOI 10.1089/acm.2008.0554
- Barrett et al. (2019), *Psych Sci Public Interest* 20(1):1–68, DOI 10.1177/1529100619832930
- Jaeger, Sleegers, Stern, Penke & Jones (2024), *Eur J Personality* 38(6), DOI 10.1177/08902070231225728
- Foo, Sutherland, Burton, Nakagawa & Rhodes (2022), meta-analysis on trustworthiness impressions
- Ekrami et al. (2018), *PLOS ONE* 13(12):e0207895
- Adel et al. (2025), *J Clin Med* 14(20):7172, DOI 10.3390/jcm14207172
- Wang, Wessels, Hussain & Merten (2017), *Aesthetic Surg J* 37(4):375–385, DOI 10.1093/asj/sjw271
- Cummaudo et al. (2013), *Int J Legal Med* 127(3):699–706, DOI 10.1007/s00414-013-0850-7
- Derakhshan et al. (2023), *The Laryngoscope*, PMID 37543968
- Frajtag, Švaco & Šuligoj (2025), arXiv:2507.18248
- Parte, Valle, Buenaposada & Baumela (2026), arXiv:2604.06961
- Chemelo et al. (2020), *Front Neurol* 11:590779, DOI 10.3389/fneur.2020.590779
- Sundelin et al. (2013), *Sleep* 36(9):1355–1360, DOI 10.5665/sleep.2964
- Heikkinen et al. (2022), *Acta Odontol Scand* 80(3):197–202, DOI 10.1080/00016357.2021.1985166
- Meng et al. (2022), *Evid Based Complement Alternat Med* 2022:6950529
- Zhang Xiaowei et al. (2024), 南京中醫藥大學學報 40(12):1323–1330
- Li Yafang et al. (2025), 世界科學技術—中醫藥現代化 27(3)

**Regulatory:**
- EU AI Act, Regulation (EU) 2024/1689, Article 5(1)
- FDA, *General Wellness: Policy for Low Risk Devices* — revised guidance 6 Jan 2026 (**primary doc NOT retrieved; verify**)
- FTC, *Health Products Compliance Guidance*, 20 December 2022
- WHO (2022), *International Standard Terminologies on TCM*, CC BY-NC-SA 3.0 IGO
- 中華書局 v. 北京國學時代文化傳播公司, Beijing First Intermediate People's Court, 2013

**Technical:**
- MediaPipe `canonical_face_model.obj` (468 vertices) — downloaded and analysed geometrically

**Located but NOT retrieved — treat contents as unverified:** Ekman, Hager & Friesen
(1981) PMID 7220762; Sackeim, Gur & Saucy (1978) DOI 10.1126/science.705335; Van
Dongen & Gangestad FA meta-analysis; Janal et al. (2021) DOI 10.1111/joor.13238;
*Laterality* 23(4) PMID 29098936; the numeric kappas in O'Brien et al. (2009);
Samizadeh (2020) PMID 31102329; the chapter bodies of 神相全編 十二宮相論 and any
麻衣相法 recension; 靈樞·通天 verbatim.

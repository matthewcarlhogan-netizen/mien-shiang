/*
 * Source-led heritage evidence.
 *
 * This file records the research layer only. Runtime prose remains in
 * qise/reflection-corpus.js, and a research-only lineage is never made
 * renderable merely because its source record is stronger.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const constituent = ({
  constituentId,
  canonicalChineseName,
  definition,
  sourceId,
  sectionLocator = null,
  folioLocator = null,
  aliases = [],
  aliasWitnesses = [],
  evidenceStrength = "RECORDED_NOT_VERIFIED",
  measurementAvailability = "NOT_RECORDED",
  note = null,
}) => ({
  constituentId,
  canonicalChineseName,
  aliases,
  aliasWitnesses,
  definition,
  sourceId,
  sectionLocator,
  folioLocator,
  evidenceStrength,
  measurementAvailability,
  prohibitedForUserInference: true,
  note,
});

const disagreement = ({
  disagreementId,
  nature,
  target,
  status = "OPEN",
  positions = [],
}) => ({
  disagreementId,
  nature,
  target,
  status,
  positions,
});

const fiveFormMembers = ["wood", "fire", "earth", "metal", "water"].map((id) =>
  constituent({
    constituentId: id,
    canonicalChineseName: {
      wood: "木形",
      fire: "火形",
      earth: "土形",
      metal: "金形",
      water: "水形",
    }[id],
    definition: "Named member of the five-form typology; no colour or modern face-shape classifier is encoded here.",
    sourceId: "heritage-five-elements",
    sectionLocator: "靈樞 第六十四·陰陽二十五人",
    evidenceStrength: "VERIFIED_PRIMARY",
    measurementAvailability: "MODERN_MAPPING_UNSUPPORTED",
  }));

export const HERITAGE_EVIDENCE = deepFreeze({
  threeSections: {
    verificationStatus: "RECORDED_NOT_VERIFIED",
    lineages: {
      primary: {
        sourceId: "heritage-three-sections",
        evidenceStrength: "RECORDED_NOT_VERIFIED",
        evidenceKind: "DISAGREEMENT",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "SUPPORTED_2D",
        constituents: [],
        relatedSystems: [],
        disagreements: [
          disagreement({
            disagreementId: "three-sections-boundaries",
            nature: "MAPPING",
            target: { targetType: "CONSTRUCT", targetRef: "threeSections" },
            status: "OPEN",
            positions: [
              {
                positionId: "sxqb-mingdu",
                sourceId: "heritage-three-sections-sxqb",
                summary: "神相全編, quoting 冥度經, records a boundary scheme distinct from the common transmitted form.",
              },
              {
                positionId: "common-transmitted",
                sourceId: "mianxiang-unspecified",
                summary: "The common transmitted boundary form begins its middle section at the brow centre rather than the nose root.",
              },
              {
                positionId: "mayi-ten-observations",
                sourceId: "heritage-three-sections",
                summary: "The received 麻衣 十觀 passage names three points rather than the same three boundary intervals.",
              },
              {
                positionId: "received-mayi-contradiction",
                sourceId: "heritage-three-sections",
                summary: "The inspected received Ma Yi witness contradicts the auspiciousness predicate formerly attributed to it.",
              },
            ],
          }),
        ],
        note: "The received attribution is contradicted and has no stable critical edition or folio; this lineage is research-only.",
      },
      "sxqb-mingdu": {
        definition: "A Three Sections boundary scheme quoted by 神相全編 from 冥度經.",
        source: "神相全編, quoting 冥度經",
        sourceId: "heritage-three-sections-sxqb",
        evidenceKind: "DISAGREEMENT",
        evidenceStrength: "VERIFIED_SECONDARY",
        runtimeStatus: "HERITAGE_ONLY",
        measurementAvailability: "CONDITIONALLY_SUPPORTED",
        constituents: [
          constituent({
            constituentId: "upper",
            canonicalChineseName: "上停",
            definition: "天中 to 印堂.",
            sourceId: "heritage-three-sections-sxqb",
            sectionLocator: "卷一「面三停」",
            evidenceStrength: "VERIFIED_SECONDARY",
            measurementAvailability: "CONDITIONALLY_SUPPORTED",
          }),
          constituent({
            constituentId: "middle",
            canonicalChineseName: "中停",
            definition: "山根 to 準頭.",
            sourceId: "heritage-three-sections-sxqb",
            sectionLocator: "卷一「面三停」",
            evidenceStrength: "VERIFIED_SECONDARY",
            measurementAvailability: "CONDITIONALLY_SUPPORTED",
          }),
          constituent({
            constituentId: "lower",
            canonicalChineseName: "下停",
            definition: "人中 to 地閣.",
            sourceId: "heritage-three-sections-sxqb",
            sectionLocator: "卷一「面三停」",
            evidenceStrength: "VERIFIED_SECONDARY",
            measurementAvailability: "CONDITIONALLY_SUPPORTED",
          }),
        ],
        relatedSystems: [],
        disagreements: [],
      },
      "common-transmitted": {
        definition: "A commonly transmitted Three Sections boundary scheme whose edition is not yet identified.",
        source: "Common transmitted form; edition not recorded",
        sourceId: "mianxiang-unspecified",
        evidenceKind: "DISAGREEMENT",
        evidenceStrength: "RECORDED_NOT_VERIFIED",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "CONDITIONALLY_SUPPORTED",
        constituents: [
          constituent({ constituentId: "upper", canonicalChineseName: "上停", definition: "髮際 to 印堂.", sourceId: "mianxiang-unspecified", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "middle", canonicalChineseName: "中停", definition: "印堂 to 準頭.", sourceId: "mianxiang-unspecified", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "lower", canonicalChineseName: "下停", definition: "人中 to 地閣.", sourceId: "mianxiang-unspecified", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
        ],
        relatedSystems: [],
        disagreements: [],
      },
      "mayi-ten-observations": {
        definition: "The received 麻衣 十觀 passage identifies three named points rather than a complete interval definition.",
        source: "Received 麻衣 十觀 passage; critical edition not located",
        sourceId: "heritage-three-sections",
        evidenceKind: "DISAGREEMENT",
        evidenceStrength: "RECORDED_NOT_VERIFIED",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "NOT_RECORDED",
        constituents: [
          constituent({ constituentId: "upper-point", canonicalChineseName: "額門", definition: "Upper named point.", sourceId: "heritage-three-sections" }),
          constituent({ constituentId: "middle-point", canonicalChineseName: "準頭", definition: "Middle named point.", sourceId: "heritage-three-sections" }),
          constituent({ constituentId: "lower-point", canonicalChineseName: "地角", definition: "Lower named point.", sourceId: "heritage-three-sections" }),
        ],
        relatedSystems: [],
        disagreements: [],
      },
      "taiqing-section-heading": {
        definition: "太清神鑑 卷六 defines Three Sections as 身三停 — three sections of the BODY, not the face. Its primary predicate is a differential, ranked rule between the three sections rather than an equal-thirds rule; its secondary predicate is 相稱 (proportional match), not 平等 (equal).",
        source: "Taiqing Shenjian, 卷六, 身三停 section",
        sourceId: "heritage-three-sections-taiqing",
        evidenceKind: "POSITIVE_CLAIM",
        // EV-06, project-owned Kanripo acquisition (2026-08-29): byte-pinned.
        evidenceStrength: "VERIFIED_PRIMARY",
        folioLocator: "<pb:KR3g0045_WYG_006_6a>",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "UNSUPPORTED",
        constituents: [],
        relatedSystems: [],
        disagreements: [],
        note: "This is a body-proportion construct, not a facial one, so a face-only scanner cannot measure it, and its differential/相稱 predicate must not be cited as support for the 'three-sections-equality-mayi-received' combination above. Predicate confirmed byte-for-byte (上停長者大吉昌… ranked rule; 又云身三停相稱 secondary). Kept structurally distinct from the FACIAL taiqing-mianbu-facial lineage (卷五 論靣部) — same text, different juan, different domain.",
      },
      /*
       * EV-05, project-owned Kanripo acquisition (2026-08-29), errata E-4.
       * A genuinely distinct lineage, not a revision of taiqing-section-heading:
       * that lineage is the卷六 BODY construct; this one is the 卷五 FACIAL
       * construct. Kept structurally distinct on purpose.
       */
      "taiqing-mianbu-facial": {
        definition: "太清神鑑 卷五 論靣部 defines the FACIAL three sections with explicit boundaries: upper = 髪際 to 眉間; middle = 眉間 to 鼻凖; lower = 凖/人中 to 頰. A 三才 correspondence (上像天 中像人 下像地) and per-section predicates (上主貴 中主壽 下主富). 三停皆稱乃上相之人矣. This is FACIAL, distinct from the BODY 身三停 of 卷六.",
        source: "Taiqing Shenjian, 卷五 論靣部",
        sourceId: "heritage-three-sections-taiqing-mianbu",
        evidenceKind: "POSITIVE_CLAIM",
        evidenceStrength: "VERIFIED_PRIMARY",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "SUPPORTED_2D",
        folioLocator: "<pb:KR3g0045_WYG_005_7b>",
        constituents: [
          constituent({ constituentId: "upper", canonicalChineseName: "上停", definition: "髪際 to 眉間.", sourceId: "heritage-three-sections-taiqing-mianbu", sectionLocator: "卷五 論靣部", folioLocator: "<pb:KR3g0045_WYG_005_7b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "SUPPORTED_2D" }),
          constituent({ constituentId: "middle", canonicalChineseName: "中停", definition: "眉間 to 鼻凖.", sourceId: "heritage-three-sections-taiqing-mianbu", sectionLocator: "卷五 論靣部", folioLocator: "<pb:KR3g0045_WYG_005_7b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "SUPPORTED_2D" }),
          constituent({ constituentId: "lower", canonicalChineseName: "下停", definition: "凖/人中 to 頰.", sourceId: "heritage-three-sections-taiqing-mianbu", sectionLocator: "卷五 論靣部", folioLocator: "<pb:KR3g0045_WYG_005_7b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "SUPPORTED_2D" }),
        ],
        relatedSystems: [],
        disagreements: [],
        note: "Keep structurally distinct from taiqing-section-heading (卷六 body). Same text, different juan, different domain, different predicate family (facial: 稱; body: ranked + 相稱).",
      },
      /* EV-07, project-owned Kanripo acquisition (2026-08-29), errata E-5. */
      "yuguan-pingdeng": {
        definition: "玉管照神局 卷下 verse: 三停平等能和美. Domain unspecified (verse). 平等 wording, not 相稱.",
        source: "玉管照神局, 卷下",
        sourceId: "heritage-three-sections-yuguan",
        evidenceKind: "POSITIVE_CLAIM",
        evidenceStrength: "VERIFIED_PRIMARY",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "NOT_RECORDED",
        folioLocator: "<pb:KR3g0044_WYG_003_13a>",
        constituents: [],
        relatedSystems: [],
        disagreements: [],
        note: "似X得X 平等 predicate is not a Ma Yi-exclusive predicate — 玉管照神局 is a Southern Tang / early Song Siku witness. See the three-sections-predicate disagreement.",
      },
    },
  },

  fiveElements: {
    aliases: ["五形人"],
    verificationStatus: "VERIFIED_PRIMARY",
    lineages: {
      primary: {
        sourceId: "heritage-five-elements",
        supportingSourceIds: ["heritage-five-elements-taiqing"],
        evidenceStrength: "VERIFIED_PRIMARY",
        // EV-15, product-owner decision required (docs/DECISION_CARDS.md CARD 8
        // — SUPERSEDE R7?). This lineage's runtimeStatus and permittedHeritageSemantics
        // are UNCHANGED by the 2026-08-29 reconciliation pending that decision.
        runtimeStatus: "RUNTIME_PROSE",
        measurementAvailability: "MODERN_MAPPING_UNSUPPORTED",
        safetyStatus: "prohibited",
        permittedHeritageSemantics: "Describe the five named forms and the source's twenty-five-type structure as attributed historical material only.",
        prohibitedInference: "Do not use colour, Qi Se, or a modern geometric face-shape label to assign a person to an element type.",
        constituents: fiveFormMembers,
        relatedSystems: [{
          relatedSystemId: "five-phases",
          canonicalChineseName: "五行",
          relationship: "A distinct adjacent system in the sources, not an alias for 五形.",
          sourceId: "heritage-five-elements-taiqing",
          note: "太清神鑑 places 五行所生 and 五形 in separate sections.",
        }],
        negativeFinding: "Modern geometric labels such as oval, heart and diamond are not established classical equivalents and must not be presented as translations of 五形.",
      },
      /*
       * EV-16, project-owned Kanripo acquisition (2026-08-29), errata E-7.
       * NEW: an entirely independent physiognomic like-with-like pairing,
       * explicitly NOT generation/overcoming/25-type. Kept as its own lineage
       * rather than folded into "primary" so it cannot be mistaken for a
       * restatement of the Ling Shu 25-type structure this evidence does not
       * support (see EV-15 / CARD 8).
       */
      "yuguan-like-with-like": {
        definition: "玉管照神局 卷上 呂洞賓賦: 似金得金剛毅深，似木得木資財阜，似水得水文章貴，似火得火兵機大，似土得土多櫃庫 — five like-with-like pairs, one outcome each. NOT generation, overcoming, a 5×5 grid, or 25 types.",
        source: "玉管照神局, 卷上 呂洞賓賦",
        sourceId: "heritage-five-forms-yuguan",
        evidenceKind: "POSITIVE_CLAIM",
        evidenceStrength: "VERIFIED_PRIMARY",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "MODERN_MAPPING_UNSUPPORTED",
        folioLocator: "<pb:KR3g0044_WYG_001_4b>",
        constituents: [],
        relatedSystems: [],
        disagreements: [],
        note: "See the no-five-forms-five-phases-conflation negative rule: this is like-with-like (an element-resembling form obtaining that same element), not the Five Phases generation/overcoming cycle and not the Ling Shu twenty-five-type structure.",
      },
    },
  },

  twelvePalaces: {
    verificationStatus: "RECORDED_NOT_VERIFIED",
    lineages: {
      primary: {
        sourceId: "heritage-twelve-palaces",
        supportingSourceIds: ["heritage-twelve-palaces-discovery-surrogate"],
        evidenceStrength: "RECORDED_NOT_VERIFIED",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "CONDITIONALLY_SUPPORTED",
        constituents: [],
        relatedSystems: [],
        disagreements: [
          disagreement({
            disagreementId: "twelve-palaces-constituents",
            nature: "CONSTITUENT_MEMBERSHIP",
            target: { targetType: "CONSTRUCT", targetRef: "twelvePalaces" },
            status: "OPEN",
            positions: [
              {
                positionId: "taiqing-yuguan",
                sourceId: "heritage-twelve-palaces-taiqing",
                summary: "太清神鑑 records a parallel palace assignment with no 田宅宮 and with 財帛宮 away from the nose.",
                // DR-05, project-owned Kanripo acquisition (2026-08-29).
                note: "Byte-pinned <pb:KR3g0045_WYG_001_17b>; evidenceStrength VERIFIED_PRIMARY.",
              },
            ],
          }),
          disagreement({
            disagreementId: "twelve-palaces-twelfth-slot",
            nature: "PREDICATE",
            target: { targetType: "CONSTRUCT", targetRef: "twelvePalaces" },
            status: "OPEN",
            positions: [
              {
                positionId: "appearance-palace",
                sourceId: "heritage-twelve-palaces-taiqing",
                summary: "The 太清神鑑 sequence closes with 相貌 rather than silently normalising the twelfth slot to another lineage.",
              },
            ],
          }),
        ],
        // EV-14, project-owned Kanripo acquisition (2026-08-29).
        note: "The Zhihetang table of contents has adjacent Twelve Palaces Formula and Twelve Palaces Network entries. They must not be collapsed, and the previously claimed Twelve Palaces Discussion locator is absent. The 十二宫 system IS byte-pinned in 太清神鑑 卷一 (成和子統論, <pb:KR3g0045_WYG_001_17b>): 宮 is normalised to 宫 (U+5BAB) in Kanripo, so negative tests must search BOTH forms. What remains SOURCE_REQUIRED is specifically the received-Mayi / 神相全編 constituent mapping (財帛宮 = nose; presence of 田宅宮), which the 太清 witness does NOT support (太清 assigns 財帛宮 to 天倉地庫). Runtime status of the construct is a separate decision (docs/DECISION_CARDS.md CARD 10).",
      },
      "sxqb-discovery-surrogate": {
        definition: "A discovery-only surrogate of the received body assigns the wealth palace to the nose.",
        source: "Discovery-only Shenxiang Quanbian body surrogate",
        sourceId: "heritage-twelve-palaces-discovery-surrogate",
        evidenceKind: "POSITIVE_CLAIM",
        evidenceStrength: "RECORDED_NOT_VERIFIED",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "NOT_RECORDED",
        constituents: [
          constituent({
            constituentId: "wealth",
            canonicalChineseName: "財帛宮",
            definition: "Nose.",
            sourceId: "heritage-twelve-palaces-discovery-surrogate",
            sectionLocator: "Twelve Palaces body (discovery-only surrogate)",
          }),
        ],
        relatedSystems: [],
        disagreements: [],
        note: "Hold at recorded: the Baidu-hosted surrogate is not an edition-anchored publication source.",
      },
      "taiqing-yuguan": {
        definition: "A parallel Twelve Palaces assignment recorded in 太清神鑑 and attributed there to 玉管照神論.",
        source: "太清神鑑, 成和子統論",
        sourceId: "heritage-twelve-palaces-taiqing",
        evidenceKind: "DISAGREEMENT",
        // EV-13, project-owned Kanripo acquisition (2026-08-29): byte-pinned
        // base text (passageId tq-j1-shierdgong). runtimeStatus of the
        // CONSTRUCT is a separate decision (docs/DECISION_CARDS.md CARD 10) —
        // this evidence-strength/locator correction does not itself change it.
        evidenceStrength: "VERIFIED_PRIMARY",
        folioLocator: "<pb:KR3g0045_WYG_001_17b>",
        runtimeStatus: "HERITAGE_ONLY",
        measurementAvailability: "NOT_RECORDED",
        constituents: [
          constituent({ constituentId: "life", canonicalChineseName: "命宮", definition: "印堂.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "wealth", canonicalChineseName: "財帛宮", definition: "天倉、地庫.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "siblings", canonicalChineseName: "兄弟宮", definition: "龍虎、額角頭.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "parents", canonicalChineseName: "父母宮", definition: "日月角.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "children", canonicalChineseName: "男女宮", definition: "三陰、三陽.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "servants", canonicalChineseName: "奴僕宮", definition: "懸壁.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "spouse", canonicalChineseName: "妻妾宮", definition: "魚尾.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "adversity", canonicalChineseName: "疾厄宮", definition: "神光、年壽.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "travel", canonicalChineseName: "遷移宮", definition: "山林、邊地.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "office", canonicalChineseName: "官祿宮", definition: "正面.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "fortune", canonicalChineseName: "福德宮", definition: "精神、地角、福堂.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
          constituent({ constituentId: "appearance", canonicalChineseName: "相貌", definition: "A general concluding category rather than 田宅宮.", sourceId: "heritage-twelve-palaces-taiqing", sectionLocator: "卷一·成和子統論", folioLocator: "<pb:KR3g0045_WYG_001_17b>", evidenceStrength: "VERIFIED_PRIMARY" }),
        ],
        relatedSystems: [],
        disagreements: [],
      },
    },
  },

  fiveMountains: {
    verificationStatus: "VERIFIED_PRIMARY",
    lineages: {
      primary: {
        source: "人倫大統賦 (薛延年注, Yuan commentary layer), directional Five Mountains witness; edition identified, folio now byte-pinned",
        sourceId: "heritage-five-mountains-renlun-datong",
        // EV-03, project-owned Kanripo acquisition (2026-08-29): promoted from
        // RECORDED_NOT_VERIFIED — the Yuan commentary layer is now byte-pinned
        // at <pb:KR3g0046_WYG_001_11a>. runtimeStatus is UNCHANGED (Decision 1,
        // docs/DECISION_CARDS.md CARD 7 — an evidence-strength correction is not
        // a lineage-routing decision).
        evidenceStrength: "VERIFIED_SECONDARY",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
        constituents: [],
        relatedSystems: [{
          relatedSystemId: "five-directions-cosmology",
          canonicalChineseName: null,
          relationship: "Cosmological directions are conceptually distinct from feature labels attested for individual mountain constituents.",
          sourceId: "heritage-five-mountains-renlun-datong",
          note: "Do not project directional labels back into Taiqing constituent records.",
        }],
        disagreements: [
          disagreement({
            disagreementId: "five-mountains-membership",
            nature: "CONSTITUENT_MEMBERSHIP",
            target: { targetType: "CONSTRUCT", targetRef: "fiveMountains" },
            status: "OPEN",
            positions: [
              {
                positionId: "taiqing-mountain-names",
                sourceId: "heritage-five-mountains",
                summary: "太清神鑑 names the five individual mountains rather than only directional positions.",
              },
            ],
          }),
          disagreement({
            disagreementId: "five-mountains-northern-region",
            nature: "MAPPING",
            target: { targetType: "CONSTRUCT", targetRef: "fiveMountains" },
            status: "OPEN",
            positions: [
              {
                positionId: "taiqing-han",
                sourceId: "heritage-five-mountains",
                summary: "太清神鑑 assigns 恆嶽 to 頷.",
              },
              {
                positionId: "sxqb-chin",
                sourceId: "heritage-five-mountains-sxqb",
                summary: "The Shenxiang Quanbian witness assigns the northern mountain to the chin point.",
              },
              {
                positionId: "shenyi-lower-face-zone",
                sourceId: "heritage-five-mountains-shenyi",
                summary: "The Shenyi Fu commentary uses a broader lower-face zone for the northern mountain.",
              },
              {
                positionId: "renlun-datong-chin",
                sourceId: "heritage-five-mountains-renlun-datong",
                summary: "人倫大統賦 witnesses the northern mountain as 頦 (chin), distinguished from 太清's 頷 term.",
              },
              {
                // EV-04, project-owned Kanripo acquisition (2026-08-29).
                positionId: "yuebo-yi",
                sourceId: "heritage-yuebo-dongzhongji-configuration",
                summary: "月波洞中記 卷上 assigns the northern/lower-face mountain to 頥.",
                note: "Byte-pinned <pb:KR3g0043_WYG_001_5a>.",
              },
            ],
          }),
        ],
        note: "Directional naming (南/北/東/西/中) is witnessed by 人倫大統賦 (薛延年注) — the best-attested authorship in this corpus — not by a generic 麻衣-lineage source as previously recorded here. Now byte-witnessed at <pb:KR3g0046_WYG_001_11a> (EV-03, 2026-08-29). The disputed northern/lower-face mountain now has three byte-pinned positions: 頷 (太清), 頦 (人倫大統賦 薛注), 頥 (月波洞中記 卷上).",
      },
      "taiqing-siku": {
        definition: "The 太清神鑑 Five Mountains assignment, retaining the mountain names used by the source.",
        source: "太清神鑑, 欽定四庫全書文淵閣本",
        sourceId: "heritage-five-mountains",
        evidenceKind: "POSITIVE_CLAIM",
        evidenceStrength: "VERIFIED_PRIMARY",
        runtimeStatus: "HERITAGE_ONLY",
        measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
        constituents: [
          constituent({ constituentId: "heng-yue-first", canonicalChineseName: "衡嶽", definition: "Forehead.", sourceId: "heritage-five-mountains", sectionLocator: "Five Mountains section, juan 2", folioLocator: "<pb:KR3g0045_WYG_002_17b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "heng-yue-second", canonicalChineseName: "恆嶽", definition: "Jaw contour.", sourceId: "heritage-five-mountains", sectionLocator: "Five Mountains section, juan 2", folioLocator: "<pb:KR3g0045_WYG_002_17b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "tai", canonicalChineseName: "泰嶽", definition: "左顴; source laterality is retained and not operationalised here.", sourceId: "heritage-five-mountains", sectionLocator: "「五嶽」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_17b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "hua", canonicalChineseName: "華嶽", definition: "右顴; source laterality is retained and not operationalised here.", sourceId: "heritage-five-mountains", sectionLocator: "「五嶽」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_17b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "song", canonicalChineseName: "嵩嶽", definition: "鼻.", sourceId: "heritage-five-mountains", sectionLocator: "「五嶽」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_17b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
        ],
        relatedSystems: [{
          relatedSystemId: "five-directions-cosmology",
          canonicalChineseName: null,
          relationship: "A separate cosmological direction framework; it is not encoded as a Taiqing constituent label.",
          sourceId: "heritage-five-mountains-mayi",
          note: "The inspected Taiqing passage supplies mountain names and facial regions, not directional labels.",
        }],
        // EV-01 folio pinning + EV-02 disagreement note, project-owned Kanripo
        // acquisition (2026-08-29). See EVIDENCE_TRANSITION_LEDGER.md.
        note: "「五嶽須要豐隆而相朝」 — the source combines the five mountains through fullness (豐隆) and mutual orientation (相朝); a frontal selfie cannot recover that rule. Encoded as the five-mountains-mutual-facing / five-mountains-fullness connectors in the connector graph (split from a single former connector, errata E-8), not as an embedded combination. The lower-face / northern-mountain term is contested across three byte-pinned witnesses: 頥 (月波洞中記 卷上, <pb:KR3g0043_WYG_001_5a>), 頷 (太清神鑑 卷二, this record), 頦 (人倫大統賦 薛注, <pb:KR3g0046_WYG_001_11a>).",
        disagreements: [],
      },
      "sxqb-chin": {
        definition: "A Shenxiang Quanbian witness places the disputed northern mountain at the chin point.",
        source: "Shenxiang Quanbian Five Mountains witness",
        sourceId: "heritage-five-mountains-sxqb",
        evidenceKind: "DISAGREEMENT",
        evidenceStrength: "VERIFIED_SECONDARY",
        runtimeStatus: "HERITAGE_ONLY",
        measurementAvailability: "CONDITIONALLY_SUPPORTED",
        constituents: [
          constituent({
            constituentId: "northern-mountain",
            canonicalChineseName: "恆山",
            definition: "Chin point.",
            sourceId: "heritage-five-mountains-sxqb",
            sectionLocator: "Five Mountains passage witnessed through Gujin Tushu Jicheng, art canon volume 632",
            evidenceStrength: "VERIFIED_SECONDARY",
            measurementAvailability: "CONDITIONALLY_SUPPORTED",
          }),
        ],
        relatedSystems: [],
        disagreements: [],
      },
      "shenyi-lower-face-zone": {
        definition: "A Shenyi Fu commentary witness places the disputed northern mountain in a broader lower-face zone.",
        source: "Shenyi Fu commentary Five Mountains witness",
        sourceId: "heritage-five-mountains-shenyi",
        evidenceKind: "DISAGREEMENT",
        evidenceStrength: "RECORDED_NOT_VERIFIED",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "CONDITIONALLY_SUPPORTED",
        constituents: [
          constituent({ constituentId: "northern-mountain", canonicalChineseName: "北嶽", definition: "Broader lower-face zone.", sourceId: "heritage-five-mountains-shenyi", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
        ],
        relatedSystems: [],
        disagreements: [],
      },
    },
  },

  fourRivers: {
    verificationStatus: "VERIFIED_PRIMARY",
    lineages: {
      primary: {
        sourceId: "heritage-four-rivers-primary",
        supportingSourceIds: [
          "heritage-four-rivers-renlun-fengjian",
          "heritage-four-rivers-renlun-datong",
        ],
        evidenceStrength: "VERIFIED_PRIMARY",
        runtimeStatus: "RUNTIME_PROSE",
        measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
        constituents: [
          constituent({ constituentId: "ji", canonicalChineseName: "濟", definition: "鼻.", sourceId: "heritage-four-rivers-primary", sectionLocator: "「四瀆」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_18a>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "huai", canonicalChineseName: "淮", definition: "目.", sourceId: "heritage-four-rivers-primary", sectionLocator: "「四瀆」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_18a>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "jiang", canonicalChineseName: "江", definition: "耳.", sourceId: "heritage-four-rivers-primary", sectionLocator: "「四瀆」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_18a>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "UNSUPPORTED" }),
          constituent({ constituentId: "he", canonicalChineseName: "河", definition: "口.", sourceId: "heritage-four-rivers-primary", sectionLocator: "「四瀆」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_18a>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
        ],
        relatedSystems: [],
        /*
         * EV-10 folio pinning + EV-12, project-owned Kanripo acquisition
         * (2026-08-29). This lineage is RUNTIME_PROSE — its note/definition/
         * source feed the live English reading text (tests/ui-language.test.js
         * enforces this) — so EV-12's byte-pinned finding is recorded here as a
         * comment, not in `note`, to keep the source text out of the reader
         * surface. 太清神鑑 卷二 states two further Four Rivers relations, both
         * byte-pinned at <pb:KR3g0045_WYG_002_18a>: 四瀆→相朝 (地之四瀆者所以相朝
         * 以接其流通) and 四瀆→應於神 (則應於神). Both are separately encoded as
         * the four-rivers-mutual-facing and four-rivers-shen-corresponds
         * connectors in registry.js (a Tier-3 source-panel surface, not this
         * lineage's own runtime prose). Shen is not operationalised (see the
         * shen-unmeasurable negative rule).
         */
        note: "The source combines mutual flow, clarity and completed banks; rim depth and ear geometry are unavailable from the current capture. Encoded as the four-rivers-flow-and-banks connector in the connector graph, not as an embedded combination.",
        disagreements: [
          disagreement({
            disagreementId: "four-rivers-eye-mouth",
            nature: "MAPPING",
            target: { targetType: "CONSTRUCT", targetRef: "fourRivers" },
            status: "OPEN",
            positions: [
              {
                positionId: "primary-eye-huai-mouth-he",
                sourceId: "heritage-four-rivers-primary",
                summary: "Primary position: eye is 淮 and mouth is 河.",
                // DR-02, project-owned Kanripo acquisition (2026-08-29).
                note: "Now witnessed by three byte-pinned witnesses that agree: 太清神鑑 卷二, 月波洞中記 卷上, 人倫大統賦 薛注. The 麻衣 eye/mouth swap remains unpinned (RECORDED_NOT_VERIFIED) — do not resolve on evidential-availability grounds.",
              },
              {
                positionId: "variant-eye-he-mouth-huai",
                sourceId: "heritage-four-rivers-sxqb-shoujuan-xiangshuo",
                summary: "Variant position: eye is 河 and mouth is 淮.",
                note: "The separate Shenxiang Quanbian juan 2 section is not yet compared, so intra-text variation cannot be ruled out.",
              },
            ],
          }),
        ],
      },
      variant: {
        sourceId: "heritage-four-rivers-sxqb-shoujuan-xiangshuo",
        supportingSourceIds: ["heritage-four-rivers-sxqb-juan2"],
        evidenceKind: "DISAGREEMENT",
        evidenceStrength: "VERIFIED_SECONDARY",
        runtimeStatus: "HERITAGE_ONLY",
        measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
        constituents: [
          constituent({ constituentId: "ji", canonicalChineseName: "濟", definition: "鼻.", sourceId: "heritage-four-rivers-sxqb-shoujuan-xiangshuo", sectionLocator: "Head volume, Xiangshuo section", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "he", canonicalChineseName: "河", definition: "目.", sourceId: "heritage-four-rivers-sxqb-shoujuan-xiangshuo", sectionLocator: "Head volume, Xiangshuo section", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "jiang", canonicalChineseName: "江", definition: "耳.", sourceId: "heritage-four-rivers-sxqb-shoujuan-xiangshuo", sectionLocator: "Head volume, Xiangshuo section", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "UNSUPPORTED" }),
          constituent({ constituentId: "huai", canonicalChineseName: "淮", definition: "口.", sourceId: "heritage-four-rivers-sxqb-shoujuan-xiangshuo", sectionLocator: "Head volume, Xiangshuo section", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
        ],
        relatedSystems: [],
        disagreements: [
          disagreement({
            disagreementId: "four-rivers-eye-mouth",
            nature: "MAPPING",
            target: { targetType: "CONSTRUCT", targetRef: "fourRivers" },
            status: "OPEN",
            positions: [
              {
                positionId: "variant-eye-he-mouth-huai",
                sourceId: "heritage-four-rivers-sxqb-shoujuan-xiangshuo",
                summary: "Variant position: eye is 河 and mouth is 淮.",
                note: "The separate Shenxiang Quanbian juan 2 section is not yet compared, so intra-text variation cannot be ruled out.",
              },
            ],
          }),
        ],
        note: "The Zhihetang juan 2 section still needs comparison; do not decide whether this is intra-text variation or an inter-text lineage split.",
      },
      "renlun-fengjian-provisional": {
        definition: "人倫風鑑 is cited as a Four Rivers witness, but its existence as a bibliographic object independent of 人倫大統賦 is not established — it may be a genre descriptor or a mislabel that entered this project's corpus rather than a distinct work. It supplies no promotable assignment.",
        source: "人倫風鑑, provisionally cited witness of unconfirmed identity",
        sourceId: "heritage-four-rivers-renlun-fengjian",
        evidenceKind: "POSITIVE_CLAIM",
        evidenceStrength: "RECORDED_NOT_VERIFIED",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "NOT_RECORDED",
        constituents: [],
        relatedSystems: [],
        disagreements: [],
        note: "Held below 人倫大統賦's status: that work's authorship (張行簡, 薛延年注) is independently documented in docs/SOURCE_EDITIONS.md, while no equivalent record exists for 人倫風鑑. Trace how the string entered the project before treating this as a real witness.",
      },
      "renlun-datong-provisional": {
        // EV-11, project-owned Kanripo acquisition (2026-08-29): the mapping
        // now agrees byte-for-byte with both base-text witnesses; "provisional"
        // no longer describes this record's evidentiary state (the runtimeStatus
        // field name is unchanged, only the definition/evidenceStrength/folio).
        definition: "人倫大統賦 薛延年注 (Yuan commentary layer) Four Rivers mapping: 耳=江 口=河 眼=淮 鼻=濟 — byte-verified and in agreement with both base-text witnesses.",
        source: "Renlun Datong Fu, 薛延年注 (Yuan commentary)",
        sourceId: "heritage-four-rivers-renlun-datong",
        evidenceKind: "POSITIVE_CLAIM",
        evidenceStrength: "VERIFIED_SECONDARY",
        folioLocator: "<pb:KR3g0046_WYG_001_10b>",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "NOT_RECORDED",
        constituents: [],
        relatedSystems: [],
        disagreements: [],
      },
    },
  },

  fiveOfficers: {
    verificationStatus: "VERIFIED_PRIMARY",
    lineages: {
      primary: {
        source: "Taiqing Shenjian, Five Officers section; the runtime prose remains the existing bounded paraphrase",
        sourceId: "heritage-five-officers",
        supportingSourceIds: ["heritage-five-officers-sxqb"],
        evidenceStrength: "VERIFIED_PRIMARY",
        runtimeStatus: "RUNTIME_PROSE",
        measurementAvailability: "CONDITIONALLY_SUPPORTED",
        constituents: [
          // EV-08, project-owned Kanripo acquisition (2026-08-29): 監察官 is
          // NO LONGER carried as an alias of this constituent. 人倫大統賦 薛注
          // is byte-witnessed with four of five titles differing from Taiqing's
          // set, in an ordered enumeration — a genuine lineage disagreement
          // (see the new "renlun-xue" lineage below and the five-officers-titles
          // disagreement in registry.js), not an orthographic variant of one term.
          constituent({ constituentId: "inspection", canonicalChineseName: "鑒察官", definition: "目.", sourceId: "heritage-five-officers", sectionLocator: "Five Officers section, juan 2", folioLocator: "<pb:KR3g0045_WYG_002_18b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "discernment", canonicalChineseName: "審辨官", definition: "鼻.", sourceId: "heritage-five-officers", sectionLocator: "「五官」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_18b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "intake-output", canonicalChineseName: "出納官", definition: "口.", sourceId: "heritage-five-officers", sectionLocator: "「五官」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_18b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "listening", canonicalChineseName: "採聽官", definition: "耳.", sourceId: "heritage-five-officers", sectionLocator: "「五官」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_18b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "UNSUPPORTED" }),
          constituent({ constituentId: "longevity", canonicalChineseName: "保壽官", definition: "眉.", sourceId: "heritage-five-officers", sectionLocator: "「五官」; 卷二 (Siku)", folioLocator: "<pb:KR3g0045_WYG_002_18b>", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
        ],
        relatedSystems: [{
          relatedSystemId: "medical-five-organs",
          canonicalChineseName: "五官",
          relationship: "A distinct tongue-including five-feature construct from another source family; it excludes the eyebrow and is not a physiognomic lineage variant.",
          sourceId: "heritage-five-officers-medical",
          note: "Treating the tongue list as a physiognomic variant is a category error.",
        }],
        disagreements: [],
        // EV-08: philtrum-longevity-office is no longer unverified — it is now
        // a witnessed position (人中為保夀官) inside the renlun-xue lineage below.
        unverifiedClaims: [],
        note: "The one-good-office/ten-years maxim now carries a Taiqing juan 2 witness, encoded as the five-officers-one-good-office-ten-years connector in the connector graph (SOURCE_PANEL_ONLY); it remains fortune-typed heritage and is never encoded as a user inference.",
      },
      /*
       * EV-08, project-owned Kanripo acquisition (2026-08-29), errata/atlas
       * five-officers-titles. RECLASSIFY: 人倫大統賦 薛注 is a genuine lineage
       * disagreement (4 of 5 titles differ, ordered enumeration), not an
       * orthographic alias of the Taiqing set.
       */
      "renlun-xue": {
        definition: "人倫大統賦 薛延年注 (Yuan commentary) Five Officers titles, ordered 一口二鼻三耳四目五人中: 口=出納官 鼻=嗅臭官 耳=審聽官 目=監察官 人中=保夀官. Four of five office titles differ from the Taiqing set (監察≠鑒察, 審聽≠採聽, 嗅臭≠審辨, member 人中≠眉).",
        source: "人倫大統賦, 薛延年注",
        sourceId: "heritage-five-mountains-renlun-datong",
        evidenceKind: "DISAGREEMENT",
        evidenceStrength: "VERIFIED_SECONDARY",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "NOT_RECORDED",
        folioLocator: "<pb:KR3g0046_WYG_001_11a>",
        constituents: [
          constituent({ constituentId: "intake-output", canonicalChineseName: "出納官", definition: "口 (一).", sourceId: "heritage-five-mountains-renlun-datong", folioLocator: "<pb:KR3g0046_WYG_001_11a>", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "smell", canonicalChineseName: "嗅臭官", definition: "鼻 (二).", sourceId: "heritage-five-mountains-renlun-datong", folioLocator: "<pb:KR3g0046_WYG_001_11a>", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "listening", canonicalChineseName: "審聽官", definition: "耳 (三).", sourceId: "heritage-five-mountains-renlun-datong", folioLocator: "<pb:KR3g0046_WYG_001_11a>", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "UNSUPPORTED" }),
          constituent({ constituentId: "inspection", canonicalChineseName: "監察官", definition: "目 (四).", sourceId: "heritage-five-mountains-renlun-datong", folioLocator: "<pb:KR3g0046_WYG_001_11a>", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "longevity", canonicalChineseName: "保夀官", definition: "人中 (五).", sourceId: "heritage-five-mountains-renlun-datong", folioLocator: "<pb:KR3g0046_WYG_001_11a>", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "NOT_RECORDED" }),
        ],
        relatedSystems: [],
        disagreements: [],
        note: "Four of five office titles differ from the Taiqing set (監察≠鑒察, 審聽≠採聽, 嗅臭≠審辨, member 人中≠眉). This is a lineage disagreement, NOT an orthographic alias. The source glosses 五官 with 荀子注司主也又識也.",
      },
    },
  },
});

/*
 * The former flat "taiqing-form-spirit-qise-mountains-rivers" cross-family
 * combination is now decomposed into typed connectors in registry.js:
 * five-mountains-four-rivers-corresponds, four-rivers-shen-corresponds,
 * shen-requires-form, form-requires-shen, and
 * heritage-qise-modifies-form-shen-mountains-rivers. See
 * docs/HERITAGE_RECONCILIATION_2026-08-24.md and CLAUDE.md item 33-adjacent
 * migration notes for why a flat cross-construct record was replaced by
 * several atomic edges rather than kept alongside them.
 */

export const HERITAGE_FIELD_FINDINGS = deepFreeze([
  {
    findingId: "xunzi-rejects-physiognomic-inference",
    scope: "FIELD",
    evidenceKind: "NEGATIVE_FINDING",
    evidenceStrength: "CORROBORATED_NOT_VERIFIED",
    sourceIds: ["xunzi-feixiang"],
    summary: "荀子·非相 is counter-evidence about the field, not a lineage within any one construct.",
    productConsequence: "Retain it as field-level context; never use it to manufacture a competing construct lineage.",
    note: "The exact edition and translation remain a publication-rights task.",
  },
  {
    findingId: "neoclassical-canons-not-population-norms",
    scope: "MODERN_CANON",
    evidenceKind: "NEGATIVE_FINDING",
    evidenceStrength: "VERIFIED_PRIMARY",
    sourceIds: [
      "farkas-1985-neoclassical-canons",
      "farkas-2000-afro-american-canons",
      "jayaratne-2012-southern-chinese-canons",
    ],
    summary: "Modern anthropometric studies report that neoclassical facial canons do not operate as general population norms.",
    productConsequence: "Do not cite equal facial thirds as empirical support for Three Sections or present canon proximity as a norm about a person.",
    note: "This is modern negative evidence, not a heritage source.",
  },
  {
    findingId: "modern-face-shape-labels-not-classical-equivalents",
    scope: "MODERN_TAXONOMY",
    evidenceKind: "NEGATIVE_FINDING",
    evidenceStrength: "CORROBORATED_NOT_VERIFIED",
    sourceIds: ["heritage-five-elements", "heritage-five-elements-taiqing"],
    summary: "Modern geometric labels such as oval, heart and diamond are not established translations of the classical five forms.",
    productConsequence: "Keep the modern classifier and the heritage typology separate and preserve disagreement explicitly.",
    note: "A broader classical corpus audit remains open; this finding must not be upgraded by absence alone.",
  },
]);

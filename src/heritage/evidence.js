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
  preciseLocator = null,
  aliases = [],
  evidenceStrength = "RECORDED_NOT_VERIFIED",
  measurementAvailability = "NOT_RECORDED",
  note = null,
}) => ({
  constituentId,
  canonicalChineseName,
  aliases,
  definition,
  sourceId,
  preciseLocator,
  evidenceStrength,
  measurementAvailability,
  prohibitedForUserInference: true,
  note,
});

const disagreement = ({
  disagreementId,
  positionId,
  sourceId,
  summary,
  status = "PARALLEL",
  note = null,
}) => ({ disagreementId, positionId, sourceId, summary, status, note });

const withinCombination = ({
  combinationId,
  constructId,
  sourceId,
  preciseLocator,
  measurementAvailability,
  renderPolicy = "HERITAGE_ONLY",
  note,
}) => ({
  combinationId,
  constructIds: [constructId],
  sourceId,
  preciseLocator,
  combinationScope: "WITHIN_CONSTRUCT",
  renderPolicy,
  measurementAvailability,
  prohibitedForUserInference: true,
  note,
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
    preciseLocator: "靈樞 第六十四·陰陽二十五人",
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
        runtimeStatus: "RUNTIME_PROSE",
        measurementAvailability: "SUPPORTED_2D",
        constituents: [],
        relatedSystems: [],
        attestedCombinations: [withinCombination({
          combinationId: "three-sections-equality-mayi-received",
          constructId: "threeSections",
          sourceId: "heritage-three-sections",
          preciseLocator: null,
          measurementAvailability: "SUPPORTED_2D",
          renderPolicy: "RESEARCH_ONLY",
          note: "An equal-sections rule is transmitted, but its wording and boundary lineage are not edition-verified; no fortune predicate may be operationalised.",
        })],
        disagreements: [
          disagreement({
            disagreementId: "three-sections-boundaries",
            positionId: "sxqb-mingdu",
            sourceId: "heritage-three-sections-sxqb",
            summary: "神相全編, quoting 冥度經, records a boundary scheme distinct from the common transmitted form.",
          }),
          disagreement({
            disagreementId: "three-sections-boundaries",
            positionId: "common-transmitted",
            sourceId: "mianxiang-unspecified",
            summary: "The common transmitted boundary form begins its middle section at the brow centre rather than the nose root.",
            status: "OPEN",
          }),
          disagreement({
            disagreementId: "three-sections-boundaries",
            positionId: "mayi-ten-observations",
            sourceId: "heritage-three-sections",
            summary: "The received 麻衣 十觀 passage names three points rather than the same three boundary intervals.",
            status: "OPEN",
          }),
        ],
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
            preciseLocator: "卷一「面三停」",
            evidenceStrength: "VERIFIED_SECONDARY",
            measurementAvailability: "CONDITIONALLY_SUPPORTED",
          }),
          constituent({
            constituentId: "middle",
            canonicalChineseName: "中停",
            definition: "山根 to 準頭.",
            sourceId: "heritage-three-sections-sxqb",
            preciseLocator: "卷一「面三停」",
            evidenceStrength: "VERIFIED_SECONDARY",
            measurementAvailability: "CONDITIONALLY_SUPPORTED",
          }),
          constituent({
            constituentId: "lower",
            canonicalChineseName: "下停",
            definition: "人中 to 地閣.",
            sourceId: "heritage-three-sections-sxqb",
            preciseLocator: "卷一「面三停」",
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
    },
  },

  twelvePalaces: {
    verificationStatus: "RECORDED_NOT_VERIFIED",
    lineages: {
      primary: {
        sourceId: "heritage-twelve-palaces",
        evidenceStrength: "VERIFIED_SECONDARY",
        runtimeStatus: "RUNTIME_PROSE",
        measurementAvailability: "CONDITIONALLY_SUPPORTED",
        constituents: [],
        relatedSystems: [],
        disagreements: [
          disagreement({
            disagreementId: "twelve-palaces-constituents",
            positionId: "taiqing-yuguan",
            sourceId: "heritage-twelve-palaces-taiqing",
            summary: "太清神鑑 records a parallel palace assignment with no 田宅宮 and with 財帛宮 away from the nose.",
          }),
          disagreement({
            disagreementId: "twelve-palaces-twelfth-slot",
            positionId: "appearance-palace",
            sourceId: "heritage-twelve-palaces-taiqing",
            summary: "The 太清神鑑 sequence closes with 相貌 rather than silently normalising the twelfth slot to another lineage.",
          }),
        ],
        note: "The 致和堂 table of contents records 十二宮訣 and 十二宮絡, not the previously claimed 十二宮相論 title; the chapter body remains on hold.",
      },
      "taiqing-yuguan": {
        definition: "A parallel Twelve Palaces assignment recorded in 太清神鑑 and attributed there to 玉管照神論.",
        source: "太清神鑑, 成和子統論",
        sourceId: "heritage-twelve-palaces-taiqing",
        evidenceKind: "DISAGREEMENT",
        evidenceStrength: "VERIFIED_SECONDARY",
        runtimeStatus: "HERITAGE_ONLY",
        measurementAvailability: "NOT_RECORDED",
        constituents: [
          constituent({ constituentId: "life", canonicalChineseName: "命宮", definition: "印堂.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "wealth", canonicalChineseName: "財帛宮", definition: "天倉、地庫.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "siblings", canonicalChineseName: "兄弟宮", definition: "龍虎、額角頭.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "parents", canonicalChineseName: "父母宮", definition: "日月角.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "children", canonicalChineseName: "男女宮", definition: "三陰、三陽.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "servants", canonicalChineseName: "奴僕宮", definition: "懸壁.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "spouse", canonicalChineseName: "妻妾宮", definition: "魚尾.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "adversity", canonicalChineseName: "疾厄宮", definition: "神光、年壽.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "travel", canonicalChineseName: "遷移宮", definition: "山林、邊地.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "office", canonicalChineseName: "官祿宮", definition: "正面.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "fortune", canonicalChineseName: "福德宮", definition: "精神、地角、福堂.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
          constituent({ constituentId: "appearance", canonicalChineseName: "相貌", definition: "A general concluding category rather than 田宅宮.", sourceId: "heritage-twelve-palaces-taiqing", preciseLocator: "卷一·成和子統論", evidenceStrength: "VERIFIED_SECONDARY" }),
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
        source: "Directional 麻衣-lineage form represented by the existing runtime prose; precise source still required",
        sourceId: "heritage-five-mountains-mayi",
        evidenceStrength: "RECORDED_NOT_VERIFIED",
        runtimeStatus: "RUNTIME_PROSE",
        measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
        constituents: [],
        relatedSystems: [],
        disagreements: [
          disagreement({
            disagreementId: "five-mountains-membership",
            positionId: "taiqing-mountain-names",
            sourceId: "heritage-five-mountains",
            summary: "太清神鑑 names the five individual mountains rather than only directional positions.",
          }),
          disagreement({
            disagreementId: "five-mountains-northern-region",
            positionId: "taiqing-han",
            sourceId: "heritage-five-mountains",
            summary: "太清神鑑 assigns 恆嶽 to 頷; other lineages use the chin point or a broader lower-face zone.",
          }),
        ],
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
          constituent({ constituentId: "heng-south", canonicalChineseName: "衡嶽", definition: "額.", sourceId: "heritage-five-mountains", preciseLocator: "「五嶽」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "heng-north", canonicalChineseName: "恆嶽", definition: "頷.", sourceId: "heritage-five-mountains", preciseLocator: "「五嶽」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "tai", canonicalChineseName: "泰嶽", definition: "左顴; source laterality is retained and not operationalised here.", sourceId: "heritage-five-mountains", preciseLocator: "「五嶽」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "hua", canonicalChineseName: "華嶽", definition: "右顴; source laterality is retained and not operationalised here.", sourceId: "heritage-five-mountains", preciseLocator: "「五嶽」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "song", canonicalChineseName: "嵩嶽", definition: "鼻.", sourceId: "heritage-five-mountains", preciseLocator: "「五嶽」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
        ],
        relatedSystems: [],
        attestedCombinations: [withinCombination({
          combinationId: "five-mountains-mutual-facing-fullness",
          constructId: "fiveMountains",
          sourceId: "heritage-five-mountains",
          preciseLocator: "「五嶽」; 卷二 (Siku)",
          measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
          note: "The source combines the five mountains through mutual orientation and fullness or projection; a frontal selfie cannot recover that rule.",
        })],
        disagreements: [],
      },
    },
  },

  fourRivers: {
    verificationStatus: "VERIFIED_PRIMARY",
    lineages: {
      primary: {
        sourceId: "heritage-four-rivers-primary",
        supportingSourceIds: ["heritage-four-rivers-renlun-datong"],
        evidenceStrength: "VERIFIED_PRIMARY",
        runtimeStatus: "RUNTIME_PROSE",
        measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
        constituents: [
          constituent({ constituentId: "ji", canonicalChineseName: "濟", definition: "鼻.", sourceId: "heritage-four-rivers-primary", preciseLocator: "「四瀆」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "huai", canonicalChineseName: "淮", definition: "目.", sourceId: "heritage-four-rivers-primary", preciseLocator: "「四瀆」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "jiang", canonicalChineseName: "江", definition: "耳.", sourceId: "heritage-four-rivers-primary", preciseLocator: "「四瀆」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "UNSUPPORTED" }),
          constituent({ constituentId: "he", canonicalChineseName: "河", definition: "口.", sourceId: "heritage-four-rivers-primary", preciseLocator: "「四瀆」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
        ],
        relatedSystems: [],
        attestedCombinations: [withinCombination({
          combinationId: "four-rivers-flow-and-banks",
          constructId: "fourRivers",
          sourceId: "heritage-four-rivers-primary",
          preciseLocator: "「四瀆」; 卷二 (Siku)",
          measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
          note: "The source combines mutual flow, clarity and completed banks; rim depth and ear geometry are unavailable from the current capture.",
        })],
        disagreements: [
          disagreement({
            disagreementId: "four-rivers-eye-mouth",
            positionId: "primary-eye-huai-mouth-he",
            sourceId: "heritage-four-rivers-primary",
            summary: "Primary position: eye is 淮 and mouth is 河.",
          }),
          disagreement({
            disagreementId: "four-rivers-eye-mouth",
            positionId: "variant-eye-he-mouth-huai",
            sourceId: "heritage-four-rivers-variant",
            summary: "Variant position: eye is 河 and mouth is 淮.",
          }),
        ],
      },
      variant: {
        sourceId: "heritage-four-rivers-variant",
        evidenceKind: "DISAGREEMENT",
        evidenceStrength: "VERIFIED_SECONDARY",
        runtimeStatus: "RUNTIME_PROSE",
        measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
        constituents: [
          constituent({ constituentId: "ji", canonicalChineseName: "濟", definition: "鼻.", sourceId: "heritage-four-rivers-variant", preciseLocator: "首卷·相說 (web reproduction)", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "he", canonicalChineseName: "河", definition: "目.", sourceId: "heritage-four-rivers-variant", preciseLocator: "首卷·相說 (web reproduction)", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "jiang", canonicalChineseName: "江", definition: "耳.", sourceId: "heritage-four-rivers-variant", preciseLocator: "首卷·相說 (web reproduction)", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "UNSUPPORTED" }),
          constituent({ constituentId: "huai", canonicalChineseName: "淮", definition: "口.", sourceId: "heritage-four-rivers-variant", preciseLocator: "首卷·相說 (web reproduction)", evidenceStrength: "VERIFIED_SECONDARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
        ],
        relatedSystems: [],
        disagreements: [
          disagreement({
            disagreementId: "four-rivers-eye-mouth",
            positionId: "variant-eye-he-mouth-huai",
            sourceId: "heritage-four-rivers-variant",
            summary: "Variant position retained without promotion until the separate 卷二 四瀆 section is checked.",
            status: "OPEN",
          }),
        ],
        note: "The 致和堂 blockprint section text still needs comparison; do not promote this lineage to verified primary.",
      },
    },
  },

  fiveOfficers: {
    verificationStatus: "VERIFIED_PRIMARY",
    lineages: {
      primary: {
        source: "太清神鑑 Five Officers section; the runtime prose remains the existing bounded paraphrase",
        sourceId: "heritage-five-officers",
        supportingSourceIds: ["heritage-five-officers-sxqb"],
        evidenceStrength: "VERIFIED_PRIMARY",
        runtimeStatus: "RUNTIME_PROSE",
        measurementAvailability: "CONDITIONALLY_SUPPORTED",
        constituents: [
          constituent({ constituentId: "inspection", canonicalChineseName: "鑒察官", aliases: ["監察官"], definition: "目.", sourceId: "heritage-five-officers", preciseLocator: "「五官」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED", note: "鑒/監 is treated as an orthographic alias, not a lineage disagreement." }),
          constituent({ constituentId: "discernment", canonicalChineseName: "審辨官", definition: "鼻.", sourceId: "heritage-five-officers", preciseLocator: "「五官」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
          constituent({ constituentId: "intake-output", canonicalChineseName: "出納官", definition: "口.", sourceId: "heritage-five-officers", preciseLocator: "「五官」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
          constituent({ constituentId: "listening", canonicalChineseName: "採聽官", definition: "耳.", sourceId: "heritage-five-officers", preciseLocator: "「五官」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "UNSUPPORTED" }),
          constituent({ constituentId: "longevity", canonicalChineseName: "保壽官", definition: "眉.", sourceId: "heritage-five-officers", preciseLocator: "「五官」; 卷二 (Siku)", evidenceStrength: "VERIFIED_PRIMARY", measurementAvailability: "CONDITIONALLY_SUPPORTED" }),
        ],
        relatedSystems: [],
        disagreements: [
          disagreement({
            disagreementId: "five-officers-longevity-member",
            positionId: "eyebrow",
            sourceId: "heritage-five-officers",
            summary: "太清神鑑 assigns 保壽官 to the eyebrow.",
          }),
          disagreement({
            disagreementId: "five-officers-longevity-member",
            positionId: "philtrum-unlocated",
            sourceId: "mianxiang-unspecified",
            summary: "A transmitted alternative assigns the longevity office to the philtrum; its source remains unlocated.",
            status: "OPEN",
          }),
        ],
        note: "The attested maxim about one good office and ten years is fortune-typed heritage and is not encoded as a user inference.",
      },
      "philtrum-variant": {
        definition: "A recorded but unlocated alternative assigning 保壽官 to 人中.",
        source: "Source not yet located",
        sourceId: "mianxiang-unspecified",
        evidenceKind: "DISAGREEMENT",
        evidenceStrength: "RECORDED_NOT_VERIFIED",
        runtimeStatus: "RESEARCH_ONLY",
        measurementAvailability: "NOT_RECORDED",
        constituents: [
          constituent({ constituentId: "longevity", canonicalChineseName: "保壽官", definition: "人中; source not yet located.", sourceId: "mianxiang-unspecified" }),
        ],
        relatedSystems: [],
        disagreements: [],
      },
    },
  },
});

export const HERITAGE_CROSS_FAMILY_COMBINATIONS = deepFreeze([
  {
    combinationId: "taiqing-form-spirit-qise-mountains-rivers",
    constructIds: ["fiveMountains", "fourRivers", "qiSe"],
    sourceId: "heritage-taiqing-form-qise-interaction",
    preciseLocator: "卷四「論看形神體像」",
    combinationScope: "CROSS_CONSTRUCT",
    renderPolicy: "HERITAGE_ONLY",
    measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
    prohibitedForUserInference: true,
    note: "A source-attested structure-and-Qi-Se interaction. It is evaluative and fortune-typed, so it remains heritage context and is never operationalised.",
  },
]);

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

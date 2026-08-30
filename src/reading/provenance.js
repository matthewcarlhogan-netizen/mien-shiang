/*
 * Reading-content provenance and expansion registry.
 *
 * Variety is not evidence. A passage can have thousands of combinations and
 * still rest on one unattributed claim, so each content family has a stable ID
 * and explicit source and rights state. Existing gaps are
 * recorded as gaps; this file never upgrades "mentioned in copy" into a
 * verified or commercially cleared source.
 */

/*
 * PROVENANCE STATUS TAXONOMY.
 *
 * These are rungs on a ladder, not synonyms. Recording which edition a text is
 * does not mean its locator has been checked against that text, and recording a
 * public-domain determination does not mean the commercial gate has been
 * satisfied. Only the top rung of each ladder satisfies the release contract.
 * The rungs below exist so that a partial result can be stated precisely
 * instead of collapsing into an undifferentiated "not verified" — and so that
 * nothing is ever promoted by relabelling it.
 */
export const CITATION_STATUS = Object.freeze({
  /** No source has been identified for the claim. */
  SOURCE_REQUIRED: "source-required",
  /** A work or witness is identified, but no edition-level locator is recorded. */
  WORK_RECORDED: "work-recorded",
  /** Edition and locator recorded. Not yet checked against the actual source. */
  EDITION_RECORDED: "edition-recorded",
  /** A received attribution or predicate is contradicted by the inspected witness. */
  ATTRIBUTION_CONTRADICTED: "attribution-contradicted",
  /** Locator independently checked against the actual source. Release-satisfying. */
  VERIFIED: "verified",
});

export const RIGHTS_STATUS = Object.freeze({
  /** No rights basis recorded. */
  UNVERIFIED: "unverified",
  /** A public-domain determination is recorded. This is a basis, not a clearance. */
  PUBLIC_DOMAIN_BY_AGE: "public-domain-by-age",
  /** The commercial rights and legal approval gate has been satisfied. Release-satisfying. */
  CLEARED: "cleared",
});

/** The release contract accepts these and nothing weaker. */
export const CITATION_RELEASE_STATUS = CITATION_STATUS.VERIFIED;
export const RIGHTS_RELEASE_STATUS = RIGHTS_STATUS.CLEARED;

/** Why a source does not yet meet the gate, in words rather than a bare negation. */
export const PROVENANCE_BLOCKER_DETAIL = Object.freeze({
  "rights-not-cleared":
    "family rights determination is not cleared",
  "citation-source-required":
    "no source identified for the claim",
  "citation-work-recorded":
    "source work identified but edition-level locator not recorded",
  "citation-recorded-not-verified":
    "citation recorded but not independently verified against the source",
  "citation-attribution-contradicted":
    "the inspected witness contradicts the received attribution or predicate",
  "citation-status-unrecognised":
    "citation status is outside the recorded taxonomy",
  "source-rights-unverified":
    "no rights basis recorded",
  "source-rights-public-domain-not-cleared":
    "public-domain basis recorded but commercial/legal clearance not complete",
  "source-rights-status-unrecognised":
    "rights status is outside the recorded taxonomy",
});

/** Expands `code:sourceId` into the sentence a reader can act on. */
export function explainProvenanceIssue(issue) {
  const detail = PROVENANCE_BLOCKER_DETAIL[String(issue).split(":")[0]];
  return detail ? `${issue} — ${detail}` : String(issue);
}

export const CONTRIBUTOR_REGISTRY = Object.freeze({
  "repository-editorial": Object.freeze({
    displayName: "Repository editorial copy",
    role: "modern-commentary",
    agreementStatus: "not-recorded",
  }),
});

/*
 * bibliographicIdentityStatus and independentWitnessStatus are separate axes
 * from citationStatus (item added by the connector-graph migration): whether
 * the WORK is bibliographically identified, and whether THIS PROJECT has its
 * own identified/acquired/verified witness of it, are both narrower claims
 * than "an edition-level locator is recorded". Defaults are derived
 * conservatively from citationStatus so the ~30 existing records don't need
 * per-entry edits, and so nothing is defaulted to a stronger claim than the
 * citation ladder already supports.
 */
const defaultBibliographicIdentityStatus = (citationStatus) => {
  if (citationStatus === CITATION_STATUS.SOURCE_REQUIRED) return "UNRESOLVED";
  if (citationStatus === CITATION_STATUS.WORK_RECORDED) return "RECORDED_IN_BIBLIOGRAPHY";
  return "WORK_IDENTIFIED";
};

const defaultIndependentWitnessStatus = (citationStatus) => (
  citationStatus === CITATION_STATUS.SOURCE_REQUIRED ? "UNRESOLVED" : "IDENTIFIED"
);

function sourceRecord(value) {
  const sectionLocator = value.sectionLocator ?? value.locator ?? null;
  const sectionLocatorStatus = value.sectionLocatorStatus
    ?? (value.citationStatus === CITATION_STATUS.VERIFIED
      ? "VERIFIED" : sectionLocator ? "RECORDED" : "NOT_RECORDED");
  const folioLocator = value.folioLocator ?? null;
  const folioLocatorStatus = value.folioLocatorStatus
    ?? (folioLocator ? "RECORDED" : "NOT_RECORDED");

  return Object.freeze({
    edition: null,
    sourceAccess: "NOT_RECORDED",
    sourceUrl: null,
    sha256: null,
    retrievedAt: null,
    editionFingerprint: null,
    surrogateRights: "UNREVIEWED",
    authorshipStatus: "NOT_RECORDED",
    authorshipNote: null,
    translationStatus: null,
    bibliographicIdentityStatus: defaultBibliographicIdentityStatus(value.citationStatus),
    independentWitnessStatus: defaultIndependentWitnessStatus(value.citationStatus),
    repository: null,
    repositoryCommit: null,
    repositoryFile: null,
    juan: null,
    ...value,
    sectionLocator,
    sectionLocatorStatus,
    folioLocator,
    folioLocatorStatus,
    // Deprecated compatibility alias. New heritage code keeps section and
    // folio evidence separate and never treats this as a folio locator.
    locator: sectionLocator,
  });
}

const RAW_SOURCE_REGISTRY = {
  /*
   * RESOLVED 17 August 2026 — DR-2026-08-17-SU-WEN-EDITION.
   *
   * The audit's recorded defect was "the Su Wen chapter reference has no
   * recorded edition or translation", and this entry carried the defect in its
   * own title. The chapter has now been retrieved verbatim and the edition
   * designated, so the citation is recorded.
   */
  "suwen-ch17": Object.freeze({
    title: "黃帝內經·素問·脈要精微論第十七 (Huangdi Neijing, Suwen, ch. 17)",
    kind: "historical-primary-text",
    edition: "四庫全書 recension; received text per the 王冰 762 CE arrangement",
    locator: "素問 卷五·脈要精微論第十七",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    translationStatus: "original-to-this-project",
  }),
  "mianxiang-unspecified": Object.freeze({
    title: "Mian Xiang tradition referenced by existing application copy",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "heritage-three-sections": Object.freeze({
    title: "Received Ma Yi material formerly used by the Three Sections corpus entry",
    kind: "contested-attribution-witness",
    edition: "Late blockprint and stone-print transmission; no stable critical edition identified",
    locator: null,
    citationStatus: CITATION_STATUS.ATTRIBUTION_CONTRADICTED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "The received witness contradicts the fortune predicate formerly attached to it; no stable folio is recorded.",
  }),
  "heritage-three-sections-sxqb": Object.freeze({
    title: "神相全編 Three Sections material",
    kind: "historical-primary-text-secondary-witness",
    edition: "致和堂藏板明刊本, 十二卷首一卷",
    locator: "卷一「面三停」; 卷二「三才三停論」「相身三停」「六府三才三停之圖」",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    translationStatus: "original-to-this-project",
  }),
  "heritage-three-sections-taiqing": Object.freeze({
    title: "Taiqing Shenjian Three Sections section",
    kind: "historical-primary-text-section-heading",
    edition: "Siku Quanshu Wenyuange recension",
    sectionLocator: "Juan 6, 身三停 section",
    // citationStatus promoted edition-recorded -> verified, consistent with
    // SR-06's identical rationale: the folio is now byte-pinned and VERIFIED
    // (<pb:KR3g0045_WYG_006_6a>), which is what "verified" means on this
    // citation-status ladder (independently checked against the actual source).
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    sourceAccess: "STABLE_REMOTE",
    surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution. The age of the underlying work does not establish that this digital surrogate carries its own declared public-domain notice; surrogate rights are held pending that confirmation.",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-04, project-owned Kanripo acquisition (2026-08-29).
    repository: "kanripo/KR3g0045",
    repositoryCommit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5",
    repositoryFile: "KR3g0045_006.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0045/blob/b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5/KR3g0045_006.txt",
    sha256: "d9ba7fbfe9c6422a5cec36ae134d693d95cc7cfd036674bddf3996aab6a7ca35",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    // Folio uses an underscore rather than the matrix's human-readable hyphen
    // (KR3g0045_WYG_006-6a): validator.js's WYG_PB regex is /^<pb:[A-Za-z0-9_]+>$/
    // and does not accept a hyphen. Same folio; an encoding correction, not an
    // evidentiary one. See docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md.
    folioLocator: "<pb:KR3g0045_WYG_006_6a>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
  }),
  "heritage-five-elements": Object.freeze({
    title: "黃帝內經·靈樞·陰陽二十五人",
    kind: "historical-primary-text",
    edition: "篇次 citation; juan is edition-dependent",
    locator: "靈樞 第六十四·陰陽二十五人",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    translationStatus: "original-to-this-project",
  }),
  "heritage-five-elements-taiqing": Object.freeze({
    title: "Taiqing Shenjian Five Forms material",
    kind: "historical-primary-text",
    edition: "欽定四庫全書文淵閣本",
    locator: "卷四「五形」",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution.",
    translationStatus: "original-to-this-project",
  }),
  "heritage-twelve-palaces": Object.freeze({
    title: "神相全編 Twelve Palaces material",
    kind: "historical-primary-text-secondary-witness",
    edition: "致和堂藏板明刊本, 十二卷首一卷",
    locator: "卷一「十二宮訣」「十二宮絡」; no「十二宮相論」title in this edition",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    translationStatus: "original-to-this-project",
  }),
  "heritage-twelve-palaces-taiqing": Object.freeze({
    title: "Taiqing Shenjian Twelve Palaces assignment attributed within the text to Yuguan Zhaoshen Lun",
    kind: "historical-primary-text",
    edition: "欽定四庫全書文淵閣本",
    locator: "卷一·成和子統論（末段）",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution.",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-06, project-owned Kanripo acquisition (2026-08-29).
    // citationStatus promoted edition-recorded -> verified: the 十二宮 system
    // is now byte-pinned (errata E-1); see EV-13/EV-14 for the construct-level
    // note and Decision 3 (docs/DECISION_CARDS.md) for runtime status, which
    // this metadata/locator correction does not itself change.
    sourceAccess: "STABLE_REMOTE",
    repository: "kanripo/KR3g0045",
    repositoryCommit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5",
    repositoryFile: "KR3g0045_001.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0045/blob/b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5/KR3g0045_001.txt",
    sha256: "c8f0b607e00a9e2d02bf788dc2c6c820714351228f8ec820cbf389861ea0ed3c",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    folioLocator: "<pb:KR3g0045_WYG_001_17b>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
  }),
  "heritage-twelve-palaces-discovery-surrogate": Object.freeze({
    title: "Discovery-only surrogate of the Shenxiang Quanbian Twelve Palaces body",
    kind: "discovery-only-secondary-surrogate",
    edition: null,
    sectionLocator: "Twelve Palaces body; wealth palace assigns the nose",
    citationStatus: CITATION_STATUS.WORK_RECORDED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
    sourceAccess: "DISCOVERY_ONLY",
    surrogateRights: "UNREVIEWED",
    authorshipStatus: "NOT_RECORDED",
    authorshipNote: "The body was observed through a Baidu-hosted surrogate and cannot support promotion or quotation.",
  }),
  "heritage-five-mountains": Object.freeze({
    title: "Taiqing Shenjian Five Mountains material",
    kind: "historical-primary-text",
    edition: "Siku Quanshu Wenyuange recension",
    locator: "Five Mountains section, juan 2",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    sourceAccess: "STABLE_REMOTE",
    surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution. The age of the underlying work does not establish that this digital surrogate carries its own declared public-domain notice; surrogate rights are held pending that confirmation.",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-01/SR-01b, project-owned Kanripo acquisition (2026-08-29).
    repository: "kanripo/KR3g0045",
    repositoryCommit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5",
    repositoryFile: "KR3g0045_002.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0045/blob/b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5/KR3g0045_002.txt",
    sha256: "bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    folioLocator: "<pb:KR3g0045_WYG_002_17b>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
  }),
  "heritage-taiqing-shidian-discovery": Object.freeze({
    title: "Shidian Guji discovery copy of Taiqing Shenjian",
    kind: "discovery-only-secondary-surrogate",
    edition: null,
    sectionLocator: null,
    citationStatus: CITATION_STATUS.WORK_RECORDED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
    sourceAccess: "DISCOVERY_ONLY",
    surrogateRights: "UNREVIEWED",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution. This copy is a discovery aid only.",
  }),
  "heritage-five-mountains-mayi": Object.freeze({
    title: "麻衣-lineage directional Five Mountains form used by existing corpus wording",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "heritage-five-mountains-sxqb": Object.freeze({
    title: "Shenxiang Quanbian Five Mountains witness",
    kind: "historical-primary-text-secondary-witness",
    edition: "Ming Zhihetang blockprint, twelve juan plus head volume",
    sectionLocator: "Five Mountains passage witnessed through Gujin Tushu Jicheng, art canon volume 632",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    sourceAccess: "REFERENCE_ONLY",
    surrogateRights: "HOST_TERMS_SEPARATE",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "Compilation witness; traditional attributions are not treated as authorship.",
    translationStatus: "original-to-this-project",
  }),
  "heritage-five-mountains-renlun-datong": Object.freeze({
    title: "人倫大統賦, 薛延年注, Five Mountains directional witness",
    kind: "historical-primary-text-secondary-witness",
    edition: "人倫大統賦 with 薛延年注, Siku Quanshu recension",
    sectionLocator: "卷上 五嶽",
    sectionLocatorStatus: "RECORDED",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    authorshipStatus: "ATTRIBUTED",
    authorshipNote: "Authored by 張行簡 (1179 jinshi; biography in the Jin shi), commentary by 薛延年 (preface 1313) — the best-attested authorship in the corpus. Witnesses directional Five Mountains naming (南/北/東/西/中) and, for the disputed northern mountain, 頦 rather than Taiqing's 頷. Edition is identified; the section-level locator has not yet been independently read by this project. The commentary layer is Yuan (元 薛延年注); the 賦 is Jin (金 張行簡) — a real chronological gap. In this WYG transcription every 五嶽/四瀆/五官 passage sits inside the parenthesised commentary and is therefore Yuan commentary, not the Jin 賦.",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-10, project-owned Kanripo acquisition (2026-08-29).
    repository: "kanripo/KR3g0046",
    repositoryCommit: "b408ea0b969672a1f52e5ec371f9fe3250976e58",
    repositoryFile: "KR3g0046_001.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0046/blob/b408ea0b969672a1f52e5ec371f9fe3250976e58/KR3g0046_001.txt",
    sha256: "61234896eb42479e01e9629042564137a64fdf465c459a4e8d7da2437adada2f",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    sourceAccess: "STABLE_REMOTE",
    folioLocator: "<pb:KR3g0046_WYG_001_11a>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
  }),
  "heritage-five-mountains-shenyi": Object.freeze({
    title: "Shenyi Fu commentary Five Mountains witness",
    kind: "historical-primary-text-secondary-witness",
    edition: null,
    sectionLocator: null,
    citationStatus: CITATION_STATUS.WORK_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    authorshipStatus: "NOT_RECORDED",
    translationStatus: "original-to-this-project",
  }),
  "heritage-five-officers-renlun-datong": Object.freeze({
    title: "Renlun Datong Fu, Xue Yannian commentary, Five Officers witness",
    kind: "historical-primary-text-secondary-witness",
    edition: "Renlun Datong Fu with Xue Yannian commentary, Siku Quanshu recension",
    sectionLocator: "Juan 1, Five Officers section",
    sectionLocatorStatus: "VERIFIED",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    sourceAccess: "STABLE_REMOTE",
    surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED",
    authorshipStatus: "ATTRIBUTED",
    authorshipNote: "The Five Officers witness is in the Yuan commentary layer by Xue Yannian; the Jin base text and Yuan commentary are distinct chronological layers. The source text and folio are byte-pinned; this does not clear surrogate or commercial rights.",
    translationStatus: "original-to-this-project",
    repository: "kanripo/KR3g0046",
    repositoryCommit: "b408ea0b969672a1f52e5ec371f9fe3250976e58",
    repositoryFile: "KR3g0046_001.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0046/blob/b408ea0b969672a1f52e5ec371f9fe3250976e58/KR3g0046_001.txt",
    sha256: "61234896eb42479e01e9629042564137a64fdf465c459a4e8d7da2437adada2f",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    folioLocator: "<pb:KR3g0046_WYG_001_11a>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
  }),
  "heritage-four-rivers": Object.freeze({
    title: "太清神鑑 and 神相全編 material used by the existing Four Rivers corpus entry",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "heritage-four-rivers-primary": Object.freeze({
    title: "Taiqing Shenjian Four Rivers primary lineage",
    kind: "historical-primary-text",
    edition: "Siku Quanshu Wenyuange recension",
    locator: "Four Rivers section, juan 2",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    sourceAccess: "STABLE_REMOTE",
    surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution. The age of the underlying work does not establish that this digital surrogate carries its own declared public-domain notice; surrogate rights are held pending that confirmation.",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-02, project-owned Kanripo acquisition (2026-08-29).
    repository: "kanripo/KR3g0045",
    repositoryCommit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5",
    repositoryFile: "KR3g0045_002.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0045/blob/b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5/KR3g0045_002.txt",
    sha256: "bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    folioLocator: "<pb:KR3g0045_WYG_002_18a>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
  }),
  "heritage-four-rivers-sxqb-shoujuan-xiangshuo": Object.freeze({
    title: "Shenxiang Quanbian head-volume Xiangshuo Four Rivers witness",
    kind: "historical-primary-text-secondary-witness",
    edition: "致和堂藏板明刊本; wording currently checked through a web reproduction",
    locator: "Head volume, Xiangshuo section",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    sourceAccess: "REFERENCE_ONLY",
    surrogateRights: "HOST_TERMS_SEPARATE",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    translationStatus: "original-to-this-project",
  }),
  "heritage-four-rivers-sxqb-juan2": Object.freeze({
    title: "Shenxiang Quanbian juan 2 Four Rivers section",
    kind: "historical-primary-text-uncompared-section",
    edition: "Ming Zhihetang blockprint, twelve juan plus head volume",
    sectionLocator: "Juan 2, Four Rivers section",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    sourceAccess: "REFERENCE_ONLY",
    surrogateRights: "HOST_TERMS_SEPARATE",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "The section is recorded but its body has not been compared with the head-volume Xiangshuo witness.",
    translationStatus: "original-to-this-project",
  }),
  "heritage-four-rivers-renlun-fengjian": Object.freeze({
    title: "人倫風鑑, provisionally cited as a Four Rivers witness",
    kind: "unresolved-tradition-source",
    edition: null,
    sectionLocator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
    authorshipStatus: "NOT_RECORDED",
    // Reconciliation SR-12, project-owned Kanripo acquisition (2026-08-29).
    // citationStatus stays source-required — this rewrite corrects what kind
    // of gap it is, not the gap itself: a real named textual comparandum with
    // no located independent witness, not a bibliographic label entered in error.
    authorshipNote: "A named textual comparandum: 人倫風鑑 is cited by name 16x in 太清神鑑 卷一 and 1x in 玉管照神局 卷上 as an interlinear variant-reading witness on the 相說歌 verse, listed alongside 洞𤣥經 and 千字文. Its existence as an independent, now-lost work is plausible; no surviving independent witness has been located, and it supplies no Four Rivers assignment (its notes are all on the 相說歌 verse). NAMED_COMPARANDUM_ATTESTED / INDEPENDENT_WITNESS_NOT_LOCATED.",
  }),
  "heritage-four-rivers-renlun-datong": Object.freeze({
    title: "Renlun Datong Fu, Xue Yannian commentary, provisional Four Rivers witness",
    kind: "historical-primary-text-secondary-witness",
    edition: "人倫大統賦 with 薛延年注, Siku Quanshu recension",
    sectionLocator: "卷上 四瀆",
    sectionLocatorStatus: "RECORDED",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    authorshipStatus: "ATTRIBUTED",
    authorshipNote: "Authored by 張行簡 (大定十九年 / 1179 jinshi, 禮部尚書 under the Jin, biography in the Jin shi); commentary by 薛延年, preface dated 皇慶二年 (1313). This is the best-attested authorship in the corpus, distinct from Taiqing Shenjian's contested Wang Pu attribution. A section-level locator for this construct has not yet been read. The commentary layer is Yuan (元 薛延年注); the 賦 is Jin (金 張行簡) — a real chronological gap. In this WYG transcription every 五嶽/四瀆/五官 passage sits inside the parenthesised commentary and is therefore Yuan commentary, not the Jin 賦.",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-11, project-owned Kanripo acquisition (2026-08-29).
    // The eye/mouth/ear/nose -> river mapping now agrees byte-for-byte with
    // both base-text witnesses (see EV-11); this record's own evidenceStrength
    // lives on the fourRivers.lineages["renlun-datong-provisional"] entry in
    // src/heritage/evidence.js, not here.
    repository: "kanripo/KR3g0046",
    repositoryCommit: "b408ea0b969672a1f52e5ec371f9fe3250976e58",
    repositoryFile: "KR3g0046_001.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0046/blob/b408ea0b969672a1f52e5ec371f9fe3250976e58/KR3g0046_001.txt",
    sha256: "61234896eb42479e01e9629042564137a64fdf465c459a4e8d7da2437adada2f",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    sourceAccess: "STABLE_REMOTE",
    folioLocator: "<pb:KR3g0046_WYG_001_10b>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
  }),
  "heritage-five-officers": Object.freeze({
    title: "Taiqing Shenjian Five Officers material",
    kind: "historical-primary-text",
    edition: "Siku Quanshu Wenyuange recension",
    locator: "Five Officers section, juan 2",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    sourceAccess: "STABLE_REMOTE",
    surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution. The age of the underlying work does not establish that this digital surrogate carries its own declared public-domain notice; surrogate rights are held pending that confirmation.",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-03, project-owned Kanripo acquisition (2026-08-29).
    repository: "kanripo/KR3g0045",
    repositoryCommit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5",
    repositoryFile: "KR3g0045_002.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0045/blob/b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5/KR3g0045_002.txt",
    sha256: "bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    folioLocator: "<pb:KR3g0045_WYG_002_18b>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
  }),
  "heritage-five-officers-sxqb": Object.freeze({
    title: "神相全編 expanded Five Officers account",
    kind: "historical-primary-text-secondary-witness",
    edition: "致和堂藏板明刊本, 十二卷首一卷",
    locator: "卷二「五官總論」「五官說」及各官分論",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    translationStatus: "original-to-this-project",
  }),
  "heritage-five-officers-medical": Object.freeze({
    title: "Huangdi Neijing Lingshu, Five Inspections and Five Messengers",
    kind: "historical-medical-text-related-system",
    edition: null,
    sectionLocator: "Five Inspections and Five Messengers section",
    citationStatus: CITATION_STATUS.WORK_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    authorshipStatus: "ANONYMOUS",
    authorshipNote: "A distinct tongue-including five-feature construct from another source family, not a physiognomic Five Officers lineage.",
    translationStatus: "original-to-this-project",
  }),
  "heritage-taiqing-juan1-mountains-rivers": Object.freeze({
    title: "Taiqing Shenjian 卷一 Three Sections/Five Mountains/Four Rivers correspondence passage",
    kind: "historical-primary-text",
    edition: "欽定四庫全書文淵閣本",
    sectionLocator: "卷一「須辨三停端不端，五嶽四瀆要相應」",
    sectionLocatorStatus: "VERIFIED",
    // citationStatus promoted edition-recorded -> verified, same rule as
    // heritage-three-sections-taiqing (SR-04) and heritage-twelve-palaces-taiqing
    // (SR-06): the folio is now byte-pinned and VERIFIED, which is what
    // "verified" means on this ladder. Also required by the frozen validator's
    // "connector verified primary evidence cannot exceed source citationStatus"
    // check, since CR-04 promotes this source's connector to VERIFIED_PRIMARY.
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    sourceAccess: "STABLE_REMOTE",
    surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution. The passage pairs a Three Sections balance clause with a Five Mountains/Four Rivers mutual-correspondence clause; only the mountains/rivers clause is encoded as a connector here (see the fiveMountains/fourRivers connector graph note against combining all three into one relationship from this line alone).",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-07, project-owned Kanripo acquisition (2026-08-29).
    repository: "kanripo/KR3g0045",
    repositoryCommit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5",
    repositoryFile: "KR3g0045_001.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0045/blob/b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5/KR3g0045_001.txt",
    sha256: "c8f0b607e00a9e2d02bf788dc2c6c820714351228f8ec820cbf389861ea0ed3c",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    folioLocator: "<pb:KR3g0045_WYG_001_6b>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
  }),
  "heritage-taiqing-juan4-form-shen-reciprocity": Object.freeze({
    title: "Taiqing Shenjian 卷四 Form/Shen reciprocal-dependence passage",
    kind: "historical-primary-text",
    edition: "欽定四庫全書文淵閣本",
    sectionLocator: "卷四",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    sourceAccess: "STABLE_REMOTE",
    surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution. This project has not independently confirmed whether this passage sits inside 論㸔形神體像 (the heading recorded for heritage-taiqing-form-qise-interaction) or a distinct part of 卷四, so the locator is held at juan level rather than merged with that source.",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-09, project-owned Kanripo acquisition (2026-08-29).
    // 神須形/形須神 clause not read this pass; folio stays not recorded.
    repository: "kanripo/KR3g0045",
    repositoryCommit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5",
    repositoryFile: "KR3g0045_004.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0045/blob/b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5/KR3g0045_004.txt",
    sha256: "84231b131823701455abf6ce63bad56c6638c5c15b5d6b0730dfd710a01f8d47",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
  }),
  "heritage-yuebo-dongzhongji-configuration": Object.freeze({
    title: "月波洞中記 Five Mountains/Four Rivers/Form/Shen configuration passage",
    kind: "historical-primary-text-secondary-witness",
    edition: "文淵閣四庫全書 (WYG-Siku)",
    sectionLocator: "卷上 河嶽",
    sectionLocatorStatus: "VERIFIED",
    // citationStatus promoted edition-recorded -> verified: same rule as
    // SR-04/SR-06/SR-07 (byte-pinned VERIFIED folio = independently checked
    // against the actual source), and required by the frozen validator since
    // CR-07 promotes this source's connector to VERIFIED_PRIMARY.
    citationStatus: CITATION_STATUS.VERIFIED,
    // rightsStatus deliberately left UNVERIFIED: the reconciliation manifest
    // does not instruct changing it for this record, unlike the other Kanripo
    // Siku witnesses. Not upgraded on this pass's own initiative.
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
    authorshipStatus: "ANONYMOUS",
    authorshipNote: "闕名 (anonymous). Per Ulrich Theobald the preface is a later forgery; the core may be pre-Song. Attribution uncertain.",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-13, project-owned Kanripo acquisition (2026-08-29).
    repository: "kanripo/KR3g0043",
    repositoryCommit: "f69732902fc82fb6b1f759cb7bf5a910c0b903a3",
    repositoryFile: "KR3g0043_001.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0043/blob/f69732902fc82fb6b1f759cb7bf5a910c0b903a3/KR3g0043_001.txt",
    sha256: "0949bfb991e41969459bb33d18486afb1af75c1c317c013f12792a9fc8647d87",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    sourceAccess: "STABLE_REMOTE",
    folioLocator: "<pb:KR3g0043_WYG_001_5a>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
  }),
  "heritage-taiqing-form-qise-interaction": Object.freeze({
    title: "Taiqing Shenjian structure-and-Qi-Se interaction",
    kind: "historical-primary-text",
    edition: "欽定四庫全書文淵閣本",
    locator: "卷四「論㸔形神體像」",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution. The section heading is transmitted as 論㸔形神體像; 㸔 is retained as source orthography and is not normalised to 看.",
    translationStatus: "original-to-this-project",
    // Reconciliation SR-08, project-owned Kanripo acquisition (2026-08-29).
    // The specific 卷四 predicate was not read this pass, so folioLocator
    // stays null / NOT_RECORDED per the reconciliation matrix.
    sourceAccess: "STABLE_REMOTE",
    repository: "kanripo/KR3g0045",
    repositoryCommit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5",
    repositoryFile: "KR3g0045_004.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0045/blob/b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5/KR3g0045_004.txt",
    sha256: "84231b131823701455abf6ce63bad56c6638c5c15b5d6b0730dfd710a01f8d47",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
  }),
  "xunzi-feixiang": Object.freeze({
    title: "荀子·非相",
    kind: "historical-primary-text-negative-finding",
    locator: "非相篇",
    citationStatus: CITATION_STATUS.WORK_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    translationStatus: "original-to-this-project",
    // Reconciliation SR-16, project-owned Kanripo acquisition (2026-08-29).
    // The received 非相 text itself was not retrieved this pass; citationStatus
    // stays work-recorded. This note records how the manuals cite it, not a
    // verified locator into 非相 itself.
    authorshipNote: "As cited within the physiognomy manuals (received 非相 text not retrieved this pass): 太清神鑑 卷三 <pb:KR3g0045_WYG_003_2b> 荀子曰相形不如相心論心不如論徳; 玉管照神局 卷中 <pb:KR3g0044_WYG_002_11b> 荀子曰相形不若相心論心不若論擇術; 人倫大統賦 卷上 五官（荀子注司主也又識也）. None quotes 非相 verbatim; the two manuals disagree on the second clause (論徳 vs 論擇術).",
  }),
  "farkas-1985-neoclassical-canons": Object.freeze({
    title: "Farkas et al. (1985), revision of neoclassical facial canons",
    kind: "modern-anthropometry-negative-evidence",
    locator: "Plastic and Reconstructive Surgery 75(3):328–338; PMID 3883374",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "farkas-2000-afro-american-canons": Object.freeze({
    title: "Farkas, Forrest & Litsas (2000), neoclassical canons in an Afro-American cohort",
    kind: "modern-anthropometry-negative-evidence",
    locator: "Aesthetic Plastic Surgery 24(3):179–184",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "jayaratne-2012-southern-chinese-canons": Object.freeze({
    title: "Jayaratne et al. (2012), neoclassical canons in Southern Chinese faces",
    kind: "modern-anthropometry-negative-evidence",
    locator: "PLoS ONE 7(12):e52593",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "neoclassical-canons-unspecified": Object.freeze({
    title: "Modern neoclassical proportion canons and their empirical refutation",
    kind: "modern-anthropometry-negative-evidence",
    locator: "Farkas 1985; Farkas et al. 2000; Jayaratne et al. 2012",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),

  /*
   * Reconciliation NEW_RECORD rows SR-05, SR-14, SR-15, project-owned Kanripo
   * acquisition (2026-08-29). See docs/heritage-evidence/REPO_RECONCILIATION_MATRIX.md
   * and docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md.
   */
  "heritage-three-sections-taiqing-mianbu": Object.freeze({
    title: "Taiqing Shenjian 卷五 論靣部 facial Three Sections",
    kind: "historical-primary-text",
    edition: "欽定四庫全書文淵閣本",
    repository: "kanripo/KR3g0045",
    repositoryCommit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5",
    repositoryFile: "KR3g0045_005.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0045/blob/b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5/KR3g0045_005.txt",
    sha256: "b02b8bee6fd5cbabe98f0e064f3487d3585019e10b0b5fe1efcb559f46d33dc7",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    sourceAccess: "STABLE_REMOTE",
    sectionLocator: "卷五 論靣部",
    sectionLocatorStatus: "VERIFIED",
    folioLocator: "<pb:KR3g0045_WYG_005_7b>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution. This is the FACIAL Three Sections definition (卷五 論靣部), distinct from the BODY 身三停 of 卷六 (heritage-three-sections-taiqing).",
    translationStatus: "original-to-this-project",
  }),
  "heritage-five-forms-yuguan": Object.freeze({
    title: "玉管照神局 卷上 (呂洞賓賦) Five Forms like-with-like passage",
    kind: "historical-primary-text",
    edition: "欽定四庫全書文淵閣本",
    repository: "kanripo/KR3g0044",
    repositoryCommit: "0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74",
    repositoryFile: "KR3g0044_001.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0044/blob/0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74/KR3g0044_001.txt",
    sha256: "17b56dac2b3946af53707a20cecb42e956eff7a88b8e9b806a35ea19f95ad9f3",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    sourceAccess: "STABLE_REMOTE",
    sectionLocator: "卷上 呂洞賓賦",
    sectionLocatorStatus: "VERIFIED",
    folioLocator: "<pb:KR3g0044_WYG_001_4b>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "Attributed 南唐 宋齊邱; likely early Song. Attribution uncertain. This passage is 似X得X (like-with-like: an element-resembling form obtaining that same element, one outcome each — five pairs). It is NOT generation (相生), overcoming (相尅), a 5×5 grid, or a 25-type structure.",
    translationStatus: "original-to-this-project",
  }),
  "heritage-three-sections-yuguan": Object.freeze({
    title: "玉管照神局 卷下 三停平等 verse",
    kind: "historical-primary-text-verse",
    edition: "欽定四庫全書文淵閣本",
    repository: "kanripo/KR3g0044",
    repositoryCommit: "0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74",
    repositoryFile: "KR3g0044_003.txt",
    sourceUrl: "https://github.com/kanripo/KR3g0044/blob/0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74/KR3g0044_003.txt",
    sha256: "3631ca4efadab24550d72543b2d282627f67ebe0b48dc855977e65479994abd2",
    retrievedAt: "2026-08-29T04:49:24Z",
    editionFingerprint: "WYG-Siku",
    sourceAccess: "STABLE_REMOTE",
    sectionLocator: "卷下 詩曰 (adjacent to 鴿形)",
    sectionLocatorStatus: "VERIFIED",
    folioLocator: "<pb:KR3g0044_WYG_003_13a>",
    folioLocatorStatus: "VERIFIED",
    folioLocatorKind: "WYG_PB",
    citationStatus: CITATION_STATUS.VERIFIED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
    authorshipNote: "Attributed 南唐 宋齊邱; likely early Song. Verse text 三停平等能和美; domain unspecified. 平等 here is NOT a Ming/麻衣-exclusive predicate — 玉管照神局 is a Southern Tang / early Song Siku witness.",
    translationStatus: "original-to-this-project",
  }),
};

export const SOURCE_REGISTRY = Object.freeze(Object.fromEntries(
  Object.entries(RAW_SOURCE_REGISTRY).map(([id, value]) => [id, sourceRecord(value)]),
));

const profile = (value) => Object.freeze({
  tradition: "Mian Xiang",
  contributorIds: Object.freeze(["repository-editorial"]),
  rightsStatus: "audit-required",
  releaseStatus: "existing-copy-needs-audit",
  ...value,
  sourceIds: Object.freeze(value.sourceIds),
});

export const CONTENT_PROVENANCE = Object.freeze({
  "five-elements-v1": profile({
    family: "five-elements", sourceIds: ["mianxiang-unspecified"],
    measurementCoverage: { mappedShapes: 6 },
  }),
  "three-courts-v1": profile({
    family: "three-courts", sourceIds: ["mianxiang-unspecified"],
    measurementCoverage: { courts: 3, hairlineMeasured: false },
  }),
  // Retained only so readings already stored on a user's device keep a
  // resolvable provenance ID after the complete twelve-region upgrade.
  "twelve-palaces-v1": profile({
    family: "twelve-palaces", sourceIds: ["mianxiang-unspecified"],
    measurementCoverage: { listed: 12, sampled: 6 },
  }),
  "twelve-palaces-v2": profile({
    family: "twelve-palaces", sourceIds: ["mianxiang-unspecified"],
    measurementCoverage: { listed: 12, sampled: 12, bilateralRegionsRequired: true },
  }),
  "qi-se-reading-v1": profile({
    family: "qi-se", sourceIds: ["mianxiang-unspecified", "suwen-ch17"],
    measurementCoverage: { bands: 3 },
  }),
  "harmony-v1": profile({
    family: "proportion-harmony",
    sourceIds: [
      "mianxiang-unspecified",
      "farkas-1985-neoclassical-canons",
      "farkas-2000-afro-american-canons",
      "jayaratne-2012-southern-chinese-canons",
    ],
    measurementCoverage: { components: 4 },
  }),
  "qise-passages-v1": profile({
    family: "qi-se-composed-passages",
    sourceIds: ["mianxiang-unspecified", "suwen-ch17"],
    measurementCoverage: { theoreticalCompositions: 12000 },
  }),
});

/** Missing breadth is a visible roadmap, not prose pretending to be complete. */
export const EXPANSION_AREAS = Object.freeze([
  { id: "ears", label: "Ears", status: "source-and-measurement-required" },
  { id: "nose", label: "Nose structure", status: "source-and-measurement-required" },
  { id: "mouth", label: "Mouth and philtrum", status: "source-and-measurement-required" },
  { id: "markings", label: "Lines and visible markings", status: "source-review-required" },
  { id: "life-stage-map", label: "Traditional position and life-stage maps", status: "source-review-required" },
]);

export function validateProvenanceEntry(id, entry) {
  const issues = [];
  if (!id || typeof id !== "string") issues.push("stable-id-required");
  if (!entry?.family) issues.push("family-required");
  if (!Array.isArray(entry?.sourceIds) || entry.sourceIds.length === 0) issues.push("source-id-required");
  for (const sourceId of entry?.sourceIds || []) {
    if (!SOURCE_REGISTRY[sourceId]) issues.push(`unknown-source:${sourceId}`);
  }
  if (!Array.isArray(entry?.contributorIds) || entry.contributorIds.length === 0) {
    issues.push("contributor-required");
  }
  for (const contributorId of entry?.contributorIds || []) {
    if (!CONTRIBUTOR_REGISTRY[contributorId]) issues.push(`unknown-contributor:${contributorId}`);
  }
  if (!entry?.rightsStatus) issues.push("rights-status-required");
  return issues;
}

/*
 * The gate is unchanged and deliberately strict: only `verified` and `cleared`
 * pass. What each helper adds is the reason. "Edition recorded but not checked"
 * and "no source at all" are different states of the world, and reporting both
 * as `citation-not-verified` made a recorded edition look like a missing one —
 * which is the reading that invites someone to "fix" it by relabelling the
 * evidence. Naming the actual shortfall keeps the record honest and keeps the
 * remaining work legible.
 */
const citationBlocker = (status) => {
  if (status === CITATION_RELEASE_STATUS) return null;
  if (status === CITATION_STATUS.EDITION_RECORDED) return "citation-recorded-not-verified";
  if (status === CITATION_STATUS.ATTRIBUTION_CONTRADICTED) {
    return "citation-attribution-contradicted";
  }
  if (status === CITATION_STATUS.WORK_RECORDED) return "citation-work-recorded";
  if (status === CITATION_STATUS.SOURCE_REQUIRED) return "citation-source-required";
  return "citation-status-unrecognised";
};

const sourceRightsBlocker = (status) => {
  if (status === RIGHTS_RELEASE_STATUS) return null;
  if (status === RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE) return "source-rights-public-domain-not-cleared";
  if (status === RIGHTS_STATUS.UNVERIFIED) return "source-rights-unverified";
  return "source-rights-status-unrecognised";
};

export function auditContentProvenance() {
  const results = {};
  for (const [id, entry] of Object.entries(CONTENT_PROVENANCE)) {
    const issues = validateProvenanceEntry(id, entry);
    if (entry.rightsStatus !== RIGHTS_RELEASE_STATUS) issues.push("rights-not-cleared");
    for (const sourceId of entry.sourceIds) {
      const source = SOURCE_REGISTRY[sourceId];
      const citation = citationBlocker(source.citationStatus);
      if (citation) issues.push(`${citation}:${sourceId}`);
      const sourceRights = sourceRightsBlocker(source.rightsStatus);
      if (sourceRights) issues.push(`${sourceRights}:${sourceId}`);
    }
    results[id] = { ready: issues.length === 0, issues: [...new Set(issues)] };
  }
  return results;
}

export const READING_PROVENANCE_IDS = Object.freeze({
  fiveElements: "five-elements-v1",
  threeCourts: "three-courts-v1",
  twelvePalaces: "twelve-palaces-v2",
  qiSe: "qi-se-reading-v1",
  harmony: "harmony-v1",
});

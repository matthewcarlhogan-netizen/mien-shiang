/*
 * Pure view models for Stage 3 heritage-connector material. No DOM, no
 * browser — same discipline as screens.js beside it.
 *
 * ── WHY THIS FILE INVENTS NOTHING ────────────────────────────────────────
 * `src/heritage/resolver.js` deliberately produces no prose (its own file
 * header: "It is deliberately NOT a prose engine. It produces no
 * sentences"). Every field a connector entry carries is structural:
 * `relationshipType`, `relationshipDirection`, `sourceId`, `sectionLocator`,
 * `evidenceStrength`, `disposition` — enum values and citation metadata, not
 * sentences. This file reduces those structural fields to a display model
 * without writing new claims: `relationshipLabel` is a mechanical
 * lowercase/space transform of the enum (`"CORRESPONDS_TO"` ->
 * `"corresponds to"`), participant labels reuse `HERITAGE_CONSTRUCT_LABEL`
 * (already used by reflection.js for the same constructs) for CONSTRUCT
 * participants and fall back to the participant's own recorded id for every
 * other node type — Stage 1 has no English label registry for
 * HERITAGE_CONCEPT/CONSTITUENT/RELATED_SYSTEM, and `HERITAGE_CONCEPT_REGISTRY`'s
 * only other recorded field, `canonicalChineseName`, is Chinese-language text
 * that `tests/ui-language.test.js` keeps out of every reader-facing surface
 * except `src/heritage/`/`reading/provenance.js` themselves — deliberately
 * NOT read here, so this file cannot become the first reader-facing surface
 * to leak it. Source citation and evidence-status fields (`sourceTitle`/`sectionLocator`/
 * `evidenceStrength`/`textualLayer`/`citationStatus`/`authorshipStatus`/
 * `sourceAccess`/locator statuses) are already-recorded bibliographic
 * metadata pulled straight from the resolved connector entry and
 * `SOURCE_REGISTRY`. Nothing here infers, composes prose about the reader,
 * resolves a disagreement, or upgrades an evidence/source status — CLAUDE.md
 * item 19's rules (tradition-attributed, source named inline, no health
 * vocabulary, no verdict about a person) apply to this surface exactly as
 * they do to Module A, even though this is a different module.
 *
 * ── WHY SOURCE_PANEL_CEILING MATERIAL NEVER REACHES tier2ConnectorModel ──
 * `tier2ConnectorModel` reads only the ONE connector `tierTwoHeritageConnections`
 * already selected (`src/qise/heritage-connections.js`'s
 * `deriveTier2FromComposition`, which itself never reads `sourcePanelOnly`
 * or `editorialJuxtapositions` — see that file). This module adds no second
 * opinion about what counts as visible; it only reshapes what Stage 3
 * already decided was visible. Tier 2's card is built with `connectorCard`
 * (the bounded reduction); the fuller evidence/provenance reduction,
 * `connectorEvidenceCard`, is used ONLY inside `tier3ConnectorModel` — Tier 2
 * never sees `evidenceStrength`/`textualLayer`/locator-status/citation
 * fields at all, so it stays bounded by construction, not by convention.
 *
 * ── WHY TIER 3's ACTIVE ORDER FOLLOWS renderPlan.relationshipOrder ────────
 * The resolver keeps `active`/`sourcePanelOnly`/`unavailableRelations` in
 * stable connectorId order (occurrence-invariant) and carries the rotating,
 * occurrence-dependent presentation order separately, in
 * `renderPlan.relationshipOrder` — see resolver.js's own comment at item 11.
 * `deriveTier2FromComposition` (heritage-connections.js) selects Tier 2's one
 * connector as `renderPlan.relationshipOrder[0]`. If Tier 3 rendered `active`
 * in its raw stable-id order instead, opening the expanded view could show a
 * DIFFERENT connector first than the one Tier 2 already selected for the
 * exact same reading — the same "two divergent presentations of one
 * selection" hazard the single composeHeritageOnceForReading call (see that
 * file's header) already closed for depth. `tier3ConnectorModel` reorders
 * `active` by `renderPlan.relationshipOrder` before building cards, so both
 * tiers agree on which connector comes first, by construction.
 */
import { HERITAGE_CONSTRUCT_LABEL, ROTATION_DISCLOSURE } from "../../qise/reflection-corpus.js";
import { SOURCE_REGISTRY } from "../../reading/provenance.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/*
 * Same three CJK ranges `tests/ui-language.test.js` and
 * `tests/qise/heritage-view.test.js`'s own `hasHan` guard already use — kept
 * identical on purpose, so "English-only" means the same thing everywhere it
 * is checked.
 */
const HAN_RANGES = Object.freeze([[0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xf900, 0xfaff]]);
function containsHan(value) {
  if (typeof value !== "string") return false;
  for (const ch of value) {
    const code = ch.codePointAt(0);
    if (HAN_RANGES.some(([lo, hi]) => code >= lo && code <= hi)) return true;
  }
  return false;
}

/*
 * The canonical heritage/source registries are source-language records on
 * purpose (see the file header) and this view layer must not become the
 * first reader-facing surface to leak their Han-script text — `sourceTitle`,
 * `sectionLocator`/`folioLocator` and disagreement `summary` all come from
 * those registries verbatim and several genuinely mix Han characters into an
 * otherwise-English string (e.g. a title prefixed with a Han work name, or a
 * locator like `"「四瀆」; 卷二 (Siku)"`). This never translates and never
 * strips characters out of a string to leave a partial remainder — a
 * surgically-edited fragment is not a verified translation, it is a guess
 * with the evidence removed. A string containing ANY Han character is
 * treated as not English-safe as a whole and OMITTED (`null`); the caller
 * falls back to an already-recorded, structurally English-safe identifier
 * (`sourceId`/`connectorId`/`positionId`) where provenance identity still
 * needs to be shown.
 */
function englishSafe(value) {
  if (typeof value !== "string" || value === "") return null;
  return containsHan(value) ? null : value;
}

/*
 * D2-2's SECOND, INDEPENDENT enforcement gate. `englishSafe()` above removes
 * every Han-script value whole, which is half of D2-2's requirement (上相,
 * 貴, and every other Han fortune term can never survive it into a reader
 * field). It gives none of the OTHER half: D2-2 also bans "any English rank,
 * status or fortune interpretation", and a project-owned English translation
 * reading something like "a person of superior physiognomy" would pass
 * `englishSafe()` completely untouched, since it contains no Han character at
 * all. This function is that second gate — it exists so that if a verified
 * translation is ever added for a predicate, the same enforcement still
 * holds; today, with no translation field authorised at all (see
 * docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md §6.5), it mainly guards
 * `excludedPredicateClauses` matches, which is enough to prove the gate is
 * wired and not dead code (see the paired tests).
 *
 * The vocabulary is CLAIM-SHAPED, not category-shaped, on purpose. The first
 * draft of this function banned the bare words "fortune", "status" and
 * "rank" and immediately fired on this product's own refusal copy — text
 * that NAMES the category in order to say it is not being claimed, e.g. "it
 * remains fortune-typed heritage and is never encoded as a user inference".
 * Banning the word would have meant rewriting a correct disclaimer to
 * satisfy a lint about English (CLAUDE.md items 22 and 40, the same class of
 * mistake). So every entry below is a CLAIM form ("the reading is
 * auspicious", "a person of superior physiognomy"), never the bare noun.
 * `excludedPredicateClauses` is checked as a literal substring match — it
 * can only narrow what is withheld, never widen it, and it is never itself
 * rendered (see `connectorCard()` below): showing the reader the list of
 * withheld clauses would reintroduce the very clause it excludes.
 */
const FORTUNE_CLAIM_VOCABULARY = new RegExp([
  "superior physiognomy", "high minister", "high office", "\\bnoble\\b", "nobility",
  // No \b after "auspicious": "auspiciousness" has no word boundary between
  // "auspicious" and "ness", so a \b-anchored pattern let it straight through
  // — found live in tier3ConnectorModel()'s own disagreement-position markup
  // ("...contradicts attributed auspiciousness predicate"), reachable the
  // moment any threeSections connector is active (disagreements attach to
  // the CONSTRUCT, not to a specific connector — resolver.js's
  // collectDisagreementIds/disagreementPanels).
  "auspicious", "\\bdestiny\\b", "\\bfated\\b", "longevity", "long life",
  "good fortune", "fortunate", "brings? wealth", "wealthy", "prosperity", "prosperous",
  "high rank", "elevated rank", "years of (rank|honour|honor|office)",
].join("|"), "i");

export function fortuneFree(value, excludedClauses) {
  if (typeof value !== "string" || value === "") return value;
  if ((excludedClauses || []).some((clause) => clause && value.includes(clause))) return null;
  return FORTUNE_CLAIM_VOCABULARY.test(value) ? null : value;
}

/** "CORRESPONDS_TO" -> "corresponds to". A mechanical transform, not a new phrase. */
export function humanizeRelationshipType(value) {
  return typeof value === "string" ? value.toLowerCase().replace(/_/g, " ") : "";
}

/**
 * A participant's display label, resolved only from already-recorded
 * canonical metadata — never invented. CONSTRUCT reuses
 * `HERITAGE_CONSTRUCT_LABEL` unchanged. HERITAGE_CONCEPT, CONSTITUENT and
 * RELATED_SYSTEM have no ENGLISH label registry in Stage 1 (see the file
 * header on `canonicalChineseName`) — their recorded id is the only
 * canonical English-safe text available for them, so it is shown as-is
 * rather than paraphrased. Uses the same canonical identifier fields as
 * `validator.js`'s `participantRefId` for validated participant node types;
 * display-safe fallbacks remain local to this view layer.
 */
function participantLabel(p) {
  if (p.nodeType === "CONSTRUCT") {
    const id = p.constructId ?? p.participantId;
    return HERITAGE_CONSTRUCT_LABEL[id] || id;
  }
  if (p.nodeType === "HERITAGE_CONCEPT") return p.conceptId ?? p.participantId;
  if (p.nodeType === "CONSTITUENT") return p.constituentId ?? p.participantId;
  if (p.nodeType === "RELATED_SYSTEM") return p.relatedSystemId ?? p.participantId;
  return p.participantId;
}

/**
 * One connector entry, reduced to the fields any reader-facing surface may
 * show: every participant it relates (not only CONSTRUCT ones — see
 * `participantLabel`), the relationship's direction, how it relates them,
 * and where it is cited. Never includes `conditionResolution`, `gateReasons`
 * or the source's evidence/citation-status fields — those belong to Tier 3's
 * fuller reduction (`connectorEvidenceCard`), not to this bounded card, which
 * both tiers share.
 *
 * `sourceTitle`/`sectionLocator` are passed through `englishSafe()` — see its
 * definition above — because both are free-text registry fields that
 * sometimes carry Han-script text (a title prefixed with a Han work name, a
 * locator like `"「四瀆」; 卷二 (Siku)"`). `sourceId` is exposed alongside
 * them, structurally English-safe by construction (a kebab-case registry
 * key), so `heritageConnectorCardMarkup` still has an identifier to fall back
 * to when both free-text fields are omitted.
 *
 * `predicate` is `entry.relationshipPredicate` (DR-2026-08-31-D2-CONNECTOR-
 * PREDICATE) through BOTH `englishSafe()` and `fortuneFree()` — two
 * independent gates, since the two guard different things: `englishSafe()`
 * removes Han script whole, `fortuneFree()` removes claim-shaped English and
 * anything matching the connector's own `excludedPredicateClauses`. Today
 * every recorded `relationshipPredicate` is Han-only, so `predicate` is
 * always `null` in practice (no translation field is authorised — see the
 * contract's §6.5) — that is the correct, honest result of abstaining from
 * an uncertified translation, not evidence the field is unused: both guards
 * are exercised, and would pass a safe value through, or block an unsafe
 * one, the moment either kind of value exists.
 */
export function connectorCard(entry, sourceRegistry = SOURCE_REGISTRY) {
  if (!entry) return null;
  const source = sourceRegistry?.[entry.sourceId] || null;
  return Object.freeze({
    connectorId: entry.connectorId,
    relationshipLabel: humanizeRelationshipType(entry.relationshipType),
    participants: Object.freeze((entry.participants || []).map((p) => Object.freeze({
      participantId: p.participantId,
      nodeType: p.nodeType,
      label: participantLabel(p),
    }))),
    relationshipDirection: entry.relationshipDirection || null,
    sourceId: entry.sourceId || null,
    sourceTitle: englishSafe(source ? source.title : null),
    sectionLocator: englishSafe(entry.sectionLocator || null),
    predicate: fortuneFree(englishSafe(entry.relationshipPredicate || null), entry.excludedPredicateClauses),
    disposition: entry.disposition || null,
    prohibitedForUserInference: entry.prohibitedForUserInference === true,
  });
}

/**
 * Tier 3's fuller reduction: everything `connectorCard` carries, plus the
 * bounded evidence/provenance fields needed to explain a connector's
 * standing in the scholarly view — `evidenceStrength`/`textualLayer`/
 * `folioLocator` from the resolved connector entry itself, and
 * `citationStatus`/`authorshipStatus`/`sourceAccess` from the cited source
 * record. All are already-recorded fields (`resolver.js`'s `toResolvedEntry`
 * / `reading/provenance.js`'s `sourceRecord`) — nothing here computes a new
 * status or upgrades an existing one. Deliberately NOT used by
 * `tier2ConnectorModel` — see the file header.
 *
 * `sectionLocatorStatus`/`folioLocatorStatus` are two DIFFERENT provenance
 * levels and must not collapse into one. A source record's status describes
 * how well THAT SOURCE, in general, is located; a connector can cite the
 * same source at a locator this project has only recorded, not verified —
 * `five-forms-generative-overcoming-system` carries `sectionLocatorStatus:
 * "RECORDED"` on the connector itself while its source
 * (`heritage-five-elements-taiqing`) is `"VERIFIED"`. Reading the source's
 * status for a connector-specific locator would silently upgrade that
 * connector's citation to a strength it does not have. So the connector's
 * OWN recorded status is read first; the source's status is used only as a
 * fallback when the connector does not record one of its own (most
 * connectors don't — they inherit the source's locator wholesale).
 */
export function connectorEvidenceCard(entry, sourceRegistry = SOURCE_REGISTRY) {
  const base = connectorCard(entry, sourceRegistry);
  if (!base) return null;
  const source = sourceRegistry?.[entry.sourceId] || null;
  return Object.freeze({
    ...base,
    evidenceStrength: entry.evidenceStrength || null,
    textualLayer: entry.textualLayer || null,
    folioLocator: englishSafe(entry.folioLocator || null),
    sectionLocatorStatus: entry.sectionLocatorStatus ?? (source ? source.sectionLocatorStatus : null),
    folioLocatorStatus: entry.folioLocatorStatus ?? (source ? source.folioLocatorStatus : null),
    citationStatus: source ? source.citationStatus : null,
    authorshipStatus: source ? source.authorshipStatus : null,
    sourceAccess: source ? source.sourceAccess : null,
  });
}

/**
 * Reorders resolved connector entries to match `renderPlan.relationshipOrder`
 * — the SAME order Tier 2's selection (`relationshipOrder[0]`) came from —
 * appending any entry the render plan does not name (defensive; at
 * `SOURCE_DEEP`, the depth `tierThreeHeritageConnections` always uses, the
 * cap is `Infinity` so every active connector is named) in stable connectorId
 * order after the named ones. Never reselects, drops, or adds a connector —
 * purely a presentation-order sort over the same set `tier3Connectors.active`
 * already contains.
 */
function orderByRelationshipOrder(entries, relationshipOrder) {
  if (!relationshipOrder || !relationshipOrder.length) return entries;
  const positionOf = new Map(relationshipOrder.map((id, i) => [id, i]));
  return entries.slice().sort((a, b) => {
    const posA = positionOf.has(a.connectorId) ? positionOf.get(a.connectorId) : Number.POSITIVE_INFINITY;
    const posB = positionOf.has(b.connectorId) ? positionOf.get(b.connectorId) : Number.POSITIVE_INFINITY;
    return posA !== posB ? posA - posB : a.connectorId.localeCompare(b.connectorId);
  });
}

/**
 * A disagreement position, reduced to its own summary plus the source
 * metadata that already backs it (`positions[].sourceId`, resolved against
 * `SOURCE_REGISTRY`) — never a resolution of which position is "right".
 * Several canonical summaries read as bare labels ("Primary position",
 * "Variant position") with the source distinguishing them left implicit;
 * this is what makes that provenance explicit rather than dropping it.
 *
 * `summary`/`sourceTitle`/`sectionLocator` all pass through `englishSafe()`
 * — a disagreement summary is free-text prose and, like a source title or
 * locator, sometimes mixes in Han-script text (e.g. a summary opening with a
 * Han work name). `positionId`/`sourceId` stay untouched: both are
 * structurally English-safe registry keys, so `heritageConnectorTier3Markup`
 * can always fall back to one of them when the free-text fields are omitted.
 */
/*
 * `summary` runs through `fortuneFree()` as well as `englishSafe()` — found
 * necessary, not theoretical: `three-sections-boundaries`' own
 * `received-mayi-contradiction` position summary reads "Received Ma Yi
 * witness contradicts attributed auspiciousness predicate", pure English, no
 * Han, so `englishSafe()` alone let it through. Disagreements attach to a
 * CONSTRUCT (resolver.js's `collectDisagreementIds`/`disagreementPanels`),
 * not to a specific connector, so this — and any other position summary on
 * any disagreement — is reachable the moment ANY connector for that
 * construct is active, whether or not that position's own connector exists.
 */
function disagreementPositionCard(position, sourceRegistry) {
  const source = sourceRegistry?.[position?.sourceId] || null;
  return Object.freeze({
    positionId: position?.positionId ?? null,
    summary: fortuneFree(englishSafe(position?.summary ?? null)),
    sourceId: position?.sourceId ?? null,
    sourceTitle: englishSafe(source ? source.title : null),
    sectionLocator: englishSafe(source ? source.sectionLocator : null),
    citationStatus: source ? source.citationStatus : null,
  });
}

function disagreementCard(d, sourceRegistry) {
  return Object.freeze({
    disagreementId: d.disagreementId,
    positions: Object.freeze((d.positions || []).map((p) => disagreementPositionCard(p, sourceRegistry))),
  });
}

/**
 * Bounded wording for a source-panel entry, chosen from its own recorded
 * `disposition` — never one blanket sentence for the whole section. The
 * resolver assigns two structurally different reasons to "not shown in the
 * daily reading" (resolver.js item 2, ~line 1065): `SOURCE_PANEL` is a
 * permanent `runtimePolicy: "SOURCE_PANEL_ONLY"` restriction that no amount
 * of future evidence promotes to active presentation; `SOURCE_PANEL_CEILING`
 * is an evidentiary ceiling that COULD, in principle, be cleared by stronger
 * evidence. Describing the first as a backlog awaiting evidence would misstate
 * a permanent policy restriction as a temporary evidence gap.
 */
const SOURCE_PANEL_DISCLOSURE = Object.freeze({
  SOURCE_PANEL: "Recorded, but kept to the source panel by policy — a standing restriction, not evidence awaiting review.",
  SOURCE_PANEL_CEILING: "Recorded but not shown in the daily reading: the evidentiary standing has not yet cleared active presentation.",
});

function sourcePanelDisclosureFor(card) {
  return SOURCE_PANEL_DISCLOSURE[card.disposition] || SOURCE_PANEL_DISCLOSURE.SOURCE_PANEL_CEILING;
}

/**
 * Tier 2's bounded card: the ONE selected connector, or unavailable with why.
 * `tier2Connectors` is `tier2.connectors` from `readingTiersWithHeritage()`
 * (i.e. `deriveTier2FromComposition`'s output) — never a raw composition
 * result, so SOURCE_PANEL_CEILING material was already excluded upstream.
 */
export function tier2ConnectorModel(tier2Connectors, sourceRegistry = SOURCE_REGISTRY) {
  if (!tier2Connectors || !tier2Connectors.available) {
    return Object.freeze({
      available: false,
      reason: tier2Connectors ? tier2Connectors.reason : "NO_CONNECTOR_DATA",
      card: null,
      rotationDisclosure: null,
    });
  }
  return Object.freeze({
    available: true,
    reason: null,
    card: connectorCard(tier2Connectors.connector, sourceRegistry),
    rotationDisclosure: tier2Connectors.rotationDisclosure,
  });
}

/**
 * Tier 3's expanded model: active connectors (in the SAME order Tier 2's
 * selection came from — see the file header), source-panel-only material,
 * disagreements (each position attributed to its source), abstentions (every
 * gate reason, not only the first) and editorial juxtapositions (each
 * referenced connector resolved to its own card, not left as a bare id),
 * each reduced to a display-safe shape. `tier3Connectors` is `tier3.connectors`
 * from `readingTiersWithHeritage()` — the full Stage 3 composition result.
 *
 * `rotationDisclosure` is CONNECTOR-PAYLOAD METADATA, not something this
 * module renders itself — see `heritageConnectorTier3Markup`, which renders
 * none of it. It carries the SAME `ROTATION_DISCLOSURE` string Tier 2's
 * model carries (`deriveTier2FromComposition`/`tier2ConnectorModel`) — never
 * a second, independently authored sentence for the same fact (Contract §13)
 * — and is set whenever ANY category here (active, source-panel-only,
 * disagreements, abstentions, editorial) is non-empty, `null` whenever
 * nothing is shown, so a fail-closed suppression never carries a disclosure
 * about material that was never composed. `src/ui/qise/app.js`'s
 * `renderReflection()` is the actual disclosure owner for the Why surface —
 * it renders one unconditional disclosure (from `tier2.rotationDisclosure`,
 * reused) before everything on that tab, including the heritage trace above
 * this model's own material, which is day-rotated content independent of
 * whether any Stage-3 connector is authorised at all. This field survives
 * for callers/tests that need to confirm the connector composition itself
 * carries disclosure-relevant metadata, per that earlier requirement.
 */
export function tier3ConnectorModel(tier3Connectors, sourceRegistry = SOURCE_REGISTRY) {
  if (!tier3Connectors) {
    return Object.freeze({
      suppressed: true, abstained: false, reason: "NO_CONNECTOR_DATA",
      active: Object.freeze([]), sourcePanelOnly: Object.freeze([]),
      disagreements: Object.freeze([]), abstentions: Object.freeze([]),
      editorial: Object.freeze([]), rotationDisclosure: null,
    });
  }
  if (tier3Connectors.suppressed || tier3Connectors.abstained) {
    return Object.freeze({
      suppressed: Boolean(tier3Connectors.suppressed),
      abstained: Boolean(tier3Connectors.abstained),
      reason: tier3Connectors.suppressionReason || tier3Connectors.abstentionReasonCode || null,
      active: Object.freeze([]), sourcePanelOnly: Object.freeze([]),
      disagreements: Object.freeze([]), abstentions: Object.freeze([]),
      editorial: Object.freeze([]), rotationDisclosure: null,
    });
  }

  const orderedActive = orderByRelationshipOrder(
    tier3Connectors.active || [],
    tier3Connectors.renderPlan?.relationshipOrder,
  );
  const activeCards = orderedActive.map((e) => connectorEvidenceCard(e, sourceRegistry));
  const sourcePanelCards = (tier3Connectors.sourcePanelOnly || [])
    .map((e) => connectorEvidenceCard(e, sourceRegistry));
  const cardById = new Map([...activeCards, ...sourcePanelCards].map((c) => [c.connectorId, c]));

  const editorial = Object.freeze((tier3Connectors.editorialJuxtapositions || []).map((j) => Object.freeze({
    policyId: j.policyId,
    historicalRelationshipAsserted: j.historicalRelationshipAsserted,
    requiresSeparateAttribution: j.requiresSeparateAttribution,
    disclosure: j.disclosure,
    // Every id here is present in active/sourcePanelOnly by construction —
    // see composeHeritageOnceForReading's file header. A fallback stub
    // covers only a malformed/synthetic input, so this can never throw.
    items: Object.freeze((j.items || []).map((id) => cardById.get(id)
      || Object.freeze({ connectorId: id, participants: Object.freeze([]), relationshipLabel: "", sourceTitle: null, sectionLocator: null, disposition: null }))),
  })));
  const disagreements = Object.freeze((tier3Connectors.disagreements || []).map((d) => disagreementCard(d, sourceRegistry)));
  const abstentions = Object.freeze(tier3Connectors.abstentions || []);

  const hasVisibleMaterial = activeCards.length > 0 || sourcePanelCards.length > 0
    || disagreements.length > 0 || abstentions.length > 0 || editorial.length > 0;

  return Object.freeze({
    suppressed: false,
    abstained: false,
    reason: null,
    active: Object.freeze(activeCards),
    sourcePanelOnly: Object.freeze(sourcePanelCards),
    disagreements,
    abstentions,
    editorial,
    rotationDisclosure: hasVisibleMaterial ? ROTATION_DISCLOSURE : null,
  });
}

/*
 * ── MARKUP: the actual reader-facing production render path ─────────────
 * `src/ui/qise/app.js` is DOM wiring only (see the file tree comment in
 * CLAUDE.md — "app.js: DOM wiring ONLY"); it must not own string-building
 * logic that a test cannot reach. These functions ARE that logic, and they
 * are what `app.js` calls and assigns directly to `storyNode.innerHTML` /
 * `whyNode.innerHTML` — see "src/ui/qise/app.js actually renders
 * heritageConnectorTier2Markup..." in tests/qise/heritage-connections.test.js
 * for the proof that app.js's wiring is not just computing this and
 * discarding it.
 */

/**
 * A card's participants, joined into one line honouring
 * `relationshipDirection` rather than always rendering a symmetric "↔":
 * DIRECTED renders `from → to`, ORDERED renders its declared sequence, and
 * UNDIRECTED (or a malformed direction missing its endpoints) falls back to
 * the plain "↔"-joined list — the historical predicate itself is never
 * reinterpreted, only how its already-recorded endpoints are laid out.
 */
function participantsLineText(card) {
  const participants = card.participants || [];
  const labelFor = (id) => (participants.find((p) => p.participantId === id) || {}).label || id;
  const dir = card.relationshipDirection;
  if (dir?.kind === "DIRECTED" && (dir.from || []).length && (dir.to || []).length) {
    return `${dir.from.map(labelFor).join(", ")} → ${dir.to.map(labelFor).join(", ")}`;
  }
  if (dir?.kind === "ORDERED" && (dir.sequence || []).length) {
    return dir.sequence.map(labelFor).join(" → ");
  }
  return participants.map((p) => p.label).join(" ↔ ");
}

/** The bounded evidence/provenance line — renders only on a Tier 3 evidence card (fields absent on Tier 2's bounded card produce no line at all). */
function evidenceStatusText(card) {
  const bits = [];
  if (card.evidenceStrength) bits.push(`evidence: ${humanizeRelationshipType(card.evidenceStrength)}`);
  if (card.textualLayer) bits.push(`textual layer: ${humanizeRelationshipType(card.textualLayer)}`);
  if (card.citationStatus) bits.push(`citation: ${card.citationStatus}`);
  if (card.authorshipStatus) bits.push(`authorship: ${humanizeRelationshipType(card.authorshipStatus)}`);
  if (card.sourceAccess) bits.push(`source access: ${humanizeRelationshipType(card.sourceAccess)}`);
  if (card.sectionLocatorStatus) bits.push(`section locator: ${humanizeRelationshipType(card.sectionLocatorStatus)}`);
  if (card.folioLocator) bits.push(`folio: ${card.folioLocator}`);
  if (card.folioLocatorStatus) bits.push(`folio locator: ${humanizeRelationshipType(card.folioLocatorStatus)}`);
  return bits.join("; ");
}

/**
 * One connector, reduced further to exactly what a reader sees. `citation`
 * falls back to the bare `sourceId` only when BOTH free-text fields were
 * omitted as not English-safe (see `connectorCard`'s `englishSafe()` use) —
 * provenance identity must still be shown, per the English-only boundary,
 * even when the prose describing it cannot be.
 *
 * `card.prohibitedForUserInference` renders as an explicit third-person
 * notice, not merely a field the model carries. `connectorCard()` already
 * reduces it from the resolver's own record (`resolver.js`'s `toResolvedEntry`
 * sets it from `connector.prohibitedForUserInference`, and `validator.js`
 * requires it `true` on every "prohibited" safety status), so it was correct
 * and present all the way to this function — but this function is the ACTUAL
 * reader-facing render boundary, and it read every other field on `card`
 * except this one. Without this line, a connector the resolver flags as
 * "must never be presented as an inference about the reader" would render
 * beside a personalised reading as an ordinary "related"/"attested"
 * relationship, with nothing distinguishing it from the measured content
 * around it — the exact framing AGENTS.md's product-scope line rules out
 * ("not diagnosis, identity ... or a fixed judgement of character"). This is
 * the single function every connector card renders through (Tier 2's one
 * selection, Tier 3's active/source-panel/editorial lists all call this),
 * so one line here covers every render site at once.
 */
export function heritageConnectorCardMarkup(card) {
  const constructs = participantsLineText(card);
  const citation = [card.sourceTitle, card.sectionLocator].filter(Boolean).join(", ") || card.sourceId || "";
  const evidence = evidenceStatusText(card);
  return `
    <p>${esc(constructs)}${constructs && card.relationshipLabel ? " — " : ""}${esc(card.relationshipLabel)}</p>
    ${citation ? `<p class="muted">${esc(citation)}</p>` : ""}
    ${card.predicate ? `<p class="muted">${esc(card.predicate)}</p>` : ""}
    ${evidence ? `<p class="muted">${esc(evidence)}</p>` : ""}
    ${card.prohibitedForUserInference ? `<p class="muted">Historical source material — not a reading of you.</p>` : ""}`;
}

/**
 * Tier 2's bounded contract: at most the one selected RUNTIME_PROSE
 * connector and its attribution. Returns "" (nothing rendered) when
 * unavailable — never a placeholder that implies a connector exists. Reads
 * only `model.card` (never `model.sourcePanelOnly`/`model.editorial`, which
 * do not exist on this model at all — see `tier2ConnectorModel`), so
 * SOURCE_PANEL_CEILING and editorial material structurally cannot appear
 * here.
 *
 * Renders NO rotation disclosure of its own. `model.rotationDisclosure`
 * stays on the model as connector-payload metadata (an earlier requirement
 * needs it carried there), but the Story SURFACE already renders the
 * reading-level disclosure unconditionally (`src/ui/qise/app.js`'s
 * `renderReflection()`, from `tier2.rotationDisclosure` — the same value,
 * already true for every reading regardless of connector selection). A
 * connector-markup function rendering its own copy duplicated that sentence
 * on screen whenever a connector was selected. Ownership rule: the surface
 * renders the disclosure exactly once; connector markup renders connector
 * content only.
 */
export function heritageConnectorTier2Markup(model) {
  if (!model.available || !model.card) return "";
  return `
    <p class="eyebrow">A related historical connection</p>
    ${heritageConnectorCardMarkup(model.card)}`;
}

/**
 * Tier 3's expanded contract: active connectors, source-panel-only material
 * (each entry labelled per its OWN disposition — policy restriction vs.
 * evidence ceiling, never one blanket label — see `sourcePanelDisclosureFor`),
 * disagreements (each position attributed to its source AND carrying its own
 * `citationStatus`, mechanically labelled — positions on the same
 * disagreement can carry materially different evidence status, e.g.
 * `three-sections-boundaries` spans edition-recorded, source-required and
 * attribution-contradicted, and a reader who cannot see that difference sees
 * all positions as equally supported; the status is shown verbatim, never
 * ranked or editorialised), abstentions (every gate reason), and editorial
 * juxtapositions (each referenced connector resolved to its own card,
 * clearly labelled as not a historical claim, per the policy's own
 * `disclosure`/`historicalRelationshipAsserted: false`).
 * Returns "" when the composition is suppressed or abstained — a fail-closed
 * gate must render nothing, not an empty-looking section that invites a
 * reader to wonder what is missing.
 *
 * Renders NO rotation disclosure of its own. `model.rotationDisclosure`
 * (`tier3ConnectorModel`, above) stays on the model as connector-payload
 * metadata, but the Why SURFACE owns the actual emission
 * (`src/ui/qise/app.js`'s `renderReflection()`) — and for a stronger reason
 * than symmetry with Tier 2: Why's `byLayer.heritage` trace (rendered above
 * this function's output, in app.js's own template) is ITSELF day-rotated
 * heritage content, reconstructed from the same `composed` reading Tier 2's
 * passage comes from, whether or not any Stage-3 connector is authorised or
 * selected. A disclosure owned by this function could only ever cover the
 * connector block below it, leaving the heritage trace above undisclosed.
 * The surface therefore renders ONE disclosure, unconditionally, before
 * everything on the Why tab — see app.js for the exact placement.
 */
export function heritageConnectorTier3Markup(model) {
  if (model.suppressed || model.abstained) return "";
  const sections = [];
  if (model.active.length) {
    sections.push(`<p class="eyebrow">Historical connector graph — attested</p>
      ${model.active.map(heritageConnectorCardMarkup).join("")}`);
  }
  if (model.sourcePanelOnly.length) {
    sections.push(`<p class="eyebrow">Historical connector graph — source-panel only</p>
      ${model.sourcePanelOnly.map((c) => `
        <p class="muted">${esc(sourcePanelDisclosureFor(c))}</p>
        ${heritageConnectorCardMarkup(c)}`).join("")}`);
  }
  if (model.disagreements.length) {
    // `p.summary` falls back to `positionId`, and the citation line to
    // `sourceId`, only when the free-text field was omitted as not
    // English-safe (see `disagreementPositionCard`'s `englishSafe()` use) —
    // provenance identity is still shown even when the prose describing it
    // cannot be.
    sections.push(`<p class="eyebrow">Where sources disagree</p>
      ${model.disagreements.map((d) => `
        <details class="source-note"><summary>${esc(d.disagreementId || "")}</summary>
          ${(d.positions || []).map((p) => `
            <p class="muted">${esc(p.summary || p.positionId || "")}</p>
            ${([p.sourceTitle, p.sectionLocator].filter(Boolean).join(", ") || p.sourceId) ? `<p class="muted">${esc([p.sourceTitle, p.sectionLocator].filter(Boolean).join(", ") || p.sourceId || "")}</p>` : ""}
            ${p.citationStatus ? `<p class="muted">citation: ${esc(p.citationStatus)}</p>` : ""}`).join("")}
        </details>`).join("")}`);
  }
  if (model.abstentions.length) {
    sections.push(`<p class="eyebrow">Not shown today, and why</p>
      <div class="chips">${model.abstentions.map((a) =>
        `<span class="chip">${esc(a.connectorId)}: ${esc((a.gateReasons && a.gateReasons.length ? a.gateReasons.join("; ") : "unavailable"))}</span>`).join("")}</div>`);
  }
  if (model.editorial.length) {
    sections.push(`<p class="eyebrow">Sources shown beside one another (editorial, not a historical claim)</p>
      ${model.editorial.map((j) => `
        <div class="editorial-item">
          ${j.items.map(heritageConnectorCardMarkup).join("")}
        </div>`).join("")}`);
  }
  return sections.join("");
}

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
import { HERITAGE_CONSTRUCT_LABEL } from "../../qise/reflection-corpus.js";
import { SOURCE_REGISTRY } from "../../reading/provenance.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
 * rather than paraphrased. Mirrors `validator.js`'s `participantDisplayId`
 * id-resolution precedence exactly, so "which id identifies this
 * participant" stays defined in one place.
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
    sourceTitle: source ? source.title : null,
    sectionLocator: entry.sectionLocator || null,
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
    folioLocator: entry.folioLocator || null,
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
 */
function disagreementPositionCard(position, sourceRegistry) {
  const source = sourceRegistry?.[position?.sourceId] || null;
  return Object.freeze({
    positionId: position?.positionId ?? null,
    summary: position?.summary ?? "",
    sourceId: position?.sourceId ?? null,
    sourceTitle: source ? source.title : null,
    sectionLocator: source ? source.sectionLocator : null,
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
 */
export function tier3ConnectorModel(tier3Connectors, sourceRegistry = SOURCE_REGISTRY) {
  if (!tier3Connectors) {
    return Object.freeze({
      suppressed: true, abstained: false, reason: "NO_CONNECTOR_DATA",
      active: Object.freeze([]), sourcePanelOnly: Object.freeze([]),
      disagreements: Object.freeze([]), abstentions: Object.freeze([]),
      editorial: Object.freeze([]),
    });
  }
  if (tier3Connectors.suppressed || tier3Connectors.abstained) {
    return Object.freeze({
      suppressed: Boolean(tier3Connectors.suppressed),
      abstained: Boolean(tier3Connectors.abstained),
      reason: tier3Connectors.suppressionReason || tier3Connectors.abstentionReasonCode || null,
      active: Object.freeze([]), sourcePanelOnly: Object.freeze([]),
      disagreements: Object.freeze([]), abstentions: Object.freeze([]),
      editorial: Object.freeze([]),
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

  return Object.freeze({
    suppressed: false,
    abstained: false,
    reason: null,
    active: Object.freeze(activeCards),
    sourcePanelOnly: Object.freeze(sourcePanelCards),
    disagreements: Object.freeze((tier3Connectors.disagreements || []).map((d) => disagreementCard(d, sourceRegistry))),
    abstentions: Object.freeze(tier3Connectors.abstentions || []),
    editorial,
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

/** One connector, reduced further to exactly what a reader sees. */
export function heritageConnectorCardMarkup(card) {
  const constructs = participantsLineText(card);
  const citation = [card.sourceTitle, card.sectionLocator].filter(Boolean).join(", ");
  const evidence = evidenceStatusText(card);
  return `
    <p>${esc(constructs)}${constructs && card.relationshipLabel ? " — " : ""}${esc(card.relationshipLabel)}</p>
    ${citation ? `<p class="muted">${esc(citation)}</p>` : ""}
    ${evidence ? `<p class="muted">${esc(evidence)}</p>` : ""}`;
}

/**
 * Tier 2's bounded contract: at most the one selected RUNTIME_PROSE
 * connector, its attribution, and the rotation disclosure when a connector
 * IS selected. Returns "" (nothing rendered) when unavailable — never a
 * placeholder that implies a connector exists. Reads only `model.card`
 * (never `model.sourcePanelOnly`/`model.editorial`, which do not exist on
 * this model at all — see `tier2ConnectorModel`), so SOURCE_PANEL_CEILING
 * and editorial material structurally cannot appear here.
 */
export function heritageConnectorTier2Markup(model) {
  if (!model.available || !model.card) return "";
  return `
    <p class="eyebrow">A related historical connection</p>
    ${heritageConnectorCardMarkup(model.card)}
    ${model.rotationDisclosure ? `<p class="muted">${esc(model.rotationDisclosure)}</p>` : ""}`;
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
    sections.push(`<p class="eyebrow">Where sources disagree</p>
      ${model.disagreements.map((d) => `
        <details class="source-note"><summary>${esc(d.disagreementId || "")}</summary>
          ${(d.positions || []).map((p) => `
            <p class="muted">${esc(p.summary || "")}</p>
            ${(p.sourceTitle || p.sectionLocator) ? `<p class="muted">${esc([p.sourceTitle, p.sectionLocator].filter(Boolean).join(", "))}</p>` : ""}
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

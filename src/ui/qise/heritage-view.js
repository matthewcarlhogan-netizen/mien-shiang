/*
 * Pure view models for Stage 3 heritage-connector material. No DOM, no
 * browser — same discipline as screens.js beside it.
 *
 * ── WHY THIS FILE INVENTS NOTHING ────────────────────────────────────────
 * `src/heritage/resolver.js` deliberately produces no prose (its own file
 * header: "It is deliberately NOT a prose engine. It produces no
 * sentences"). Every field a connector entry carries is structural:
 * `relationshipType`, `sourceId`, `sectionLocator`, `evidenceStrength`,
 * `disposition` — enum values and citation metadata, not sentences. This
 * file reduces those structural fields to a display model without writing
 * new claims: `relationshipLabel` is a mechanical lowercase/space
 * transform of the enum (`"CORRESPONDS_TO"` -> `"corresponds to"`),
 * `constructLabels` reuses `HERITAGE_CONSTRUCT_LABEL` (already used by
 * reflection.js for the same constructs), and `sourceTitle`/`sectionLocator`
 * are already-recorded bibliographic metadata pulled straight from
 * `SOURCE_REGISTRY`/the entry itself. Nothing here infers, composes prose
 * about the reader, or resolves a disagreement — CLAUDE.md item 19's rules
 * (tradition-attributed, source named inline, no health vocabulary, no
 * verdict about a person) apply to this surface exactly as they do to
 * Module A, even though this is a different module.
 *
 * ── WHY SOURCE_PANEL_CEILING MATERIAL NEVER REACHES tier2ConnectorModel ──
 * `tier2ConnectorModel` reads only the ONE connector `tierTwoHeritageConnections`
 * already selected (`src/qise/heritage-connections.js`'s
 * `deriveTier2FromComposition`, which itself never reads `sourcePanelOnly`
 * or `editorialJuxtapositions` — see that file). This module adds no second
 * opinion about what counts as visible; it only reshapes what Stage 3
 * already decided was visible.
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
 * One connector entry, reduced to the fields any reader-facing surface may
 * show: which constructs it relates, how, and where it is cited. Never
 * includes `conditionResolution`, `gateReasons` or other audit-only fields —
 * those belong to Tier 3's raw structures (`tier3ConnectorModel`), not to a
 * card meant to be read.
 */
export function connectorCard(entry, sourceRegistry = SOURCE_REGISTRY) {
  if (!entry) return null;
  const source = sourceRegistry?.[entry.sourceId] || null;
  return Object.freeze({
    connectorId: entry.connectorId,
    relationshipLabel: humanizeRelationshipType(entry.relationshipType),
    constructLabels: Object.freeze((entry.participants || [])
      .filter((p) => p.nodeType === "CONSTRUCT")
      .map((p) => HERITAGE_CONSTRUCT_LABEL[p.constructId] || p.constructId)),
    sourceTitle: source ? source.title : null,
    sectionLocator: entry.sectionLocator || null,
    disposition: entry.disposition || null,
    prohibitedForUserInference: entry.prohibitedForUserInference === true,
  });
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
 * Tier 3's expanded model: active connectors, source-panel-only material,
 * disagreements, abstentions and editorial juxtapositions, each reduced to a
 * display-safe shape. `tier3Connectors` is `tier3.connectors` from
 * `readingTiersWithHeritage()` — the full Stage 3 composition result.
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
  return Object.freeze({
    suppressed: false,
    abstained: false,
    reason: null,
    active: Object.freeze((tier3Connectors.active || []).map((e) => connectorCard(e, sourceRegistry))),
    sourcePanelOnly: Object.freeze((tier3Connectors.sourcePanelOnly || []).map((e) => connectorCard(e, sourceRegistry))),
    disagreements: Object.freeze(tier3Connectors.disagreements || []),
    abstentions: Object.freeze(tier3Connectors.abstentions || []),
    editorial: Object.freeze(tier3Connectors.editorialJuxtapositions || []),
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

/** One connector, reduced further to exactly what a reader sees. */
export function heritageConnectorCardMarkup(card) {
  const constructs = card.constructLabels.join(" ↔ ");
  const citation = [card.sourceTitle, card.sectionLocator].filter(Boolean).join(", ");
  return `
    <p>${esc(constructs)}${constructs && card.relationshipLabel ? " — " : ""}${esc(card.relationshipLabel)}</p>
    ${citation ? `<p class="muted">${esc(citation)}</p>` : ""}`;
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
 * (clearly labelled as not shown daily), disagreements, abstentions/
 * availability, and editorial juxtapositions (clearly labelled as not a
 * historical claim, per the policy's own `disclosure`/
 * `historicalRelationshipAsserted: false`). Returns "" when the composition
 * is suppressed or abstained — a fail-closed gate must render nothing, not
 * an empty-looking section that invites a reader to wonder what is missing.
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
      <p class="muted">Recorded but not shown in the daily reading: the evidentiary standing has not yet cleared active presentation.</p>
      ${model.sourcePanelOnly.map(heritageConnectorCardMarkup).join("")}`);
  }
  if (model.disagreements.length) {
    sections.push(`<p class="eyebrow">Where sources disagree</p>
      ${model.disagreements.map((d) => `
        <details class="source-note"><summary>${esc(d.disagreementId || "")}</summary>
          ${(d.positions || []).map((p) => `<p class="muted">${esc(p.summary || "")}</p>`).join("")}
        </details>`).join("")}`);
  }
  if (model.abstentions.length) {
    sections.push(`<p class="eyebrow">Not shown today, and why</p>
      <div class="chips">${model.abstentions.map((a) =>
        `<span class="chip">${esc(a.connectorId)}: ${esc((a.gateReasons || [])[0] || "unavailable")}</span>`).join("")}</div>`);
  }
  if (model.editorial.length) {
    sections.push(`<p class="eyebrow">Sources shown beside one another (editorial, not a historical claim)</p>
      ${model.editorial.map((j) => `<p class="muted">${esc((j.items || []).join(", "))}</p>`).join("")}`);
  }
  return sections.join("");
}

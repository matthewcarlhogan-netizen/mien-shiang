/*
 * Pure view-model tests for src/ui/qise/heritage-view.js — the reader-facing
 * reduction of Stage 3 connector material. No DOM.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  humanizeRelationshipType, connectorCard, tier2ConnectorModel, tier3ConnectorModel,
  heritageConnectorCardMarkup, heritageConnectorTier2Markup, heritageConnectorTier3Markup,
} from "../../src/ui/qise/heritage-view.js";
import {
  tierTwoHeritageConnections, tierThreeHeritageConnections, deriveTier2FromComposition,
} from "../../src/qise/heritage-connections.js";
import { deriveReadingState } from "../../src/qise/reading-state.js";
import { composeReading } from "../../src/qise/reflection.js";

const SOURCE_REGISTRY = Object.freeze({
  "synthetic-source": Object.freeze({ title: "Synthetic Source Title" }),
});

const entry = (overrides = {}) => ({
  connectorId: "syn-connector",
  relationshipType: "CORRESPONDS_TO",
  participants: [
    { participantId: "fiveMountains", nodeType: "CONSTRUCT", constructId: "fiveMountains" },
    { participantId: "fourRivers", nodeType: "CONSTRUCT", constructId: "fourRivers" },
  ],
  sourceId: "synthetic-source",
  sectionLocator: "juan 2",
  disposition: "ACTIVE",
  prohibitedForUserInference: true,
  ...overrides,
});

function makeReflection(stateOverrides = {}, occurrence = 0) {
  const state = deriveReadingState({ heritageConstruct: "fourRivers", sourceLineage: "primary", ...stateOverrides });
  return { state, composed: composeReading(state, { occurrence }), occurrence };
}

/* ── humanizeRelationshipType: mechanical, invents nothing ───────────────── */

test("humanizeRelationshipType lowercases and spaces the enum, nothing else", () => {
  assert.equal(humanizeRelationshipType("CORRESPONDS_TO"), "corresponds to");
  assert.equal(humanizeRelationshipType("COLLECTIVE_RULE"), "collective rule");
  assert.equal(humanizeRelationshipType(null), "");
  assert.equal(humanizeRelationshipType(undefined), "");
});

/* ── connectorCard: only already-recorded fields, nothing invented ───────── */

test("connectorCard reduces a connector entry to display-safe fields, resolving sourceId against the registry", () => {
  const card = connectorCard(entry(), SOURCE_REGISTRY);
  assert.equal(card.connectorId, "syn-connector");
  assert.equal(card.relationshipLabel, "corresponds to");
  assert.deepEqual(card.constructLabels, ["Five Mountains", "Four Rivers"]);
  assert.equal(card.sourceTitle, "Synthetic Source Title");
  assert.equal(card.sectionLocator, "juan 2");
  assert.equal(card.prohibitedForUserInference, true);
});

test("connectorCard returns null for a null entry, and null sourceTitle for an unresolvable sourceId", () => {
  assert.equal(connectorCard(null), null);
  const card = connectorCard(entry({ sourceId: "unknown-source" }), SOURCE_REGISTRY);
  assert.equal(card.sourceTitle, null);
});

test("connectorCard never carries audit-only fields (conditionResolution, gateReasons)", () => {
  const card = connectorCard(entry({ conditionResolution: { satisfied: true }, gateReasons: ["X"] }), SOURCE_REGISTRY);
  assert.equal("conditionResolution" in card, false);
  assert.equal("gateReasons" in card, false);
});

/* ── A: Tier 2 renders the one eligible connector's bounded content ──────── */

test("A: tier2ConnectorModel emits the selected connector's bounded reader-facing content, attribution and disclosure", () => {
  const tier2Connectors = {
    available: true,
    reason: null,
    connector: entry(),
    disagreements: [],
    rotationDisclosure: "Today's passage comes from the rotation through the traditional systems, not from anything the app measured.",
    occurrence: 0,
  };
  const model = tier2ConnectorModel(tier2Connectors, SOURCE_REGISTRY);
  assert.equal(model.available, true);
  assert.equal(model.card.connectorId, "syn-connector");
  assert.equal(model.card.sourceTitle, "Synthetic Source Title");
  assert.equal(typeof model.rotationDisclosure, "string");
  assert.ok(model.rotationDisclosure.length > 0);
});

/* ── B: SOURCE_PANEL_CEILING never leaks into Tier 2 ──────────────────────── */

test("B: tier2ConnectorModel never surfaces sourcePanelOnly content — the field does not exist on tier2.connectors at all", () => {
  // tier2.connectors (deriveTier2FromComposition's output shape) has no
  // sourcePanelOnly field to begin with; this proves tier2ConnectorModel
  // does not go looking for one on some other object shape.
  const tier2Connectors = {
    available: false, reason: "NO_ACTIVE_CONNECTOR", connector: null,
    disagreements: [], rotationDisclosure: null, occurrence: 0,
    sourcePanelOnly: [entry({ connectorId: "ceilinged", disposition: "SOURCE_PANEL_CEILING" })],
  };
  const model = tier2ConnectorModel(tier2Connectors, SOURCE_REGISTRY);
  assert.equal(model.available, false);
  assert.equal(model.card, null);
  assert.equal(JSON.stringify(model).includes("ceilinged"), false);
});

test("B (end-to-end, real corpus): the real fiveMountains/primary Tier 2 output — LINEAGE_RESEARCH_ONLY-blocked today — never renders a card", () => {
  const reflection = makeReflection({ heritageConstruct: "fiveMountains", sourceLineage: "primary" });
  const tier2Connectors = tierTwoHeritageConnections(reflection, { captureQualityPassed: true, safetyPassed: true });
  const model = tier2ConnectorModel(tier2Connectors);
  assert.equal(model.available, false);
  assert.equal(model.card, null);
});

/* ── C: Tier 3 surfaces source-panel/disagreement/abstention structures ──── */

test("C: tier3ConnectorModel surfaces active, sourcePanelOnly, disagreements and abstentions as structured, reduced entries", () => {
  const tier3Connectors = {
    suppressed: false, abstained: false,
    active: [entry({ connectorId: "active-1" })],
    sourcePanelOnly: [entry({ connectorId: "ceilinged-1", disposition: "SOURCE_PANEL_CEILING" })],
    disagreements: [{ disagreementId: "d-1", target: { targetType: "CONSTRUCT", targetRef: "fourRivers" }, positions: [] }],
    abstentions: [{ connectorId: "blocked-1", disposition: "LINEAGE_RESEARCH_ONLY", prohibitedForUserInference: true, gateReasons: ["LINEAGE_RESEARCH_ONLY"] }],
    editorialJuxtapositions: [],
  };
  const model = tier3ConnectorModel(tier3Connectors, SOURCE_REGISTRY);
  assert.equal(model.active.length, 1);
  assert.equal(model.active[0].connectorId, "active-1");
  assert.equal(model.sourcePanelOnly.length, 1);
  assert.equal(model.sourcePanelOnly[0].connectorId, "ceilinged-1");
  assert.equal(model.disagreements.length, 1);
  assert.equal(model.abstentions.length, 1);
  assert.equal(model.abstentions[0].connectorId, "blocked-1");
});

test("C (end-to-end, real corpus): the real fiveMountains/primary Tier 3 output reaches the LINEAGE_RESEARCH_ONLY abstention in the view model", () => {
  const reflection = makeReflection({ heritageConstruct: "fiveMountains", sourceLineage: "primary" });
  const tier3Connectors = tierThreeHeritageConnections(reflection, { captureQualityPassed: true, safetyPassed: true });
  const model = tier3ConnectorModel(tier3Connectors);
  assert.equal(model.suppressed, false);
  assert.equal(model.active.some((c) => c.connectorId === "five-mountains-mutual-facing-fullness"), false);
  assert.equal(model.sourcePanelOnly.some((c) => c.connectorId === "five-mountains-mutual-facing-fullness"), false);
  const blocked = model.abstentions.find((e) => e.connectorId === "five-mountains-mutual-facing-fullness");
  assert.ok(blocked, "the connector must still be reachable in Tier 3's structured abstentions");
  assert.equal(blocked.gateReasons[0], "LINEAGE_RESEARCH_ONLY");
});

/* ── D: fail-closed safety — UNKNOWN/missing suppresses both tiers' models ── */

test("D: missing/UNKNOWN safety authorization suppresses tier2ConnectorModel — no card rendered", () => {
  const reflection = makeReflection();
  const tier2Connectors = tierTwoHeritageConnections(reflection, { captureQualityPassed: true });
  const model = tier2ConnectorModel(tier2Connectors);
  assert.equal(model.available, false);
  assert.equal(model.card, null);
  assert.equal(model.reason, "SAFETY_GATE_UNKNOWN");
});

test("D: missing/UNKNOWN safety authorization suppresses tier3ConnectorModel — no active/sourcePanelOnly content", () => {
  const reflection = makeReflection();
  const tier3Connectors = tierThreeHeritageConnections(reflection, { captureQualityPassed: true });
  const model = tier3ConnectorModel(tier3Connectors);
  assert.equal(model.suppressed, true);
  assert.equal(model.reason, "SAFETY_GATE_UNKNOWN");
  assert.deepEqual(model.active, []);
  assert.deepEqual(model.sourcePanelOnly, []);
});

test("D: an explicitly FAILED safety gate suppresses both view models identically to UNKNOWN, with a distinct reason", () => {
  const reflection = makeReflection();
  const tier2 = tier2ConnectorModel(tierTwoHeritageConnections(reflection, { captureQualityPassed: true, safetyPassed: false }));
  const tier3 = tier3ConnectorModel(tierThreeHeritageConnections(reflection, { captureQualityPassed: true, safetyPassed: false }));
  assert.equal(tier2.available, false);
  assert.equal(tier2.reason, "SAFETY_GATE_FAILED");
  assert.equal(tier3.suppressed, true);
  assert.equal(tier3.reason, "SAFETY_GATE_FAILED");
});

/* ── E: heritage view models never touch or replace measurement output ───── */

test("E: building a connector view model is pure and cannot be observed to mutate its input", () => {
  const tier2Connectors = {
    available: true, reason: null, connector: entry(), disagreements: [],
    rotationDisclosure: "x", occurrence: 0,
  };
  const before = JSON.stringify(tier2Connectors);
  tier2ConnectorModel(tier2Connectors, SOURCE_REGISTRY);
  assert.equal(JSON.stringify(tier2Connectors), before);
});

/*
 * ── MARKUP: the actual functions src/ui/qise/app.js calls and assigns to
 *    innerHTML — the real reader-facing production render path. Testing only
 *    the MODEL (above) would leave the actual HTML-string-producing code
 *    unproven; these functions are exactly what app.js injects into the DOM,
 *    moved here (from app.js, which nothing can import — CLAUDE.md item 44)
 *    specifically so they are directly testable rather than provable only by
 *    a source-text grep. See "src/ui/qise/app.js actually renders..." in
 *    tests/qise/heritage-connections.test.js for the proof app.js calls
 *    THESE functions and assigns their return value into the DOM.
 */

/* ── A: Tier 2 emits the selected connector's bounded content ────────────── */

test("A: heritageConnectorTier2Markup renders the card's constructs, relationship, citation and rotation disclosure", () => {
  const model = tier2ConnectorModel({
    available: true, reason: null, connector: entry(), disagreements: [],
    rotationDisclosure: "Today's passage comes from the rotation through the traditional systems, not from anything the app measured.",
    occurrence: 0,
  }, SOURCE_REGISTRY);
  const html = heritageConnectorTier2Markup(model);
  assert.match(html, /Five Mountains/);
  assert.match(html, /Four Rivers/);
  assert.match(html, /corresponds to/);
  assert.match(html, /Synthetic Source Title/);
  assert.match(html, /juan 2/);
  assert.match(html, /passage comes from the rotation/);
});

test("A: heritageConnectorTier2Markup renders nothing (empty string) when no connector is available — never a placeholder implying one exists", () => {
  const model = tier2ConnectorModel({ available: false, reason: "NO_ACTIVE_CONNECTOR", connector: null, disagreements: [], rotationDisclosure: null, occurrence: 0 });
  assert.equal(heritageConnectorTier2Markup(model), "");
});

/* ── B: SOURCE_PANEL_CEILING content cannot appear in Tier 2's markup ────── */

test("B: heritageConnectorTier2Markup never mentions a SOURCE_PANEL_CEILING connector, even if one is smuggled onto the raw tier2.connectors object", () => {
  const tier2Connectors = {
    available: true, reason: null, connector: entry({ connectorId: "the-selected-one" }),
    disagreements: [], rotationDisclosure: "x", occurrence: 0,
    // Not a real field on deriveTier2FromComposition's output — proves the
    // markup path structurally cannot read it even if it were present.
    sourcePanelOnly: [entry({ connectorId: "ceilinged-connector-id", disposition: "SOURCE_PANEL_CEILING" })],
  };
  const html = heritageConnectorTier2Markup(tier2ConnectorModel(tier2Connectors, SOURCE_REGISTRY));
  assert.match(html, /the-selected-one|Five Mountains/);
  assert.equal(html.includes("ceilinged-connector-id"), false);
  assert.equal(html.includes("SOURCE_PANEL_CEILING"), false);
});

/* ── C: Tier 3's markup reaches source-panel/disagreement/abstention material ── */

test("C: heritageConnectorTier3Markup renders active, source-panel-only (clearly labelled), disagreements and abstentions", () => {
  const model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [entry({ connectorId: "active-1" })],
    sourcePanelOnly: [entry({ connectorId: "ceilinged-1", disposition: "SOURCE_PANEL_CEILING" })],
    disagreements: [{ disagreementId: "d-1", target: { targetType: "CONSTRUCT", targetRef: "fourRivers" }, positions: [{ summary: "Position A" }] }],
    abstentions: [{ connectorId: "blocked-1", disposition: "LINEAGE_RESEARCH_ONLY", prohibitedForUserInference: true, gateReasons: ["LINEAGE_RESEARCH_ONLY"] }],
    editorialJuxtapositions: [{ policyId: "p-1", items: ["active-1", "ceilinged-1"], historicalRelationshipAsserted: false, disclosure: "SOURCES_SHOWN_BESIDE_ONE_ANOTHER" }],
  }, SOURCE_REGISTRY);
  const html = heritageConnectorTier3Markup(model);
  assert.match(html, /attested/i);
  assert.match(html, /source-panel only/i);
  assert.match(html, /not shown in the daily reading/i);
  assert.match(html, /Position A/);
  assert.match(html, /blocked-1/);
  assert.match(html, /LINEAGE_RESEARCH_ONLY/);
  assert.match(html, /editorial, not a historical claim/i);
});

test("C: heritageConnectorTier3Markup omits a section entirely when its list is empty, rather than rendering an empty heading", () => {
  const model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], sourcePanelOnly: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
  }, SOURCE_REGISTRY);
  assert.equal(heritageConnectorTier3Markup(model), "");
});

/* ── D: fail-closed safety suppresses the markup output entirely ─────────── */

test("D: both markup functions render nothing (not an empty section, not a placeholder) when the underlying model is suppressed/abstained", () => {
  const suppressedTier2 = tier2ConnectorModel({ available: false, reason: "SAFETY_GATE_UNKNOWN", connector: null, disagreements: [], rotationDisclosure: null, occurrence: 0 });
  const suppressedTier3 = tier3ConnectorModel({ suppressed: true, suppressionReason: "SAFETY_GATE_UNKNOWN" });
  assert.equal(heritageConnectorTier2Markup(suppressedTier2), "");
  assert.equal(heritageConnectorTier3Markup(suppressedTier3), "");
});

test("D: end-to-end through the real Stage 3 path — missing safetyPassed produces empty markup for both tiers", () => {
  const reflection = makeReflection({ heritageConstruct: "fourRivers", sourceLineage: "primary" });
  const tier2Connectors = tierTwoHeritageConnections(reflection, { captureQualityPassed: true });
  const tier3Connectors = tierThreeHeritageConnections(reflection, { captureQualityPassed: true });
  assert.equal(heritageConnectorTier2Markup(tier2ConnectorModel(tier2Connectors)), "");
  assert.equal(heritageConnectorTier3Markup(tier3ConnectorModel(tier3Connectors)), "");
});

/* ── E: the markup functions cannot touch or require Tier 1 measurement data ── */

test("E: the markup functions' entire signature is the connector view model — they cannot read or require compass/metrics/confidence", () => {
  assert.equal(heritageConnectorTier2Markup.length, 1);
  assert.equal(heritageConnectorTier3Markup.length, 1);
  assert.equal(heritageConnectorCardMarkup.length, 1);
  // A model carrying extra Tier-1-shaped fields renders identically to one
  // without them — the functions read only their own documented shape.
  const model = tier2ConnectorModel({
    available: true, reason: null, connector: entry(), disagreements: [],
    rotationDisclosure: "x", occurrence: 0,
  }, SOURCE_REGISTRY);
  const withExtraMeasurement = { ...model, compass: { ascendant: "chi", magnitude: 9 }, metrics: { ming: 1 } };
  assert.equal(heritageConnectorTier2Markup(model), heritageConnectorTier2Markup(withExtraMeasurement));
});

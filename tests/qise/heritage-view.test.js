/*
 * Pure view-model tests for src/ui/qise/heritage-view.js — the reader-facing
 * reduction of Stage 3 connector material. No DOM.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  humanizeRelationshipType, connectorCard, connectorEvidenceCard,
  tier2ConnectorModel, tier3ConnectorModel,
  heritageConnectorCardMarkup, heritageConnectorTier2Markup, heritageConnectorTier3Markup,
} from "../../src/ui/qise/heritage-view.js";
import {
  tierTwoHeritageConnections, tierThreeHeritageConnections, deriveTier2FromComposition,
} from "../../src/qise/heritage-connections.js";
import { deriveReadingState } from "../../src/qise/reading-state.js";
import { composeReading } from "../../src/qise/reflection.js";
import {
  HERITAGE_REGISTRY, HERITAGE_CONNECTOR_REGISTRY, HERITAGE_DISAGREEMENT_REGISTRY,
} from "../../src/heritage/registry.js";
import { HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY } from "../../src/heritage/negative-relationships-registry.js";
import { HERITAGE_COMPOSITION_POLICIES } from "../../src/heritage/composition-policies-registry.js";
import { HERITAGE_CONCEPT_REGISTRY } from "../../src/heritage/concepts.js";
import { SOURCE_REGISTRY as REAL_SOURCE_REGISTRY } from "../../src/reading/provenance.js";
import {
  composeHeritageForReading, composeHeritageConnectionsWithRegistries,
} from "../../src/heritage/composition.js";
import { ROTATION_DISCLOSURE } from "../../src/qise/reflection-corpus.js";

/* Same real-registry base composeHeritageConnectionsWithRegistries() call
 * tests/heritage/composition.test.js uses, so a "real chain" test here means
 * the same thing it means there: the actual resolver + the actual Stage-3
 * mapping, with zero synthetic registry data. */
const realBase = (overrides = {}) => ({
  captureQualityPassed: true,
  safetyPassed: true,
  heritageRegistry: HERITAGE_REGISTRY,
  conceptRegistry: HERITAGE_CONCEPT_REGISTRY,
  connectorRegistry: HERITAGE_CONNECTOR_REGISTRY,
  disagreementRegistry: HERITAGE_DISAGREEMENT_REGISTRY,
  negativeRelationshipRegistry: HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY,
  compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
  sourceRegistry: REAL_SOURCE_REGISTRY,
  depthMode: "SOURCE_DEEP",
  occurrence: 0,
  ...overrides,
});

/* Same three CJK ranges tests/ui-language.test.js uses. Defined once, up
 * top, and reused by every English-only assertion in this file. */
const hasHan = (value) => [...String(value ?? "")].some((character) => {
  const code = character.codePointAt(0);
  return (code >= 0x3400 && code <= 0x4dbf)
    || (code >= 0x4e00 && code <= 0x9fff)
    || (code >= 0xf900 && code <= 0xfaff);
});

const SOURCE_REGISTRY = Object.freeze({
  "synthetic-source": Object.freeze({
    title: "Synthetic Source Title",
    sectionLocator: "juan 2",
    sectionLocatorStatus: "VERIFIED",
    folioLocatorStatus: "NOT_RECORDED",
    citationStatus: "verified",
    authorshipStatus: "ATTRIBUTED",
    sourceAccess: "REFERENCE_ONLY",
  }),
  "synthetic-source-2": Object.freeze({
    title: "Synthetic Source Title 2",
    sectionLocator: "head volume",
    citationStatus: "edition-recorded",
    authorshipStatus: "ATTRIBUTED_AND_CONTESTED",
  }),
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
  assert.deepEqual(card.participants.map((p) => p.label), ["Five Mountains", "Four Rivers"]);
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

/*
 * ── FRESH CODEX FINDINGS AGAINST cb3eaf8 — 8 falsification tests ─────────
 * Each test below is a falsification test for one of the 8 fresh P2
 * findings raised by Codex against commit cb3eaf8's heritage-view.js: it
 * MUST fail against cb3eaf8's implementation (mapping `active` directly
 * instead of following `renderPlan.relationshipOrder`; filtering
 * participants to `nodeType === "CONSTRUCT"`; always joining participants
 * with an unconditional "↔"; dropping disagreement positions to their bare
 * `summary`; rendering editorial `items` as bare connector-id strings;
 * describing every source-panel entry with one evidence-ceiling sentence
 * regardless of `disposition`; rendering only `gateReasons[0]`; and
 * `connectorCard` dropping evidence/provenance fields entirely so Tier 3
 * had nothing to preserve) and pass against the fix above.
 */

/* ── 1: Tier 3's ACTIVE order follows renderPlan.relationshipOrder, matching Tier 2's pick ── */

test("1: tier3ConnectorModel orders ACTIVE cards by renderPlan.relationshipOrder, not by stable connectorId order", () => {
  const tier3Connectors = {
    suppressed: false, abstained: false,
    // Stable connectorId order (what the resolver's `active` array is always
    // in) puts "connector-a" first, alphabetically ahead of "connector-b".
    active: [
      entry({ connectorId: "connector-a" }),
      entry({ connectorId: "connector-b" }),
    ],
    sourcePanelOnly: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
    // The resolver's own rotated presentation order (what Tier 2's pick,
    // renderPlan.relationshipOrder[0], is drawn from) puts "connector-b" first.
    renderPlan: { relationshipOrder: ["connector-b", "connector-a"] },
  };
  const tier2Pick = tier3Connectors.renderPlan.relationshipOrder[0];
  const model = tier3ConnectorModel(tier3Connectors, SOURCE_REGISTRY);
  assert.equal(model.active[0].connectorId, tier2Pick,
    "Tier 3's first displayed ACTIVE connector must be the same one Tier 2 selected for this reading");
  assert.equal(model.active[1].connectorId, "connector-a");
});

/* ── 2a: every supported participant type survives, not only CONSTRUCT ── */

test("2a: connectorCard preserves HERITAGE_CONCEPT, CONSTITUENT and RELATED_SYSTEM participants, not only CONSTRUCT", () => {
  const mixed = entry({
    connectorId: "mixed-participants",
    participants: [
      { participantId: "fourRivers", nodeType: "CONSTRUCT", constructId: "fourRivers" },
      { participantId: "shen", nodeType: "HERITAGE_CONCEPT", conceptId: "shen" },
      { participantId: "someConstituent", nodeType: "CONSTITUENT", constituentId: "someConstituent" },
      { participantId: "five-phases", nodeType: "RELATED_SYSTEM", relatedSystemId: "five-phases" },
    ],
  });
  const card = connectorCard(mixed, SOURCE_REGISTRY);
  assert.equal(card.participants.length, 4, "all four declared participants must survive the reduction");
  const nodeTypes = card.participants.map((p) => p.nodeType);
  assert.deepEqual(nodeTypes, ["CONSTRUCT", "HERITAGE_CONCEPT", "CONSTITUENT", "RELATED_SYSTEM"]);
  // HERITAGE_CONCEPT has no English label registry in Stage 1 (its only
  // other recorded field is Chinese-language canonicalChineseName, which
  // this file deliberately never reads — see heritage-view.js's file
  // header) — the concept's own recorded id is shown as-is.
  const shen = card.participants.find((p) => p.participantId === "shen");
  assert.equal(shen.label, "shen");
  // CONSTITUENT/RELATED_SYSTEM have no label registry in Stage 1 — the
  // recorded id is shown as-is rather than an invented paraphrase.
  const constituent = card.participants.find((p) => p.participantId === "someConstituent");
  assert.equal(constituent.label, "someConstituent");
  const relatedSystem = card.participants.find((p) => p.participantId === "five-phases");
  assert.equal(relatedSystem.label, "five-phases");
});

test("2a (real corpus): a mixed CONSTRUCT/HERITAGE_CONCEPT connector from the real registry keeps every participant", () => {
  const real = HERITAGE_CONNECTOR_REGISTRY["heritage-qise-modifies-form-shen-mountains-rivers"];
  assert.ok(real, "the real registry connector this test targets must exist");
  const card = connectorCard(real);
  // 5 declared participants: heritageQiSe, form, shen (HERITAGE_CONCEPT) + fiveMountains, fourRivers (CONSTRUCT).
  assert.equal(card.participants.length, real.participants.length);
  assert.equal(card.participants.length, 5);
  assert.ok(card.participants.some((p) => p.participantId === "shen" && p.nodeType === "HERITAGE_CONCEPT"));
  assert.ok(card.participants.some((p) => p.participantId === "form" && p.nodeType === "HERITAGE_CONCEPT"));
});

/* ── 2b: DIRECTED/ORDERED relationships are not flattened to a symmetric ↔ ── */

test("2b: heritageConnectorCardMarkup renders a DIRECTED connector as from → to, never as ↔", () => {
  const directed = entry({
    connectorId: "directed-connector",
    relationshipDirection: { kind: "DIRECTED", from: ["fourRivers"], to: ["fiveMountains"] },
    participants: [
      { participantId: "fourRivers", nodeType: "CONSTRUCT", constructId: "fourRivers" },
      { participantId: "fiveMountains", nodeType: "CONSTRUCT", constructId: "fiveMountains" },
    ],
  });
  const html = heritageConnectorCardMarkup(connectorCard(directed, SOURCE_REGISTRY));
  assert.equal(html.includes("↔"), false, "a DIRECTED relationship must not render the symmetric ↔ separator");
  assert.match(html, /Four Rivers[^]*→[^]*Five Mountains/);
});

test("2b: an UNDIRECTED connector still renders the symmetric ↔ (negative control — direction handling did not remove the symmetric case)", () => {
  const undirected = entry({ relationshipDirection: { kind: "UNDIRECTED" } });
  const html = heritageConnectorCardMarkup(connectorCard(undirected, SOURCE_REGISTRY));
  assert.match(html, /↔/);
});

test("2b (real corpus): the real DIRECTED connector shen-requires-form renders shen → form, not shen ↔ form", () => {
  const real = HERITAGE_CONNECTOR_REGISTRY["shen-requires-form"];
  assert.ok(real, "the real registry connector this test targets must exist");
  assert.equal(real.relationshipDirection.kind, "DIRECTED");
  const html = heritageConnectorCardMarkup(connectorCard(real));
  assert.equal(html.includes("↔"), false);
  assert.match(html, /→/);
});

/* ── 3: every disagreement position is attributed to its own source ── */

test("3: tier3ConnectorModel resolves each disagreement position's sourceId to its own source title", () => {
  const tier3Connectors = {
    suppressed: false, abstained: false,
    active: [], sourcePanelOnly: [], abstentions: [], editorialJuxtapositions: [],
    disagreements: [{
      disagreementId: "four-rivers-eye-mouth",
      target: { targetType: "CONSTRUCT", targetRef: "fourRivers" },
      positions: [
        { positionId: "primary", sourceId: "synthetic-source", summary: "Primary position" },
        { positionId: "variant", sourceId: "synthetic-source-2", summary: "Variant position" },
      ],
    }],
  };
  const model = tier3ConnectorModel(tier3Connectors, SOURCE_REGISTRY);
  const [primary, variant] = model.disagreements[0].positions;
  assert.equal(primary.sourceTitle, "Synthetic Source Title");
  assert.equal(variant.sourceTitle, "Synthetic Source Title 2");
  assert.notEqual(primary.sourceTitle, variant.sourceTitle,
    "two positions on the same disagreement must not be attributed to the same source");

  const html = heritageConnectorTier3Markup(model);
  assert.match(html, /Synthetic Source Title(?!\s*2)/);
  assert.match(html, /Synthetic Source Title 2/);
});

/* ── 4: editorial juxtapositions resolve every referenced connector, not bare ids ── */

test("4: tier3ConnectorModel resolves each editorial item to its own connector card, not a bare id", () => {
  const tier3Connectors = {
    suppressed: false, abstained: false,
    active: [entry({ connectorId: "active-1", sourceId: "synthetic-source" })],
    sourcePanelOnly: [entry({ connectorId: "ceilinged-1", sourceId: "synthetic-source-2", disposition: "SOURCE_PANEL_CEILING" })],
    disagreements: [], abstentions: [],
    editorialJuxtapositions: [{
      policyId: "p-1", items: ["active-1", "ceilinged-1"],
      historicalRelationshipAsserted: false, requiresSeparateAttribution: true,
      disclosure: "SOURCES_SHOWN_BESIDE_ONE_ANOTHER",
    }],
  };
  const model = tier3ConnectorModel(tier3Connectors, SOURCE_REGISTRY);
  const items = model.editorial[0].items;
  assert.equal(items.length, 2);
  assert.equal(items[0].connectorId, "active-1");
  assert.equal(items[0].sourceTitle, "Synthetic Source Title");
  assert.equal(items[1].connectorId, "ceilinged-1");
  assert.equal(items[1].sourceTitle, "Synthetic Source Title 2");

  const html = heritageConnectorTier3Markup(model);
  assert.match(html, /Synthetic Source Title(?!\s*2)/);
  assert.match(html, /Synthetic Source Title 2/);
  assert.equal(html.includes("active-1, ceilinged-1"), false,
    "editorial items must not render as a bare, unattributed id list");
});

/* ── 5: SOURCE_PANEL (policy) reads differently from SOURCE_PANEL_CEILING (evidence) ── */

test("5: a policy-restricted SOURCE_PANEL entry is worded as a standing restriction, never as an evidence backlog", () => {
  const model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
    sourcePanelOnly: [entry({
      connectorId: "five-officers-one-good-office-ten-years", disposition: "SOURCE_PANEL",
    })],
  }, SOURCE_REGISTRY);
  const html = heritageConnectorTier3Markup(model);
  assert.match(html, /policy/i);
  assert.equal(/evidentiary standing has not yet cleared/i.test(html), false,
    "a permanent policy restriction must not be worded as evidence pending review");
});

test("5: a SOURCE_PANEL_CEILING entry keeps the evidence-ceiling wording (negative control)", () => {
  const model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
    sourcePanelOnly: [entry({ connectorId: "ceilinged-1", disposition: "SOURCE_PANEL_CEILING" })],
  }, SOURCE_REGISTRY);
  const html = heritageConnectorTier3Markup(model);
  assert.match(html, /evidentiary standing has not yet cleared/i);
});

/* ── 6: every abstention gate reason survives, not only gateReasons[0] ── */

test("6: heritageConnectorTier3Markup renders every gate reason, not only the first", () => {
  const model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], sourcePanelOnly: [], disagreements: [], editorialJuxtapositions: [],
    abstentions: [{
      connectorId: "blocked-1", disposition: "PARTICIPANT_ABSENT",
      prohibitedForUserInference: true,
      gateReasons: ["PARTICIPANT_ABSENT", "LINEAGE_RESEARCH_ONLY"],
    }],
  }, SOURCE_REGISTRY);
  const html = heritageConnectorTier3Markup(model);
  assert.match(html, /PARTICIPANT_ABSENT/);
  assert.match(html, /LINEAGE_RESEARCH_ONLY/,
    "a second, simultaneously-true gate reason must not be discarded");
});

/* ── 7: evidence/provenance status is preserved for Tier 3, and stays absent from Tier 2 ── */

test("7: connectorEvidenceCard preserves evidenceStrength, textualLayer and the source's locator/citation/authorship/access status", () => {
  const withEvidence = entry({
    connectorId: "ceilinged-1",
    disposition: "SOURCE_PANEL_CEILING",
    evidenceStrength: "RECORDED_NOT_VERIFIED",
    textualLayer: "COMMENTARY",
    folioLocator: "folio 12",
    sourceId: "synthetic-source",
  });
  const card = connectorEvidenceCard(withEvidence, SOURCE_REGISTRY);
  assert.equal(card.evidenceStrength, "RECORDED_NOT_VERIFIED");
  assert.equal(card.textualLayer, "COMMENTARY");
  assert.equal(card.folioLocator, "folio 12");
  assert.equal(card.sectionLocatorStatus, "VERIFIED");
  assert.equal(card.citationStatus, "verified");
  assert.equal(card.authorshipStatus, "ATTRIBUTED");
  assert.equal(card.sourceAccess, "REFERENCE_ONLY");
});

test("7: tier3ConnectorModel's sourcePanelOnly/active cards carry evidence status, and it renders in Tier 3's markup", () => {
  const tier3Connectors = {
    suppressed: false, abstained: false,
    active: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
    sourcePanelOnly: [entry({
      connectorId: "ceilinged-1", disposition: "SOURCE_PANEL_CEILING",
      evidenceStrength: "RECORDED_NOT_VERIFIED", sourceId: "synthetic-source",
    })],
  };
  const model = tier3ConnectorModel(tier3Connectors, SOURCE_REGISTRY);
  assert.equal(model.sourcePanelOnly[0].evidenceStrength, "RECORDED_NOT_VERIFIED");
  const html = heritageConnectorTier3Markup(model);
  assert.match(html, /recorded not verified/i);
});

test("7: Tier 2 stays bounded — its card never carries evidenceStrength/textualLayer/citationStatus, even for the same connector", () => {
  const tier2Connectors = {
    available: true, reason: null,
    connector: entry({ evidenceStrength: "RECORDED_NOT_VERIFIED", textualLayer: "COMMENTARY", sourceId: "synthetic-source" }),
    disagreements: [], rotationDisclosure: "x", occurrence: 0,
  };
  const model = tier2ConnectorModel(tier2Connectors, SOURCE_REGISTRY);
  assert.equal("evidenceStrength" in model.card, false);
  assert.equal("textualLayer" in model.card, false);
  assert.equal("citationStatus" in model.card, false);
  const html = heritageConnectorTier2Markup(model);
  assert.equal(/recorded not verified/i.test(html), false);
});

/* ── 8: locked invariants this pass must not disturb ─────────────────────── */

test("8: SOURCE_PANEL_CEILING still cannot leak into Tier 2 after the evidence-card change", () => {
  const tier2Connectors = {
    available: false, reason: "NO_ACTIVE_CONNECTOR", connector: null,
    disagreements: [], rotationDisclosure: null, occurrence: 0,
    sourcePanelOnly: [entry({ connectorId: "ceilinged", disposition: "SOURCE_PANEL_CEILING", evidenceStrength: "RECORDED_NOT_VERIFIED" })],
  };
  const model = tier2ConnectorModel(tier2Connectors, SOURCE_REGISTRY);
  assert.equal(model.available, false);
  assert.equal(model.card, null);
  assert.equal(JSON.stringify(model).includes("ceilinged"), false);
});

test("8: safety UNKNOWN still renders no connector heritage at all after the reordering/attribution changes", () => {
  const reflection = makeReflection();
  const tier2Connectors = tierTwoHeritageConnections(reflection, { captureQualityPassed: true });
  const tier3Connectors = tierThreeHeritageConnections(reflection, { captureQualityPassed: true });
  assert.equal(heritageConnectorTier2Markup(tier2ConnectorModel(tier2Connectors)), "");
  assert.equal(heritageConnectorTier3Markup(tier3ConnectorModel(tier3Connectors)), "");
});

test("8: Tier-1 Qi Se measurement fields still cannot affect the connector markup output", () => {
  const model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [entry({ connectorId: "active-1" })],
    sourcePanelOnly: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
  }, SOURCE_REGISTRY);
  const withExtraMeasurement = { ...model, compass: { ascendant: "chi", magnitude: 9 }, metrics: { ming: 1 } };
  assert.equal(heritageConnectorTier3Markup(model), heritageConnectorTier3Markup(withExtraMeasurement));
});

test("2a: preserving HERITAGE_CONCEPT participants does not leak Chinese-language canonicalChineseName into reader-facing markup (tests/ui-language.test.js's guard does not scan this file, so this file must guard itself)", () => {
  const mixed = entry({
    connectorId: "mixed-participants",
    participants: [
      { participantId: "shen", nodeType: "HERITAGE_CONCEPT", conceptId: "shen" },
      { participantId: "form", nodeType: "HERITAGE_CONCEPT", conceptId: "form" },
      { participantId: "heritageQiSe", nodeType: "HERITAGE_CONCEPT", conceptId: "heritageQiSe" },
    ],
  });
  const card = connectorCard(mixed, SOURCE_REGISTRY);
  assert.equal(hasHan(JSON.stringify(card)), false, "connectorCard output must be English-only");
  const html = heritageConnectorCardMarkup(card);
  assert.equal(hasHan(html), false, "reader-facing markup must be English-only");
});

/* ── 9: connector-level locator status is the CONNECTOR's own, not the source's ── */

test("9 (real corpus): connectorEvidenceCard reads sectionLocatorStatus from the connector entry, and does not upgrade it to the source's stronger status", () => {
  const real = HERITAGE_CONNECTOR_REGISTRY["five-forms-generative-overcoming-system"];
  assert.ok(real, "the real registry connector this test targets must exist");
  assert.equal(real.sectionLocatorStatus, "RECORDED",
    "fixture assumption: the connector itself records RECORDED, not VERIFIED");
  const source = REAL_SOURCE_REGISTRY[real.sourceId];
  assert.ok(source, "the connector's cited source record must exist");
  assert.equal(source.sectionLocatorStatus, "VERIFIED",
    "fixture assumption: the source record is stronger than the connector's own status — " +
    "this is what makes the test meaningful, not a coincidence of equal values");

  const card = connectorEvidenceCard(real, REAL_SOURCE_REGISTRY);
  assert.equal(card.sectionLocatorStatus, "RECORDED",
    "the connector's own weaker locator status must survive, not be upgraded to the source's VERIFIED");
});

test("9: a connector with no locator status of its own still falls back to the source's status (negative control — the fallback path still works)", () => {
  const withoutOwnStatus = entry({ connectorId: "no-own-status", sourceId: "synthetic-source" });
  assert.equal("sectionLocatorStatus" in withoutOwnStatus, false);
  const card = connectorEvidenceCard(withoutOwnStatus, SOURCE_REGISTRY);
  assert.equal(card.sectionLocatorStatus, "VERIFIED",
    "with no connector-specific status recorded, the source's status is the only one available");
});

test("9: tier3ConnectorModel's active cards carry the connector-specific sectionLocatorStatus through to the reduced model", () => {
  const tier3Connectors = {
    suppressed: false, abstained: false,
    active: [entry({ connectorId: "weak-locator", sourceId: "synthetic-source", sectionLocatorStatus: "RECORDED" })],
    sourcePanelOnly: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
  };
  const model = tier3ConnectorModel(tier3Connectors, SOURCE_REGISTRY);
  assert.equal(model.active[0].sectionLocatorStatus, "RECORDED",
    "SOURCE_REGISTRY's synthetic-source is VERIFIED — the connector's own RECORDED must not be lost in the reduction");
});

/* ── 10: each disagreement position renders its OWN citationStatus, not a shared one ── */

test("10 (real corpus): heritageConnectorTier3Markup renders each three-sections-boundaries position's own, distinct citationStatus", () => {
  const real = HERITAGE_DISAGREEMENT_REGISTRY["three-sections-boundaries"];
  assert.ok(real, "the real registry disagreement this test targets must exist");
  assert.ok(real.positions.length >= 3, "fixture assumption: several positions, spanning several statuses");

  const model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], sourcePanelOnly: [], abstentions: [], editorialJuxtapositions: [],
    disagreements: [real],
  }, REAL_SOURCE_REGISTRY);

  const statuses = model.disagreements[0].positions.map((p) => p.citationStatus);
  // Fixture assumption: this disagreement spans materially different evidence
  // status, which is the entire point of showing it per-position rather than
  // once for the disagreement.
  assert.ok(statuses.includes("edition-recorded"), "expected an edition-recorded position");
  assert.ok(statuses.includes("source-required"), "expected a source-required position");
  assert.ok(statuses.includes("attribution-contradicted"), "expected an attribution-contradicted position");
  assert.ok(new Set(statuses).size >= 3, "positions must carry genuinely different statuses, not one repeated value");

  const html = heritageConnectorTier3Markup(model);
  assert.match(html, /edition-recorded/, "an edition-recorded position's status must render");
  assert.match(html, /source-required/, "a source-required position's status must render");
  assert.match(html, /attribution-contradicted/, "an attribution-contradicted position's status must render");
});

test("10: two synthetic positions on one disagreement render their own, different citationStatus values (negative control against a shared/blank label)", () => {
  const model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], sourcePanelOnly: [], abstentions: [], editorialJuxtapositions: [],
    disagreements: [{
      disagreementId: "synthetic-status-spread",
      positions: [
        { positionId: "strong", sourceId: "synthetic-source", summary: "Strong-citation position" },
        { positionId: "weak", sourceId: "synthetic-source-2", summary: "Weaker-citation position" },
      ],
    }],
  }, SOURCE_REGISTRY);
  const [strong, weak] = model.disagreements[0].positions;
  assert.equal(strong.citationStatus, "verified");
  assert.equal(weak.citationStatus, "edition-recorded");
  assert.notEqual(strong.citationStatus, weak.citationStatus);

  const html = heritageConnectorTier3Markup(model);
  assert.match(html, /citation:\s*verified/i);
  assert.match(html, /citation:\s*edition-recorded/i);
});

/* ── 11: connector-specific locator status survives the REAL end-to-end chain ──
 * Round 6's proof called connectorEvidenceCard(rawRegistryEntry) directly,
 * which skips resolver.js's toResolvedEntry() and composition.js's Stage-3
 * mapping entirely — so it could not have caught a regression at either
 * layer. These two tests go through the real chain instead: the actual
 * resolveHeritageConnections() (resolver.js, frozen, untouched) and the
 * actual Stage-3 mapping (composition.js's mapResolverResult(), which now
 * carries sectionLocatorStatus/folioLocatorStatus from the canonical
 * connector registry onto the resolved entry — see that function). */

test("11 (real corpus, real chain): four-rivers-flow-and-banks' sectionLocatorStatus survives resolveHeritageConnections() -> Stage-3 mapping -> tier3ConnectorModel(), through the actual composeHeritageForReading() production entry point, with ZERO registry override", () => {
  const result = composeHeritageForReading({
    captureQualityPassed: true, safetyPassed: true,
    heritageConstruct: "fourRivers", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  assert.equal(result.abstained, false);
  const resolvedEntry = result.sourcePanelOnly.find((e) => e.connectorId === "four-rivers-flow-and-banks");
  assert.ok(resolvedEntry, "the real connector this test targets must be reachable through the real production path");
  assert.equal(resolvedEntry.sectionLocatorStatus, "VERIFIED",
    "the Stage-3 mapping layer must carry the connector's own recorded status onto the resolved entry");

  const model = tier3ConnectorModel(result, REAL_SOURCE_REGISTRY);
  const card = model.sourcePanelOnly.find((c) => c.connectorId === "four-rivers-flow-and-banks");
  assert.ok(card);
  assert.equal(card.sectionLocatorStatus, "VERIFIED");
});

test("11 (real corpus, real chain, disclosed reachability override): five-forms-generative-overcoming-system's own RECORDED sectionLocatorStatus survives the same real chain end-to-end and is NOT upgraded to its source's stronger VERIFIED status", () => {
  const real = HERITAGE_CONNECTOR_REGISTRY["five-forms-generative-overcoming-system"];
  assert.ok(real);
  assert.equal(real.sectionLocatorStatus, "RECORDED");
  const source = REAL_SOURCE_REGISTRY[real.sourceId];
  assert.ok(source);
  assert.equal(source.citationStatus, "verified");
  assert.equal(source.sectionLocatorStatus, "VERIFIED",
    "fixture assumption: the source's status is stronger than the connector's own -- this is what makes the test meaningful, not a coincidence of equal values");

  // This connector's real runtimePolicy is RESEARCH_ONLY, and resolver.js
  // correctly routes RESEARCH_ONLY connectors to abstentions BEFORE any
  // SOURCE_PANEL promotion (resolver.js item 2) -- proven below with ZERO
  // override, through the real, unmodified production path. Abstention
  // cards (composition.js's toAbstention()) never carry locator fields at
  // all, so no real (construct, lineage) pairing today can drive this exact
  // connector into tier3ConnectorModel()'s evidence-card reduction -- a
  // pre-existing, orthogonal fact about this connector's runtime policy,
  // not something this fix touches or needs to touch.
  const realPath = composeHeritageForReading({
    captureQualityPassed: true, safetyPassed: true,
    heritageConstruct: "fiveElements", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  assert.equal(
    realPath.abstentions.some((a) => a.connectorId === "five-forms-generative-overcoming-system" && a.disposition === "RESEARCH_ONLY"),
    true,
    "fixture assumption: through the real, unmodified production path, this connector abstains as RESEARCH_ONLY today, and so cannot demonstrate the locator-status gap via that path alone",
  );

  // So the real chain is exercised through the injectable seam instead --
  // composeHeritageConnectionsWithRegistries, which calls the SAME
  // resolveHeritageConnections() and the SAME mapResolverResult() the
  // production path calls -- with the REAL canonical registries UNCHANGED
  // except one disclosed, single-field override on a CLONE of this ONE
  // connector record: runtimePolicy only, so the record becomes reachable
  // as sourcePanelOnly and can reach an evidence card at all. Every other
  // field on the clone -- including the sectionLocatorStatus under test --
  // stays byte-identical to the real registry entry.
  const reachableConnectorRegistry = Object.freeze({
    ...HERITAGE_CONNECTOR_REGISTRY,
    "five-forms-generative-overcoming-system": Object.freeze({
      ...real,
      runtimePolicy: "HERITAGE_PRESENTATION_ALLOWED",
    }),
  });
  const result = composeHeritageConnectionsWithRegistries(realBase({
    heritageConstruct: "fiveElements", sourceLineage: "primary",
    connectorRegistry: reachableConnectorRegistry,
  }));
  assert.equal(result.abstained, false);
  const resolvedEntry = [...result.active, ...result.sourcePanelOnly]
    .find((e) => e.connectorId === "five-forms-generative-overcoming-system");
  assert.ok(resolvedEntry, "the connector must be reachable once the orthogonal runtimePolicy gate is (disclosedly) lifted");
  assert.equal(resolvedEntry.sectionLocatorStatus, "RECORDED",
    "the connector's own RECORDED status must survive resolveHeritageConnections() -> Stage-3 mapping");

  const model = tier3ConnectorModel(result, REAL_SOURCE_REGISTRY);
  const card = [...model.active, ...model.sourcePanelOnly]
    .find((c) => c.connectorId === "five-forms-generative-overcoming-system");
  assert.ok(card);
  assert.equal(card.sectionLocatorStatus, "RECORDED",
    "end-to-end: the connector's own locator status must not be upgraded to the source's VERIFIED");
  assert.equal(card.citationStatus, "verified",
    "the SOURCE's own citationStatus must remain visible and unmodified alongside the connector-specific status -- both must be true at once");
});

/* ── 12: English-only reader-facing boundary -- real canonical corpus, zero Han ── */

test("12A (real corpus, real chain): four-rivers-flow-and-banks cannot render \u56db\u7006 or any Han character, even though its own sectionLocator carries it", () => {
  const real = HERITAGE_CONNECTOR_REGISTRY["four-rivers-flow-and-banks"];
  assert.ok(real);
  assert.equal(hasHan(real.sectionLocator), true,
    "fixture assumption: the connector's own recorded sectionLocator contains Han -- this is what makes the test meaningful");

  const result = composeHeritageForReading({
    captureQualityPassed: true, safetyPassed: true,
    heritageConstruct: "fourRivers", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  const model = tier3ConnectorModel(result, REAL_SOURCE_REGISTRY);
  const card = model.sourcePanelOnly.find((c) => c.connectorId === "four-rivers-flow-and-banks");
  assert.ok(card);
  assert.equal(hasHan(card.sectionLocator), false, "the card must not carry the raw Han-bearing locator");
  assert.equal(card.sectionLocator, null, "the unsafe field is omitted, not surgically stripped");
  assert.ok(card.sourceTitle, "an English-safe sourceTitle must still be shown");

  const html = heritageConnectorTier3Markup(model);
  assert.equal(html.includes("\u56db\u7006"), false);
  assert.equal(hasHan(html), false, "the rendered markup for this connector must be entirely Han-free");
});

test("12B (real corpus, real chain): three-sections-boundaries cannot render Han from any position's summary, source title or source locator", () => {
  const real = HERITAGE_DISAGREEMENT_REGISTRY["three-sections-boundaries"];
  assert.ok(real);
  const rawPositionsWithHan = real.positions.filter((p) => hasHan(p.summary));
  assert.ok(rawPositionsWithHan.length >= 1,
    "fixture assumption: at least one of this disagreement's raw summaries contains Han -- this is what makes the test meaningful");

  const result = composeHeritageForReading({
    captureQualityPassed: true, safetyPassed: true,
    heritageConstruct: "threeSections", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  const model = tier3ConnectorModel(result, REAL_SOURCE_REGISTRY);
  const disagreement = model.disagreements.find((d) => d.disagreementId === "three-sections-boundaries");
  assert.ok(disagreement);
  for (const p of disagreement.positions) {
    assert.equal(hasHan(p.summary), false, `position ${p.positionId}'s summary must not carry raw Han text`);
    assert.equal(hasHan(p.sourceTitle), false, `position ${p.positionId}'s sourceTitle must not carry raw Han text`);
    assert.equal(hasHan(p.sectionLocator), false, `position ${p.positionId}'s sectionLocator must not carry raw Han text`);
    // Provenance identity must survive even where the free-text summary was
    // omitted -- positionId/sourceId are structurally English-safe and are
    // never Han-filtered themselves.
    assert.ok(p.positionId, "positionId must survive regardless of summary safety");
  }

  const html = heritageConnectorTier3Markup(model);
  assert.equal(hasHan(html), false, "the rendered markup for this disagreement must be entirely Han-free");
  // At least one position's bare positionId must appear in place of its
  // omitted Han-bearing summary, proving the fallback actually fired rather
  // than the position silently vanishing.
  assert.ok(rawPositionsWithHan.some((p) => html.includes(p.positionId)),
    "a position whose summary was omitted must still show its positionId");
});

test("12C (real corpus, real chain, combined): complete Tier-3 connector + disagreement markup built from BOTH canonical entries above contains zero Han characters", () => {
  const activeStyleConnector = HERITAGE_CONNECTOR_REGISTRY["four-rivers-flow-and-banks"];
  const disagreement = HERITAGE_DISAGREEMENT_REGISTRY["three-sections-boundaries"];
  assert.ok(activeStyleConnector);
  assert.ok(disagreement);

  const tier3Connectors = {
    suppressed: false, abstained: false,
    active: [{ ...activeStyleConnector, disposition: "ACTIVE", relationshipAvailability: "AVAILABLE", gateReasons: [] }],
    sourcePanelOnly: [], abstentions: [], editorialJuxtapositions: [],
    disagreements: [disagreement],
  };
  const model = tier3ConnectorModel(tier3Connectors, REAL_SOURCE_REGISTRY);
  const html = heritageConnectorTier3Markup(model);
  assert.ok(html.length > 0, "the combined markup must actually render something to be a meaningful proof");
  assert.equal(hasHan(html), false, "complete Tier-3 markup built from real canonical corpus data must contain zero Han characters");
});

/*
 * ── 13: Tier 3 ("Why") discloses the scheduled heritage rotation exactly as
 *    Tier 2 ("Story") already does, whenever Tier-3 connector material is
 *    actually rendered — never a second, differently-worded mechanism ──────
 * PR #40 closeout, Codex finding: the Why tab could render connector/source/
 * disagreement/abstention/editorial material selected by the day-rotated
 * heritageConstruct/sourceLineage with no disclosure at all, since the only
 * `rotationDisclosure` lived on Tier 2's (Story's) bounded selection. That let
 * Tier-3 material read as selected by the measurement rather than by the
 * scheduled rotation, contrary to Contract §13. Fixed entirely inside
 * `tier3ConnectorModel`/`heritageConnectorTier3Markup` — no second rotation
 * mechanism, no new occurrence, no new prose: the SAME `ROTATION_DISCLOSURE`
 * string Tier 2 already carries.
 */

test("13: tier3ConnectorModel sets rotationDisclosure whenever ANY category has material, not only when active is non-empty", () => {
  const withSourcePanelOnly = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], sourcePanelOnly: [entry({ connectorId: "ceilinged-1", disposition: "SOURCE_PANEL_CEILING" })],
    disagreements: [], abstentions: [], editorialJuxtapositions: [],
  }, SOURCE_REGISTRY);
  assert.equal(withSourcePanelOnly.rotationDisclosure, ROTATION_DISCLOSURE);

  const withOnlyAbstentions = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], sourcePanelOnly: [], disagreements: [],
    abstentions: [{ connectorId: "blocked-1", disposition: "LINEAGE_RESEARCH_ONLY", prohibitedForUserInference: true, gateReasons: ["LINEAGE_RESEARCH_ONLY"] }],
    editorialJuxtapositions: [],
  }, SOURCE_REGISTRY);
  assert.equal(withOnlyAbstentions.rotationDisclosure, ROTATION_DISCLOSURE);

  const withOnlyDisagreements = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], sourcePanelOnly: [], abstentions: [], editorialJuxtapositions: [],
    disagreements: [{ disagreementId: "d-1", target: { targetType: "CONSTRUCT", targetRef: "fourRivers" }, positions: [] }],
  }, SOURCE_REGISTRY);
  assert.equal(withOnlyDisagreements.rotationDisclosure, ROTATION_DISCLOSURE);
});

test("13: tier3ConnectorModel's rotationDisclosure is null with nothing to show, and null when suppressed/abstained/absent", () => {
  const empty = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], sourcePanelOnly: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
  }, SOURCE_REGISTRY);
  assert.equal(empty.rotationDisclosure, null);

  const suppressed = tier3ConnectorModel({ suppressed: true, suppressionReason: "SAFETY_GATE_UNKNOWN" });
  assert.equal(suppressed.rotationDisclosure, null);

  const abstained = tier3ConnectorModel({ suppressed: false, abstained: true, abstentionReasonCode: "UNSUPPORTED_LINEAGE" });
  assert.equal(abstained.rotationDisclosure, null);

  const noData = tier3ConnectorModel(null);
  assert.equal(noData.rotationDisclosure, null);
});

test("13: heritageConnectorTier3Markup renders the rotation disclosure once, BEFORE the material it applies to, exactly when material is shown", () => {
  const model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [entry({ connectorId: "active-1" })],
    sourcePanelOnly: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
  }, SOURCE_REGISTRY);
  const html = heritageConnectorTier3Markup(model);
  assert.match(html, /rotation through the traditional systems/);
  // The disclosure must precede the material it is disclosing, so a reader
  // opening Why sees it before anything that could otherwise read as
  // measurement-derived.
  assert.ok(html.indexOf("rotation through the traditional systems") < html.indexOf("corresponds to"),
    "the rotation disclosure must render before the connector card, not after");
  // Exactly one occurrence — not once per section.
  assert.equal(html.split("rotation through the traditional systems").length - 1, 1);
});

test("13: heritageConnectorTier3Markup renders no disclosure when there is no material (an empty model gains no stray paragraph)", () => {
  const model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [], sourcePanelOnly: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
  }, SOURCE_REGISTRY);
  assert.equal(heritageConnectorTier3Markup(model), "");
});

test("13: Tier 2 and Tier 3 render the SAME rotation-disclosure string — no second, independently authored disclosure mechanism", () => {
  const tier2Model = tier2ConnectorModel({
    available: true, reason: null, connector: entry(), disagreements: [],
    rotationDisclosure: ROTATION_DISCLOSURE, occurrence: 0,
  }, SOURCE_REGISTRY);
  const tier3Model = tier3ConnectorModel({
    suppressed: false, abstained: false,
    active: [entry({ connectorId: "active-1" })],
    sourcePanelOnly: [], disagreements: [], abstentions: [], editorialJuxtapositions: [],
  }, SOURCE_REGISTRY);
  assert.equal(tier2Model.rotationDisclosure, ROTATION_DISCLOSURE);
  assert.equal(tier3Model.rotationDisclosure, ROTATION_DISCLOSURE);
  assert.equal(tier2Model.rotationDisclosure, tier3Model.rotationDisclosure);
  // esc() HTML-encodes the apostrophe in ROTATION_DISCLOSURE, so the markup
  // is matched on a stable, punctuation-free substring rather than the raw
  // constant (see the apostrophe-free assertions elsewhere in this file).
  assert.match(heritageConnectorTier2Markup(tier2Model), /rotation through the traditional systems/);
  assert.match(heritageConnectorTier3Markup(tier3Model), /rotation through the traditional systems/);
});

test("13 (real corpus, real chain): fourRivers/primary has real sourcePanelOnly material with no active connector — Tier 3 discloses the rotation even though Tier 2 has nothing to disclose", () => {
  const reflection = makeReflection({ heritageConstruct: "fourRivers", sourceLineage: "primary" });
  const tier2Connectors = tierTwoHeritageConnections(reflection, { captureQualityPassed: true, safetyPassed: true });
  const tier3Connectors = tierThreeHeritageConnections(reflection, { captureQualityPassed: true, safetyPassed: true });

  // Fixture assumption: today's real corpus has no ACTIVE connector for any
  // construct (see docs/HERITAGE_CONNECTOR_STAGE_STATUS.md), so Tier 2 has
  // nothing to select and nothing to disclose -- exactly the asymmetric case
  // the Codex finding described, reproduced with zero synthetic data.
  assert.equal(tier2Connectors.available, false);
  assert.equal(tier2ConnectorModel(tier2Connectors).rotationDisclosure, null);

  const tier3Model = tier3ConnectorModel(tier3Connectors, REAL_SOURCE_REGISTRY);
  assert.ok(tier3Model.sourcePanelOnly.some((c) => c.connectorId === "four-rivers-flow-and-banks"),
    "fixture assumption: fourRivers/primary's real sourcePanelOnly material must include this connector");
  assert.equal(tier3Model.rotationDisclosure, ROTATION_DISCLOSURE);
  const html = heritageConnectorTier3Markup(tier3Model);
  assert.match(html, /rotation through the traditional systems/,
    "Tier 3 must disclose the scheduled rotation whenever it renders heritage material, even when Tier 2 selected nothing");
});

test("13: safety UNKNOWN still renders neither heritage material NOR a misleading rotation disclosure in Tier 3", () => {
  const reflection = makeReflection();
  const tier3Connectors = tierThreeHeritageConnections(reflection, { captureQualityPassed: true });
  const model = tier3ConnectorModel(tier3Connectors);
  assert.equal(model.suppressed, true);
  assert.equal(model.rotationDisclosure, null);
  assert.equal(heritageConnectorTier3Markup(model), "");
});

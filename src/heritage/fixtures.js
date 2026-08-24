import {
  HERITAGE_REGISTRY,
  HERITAGE_CONNECTOR_REGISTRY,
  HERITAGE_DISAGREEMENT_REGISTRY,
} from "./registry.js";
import { HERITAGE_FIELD_FINDINGS } from "./evidence.js";
import { HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY } from "./negative-relationships-registry.js";
import { HERITAGE_COMPOSITION_POLICIES } from "./composition-policies-registry.js";
import { HERITAGE_CONCEPT_REGISTRY } from "./concepts.js";

/* Fixtures are snapshots of the canonical registry, not a second corpus. */
export const heritageFixtures = Object.freeze(Object.values(HERITAGE_REGISTRY));
export const heritageFieldFindingFixtures = HERITAGE_FIELD_FINDINGS;
export const heritageConnectorFixtures = Object.freeze(Object.values(HERITAGE_CONNECTOR_REGISTRY));
export const heritageDisagreementFixtures = Object.freeze(Object.values(HERITAGE_DISAGREEMENT_REGISTRY));
export const heritageNegativeRuleFixtures = Object.freeze(Object.values(HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY));
export const heritageCompositionPolicyFixtures = Object.freeze(Object.values(HERITAGE_COMPOSITION_POLICIES));
export const heritageConceptFixtures = Object.freeze(Object.values(HERITAGE_CONCEPT_REGISTRY));

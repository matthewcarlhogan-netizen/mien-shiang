import { HERITAGE_REGISTRY } from "./registry.js";
import {
  HERITAGE_CROSS_FAMILY_COMBINATIONS,
  HERITAGE_FIELD_FINDINGS,
} from "./evidence.js";

/* Fixtures are snapshots of the canonical registry, not a second corpus. */
export const heritageFixtures = Object.freeze(Object.values(HERITAGE_REGISTRY));
export const heritageCombinationFixtures = HERITAGE_CROSS_FAMILY_COMBINATIONS;
export const heritageFieldFindingFixtures = HERITAGE_FIELD_FINDINGS;

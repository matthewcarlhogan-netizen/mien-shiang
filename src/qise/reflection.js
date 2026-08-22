/*
 * Reflection Engine: Observation, Heritage, Reflection.
 * Heritage text is always source-attributed; it is never inferred from a
 * measurement. The component registry makes every state dependency auditable.
 */

import {
  READING_AFFECTING, NON_READING_AFFECTING, stateKey, STATE_KEY_SEPARATOR,
} from "./reading-state.js";
import {
  ASCENDANT_SUBJECT, REGION_PLACE, DIRECTION_VERB, MAGNITUDE_QUALIFIER,
  HEADLINE, HISTORY_LINE, CONFIDENCE_VOICE, AVAILABILITY_LINE, OBSERVATION_SHAPES,
  BRIDGE_OPENER, BRIDGE_ABSTAINED, REFLECTION, ROTATION_DISCLOSURE,
  SELF_REPORT_BRIDGE,
} from "./reflection-corpus.js";
import { HERITAGE_REGISTRY } from "../heritage/registry.js";
import { RUNTIME_TO_MEASUREMENT_AVAILABILITY } from "../heritage/schema.js";
import { seededIndex } from "./passages.js";

export const LAYERS = Object.freeze(["observation", "heritage", "reflection"]);
export const CORPUS_VERSION = "reflection-corpus-v1";
export const ENGINE_VERSION = "reflection-engine-v1";

const read = (s) => s.availability === "read";

function lineageFor(s) {
  const registryEntry = HERITAGE_REGISTRY[s.heritageConstruct]
    || HERITAGE_REGISTRY.threeSections;
  return {
    entry: registryEntry,
    lineage: registryEntry.lineages[s.sourceLineage]
      || Object.values(registryEntry.lineages)[0],
  };
}

export const COMPONENTS = Object.freeze([
  {
    id: "headline",
    layer: "observation",
    dependsOn: ["ascendant", "direction", "availability"],
    variants(s) {
      if (!read(s)) {
        return ["Today's reading is incomplete.", "There is no reading to give today."];
      }
      const byDirection = HEADLINE[s.ascendant] || HEADLINE.ping;
      return byDirection[s.direction] || byDirection.none || HEADLINE.ping.none;
    },
  },
  {
    id: "availability",
    layer: "observation",
    dependsOn: ["availability"],
    variants(s) {
      return AVAILABILITY_LINE[s.availability] || AVAILABILITY_LINE.read;
    },
  },
  {
    id: "observation",
    layer: "observation",
    dependsOn: ["ascendant", "region", "direction", "availability"],
    variants(s) {
      if (!read(s)) return [null];
      const parts = {
        subject: ASCENDANT_SUBJECT[s.ascendant] || ASCENDANT_SUBJECT.ping,
        place: REGION_PLACE[s.region] || REGION_PLACE.overall,
        verb: DIRECTION_VERB[s.direction] || DIRECTION_VERB.none,
        object: s.direction === "none"
          ? "the range your own recent readings have settled into"
          : "what has been usual for you lately",
      };
      return OBSERVATION_SHAPES.map((shape) => shape(parts));
    },
  },
  {
    id: "magnitude",
    layer: "observation",
    dependsOn: ["magnitudeBand", "availability"],
    variants(s) {
      if (!read(s)) return [null];
      return MAGNITUDE_QUALIFIER[s.magnitudeBand] || MAGNITUDE_QUALIFIER.level;
    },
  },
  {
    id: "history",
    layer: "observation",
    dependsOn: ["historyStage", "trajectory"],
    variants(s) {
      const byStage = HISTORY_LINE[s.historyStage] || HISTORY_LINE.establishing;
      return byStage[s.trajectory] || byStage.steady || [null];
    },
  },
  {
    id: "confidence",
    layer: "observation",
    dependsOn: ["confidenceBand"],
    variants(s) {
      return CONFIDENCE_VOICE[s.confidenceBand] || [null];
    },
  },
  {
    id: "heritage",
    layer: "heritage",
    dependsOn: ["heritageConstruct", "sourceLineage"],
    variants(s) {
      const lineage = lineageFor(s).lineage;
      if (lineage.availability === "abstention") return [null];
      return [lineage.definition];
    },
  },
  {
    id: "heritageNote",
    layer: "heritage",
    dependsOn: ["heritageConstruct", "sourceLineage"],
    variants(s) {
      const lineage = lineageFor(s).lineage;
      if (lineage.availability === "abstention") return [null];
      return [lineage.note];
    },
  },
  {
    id: "heritageAbstention",
    layer: "heritage",
    dependsOn: ["availability"],
    variants(s) {
      if (read(s)) return [null];
      return [{
        text: null,
        abstention: Object.freeze({
          layer: "heritage",
          terminationState: "abstain",
          reasonCode: s.availability,
          provenanceId: "heritage-abstention",
          measurementAvailability: RUNTIME_TO_MEASUREMENT_AVAILABILITY[s.availability]
            || "PERMANENTLY_ABSTAIN",
        }),
      }];
    },
  },
  {
    id: "bridge",
    layer: "reflection",
    dependsOn: ["availability"],
    variants(s) {
      return read(s) ? BRIDGE_OPENER : BRIDGE_ABSTAINED;
    },
  },
  {
    id: "reflection",
    layer: "reflection",
    dependsOn: ["heritageConstruct", "ascendant"],
    variants(s) {
      const byConstruct = REFLECTION[s.heritageConstruct] || REFLECTION.threeSections;
      return byConstruct[s.ascendant] || byConstruct.ping;
    },
  },
].map((component) => Object.freeze({
  ...component,
  render: (s, i = 0) => component.variants(s)[i] ?? null,
})));

export function variationCycle(state) {
  return COMPONENTS.reduce((total, component) => (
    total * Math.max(1, component.variants(state).length)
  ), 1);
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function coprimeStride(total) {
  if (total <= 2) return 1;
  let step = Math.max(1, Math.round(total * 0.6180339887));
  while (gcd(step, total) !== 1) step = (step % total) + 1;
  return step;
}

export function variantIndices(state, occurrence = 0) {
  const radices = COMPONENTS.map((component) => (
    Math.max(1, component.variants(state).length)
  ));
  const total = radices.reduce((a, b) => a * b, 1);
  const offset = seededIndex(stateKey(state), total);
  const normalizedOccurrence = (((occurrence | 0) % total) + total) % total;
  const walk = (offset + normalizedOccurrence * coprimeStride(total)) % total;

  const out = [];
  let place = 1;
  for (const radix of radices) {
    out.push(Math.floor(walk / place) % radix);
    place *= radix;
  }
  return out;
}

export const DECLARED_EQUIVALENCES = Object.freeze([]);

export function consumedFields() {
  const seen = new Set();
  for (const component of COMPONENTS) {
    for (const field of component.dependsOn) seen.add(field);
  }
  return seen;
}

export function composeReading(state, options = {}) {
  if (!state) throw new TypeError("composeReading needs an interpreted reading state");

  const key = stateKey(state);
  const occurrence = Number.isFinite(options.occurrence)
    ? Math.max(0, options.occurrence | 0)
    : 0;
  const indices = variantIndices(state, occurrence);
  const parts = [];
  const trace = [];
  const abstentions = [];

  COMPONENTS.forEach((component, i) => {
    const set = component.variants(state);
    const index = Math.min(indices[i], set.length - 1);
    const output = set[index];
    const structured = output && typeof output === "object" && output.abstention;
    const text = structured ? output.text : output;

    if (structured) {
      abstentions.push(output.abstention);
      trace.push({
        id: component.id,
        layer: component.layer,
        drivenBy: component.dependsOn.map((field) => field + "=" + state[field]),
        variant: "abstained",
        abstention: output.abstention,
      });
    }
    if (text === null || text === undefined || text === "") return;

    parts.push({ id: component.id, layer: component.layer, text });
    if (!structured) {
      trace.push({
        id: component.id,
        layer: component.layer,
        drivenBy: component.dependsOn.map((field) => field + "=" + state[field]),
        variant: set.length > 1 ? (index + 1) + " of " + set.length : "only",
      });
    }
  });

  if (options.includeSelfReport !== false && state.selfReport) {
    const marks = Object.entries(state.selfReport)
      .filter(([keyName, value]) => SELF_REPORT_BRIDGE[keyName] && value)
      .map(([keyName, value]) => SELF_REPORT_BRIDGE[keyName] + " as " + value);
    if (marks.length) {
      parts.push({
        id: "selfReport",
        layer: "observation",
        text: marks.join(", and ") + " today. That is your own note, not something the camera found.",
      });
      trace.push({
        id: "selfReport",
        layer: "observation",
        drivenBy: ["selfReport (non-identity)"],
      });
    }
  }

  const byLayer = {};
  for (const layer of LAYERS) {
    byLayer[layer] = parts.filter((part) => part.layer === layer).map((part) => part.text);
  }

  return Object.freeze({
    stateKey: key,
    occurrence,
    variationCycle: variationCycle(state),
    parts,
    layers: byLayer,
    heritageAbstentions: Object.freeze(abstentions),
    rotationDisclosure: ROTATION_DISCLOSURE,
    text: parts.map((part) => part.text).join(" "),
    provenance: Object.freeze({
      engine: ENGINE_VERSION,
      corpus: CORPUS_VERSION,
      readingAffecting: READING_AFFECTING,
      nonReadingAffecting: NON_READING_AFFECTING,
    }),
    trace,
  });
}

export function explainReading(composed) {
  if (!composed) return [];
  return composed.trace.map((trace) => ({
    sentence: (composed.parts.find((part) => part.id === trace.id) || {}).text
      || (trace.abstention
        ? "Heritage material remains source-attributed; measurement-derived joining abstained because "
          + trace.abstention.reasonCode + "."
        : ""),
    layer: trace.layer,
    because: trace.drivenBy,
  }));
}

export function parseStateKey(key) {
  const out = {};
  for (const pair of String(key).split(STATE_KEY_SEPARATOR)) {
    const i = pair.indexOf("=");
    if (i > 0) out[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return out;
}

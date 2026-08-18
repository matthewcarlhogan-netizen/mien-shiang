/*
 * THE INTERPRETED READING STATE, AND ITS IDENTITY.
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 * Before this module, the reading was assembled from three inputs — ascendant,
 * magnitude band, and course — while the pipeline went on computing confidence,
 * baseline stage, trajectory, region and heritage rotation and then throwing all
 * of them away. Two users on materially different days received identical prose.
 * That is not a copy problem. It is a defect: meaningful state was calculated
 * and silently discarded, which is the one thing READING_EXPERIENCE_CONTRACT.md
 * §2 forbids outright.
 *
 * So the interpreted state is now a declared object with a declared identity.
 * `READING_AFFECTING` is the registry: every field named there MUST be capable
 * of changing the reading, and `reading-collision.test.js` fails the build if
 * one of them turns out to be inert. A field that is computed but cannot move
 * the output is either promoted to reading-affecting or deleted — it does not
 * get to sit in the middle looking useful.
 *
 * ── WHY THE SEED IS THE STATE KEY, NOT THE TIMESTAMP ───────────────────────
 * `passages.js` seeded its variation from the reading's timestamp. That is
 * deterministic in the weak sense — reopening a screen gives the same words —
 * but it means the SAME interpreted state produces DIFFERENT prose on two
 * different days, and two DIFFERENT states can land on the same words. It makes
 * variation decorative rather than meaningful, and it makes collision detection
 * impossible, because the text is a function of the clock rather than of the
 * state.
 *
 * Seeding from the state key inverts that: same state, same reading, always;
 * different state, different reading, provably. Repetition across days is
 * handled where it belongs — in `trajectory`, which already knows this is the
 * third time something has appeared and says so.
 */

/* ── the declared dimensions ─────────────────────────────────────────────── */

/** Where on the face the dominant movement sits. */
export const REGIONS = Object.freeze(["centre", "periorbital", "overall"]);

/** The Qi Se colour that rose furthest from the personal baseline. */
export const ASCENDANTS = Object.freeze(["chi", "huang", "qing", "bai", "hei", "ping"]);

/** Direction of travel against the user's own baseline. */
export const DIRECTIONS = Object.freeze(["up", "down", "mixed", "none"]);

/**
 * Magnitude, in units of the user's own noise floor. Mirrors
 * `MAGNITUDE_BANDS` in baseline.js, plus the "no movement" case.
 */
export const MAGNITUDE_BANDS = Object.freeze(["level", "slight", "clear", "marked"]);

/**
 * Confidence, banded. Contract §11: confidence changes how the reading SPEAKS,
 * it is not a badge bolted to the side of prose that ignores it.
 */
export const CONFIDENCE_BANDS = Object.freeze(["high", "moderate", "limited", "below"]);

/** How much personal history the reading is standing on. */
export const HISTORY_STAGES = Object.freeze(["calibrating", "establishing", "established"]);

/**
 * The temporal shape. Contract §10: same region, same measurement, different
 * temporal pattern, different reading. This is the largest legitimate source of
 * personalisation the product has.
 */
export const TRAJECTORIES = Object.freeze([
  "first",       // not seen before in this segment
  "repeating",   // has appeared before, not consecutively
  "persisting",  // present across consecutive readings
  "settling",    // was present, now moving back toward the usual range
  "steady",      // nothing notable moving
]);

export const HERITAGE_CONSTRUCTS = Object.freeze([
  "threeSections", "fiveElements", "twelvePalaces",
  "fiveMountains", "fourRivers", "fiveOfficers",
]);

/**
 * Which textual lineage the heritage passage came from. Only Four Rivers has a
 * live split (目/口 swap between 河 and 淮), but the field is general because
 * B-020 found the disagreement is the interesting part, not an embarrassment.
 */
export const SOURCE_LINEAGES = Object.freeze(["primary", "variant"]);

/**
 * Contract §12: an unavailable reading is not a broken reading. Each value
 * carries WHY, because "not read today" without a reason reads as a bug.
 */
export const AVAILABILITY = Object.freeze([
  "read",
  "abstained_capture",     // the capture could not support it
  "abstained_anatomy",     // the camera cannot support it, ever, front-on
  "abstained_confidence",  // measurable, but not separable from conditions
  "abstained_calibrating", // not enough personal history yet
]);

/**
 * THE REGISTRY.
 *
 * Every field here must be able to change the rendered reading. The collision
 * test mutates each one in isolation and fails if the output does not move.
 */
export const READING_AFFECTING = Object.freeze([
  "region", "ascendant", "direction", "magnitudeBand", "confidenceBand",
  "historyStage", "trajectory", "heritageConstruct", "sourceLineage",
  "availability",
]);

/**
 * Fields computed and carried on the state, but declared NOT to affect the
 * reading. Declaring them is the point: it is the difference between a decision
 * and an oversight.
 */
export const NON_READING_AFFECTING = Object.freeze([
  "timestampIso",   // identity of the row, not of the interpretation
  "canonicalDay",   // ditto
  "lineageId",      // segmentation bookkeeping
  "baselineVersion",
  "captureClass",   // already segments the baseline; does not colour the prose
  "selfReport",     // §14 — additive context, not part of state identity
]);

/* ── derivation ──────────────────────────────────────────────────────────── */

const has = (list, v) => list.indexOf(v) !== -1;

/** Which band a magnitude in noise-floor units falls into. */
export function magnitudeBandOf(z) {
  const a = Math.abs(typeof z === "number" && Number.isFinite(z) ? z : 0);
  if (a >= 3.0) return "marked";
  if (a >= 1.8) return "clear";
  if (a >= 1.0) return "slight";
  return "level";
}

/** Which band a 0..1 confidence falls into. */
export function confidenceBandOf(c) {
  if (typeof c !== "number" || !Number.isFinite(c)) return "below";
  if (c >= 0.85) return "high";
  if (c >= 0.7) return "moderate";
  if (c >= 0.6) return "limited";
  return "below";
}

/** How much history this reading stands on. */
export function historyStageOf(validCount) {
  const n = typeof validCount === "number" ? validCount : 0;
  if (n < 3) return "calibrating";
  if (n < 10) return "establishing";
  return "established";
}

/**
 * The temporal shape of this movement against recent readings.
 *
 * `recent` is oldest-first, each entry `{ ascendant, magnitudeBand }`, already
 * filtered to the current baseline segment. Only readings that actually moved
 * count as occurrences — a run of "level" days is not a pattern.
 */
export function trajectoryOf(ascendant, magnitudeBand, recent = []) {
  if (magnitudeBand === "level" || ascendant === "ping") return "steady";

  const moved = (r) => r && r.ascendant === ascendant && r.magnitudeBand !== "level";
  const occurrences = recent.filter(moved).length;

  if (occurrences === 0) return "first";

  // Consecutive run ending at the most recent reading.
  let run = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (moved(recent[i])) run++;
    else break;
  }
  if (run >= 2) return "persisting";

  // Present historically, absent from the immediately preceding reading:
  // the movement is on its way back to the usual range.
  const last = recent[recent.length - 1];
  if (occurrences >= 1 && !moved(last)) return "settling";

  return "repeating";
}

/**
 * Assemble the interpreted state.
 *
 * Deliberately total: every field is filled with a declared value, never left
 * undefined, because an undefined dimension is a silent collision waiting to
 * happen — two states that differ only in a field nobody set are the same state
 * as far as the composer is concerned.
 */
export function deriveReadingState({
  interpreted = null,
  recent = [],
  confidence = null,
  heritageConstruct = "threeSections",
  sourceLineage = "primary",
  availability = null,
  region = null,
  selfReport = null,
} = {}) {
  const state = interpreted && interpreted.state === "read" ? interpreted : null;
  const compass = state ? state.compass : null;

  const validCount = state
    ? (typeof interpreted.validCount === "number" ? interpreted.validCount : 10)
    : (interpreted && typeof interpreted.readingsSoFar === "number" ? interpreted.readingsSoFar : 0);

  const historyStage = historyStageOf(validCount);
  const confidenceBand = confidenceBandOf(confidence);

  let ascendant = (compass && compass.ascendant) || "ping";
  if (!has(ASCENDANTS, ascendant)) ascendant = "ping";

  /*
   * MAGNITUDE COMES FROM THE COMPASS, NOT FROM THE LOUDEST AXIS.
   *
   * `projectCompass` already computes `magnitude` as the ascendant colour's own
   * score in units of the personal noise floor, and it scores a conjunction as
   * its WEAKER leg. Taking max|z| across all axes instead would report the
   * loudest single axis, which is a different quantity that happens to look
   * similar — and would inflate every reading whose ascendant is a conjunction
   * (bai, qing) by silently reading the stronger half.
   *
   * max|z| survives only as the fallback for a compass that predates the field.
   */
  const zTop = compass && typeof compass.magnitude === "number"
    ? compass.magnitude
    : (compass && typeof compass.z === "object" && compass.z
      ? Math.max(...Object.values(compass.z).map((v) => (typeof v === "number" ? Math.abs(v) : 0)))
      : 0);
  let magnitudeBand = state ? magnitudeBandOf(zTop) : "level";
  if (ascendant === "ping") magnitudeBand = "level";

  let direction = "none";
  if (magnitudeBand !== "level" && compass && compass.z) {
    const vals = Object.values(compass.z).filter((v) => typeof v === "number" && Math.abs(v) >= 1);
    const ups = vals.filter((v) => v > 0).length;
    const downs = vals.filter((v) => v < 0).length;
    direction = ups && downs ? "mixed" : (ups ? "up" : (downs ? "down" : "none"));
  }
  if (direction === "none") magnitudeBand = "level";

  /*
   * NOTHING CROSSED THE FLOOR MEANS NOTHING ROSE.
   *
   * `projectCompass` names an ascendant colour whenever one axis leads the
   * others, including on days when the leader never left the personal noise
   * floor. Carried through unchanged, that produced states like "chi ascendant,
   * level magnitude" — a colour named as risen on a day nothing rose. Unreachable,
   * so never proven distinct, and it would have put a colour in the headline of
   * a day the user's own scatter fully explains.
   *
   * Below the floor there is no ascendant. That is what the floor is for.
   */
  if (magnitudeBand === "level") ascendant = "ping";

  let resolvedRegion = region;
  if (!has(REGIONS, resolvedRegion)) {
    resolvedRegion = ascendant === "hei" ? "periorbital" : (magnitudeBand === "level" ? "overall" : "centre");
  }

  /*
   * A LEVEL DAY IS A WHOLE-FACE OBSERVATION.
   *
   * `regionOf` reports where the movement sits, and on a day with no movement
   * it has nothing to report — it was returning "centre" as a default, which
   * put a region on a reading that had no regional claim to make, and produced
   * a state the collision sweep never visits. Caught by the production-path
   * test on the very first real neutral scan, which is the most common day
   * there is.
   */
  if (magnitudeBand === "level") resolvedRegion = "overall";

  // Availability is decided here, once, rather than in each surface. Order
  // matters: anatomy is permanent, capture is today's, confidence is the
  // softest, calibrating is a stage not a fault.
  let resolvedAvailability = availability;
  if (!has(AVAILABILITY, resolvedAvailability)) {
    if (historyStage === "calibrating") resolvedAvailability = "abstained_calibrating";
    else if (confidenceBand === "below") resolvedAvailability = "abstained_confidence";
    else if (!state) resolvedAvailability = "abstained_capture";
    else resolvedAvailability = "read";
  }

  const trajectory = resolvedAvailability === "read"
    ? trajectoryOf(ascendant, magnitudeBand, recent)
    : "steady";

  /*
   * ABSTENTION COLLAPSES THE MOVEMENT CLAIM.
   *
   * Caught by `reading-state.test.js`, not by design: a below-confidence
   * reading was abstaining on the availability field while still carrying
   * ascendant "hei" and magnitude "clear" in its identity. Two things were
   * wrong with that. The state was unreachable, so the collision sweep had
   * never proven it distinct from anything — the guarantee had a hole exactly
   * where real users with bad lighting live. And it was dishonest: a state that
   * says "we could not separate this from the conditions" must not also record
   * WHICH movement it could not separate, because that is a claim dressed as a
   * refusal.
   *
   * So an abstained reading makes no movement claim at all. The reason for the
   * gap lives in `availability`, where it can be shown to the user, and
   * nowhere else.
   */
  if (resolvedAvailability !== "read") {
    ascendant = "ping";
    magnitudeBand = "level";
    direction = "none";
    resolvedRegion = "overall";
  }

  return Object.freeze({
    region: resolvedRegion,
    ascendant,
    direction,
    magnitudeBand,
    confidenceBand,
    historyStage,
    trajectory,
    heritageConstruct: has(HERITAGE_CONSTRUCTS, heritageConstruct) ? heritageConstruct : "threeSections",
    sourceLineage: has(SOURCE_LINEAGES, sourceLineage) ? sourceLineage : "primary",
    availability: resolvedAvailability,
    // carried, declared non-reading-affecting
    selfReport: selfReport || null,
  });
}

/**
 * The deterministic identity of an interpreted state.
 *
 * Field order is fixed and the separator cannot appear in any declared value,
 * so the key is unambiguous and stable across releases. Contract §3.
 */
export const STATE_KEY_SEPARATOR = "|";

export function stateKey(state) {
  if (!state) return "";
  return READING_AFFECTING.map((f) => `${f}=${state[f]}`).join(STATE_KEY_SEPARATOR);
}

/**
 * Is this combination of dimensions actually reachable?
 *
 * The collision test enumerates the declared space and filters through this.
 * Testing unreachable states would either force the corpus to cover prose
 * nobody can ever see, or bury real collisions under fake ones.
 */
export function isReachable(s) {
  if (!s) return false;

  // "ping" is the no-ascendant case: nothing rose, so nothing moved.
  if (s.ascendant === "ping" && s.magnitudeBand !== "level") return false;
  if (s.ascendant !== "ping" && s.magnitudeBand === "level") return false;

  // Movement and direction are the same fact seen twice.
  if (s.magnitudeBand === "level" && s.direction !== "none") return false;
  if (s.magnitudeBand !== "level" && s.direction === "none") return false;

  /*
   * ABSTENTION PRECEDENCE: calibrating > confidence > capture.
   *
   * Two reasons to abstain can be true at once — a second-ever reading taken in
   * bad light is both uncalibrated and unconfident. The first model asserted
   * that below-threshold confidence implied the confidence abstention, and
   * derivation disagreed with it, giving calibrating precedence. One of them
   * had to be wrong and it was the model.
   *
   * Calibrating wins because it is the more fundamental gap and the more useful
   * thing to tell the user: "there is no baseline yet" is a stage they can pass
   * through, where "the light was poor" invites them to retake a photograph
   * that still has nothing to be compared against. Below-threshold confidence
   * therefore permits either abstention, and never permits a read.
   */
  if (s.confidenceBand === "below"
      && s.availability !== "abstained_confidence"
      && s.availability !== "abstained_calibrating") return false;
  if (s.availability === "abstained_confidence" && s.confidenceBand !== "below") return false;

  // Calibrating is a history stage, and it abstains for that reason alone.
  if (s.historyStage === "calibrating" && s.availability !== "abstained_calibrating") return false;
  if (s.availability === "abstained_calibrating" && s.historyStage !== "calibrating") return false;

  // A calibrating reading has no baseline to move against.
  if (s.historyStage === "calibrating" && (s.magnitudeBand !== "level" || s.trajectory !== "steady")) return false;

  // Trajectory is a property of movement.
  if (s.magnitudeBand === "level" && s.trajectory !== "steady") return false;
  if (s.magnitudeBand !== "level" && s.trajectory === "steady") return false;

  // Any abstention suppresses the trajectory claim: we did not observe enough
  // to say where this sits in a pattern.
  if (s.availability !== "read" && s.trajectory !== "steady") return false;

  /*
   * Region is INDEPENDENT of ascendant, and that is a correction rather than a
   * looseness. The first cut of this file pinned periorbital to `hei`, on the
   * intuition that shadow is an under-eye phenomenon. The consequence was that
   * no two reachable states differed by region alone — region was structurally
   * determined by ascendant, so it could never move the reading on its own,
   * and it would have sat in READING_AFFECTING passing every test while being
   * inert. That is the precise failure this module exists to catch, and the
   * audit caught it in its own author's code first.
   *
   * The measurement backs the looser rule: `periorbitalL` is a separate axis
   * from the central ones, and paleness or a cool cast can lead there just as
   * shadow can. Only the no-movement case is fixed, because nothing rising is
   * an observation about the face as a whole.
   */
  if (s.magnitudeBand === "level" && s.region !== "overall") return false;
  if (s.magnitudeBand !== "level" && s.region === "overall") return false;

  // Only Four Rivers currently carries a live lineage split (B-020 §7).
  if (s.sourceLineage === "variant" && s.heritageConstruct !== "fourRivers") return false;

  return true;
}

/** Every reachable state in the declared space. Used by the collision test. */
export function enumerateReachableStates() {
  const out = [];
  for (const region of REGIONS)
    for (const ascendant of ASCENDANTS)
      for (const direction of DIRECTIONS)
        for (const magnitudeBand of MAGNITUDE_BANDS)
          for (const confidenceBand of CONFIDENCE_BANDS)
            for (const historyStage of HISTORY_STAGES)
              for (const trajectory of TRAJECTORIES)
                for (const heritageConstruct of HERITAGE_CONSTRUCTS)
                  for (const sourceLineage of SOURCE_LINEAGES)
                    for (const availability of AVAILABILITY) {
                      const s = {
                        region, ascendant, direction, magnitudeBand, confidenceBand,
                        historyStage, trajectory, heritageConstruct, sourceLineage,
                        availability,
                      };
                      if (isReachable(s)) out.push(Object.freeze(s));
                    }
  return out;
}

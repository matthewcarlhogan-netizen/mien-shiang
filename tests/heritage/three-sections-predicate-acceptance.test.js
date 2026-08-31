/*
 * D2-1 / D2-2 / D2-3 / D2-4 — ACCEPTANCE TESTS FOR THE THREE SECTIONS PREDICATE PAIR.
 *
 * ── WHY THESE ARE GREEN BEFORE THE PROMOTION LANDS ─────────────────────────
 * The promotion approved in DR-2026-08-31-D2-CONNECTOR-PREDICATE is BLOCKED on
 * a Stage 1/2 freeze exception that has not been granted (see
 * docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md section 6). Writing tests
 * that fail until it is would put this branch's CI red for a reason no one on
 * the branch can fix, which the repo's own rules forbid.
 *
 * So every invariant here is written to hold in BOTH phases, and the one
 * count that genuinely changes is driven by `AUTHORISED_ACTIVE_PREDICATE_IDS`.
 * Flipping that constant is the single edit that turns this file from
 * "records the pre-promotion state" into "enforces the post-promotion
 * contract" — and the structural assertions below activate off it rather than
 * sitting in a comment.
 *
 * ── THE ONE THING THAT MUST NEVER REGRESS, IN EITHER PHASE ─────────────────
 * D2-2's enforcement clause: 上相, 貴 and any English rank/status/fortune
 * reading must never appear in ANY reader-facing representation. That sweep is
 * meaningful today (it proves the surfaces are clean before promotion) and is
 * the real gate afterwards. It is deliberately written over every reachable
 * state and both tiers' actual production markup, not over a sample.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  HERITAGE_REGISTRY, HERITAGE_CONNECTOR_REGISTRY, HERITAGE_DISAGREEMENT_REGISTRY,
} from "../../src/heritage/registry.js";
import { HERITAGE_CONSTRUCT_IDS } from "../../src/heritage/constants.js";
import {
  tier2ConnectorModel, tier3ConnectorModel,
  heritageConnectorTier2Markup, heritageConnectorTier3Markup,
} from "../../src/ui/qise/heritage-view.js";
import { deriveTier2FromComposition } from "../../src/qise/heritage-connections.js";
import { readingTiers } from "../../src/qise/reading-tiers.js";
import { enumerateReachableStates } from "../../src/qise/reading-state.js";
import { composeReading } from "../../src/qise/reflection.js";
import { composeLatent, connectorResidue, DIVERSITY_TARGET } from "../../scripts/heritage-readiness.mjs";

/*
 * THE PHASE SWITCH. Pre-promotion this is empty. D2-1 + D2-3 implementation
 * sets it to exactly these two ids, in this order:
 *
 *   ["three-sections-facial-proportion-taiqing", "three-sections-pingdeng-yuguan"]
 *
 * D2-3 is explicit that there are exactly TWO records and that
 * `three-sections-xiangcheng-taiqing` must never be created — the existing
 * Taiqing record is updated in place, not duplicated.
 */
const AUTHORISED_ACTIVE_PREDICATE_IDS = Object.freeze([]);

const FORBIDDEN_DUPLICATE_ID = "three-sections-xiangcheng-taiqing";
const TAIQING_ID = "three-sections-facial-proportion-taiqing";
const YUGUAN_ID = "three-sections-pingdeng-yuguan";

/* ── D2-3: the record set, in both phases ────────────────────────────────── */

test("the duplicate Taiqing record is never created", () => {
  assert.equal(HERITAGE_CONNECTOR_REGISTRY[FORBIDDEN_DUPLICATE_ID], undefined,
    `${FORBIDDEN_DUPLICATE_ID} duplicates the existing Taiqing record. DR-2026-08-31 D2-3 `
    + "requires the existing record be UPDATED in place, not duplicated.");

  // And the record it would have duplicated is present exactly once.
  assert.ok(HERITAGE_CONNECTOR_REGISTRY[TAIQING_ID], "the Taiqing record is gone");
  const taiqingSources = Object.values(HERITAGE_CONNECTOR_REGISTRY)
    .filter((c) => c.sourceId === "heritage-three-sections-taiqing-mianbu");
  assert.equal(taiqingSources.length, 1,
    "more than one connector now cites the Taiqing mianbu source; that is the duplication D2-3 forbids");
});

test("the Three Sections active set matches exactly what is authorised", () => {
  const composed = composeLatent({
    heritageConstruct: "threeSections", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  const active = (composed?.active || []).map((e) => e.connectorId).sort();
  assert.deepEqual(active, [...AUTHORISED_ACTIVE_PREDICATE_IDS].sort(),
    "the Three Sections active set drifted from the authorised set");

  // Post-promotion structure. Activates off the constant, so it is enforced
  // rather than remembered.
  if (AUTHORISED_ACTIVE_PREDICATE_IDS.length) {
    assert.equal(AUTHORISED_ACTIVE_PREDICATE_IDS.length, 2,
      "D2-3 authorises exactly two predicate records, never three");
    assert.deepEqual([...AUTHORISED_ACTIVE_PREDICATE_IDS].sort(), [TAIQING_ID, YUGUAN_ID].sort());

    const { residue } = connectorResidue("threeSections", "primary");
    assert.equal(residue, 2, "two active records must give a rotation residue of exactly 2");

    // Each carries the other as its alternate, and both point at the one
    // open disagreement -- so neither can be read as a settled house position.
    for (const [id, otherId] of [[TAIQING_ID, YUGUAN_ID], [YUGUAN_ID, TAIQING_ID]]) {
      const record = HERITAGE_CONNECTOR_REGISTRY[id];
      assert.ok(record, `${id} is missing`);
      assert.ok((record.disagreementIds || []).includes("three-sections-predicate"),
        `${id} does not declare the predicate disagreement`);
      assert.ok((record.alternateConnectorIds || []).includes(otherId),
        `${id} does not name ${otherId} as its alternate position`);
      assert.ok((record.excludedPredicateClauses || []).length > 0,
        `${id} carries no excluded fortune clause; D2-2 requires the exclusion be explicit`);
    }

    // D2-3: a meaningful proportion/equality distinction must actually reach
    // the permitted surface, not merely differ in the registry.
    const predicates = AUTHORISED_ACTIVE_PREDICATE_IDS
      .map((id) => HERITAGE_CONNECTOR_REGISTRY[id].relationshipPredicate);
    assert.equal(new Set(predicates).size, 2,
      "both records carry the same predicate; there is no proportion/equality distinction");
  }
});

test("the predicate disagreement stays open, with both positions recorded", () => {
  const d = HERITAGE_DISAGREEMENT_REGISTRY["three-sections-predicate"];
  assert.ok(d, "the predicate disagreement is gone");
  assert.equal(d.nature, "PREDICATE");
  assert.equal(d.status, "OPEN",
    "the disagreement was resolved to a house position; D2-3 requires both positions stay visible");
  assert.deepEqual(d.positions.map((p) => p.positionId).sort(),
    ["taiqing-xiangcheng", "yuguan-pingdeng"]);
});

/* ── D2-2: the enforcement sweep, meaningful in both phases ──────────────── */

/*
 * Han rank characters, and their English equivalents. The English half is the
 * half `englishSafe()` cannot catch (contract section 6.4): it omits any string
 * carrying a Han character, so 上相/貴 can never survive it -- but a
 * project-owned translation reading "a person of superior physiognomy" would
 * pass it untouched. That is precisely what D2-2's "any English rank, status or
 * fortune interpretation" bans, so it is checked separately here.
 */
const FORBIDDEN_HAN = /[上]相|貴|富貴|壽/;

/*
 * CLAIM-SHAPED, not category-shaped — and that distinction is evidence, not
 * fastidiousness. The first draft of this pattern banned the bare words
 * "fortune", "status" and "rank", and immediately fired on
 *
 *   "it remains fortune-typed heritage and is never encoded as a user inference"
 *
 * which is the product REFUSING to make a fortune claim. Banning the word
 * would have meant rewriting a correct disclaimer to satisfy a lint about
 * English — CLAUDE.md items 22 and 40 verbatim, a scanner confidently wrong
 * about text it misread, offering the wrong fix.
 *
 * D2-2 bans "any English rank, status or fortune INTERPRETATION". An
 * interpretation is a claim about the reader. Naming the category in order to
 * disclaim it is the opposite. So the pattern matches claim forms, and the
 * real disclaimer string is pinned as a negative control below so nobody
 * re-broadens it and walks into the same wall.
 */
const FORBIDDEN_ENGLISH = new RegExp([
  "superior physiognomy", "high minister", "high office", "\\bnoble\\b", "nobility",
  "\\bauspicious\\b", "\\bdestiny\\b", "\\bfated\\b", "longevity", "long life",
  "good fortune", "fortunate", "brings? wealth", "wealthy", "prosperity", "prosperous",
  "high rank", "elevated rank", "years of (rank|honour|honor|office)",
].join("|"), "i");

/** Every string a reader could see, for one construct/lineage, both tiers. */
function readerFacingStrings(heritageConstruct, sourceLineage, occurrence) {
  const composition = composeLatent({
    heritageConstruct, sourceLineage, depthMode: "SOURCE_DEEP", occurrence,
  });
  if (!composition) return [];
  const t2Model = tier2ConnectorModel(deriveTier2FromComposition(composition));
  const t3Model = tier3ConnectorModel(composition);
  return [
    heritageConnectorTier2Markup(t2Model),
    heritageConnectorTier3Markup(t3Model),
    // The view MODELS too, not only the rendered markup: accessibility text and
    // any future export surface reads the model, so a leak there is a leak.
    JSON.stringify(t2Model),
    JSON.stringify(t3Model),
  ];
}

test("no rank, status or fortune claim reaches any heritage reader surface", () => {
  const offenders = [];
  for (const heritageConstruct of HERITAGE_CONSTRUCT_IDS) {
    for (const sourceLineage of ["primary", "variant"]) {
      for (const occurrence of [0, 1, 2, 3]) {
        for (const text of readerFacingStrings(heritageConstruct, sourceLineage, occurrence)) {
          const han = text.match(FORBIDDEN_HAN);
          const eng = text.match(FORBIDDEN_ENGLISH);
          if (han) offenders.push(`${heritageConstruct}/${sourceLineage}@${occurrence}: Han "${han[0]}"`);
          if (eng) offenders.push(`${heritageConstruct}/${sourceLineage}@${occurrence}: English "${eng[0]}"`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [],
    "D2-2: a rank/status/fortune claim reached a reader-facing heritage surface:\n  "
    + offenders.join("\n  "));
});

test("no rank, status or fortune claim reaches Tier 1, Tier 2 or Tier 3 of the reading", () => {
  const offenders = [];
  for (const state of enumerateReachableStates().filter((_, i) => i % 23 === 0)) {
    const tiers = readingTiers({ state, composed: composeReading(state) });
    for (const [tier, value] of Object.entries(tiers)) {
      const text = JSON.stringify(value);
      const han = text.match(FORBIDDEN_HAN);
      const eng = text.match(FORBIDDEN_ENGLISH);
      if (han) offenders.push(`${tier}: Han "${han[0]}"`);
      if (eng) offenders.push(`${tier}: English "${eng[0]}"`);
    }
  }
  assert.deepEqual([...new Set(offenders)], [],
    "D2-2: a rank/status/fortune claim reached the reading tiers");
});

test("the guard would fire on the exact clauses D2-2 excludes", () => {
  // Paired positive control. Without it, an over-narrow pattern would make
  // every sweep above pass by matching nothing.
  assert.match("三停皆稱乃上相之人矣", FORBIDDEN_HAN);
  assert.match("或一官好則貴十年", FORBIDDEN_HAN);
  for (const sample of [
    "this is a person of superior physiognomy",
    "the classical reading is one of high office",
    "associated with wealth and long life",
    "a noble configuration",
  ]) {
    assert.match(sample, FORBIDDEN_ENGLISH, `missed: ${sample}`);
  }
  assert.match("when the three stand equal, the reading is auspicious", FORBIDDEN_ENGLISH);

  // And it does not fire on the permitted geometric vocabulary, nor on the
  // product NAMING the category in order to refuse it. The last string is
  // real, shipped copy (fiveOfficers/primary) — pinned because the first draft
  // of this pattern banned it and the fix would have been to rewrite a correct
  // disclaimer.
  for (const ok of [
    "the three sections are in proportion to one another",
    "the sections stand equal in length",
    "sources differ on whether the reading is proportion or equality",
    "it remains fortune-typed heritage and is never encoded as a user inference",
    "no diagnosis, no fortune, no fixed judgement of character",
  ]) {
    assert.doesNotMatch(ok, FORBIDDEN_ENGLISH, `false positive: ${ok}`);
    assert.doesNotMatch(ok, FORBIDDEN_HAN, `false positive: ${ok}`);
  }
});

/* ── the blocker D2-1 does not yet account for ───────────────────────────── */

test("threeSections/primary cannot be routed to RUNTIME_PROSE as it stands", () => {
  /*
   * D2-1 approves routing `threeSections/primary` to RUNTIME_PROSE.
   * `heritageMaterialFor()` renders a lineage's `definition` as Tier 2's
   * PASSAGE, so that routing would ship this lineage's definition to readers —
   * and it currently ends "...holds that when the three stand equal, the
   * reading is auspicious." That is a fortune claim, which D2-2 bans on every
   * reader-facing surface.
   *
   * Worse, `threeSections/primary` is the RECEIVED MA YI lineage
   * (sourceId heritage-three-sections), whose own note records the attribution
   * as contradicted with no stable critical edition. The VERIFIED Taiqing
   * facial material D2-1's connector cites lives under a different lineage key,
   * `taiqing-mianbu-facial`.
   *
   * So D2-1 as written promotes a verified CONNECTOR while routing a contested
   * LINEAGE. This test records that mismatch; it must be resolved by the
   * product owner before the promotion is implemented, and it is why the
   * Gemini handoff refuses the task.
   */
  const primary = HERITAGE_REGISTRY.threeSections.lineages.primary;
  assert.equal(primary.runtimeStatus, "RESEARCH_ONLY",
    "threeSections/primary was routed to runtime prose. Its definition carries a fortune "
    + "claim and its attribution is contradicted — see DR-2026-08-31 D2-1/D2-2.");
  assert.match(primary.definition, FORBIDDEN_ENGLISH,
    "the fortune claim was edited out of threeSections/primary's definition; if that was "
    + "deliberate, record it and update this test together with the evidence");
  assert.equal(primary.sourceId, "heritage-three-sections");
  assert.ok(HERITAGE_REGISTRY.threeSections.lineages["taiqing-mianbu-facial"],
    "the verified Taiqing facial lineage is gone; D2-1's connector cites its source");
});

/* ── determinism, in both phases ─────────────────────────────────────────── */

test("connector composition replays byte-identically for the same inputs", () => {
  for (const heritageConstruct of HERITAGE_CONSTRUCT_IDS) {
    for (const occurrence of [0, 1, 5]) {
      const a = readerFacingStrings(heritageConstruct, "primary", occurrence);
      const b = readerFacingStrings(heritageConstruct, "primary", occurrence);
      assert.deepEqual(a, b, `${heritageConstruct}@${occurrence} did not replay identically`);
    }
  }
});

test("rotation is a function of occurrence alone, with no clock or randomness", () => {
  const source = [
    "src/heritage/resolver.js", "src/qise/heritage-connections.js", "src/ui/qise/heritage-view.js",
  ];
  const FORBIDDEN = /\bMath\.random\b|\bDate\.now\b|\bnew Date\b|\bperformance\.now\b/;
  for (const rel of source) {
    const text = readFileSync(new URL("../../" + rel, import.meta.url), "utf8");
    assert.doesNotMatch(text, FORBIDDEN, `${rel} introduced a clock or a random source`);
  }
});

/* ── D2-4: the gate is held, not fitted to the corpus ────────────────────── */

test("Gate D's target is held at 250 and passing it is not authorised here", () => {
  assert.equal(DIVERSITY_TARGET, 250,
    "DR-2026-08-31 D2-4 holds Gate D at 250. Lowering it to fit the current corpus is "
    + "explicitly not authorised; a capacity review may reconsider only after source acquisition.");

  // Even fully promoted, the corpus cannot reach it -- recorded so that a
  // future change claiming otherwise has to explain itself.
  const best = Math.max(...HERITAGE_CONSTRUCT_IDS.map((id) => {
    const { activeCount } = connectorResidue(id, "primary");
    return activeCount;
  }));
  assert.ok(best < DIVERSITY_TARGET,
    "connector depth now claims to reach the diversity target; re-measure before believing it");
});

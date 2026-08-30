# Decision cards

**Status: historical decision-card inventory, 30 August 2026.** The closed-beta runtime amendment
dated 31 August 2026 is recorded in `docs/DECISION_REGISTER.md`; the cards below remain the
underlying evidence/options record and are not a claim that beta runtime is disabled. Per brief
and per `docs/AGENTS.md`'s standing rule, absence of a decision is
`UNDECIDED`, never inferred by an agent. Each card states options, evidence, the consequence both
ways, and — where research supports one — a labelled recommendation that is **not** an approval.
The product owner records approval, if given, as a new dated entry in `docs/DECISION_REGISTER.md`
referencing the card below by name.

---

## CARD 1 — Charter amendment: persisting a daily face photograph

**The conflict.** `docs/PROJECT_CHARTER.md` states: "Raw camera frames are processed in volatile
memory, are not uploaded and are not persisted. Only explicitly allow-listed derived records may
be stored locally." `AGENTS.md` states the same constraint independently: "Raw frames remain in
volatile memory and are not persisted or transmitted." `docs/PRODUCT_NORTH_STAR.md`'s Daily
Portrait pillar requires a persisted photograph, by definition — a "growing visual history" is not
possible from data that is discarded every session.

**Options.**
- **A. Amend the charter** to state precisely what may now be persisted (a timeline *display
  frame*, per `docs/DAILY_PORTRAIT_ARCHITECTURE.md`'s measurement/display separation — never the
  raw measurement-path capture, which stays volatile-only exactly as today) and why the
  measurement-path guarantee is unaffected. This is the only option that lets PR C proceed.
- **B. Do not amend the charter; do not build Daily Portrait's photo-persistence layer.** The
  product remains what it is today, plus the architecture, governance and heritage-readiness work
  in this PR, with Daily Portrait staying a documented but unbuilt direction.

**Consequence of A.** `CONSENT_VERSION` in `src/qise/consent.js` (currently `"qise-consent-v3"`)
is a Qi Se-specific consent version and is not itself bumped by this decision unless Daily
Portrait shares that consent domain — see Card 2. If Daily Portrait gets its own consent domain,
it gets its own version constant and its own re-prompt-on-change discipline, modelled on but
separate from Qi Se's. The charter's measurement-path guarantee (raw frames volatile-only) is
**unaffected either way** — `docs/DAILY_PORTRAIT_ARCHITECTURE.md`'s separation rule exists
precisely so amending the charter for the *display* frame does not touch the *measurement* frame's
existing, tested guarantee.

**Consequence of B.** PR C does not begin. This PR's architecture documents remain a specified,
reviewed, not-yet-implemented direction, and the product owner can approve later without any
further Claude research pass — the documents in this PR are the specification.

**Research recommendation:** A, because it is the only option consistent with the approved north
star, and the amendment can be scoped narrowly enough (display frame only, measurement path
provably unaffected, tests specified in `docs/DAILY_PORTRAIT_ARCHITECTURE.md`) that it does not
weaken the guarantee the charter's current wording protects. **This is a recommendation, not an
approval.**

---

## CARD 2 — Consent-domain separation

**The question.** Should Daily Portrait storage consent be a separate consent domain from Qi Se
processing consent, backup authorisation, and heritage presentation — or should all Daily Portrait
processing simply extend Qi Se's existing single consent gate?

**Options.**
- **A. Separate domains.** Each of {Daily Portrait storage, Qi Se processing, backup
  authorisation, heritage presentation} gets its own consent record and its own withdrawal path.
  Enables the architecture invariant in `docs/DAILY_PORTRAIT_ARCHITECTURE.md` ("Daily Portrait
  remains useful even when no Qi Se result can be produced") to extend to consent itself — a user
  could, in principle, use the timeline without ever consenting to Qi Se measurement.
- **B. One combined domain**, extending `src/qise/consent.js`'s existing single gate to cover
  Daily Portrait too. Simpler to implement and reason about; forecloses the "timeline without Qi
  Se consent" possibility as a product option, at least until a future migration.

**Until decided, existing behaviour is preserved unchanged.** `src/qise/consent.js`'s `withdraw()`
already requires a mandatory `deleteAll` argument and could not be called without one — that
structural guarantee is not weakened by this card being open. If Card 1 is approved and PR C
proceeds before this card is decided, PR C defaults to **Option B's shape** (extend the existing
gate) specifically because it is the conservative, already-proven-safe pattern; migrating to
separate domains later is additive, not a weakening of anything shipped in the meantime.

**Research recommendation:** none stated — this is a product-shape decision (whether "timeline
without measurement" should ever be a real user path) more than an evidence question, and belongs
to the product owner without a research thumb on the scale.

---

## CARD 3 — Original vs. canonical image retention

**The question.** Does the Daily Portrait archive retain: **(A)** the canonical (aligned,
cropped) display frame only; **(B)** the canonical frame locally, with the original full-resolution
capture retained only in an optional backup; or **(C)** both original and canonical, always, both
locally and in backup?

| | Storage cost | Privacy exposure | Future reprocessing | Restoration quality | Portability | Timeline quality | Matches user expectation |
|---|---|---|---|---|---|---|---|
| **A. Canonical only** | Lowest | Lowest — only the derived, stable frame ever exists | None possible — if alignment improves later, old frames cannot be re-aligned from a better original | Full — canonical frame is the only artefact and it's what's shown | Simplest export | Best available today | Matches "photo apps show me my photo," but surprising if a user later wants their *original*, unaligned shot back |
| **B. Canonical local, original in backup only** | Moderate — original only exists where backup is enabled | Moderate — original exists, but only where the user opted into backup | Possible, but only for backed-up days, and only after a restore | Full, for backed-up days; canonical-only for local-only days | More complex export (two artefacts, one conditional) | Same as A day-to-day; better if reprocessing ever matters | Reasonable middle ground, but the inconsistency (some days have originals, some don't, depending on backup timing) needs clear UI |
| **C. Both, always** | Highest — roughly double the image storage for every single day, forever | Highest — the unaligned original (which may include more background/context than the cropped canonical) always exists somewhere | Always possible | Full | Most complete but heaviest export | Same as A/B for display | Most conservative for a user who might one day want the raw shot, at the cost of storage this document already flags as not unlimited |

**Research recommendation:** **A now, with B as a documented future option** if reprocessing ever
becomes a real need (e.g., an alignment-algorithm improvement the product owner wants applied
retroactively) — recommended because `docs/LOCAL_AND_CLOUD_DATA_ARCHITECTURE.md` already
establishes that storage is not unlimited and must not be silently pruned, and doubling per-day
storage forever (C) trades against that without a concrete need identified yet. **Not an
approval** — this is exactly the kind of storage-heavy default the plan explicitly said must not be
chosen silently.

---

## CARD 4 — Encryption and key recovery

**The question.** Is client-side, genuinely end-to-end encryption of the backup archive approved,
and if so, which key-recovery mechanism (user passphrase / generated recovery key / platform
credential / a combination)?

**Evidence.** Fully worked in `docs/BACKUP_ARCHIVE_FORMAT.md`'s encryption section and
`docs/SECURITY_PRIVACY_THREAT_MODEL.md`'s threat table. The core tension: real end-to-end
encryption (no server-side escrow) means a lost key is unrecoverable by design; any recovery
mechanism that removes that risk (e.g., server-held escrow) removes the "end-to-end" property
being claimed.

**Options.** As enumerated in `docs/BACKUP_ARCHIVE_FORMAT.md`: user passphrase alone; generated
recovery key alone; platform credential alone; or a combination (e.g., passphrase with a
one-time-shown recovery key as a fallback, both user-held).

**Research recommendation:** a generated recovery key, shown once at setup with an explicit,
honest "write this down, we cannot recover it for you" message, as the primary mechanism, because
it does not depend on the user choosing a memorable-but-weak passphrase and does not depend on a
platform credential store's own availability across all target devices. **Not an approval** — this
is exactly the kind of "can we truthfully say end-to-end" claim the plan required routing to the
product owner rather than deciding unilaterally.

---

## CARD 5 — Multi-device policy

**The question.** Is `docs/BACKUP_ARCHIVE_FORMAT.md`'s v1 constraint (one active writing device,
`conflict` surfaced rather than merged) approved as the shipped policy, or is full multi-device
conflict resolution required for v1?

**Research recommendation:** approve the one-active-writer constraint for v1, because the
alternative (real conflict resolution across devices for a face-photo archive) is exactly the kind
of "architecturally significant" work the plan named as something not to build speculatively
before a simpler, safer version has shipped and been used. **Not an approval.**

---

## CARD 6 — Qi Se safety authorisation

**Closed-beta status:** superseded as a runtime off-switch by
`DR-2026-08-31-REFLECTION-BETA-RUNTIME`. The card remains the historical options/evidence record;
the beta uses the named `QISE_BETA_SAFETY_AUTHORIZATION` policy while commercial and legal review
remain separate.

**Carried forward, unchanged by this session**, from
`docs/heritage-evidence/SAFETY_AUTHORIZATION_INTERFACE.md` §3(a)/(b). The question remains exactly
as that document states it: either **(a)** a product-owner determination that Qi Se needs no
safety-referral gate (with `safetyPassed` supplied as `true` only via a single named decision
constant, never a bare literal), or **(b)** an actual Qi Se safety signal designed and built — out
of scope for this program.

**Pre-amendment status (historical):** the earlier implementation recorded
`SAFETY_AUTHORIZED = NOT_GRANTED` because no authoritative safety signal was supplied and
`gateStatus(undefined)` failed closed. That was the pre-beta runtime state. The 31 August
closed-beta amendment explicitly supersedes that off-switch with the named
`QISE_BETA_SAFETY_AUTHORIZATION` policy; it does not claim a clinical signal exists or clear
commercial/legal obligations.

---

## CARD 7 — Five Mountains lineage routing

**Closed-beta status:** the historical recommendation below is superseded for the beta runtime by
the explicit Taiqing witness route recorded in `DR-2026-08-31-REFLECTION-BETA-RUNTIME`. The card's
disagreement and multi-witness caution remain valid analytical context.

**Carried forward, unchanged by this session**, from
`docs/heritage-evidence/PRODUCT_OWNER_DECISIONS.md` (renamed in this PR to
`docs/heritage-evidence/RESEARCH_RECOMMENDATION_PACK.md` — see A5). Research recommends
**D now** (keep `ABSTRACT_LINEAGE_OVERRIDES` empty; the abstract `"primary"` rotation slot stays
unrouted, rendering as "measured geometry plus a note that the classical rule needs multiple
witnesses") **with E as the future direction** (a genuine multi-witness render path, which may
require a change to frozen Stage 2 semantics and so needs its own review before being attempted).
**Options A/B/C (routing to one single witness) are not recommended** — each would silently
privilege one lineage's `相朝`/`豐隆` predicate set over the others' and erase a documented
disagreement. `ABSTRACT_LINEAGE_OVERRIDES` stays `{}` in this pass; see B1 for confirmation that
this pass does not touch it.

---

## CARD 8 — SUPERSEDE R7 with new pinned evidence?

**The conflict.** `docs/DECISION_REGISTER.md`'s `DR-2026-08-17-B020-CLASS-A` records R7 as
**approved**: ship the five-type Five Elements reduction while stating that 靈樞·陰陽二十五人
defines twenty-five. This session's evidence-reconciliation pass (B1) may show that no pinned
*physiognomic* witness in the project-owned corpus ever established a 25-fold *physiognomic*
subdivision — meaning the medical Ling Shu framework and the physiognomic Five Forms system may
have been conflated in R7's own stated basis.

**Why this is a decision card, not an automatic correction.** The underlying evidentiary claim
(no physiognomic 25-fold witness exists) may be a plain fact this pass can record. Whether that
fact **supersedes R7's approved reader-facing disclosure**, and whether it **changes what is
eligible to render at runtime**, are `PRODUCT_POLICY_AFFECTING`/`RUNTIME_AFFECTING` changes under
B1's classification — routed here, not applied, regardless of how clear the evidentiary case looks.

**Options.**
- **A. Supersede R7 as recommended (see below).** Rewrite the Five Elements reader-facing
  disclosure to state the medical-parallel finding as a related-system note, without implying the
  25-fold structure has physiognomic standing. Runtime eligibility for the five-type reduction
  itself is unaffected (the reduction was always presented as a reduction, per R7's original
  text); what changes is only the disclosure's characterisation of the twenty-five-type source.
- **B. Retain R7 exactly as currently approved.** No change to reader-facing copy or runtime
  eligibility; the new evidence is recorded (B1's `EVIDENCE_FACT_ONLY` row) but not acted on
  pending further review.
- **C. A stronger correction** — if the product owner judges the conflation more serious than a
  disclosure wording fix (e.g., that the five-type reduction itself should not cite 靈樞·陰陽二十五人
  at all, even as a caveated parallel) — a full re-derivation of the Five Elements disclosure from
  only the pinned physiognomic sources, with the medical system dropped from the customer-facing
  copy entirely and kept only in scholarly evidence records.

**Research recommendation:** Option A — correct the disclosure to accurately characterise
靈樞·陰陽二十五人 as a related medical framework rather than physiognomic evidence for the
twenty-five-fold structure, while leaving the five-type reduction's runtime eligibility untouched,
because the reduction's own defensibility (a five-type simplification is a legitimate editorial
choice, independent of whether the twenty-five-type medical text is physiognomic evidence) does
not depend on the conflation being corrected. **This is a recommendation, not an approval — R7's
current reader-facing disclosure and current runtime eligibility are unchanged in this session's
shipped code**, per B1.

---

## CARD 10 — Twelve Palaces construct runtime status

**The question.** `docs/heritage-evidence/REPO_RECONCILIATION_MATRIX.md`'s EV-13 promotes the
`twelvePalaces.lineages["taiqing-yuguan"]` lineage's evidence to `VERIFIED_PRIMARY` (the 十二宮
system is now byte-pinned at `<pb:KR3g0045_WYG_001_17b>`, 太清神鑑 卷一 成和子統論). This is a
factual, applied correction (B1: `EVIDENCE_FACT_ONLY`/`LOCATOR_ONLY`). Separately — and not applied
by this pass — is whether the **construct's** overall `runtimeStatus` (currently
`RECORDED_NOT_VERIFIED` at the `twelvePalaces` record level; the `taiqing-yuguan` lineage itself is
`HERITAGE_ONLY`) should change as a result, i.e. whether Twelve Palaces should become eligible for
a stronger runtime presentation than it has today.

**Why this is a decision card, not an automatic promotion.** A single lineage's evidence being
byte-pinned is a fact about that lineage. Whether the *construct* — which still carries an open,
unresolved disagreement (`twelve-palaces-constituents`) between the byte-pinned Taiqing witness and
the unpinned received-Mayi/神相全編 mapping — should be presented more assertively at runtime is a
product/content decision about how much weight one witness's strength should carry for the whole
construct, not a mechanical consequence of that witness's own promotion.

**Options.**
- **A. No change.** Leave `twelvePalaces`'s construct-level `verificationStatus` and every
  lineage's `runtimeStatus` exactly as they are; the `taiqing-yuguan` lineage's evidence strength is
  corrected, but nothing about what is eligible to render changes.
- **B. Promote the construct's presentation** to reflect that at least one lineage now has
  fully verified, byte-pinned evidence, while explicitly retaining the open disagreement's
  unresolved status alongside it.

**Research recommendation:** A (no change) for this pass, because the open
`twelve-palaces-constituents` disagreement is exactly the kind of thing a promoted presentation
could obscure if not designed carefully — and designing that presentation is scoped work, not a
side effect of an evidence correction. **Not an approval.**

---

## CARD 11 — Kanripo surrogate rights (project-owned acquisition, all pinned records)

**Carried forward, unchanged by this session**, from matrix row SR-18. The project-owned Kanripo
acquisition (KR3g0043/0044/0045/0046) found an explicit **organisation-level CC BY-SA 4.0
declaration** covering the source repositories — not carried in-surrogate on individual files, and
ShareAlike's commercial-use implications for this product are unresolved. Every `SOURCE_REGISTRY`
record pinned by this acquisition (SR-01 through SR-16, plus the three new records SR-05/14/15)
keeps `surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED"` exactly as before — **not** moved to
`CLEARED`, and not touched by this pass's evidence-strength or locator corrections, which are
citation-ladder facts, not rights determinations. This requires product-owner and/or counsel
review before any of this content could be treated as commercially cleared, independent of how
well-attested the underlying scholarship now is.

---

## CARD 9 — Analytics boundary

**The question.** Should any event in `docs/SECURITY_PRIVACY_THREAT_MODEL.md`'s named-but-
unimplemented aggregate-telemetry taxonomy actually be implemented?

**Research recommendation:** none. This is a product/privacy-posture decision with no evidence
gap to research — the taxonomy exists so that *if* the product owner ever wants aggregate
retention metrics, the event names and their privacy boundary are already thought through, not so
that Claude can recommend turning them on.

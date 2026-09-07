Status: SUPERSEDED — historical record only.

The independent cultural-review dependency described in this document was retired by DR-2026-08-19-CULTURAL-REVIEW-RETIREMENT. Reviewer-dependent classes and approval requirements below are retained only as historical context and are not active release requirements.

# B-020 — R1–R14 disposition package

**Historical status (17 August 2026):** awaiting disposition. Nothing in this recommendation package was approved when it was prepared.
Prepared 17 August 2026 from `OPTION_B_020_DOSSIER.md` §12 and `PRODUCT_DESIGN_V2.md`.

**Current synchronization (30 August 2026):** `DR-2026-08-17-B020-CLASS-A` records R1, R2, R4, R5, R7, R10, R11, R12, R13 and R14 as approved. R3, R6, R8 and R9 remain open. `DR-2026-08-19-CULTURAL-REVIEW-RETIREMENT` retires the independent cultural-review requirement; it does not itself decide those four rows and does not weaken rights, safety, provenance or evidence-integrity gates.

Recommendations are recommendations. The implementer cannot record the verdict —
`docs/OPTION_B_EXECUTION_PLAN.md` reserves that for the named independent owner,
and B-020's acceptance criteria name a source/cultural reviewer specifically.

**The corpus currently shipped behind the `on` flag already embodies every
recommendation below.** That is an implementation fact, not a substitute for a
disposition: ten rows are approved in the decision register, while R3, R6, R8
and R9 remain open. Amending a row means changing corpus content, which the
"corpus/code consequence" column sizes.

## Who can sign what

| Class | Rows | Who |
|---|---|---|
| **A — product owner alone** | R1, R2, R4, R5, R7, R10, R11, R12, R13, R14 | You. Naming, scope, engineering and safety-posture decisions. |
| **B — previously required reviewer** | R3, R6, R8, R9 | A named, qualified Mian Xiang reviewer. These are claims about what a tradition says, or about representing it. |
| **C — needs legal review before any paid build** | R8, R9, R11 (in part) | R8 touches representation; R9 and R11 touch EU AI Act Art. 5(1)(g) and FDA/FTC exposure. |

R8 and R9 appear in more than one class deliberately: each needs both a cultural
and a legal view, and neither substitutes for the other.

The independent cultural-review requirement was retired by
`DR-2026-08-19-CULTURAL-REVIEW-RETIREMENT`. That retirement changes the required
review path; it does not itself decide R3, R6, R8 or R9. The Class B and C labels
below are historical rationale and risk classification, not active release
requirements. The open rows still require an explicit product-owner disposition,
with legal review still required where the records say so.

---

## The table

### R1 — "Three Courts" or "Three Sections"?

- **Recommended:** rename to **Three Sections**.
- **Product consequence:** the construct's English name changes everywhere it appears; the Chinese 三停 is unchanged.
- **Corpus/code consequence:** one identifier (`threeSections`, already used), one heritage entry, six reflection cells. No state-model change. Free now; expensive once corpus IDs are minted and stored on records.
- **Evidence:** dossier §3 — "Three Courts" could not be verified against any scholarly source; 停 does not mean "court". Hypothesis, flagged as hypothesis: contamination from Western aesthetic-proportion English.
- **Risk if accepted:** a term some existing users may have seen changes. Minimal.
- **Risk if rejected:** we ship a rendering with no textual warrant and no source to cite when asked.
- **Class:** A.

### R2 — Is Harmony one of the six enduring constructs?

- **Recommended:** **out** of the six; kept in the product, relabelled as a computed proportion score; stays in the rights register.
- **Product consequence:** Harmony is presented as our own measure, not as a tradition claim.
- **Corpus/code consequence:** none in the reflection engine (Harmony has no heritage entry). One line in the rights audit's family table changes meaning.
- **Evidence:** `src/reading/harmony.js` computes an aesthetic score; the dossier found no source text defining it as a construct. `commercial-rights-audit.md` nonetheless lists "Proportion harmony" as a family needing evidence — the neoclassical proportion source is recorded as unspecified.
- **Risk if accepted:** none identified.
- **Risk if rejected:** we would need to source a construct that appears to have no classical basis, which is likely unclosable.
- **Class:** A.

### R3 — Four Rivers: carry both 目/口 lineages, or select one?

- **Recommended:** **carry both**, tagged by lineage.
- **Product consequence:** the same construct can present two readings on different days, with the disagreement stated. This is the single most distinctive thing in the heritage layer.
- **Corpus/code consequence:** already built — `sourceLineage` is a reading-affecting dimension with `primary` and `variant` entries. Selecting one instead would remove a dimension from the state model and shrink the space.
- **Evidence:** dossier §7, read verbatim in the primary texts. 太清神鑑 and 人倫大統賦 give 目=淮, 口=河; 神相全編 and the 神異賦 commentary give 目=河, 口=淮. Both are internally reinforced. Contemporary sources reproduce the split without noticing it.
- **Risk if accepted:** a user could find the variation confusing if the disclosure is weak. Mitigated by the lineage attribution already shipped.
- **Risk if rejected:** picking one silently asserts a resolution to a thousand-year-old disagreement that we have no standing to make.
- **Class:** **B** — which lineage is presented as primary is a cultural judgement.

### R4 — 北岳: 頷 (mandible), 頦 (menton), or 地閣 (lower-face zone)?

- **Recommended:** **頦**, menton point (MediaPipe idx 152); the other two versioned as alternatives.
- **Product consequence:** one landmark, testable and implementable, rather than a contour or a region.
- **Corpus/code consequence:** affects B-025's coverage matrix, not the current corpus. One heritage note already states the disagreement.
- **Evidence:** dossier §6 — 神相全編 and 人倫大統賦 both give 頦; 太清神鑑 gives 頷; the 神異賦 commentary gives 地閣, defined as a region. Majority reading, and the only one that is a single point.
- **Risk if accepted:** we adopt the majority over the earliest witness.
- **Risk if rejected:** a zone or contour target that cannot be tested for accuracy.
- **Class:** A (engineering).

### R5 — 中岳: 鼻 (whole nose) or 準頭 (pronasale)?

- **Recommended:** **鼻**.
- **Product consequence:** negligible — the traditional criterion is 高隆 (prominence), which a front-facing capture cannot recover, so this region abstains either way.
- **Corpus/code consequence:** B-025 only.
- **Evidence:** dossier §6 — four witnesses give 鼻; 準頭 appears in one line (雜說中篇 / 袁柳莊雜論中篇).
- **Risk if accepted:** none material.
- **Risk if rejected:** none material.
- **Class:** A.

### R6 — 五官: physiognomic membership (with 眉) or Neijing (with 舌)?

- **Recommended:** **physiognomic**, and 保壽官's longevity semantics stripped.
- **Product consequence:** the Five Officers ship as ear, eyebrow, eye, nose, mouth. The tongue is never read.
- **Corpus/code consequence:** the current heritage entry already uses the physiognomic five and already omits the eyebrow's longevity title, stating that it does so deliberately.
- **Evidence:** dossier §5. These are two different constructs sharing a name. The Neijing set (靈樞·五閱五使, verbatim) is explicitly organ-correspondence doctrine — shipping it is a diagnostic claim. The tongue is also not visible in a face capture.
- **Risk if accepted:** we present the divination taxonomy and not the medical one, which some TCM practitioners will consider the wrong 五官.
- **Risk if rejected:** the Neijing membership carries pathophysiological semantics into a General Wellness product.
- **Class:** **B** and **C** — cultural on which construct is meant, legal on the organ-mapping exposure.

### R7 — Five Elements: 25 types, or 5 with a stated caveat?

- **Recommended:** **5, with the source's 25-type structure stated plainly.**
- **Product consequence:** the app says what almost no competitor says — that the reduction is a reduction.
- **Corpus/code consequence:** already shipped in the heritage note.
- **Evidence:** dossier §4 — 靈樞·陰陽二十五人 subdivides five forms by five pentatonic tones into 25. The tonal subdivision has no visual correlate and is not implementable from a photograph.
- **Risk if accepted:** none identified.
- **Risk if rejected:** implementing 25 is not possible from the available signal.
- **Class:** A.

### R8 — 妻妾宮 and 奴僕宮: literal, modernised, or suppressed?

- **Recommended:** **suppressed** from user-facing output; retained in the source notes as historical record.
- **Product consequence:** ten of the twelve palaces are readable; two are documented but never rendered as a reading about the user.
- **Corpus/code consequence:** a suppression list in the Twelve Palaces entry. Not yet built — the current corpus has one Twelve Palaces heritage entry that does not enumerate palaces.
- **Evidence:** dossier §2. 妻妾宮 is explicitly polygynous; 夫妻宮 is a modern substitution, not a translation. 奴僕宮 is servile. Rendering either literally is offensive; modernising is a silent editorial act that misrepresents the source.
- **Risk if accepted:** we omit two of twelve regions and must say why.
- **Risk if rejected:** either offensive output, or an undisclosed rewriting of a primary source.
- **Class:** **B** and **C**.

### R9 — Colour (五色) as classifier input: confirm exclusion.

- **Recommended:** **excluded. Not negotiable.**
- **Product consequence:** Five Elements typing uses geometry only. Qi Se still measures colour — but only as a within-subject delta against the user's own baseline, never as a between-subject type.
- **Corpus/code consequence:** already true of the reflection engine. Requires a standing test in B-025/B-070 that element assignment does not correlate with skin tone.
- **Evidence:** dossier §4 and §10.2 P6. Complexion (蒼/赤/黃/白/黑) is intrinsic to the classical typology, so a faithful implementation is bias-generating by construction. EU AI Act Art. 5(1)(g) prohibits biometric categorisation to infer race — an outright prohibition, not a risk tier.
- **Risk if accepted:** we are less faithful to the source. Stated openly, that is a feature.
- **Risk if rejected:** a prohibited practice under EU law.
- **Class:** **B** (fidelity) and **C** (prohibition). **Recommend this row is not treated as optional.**

### R10 — Left/right convention, and 男左女右?

- **Recommended:** **subject-side, documented, with a mirroring test in CI. Reject 男左女右.**
- **Product consequence:** east/west peaks map consistently for every user regardless of gender.
- **Corpus/code consequence:** B-025. MediaPipe indices are image-space and mirrored relative to the subject; a naive mapping inverts 東岳/西岳 for everyone.
- **Evidence:** dossier §6 — no retrieved source states whether 左/右 means the subject's side or the viewer's, and the gendered rule is unattested in every text retrieved.
- **Risk if accepted:** we adopt a convention the sources do not state, and say so.
- **Risk if rejected:** output depends on declared gender — a fairness problem we would be inventing.
- **Class:** A.

### R11 — Accept all 14 prohibited inferences as absolute constraints?

- **Recommended:** **accept.**
- **Product consequence:** no lifespan, mortality, prognosis, wealth, rank, character, intelligence, criminality, race, emotion or named-condition output, ever, in any mode.
- **Corpus/code consequence:** already enforced by `no-medical-language.test.js`, `no-absolutes.test.js`, `copy-lint.test.js` and the parity claim profile. Accepting makes them permanent rather than current.
- **Evidence:** dossier §10 — each traces to retrieved regulatory text (FDA General Wellness, FTC Health Products Compliance Guidance, EU AI Act Art. 5) or to a classical line making the claim.
- **Risk if accepted:** some traditional content can never be surfaced.
- **Risk if rejected:** General Wellness status is not defensible, and under the Australian TGA excluded-goods determination one non-conforming feature voids the exclusion for the whole product.
- **Class:** A, with **C** confirmation before any paid build.

### R12 — Malar-rash gate: non-specific copy?

- **Recommended:** **yes** — suppress all output, generic message, finding not named.
- **Product consequence:** the gate says the image cannot be analysed and suggests a professional, without stating what was detected.
- **Corpus/code consequence:** the gate does not exist in code yet. `src/zones.js` and `src/qise/rois.js` reference a malar gate in comments; no detector ships.
- **Evidence:** dossier §10.3. Naming a clinical sign is a device claim regardless of the wrapper.
- **Risk if accepted:** a user is not told what was seen. That is the point.
- **Risk if rejected:** a diagnostic-adjacent output in a General Wellness product.
- **Class:** A, with **C** confirmation.

### R13 — Remove 假神; hard-code gate precedence?

- **Recommended:** **yes**, and make precedence a negative test rather than a convention.
- **Product consequence:** false-shen never appears. Any fired gate suppresses everything downstream, heritage included.
- **Corpus/code consequence:** 假神 is already absent from the corpus. Precedence needs the gate to exist first (see R12).
- **Evidence:** dossier §8. 假神's cardinal sign is 兩顴泛紅如妝 — the same pixels the malar gate owns. 靈樞·五色 attaches an explicit mortality prediction to malar erythema.
- **Risk if accepted:** none identified.
- **Risk if rejected:** two modules competing for the same pixels, one of them carrying a death claim.
- **Class:** A.

### R14 — Earlobe-crease gate: re-scope or withdraw?

- **Recommended:** **withdraw from v1** and amend the project charter.
- **Product consequence:** the charter currently names a critical safety gate that has never been able to run.
- **Corpus/code consequence:** charter text. `src/engine.js:227` already records `diagonal_crease: "needs an ear detector; the face mesh has no earlobe points"` — the codebase knew before the dossier did.
- **Evidence:** dossier §7, verified against MediaPipe's `canonical_face_model.obj`: 468 vertices, no helix, antihelix, tragus, concha or lobule. Only 10 vertices sit posterior to z = −1.5.
- **Risk if accepted:** the charter's safety-gate claim is reduced to one gate.
- **Risk if rejected:** we keep a written commitment to a control that cannot be built from the current capture, which is worse than not having it.
- **Class:** A, with **C** noting that the charter is a compliance artefact.

---

## Historical approval workflow

At the time this package was prepared, rows in class A could be recorded in
`DECISION_REGISTER.md` immediately and the corpus updated in the same change.
Rows in class B and C were held for the independent-review and legal gates then
specified. **No amount of agreement between us satisfied those gates.**

The current decision state is the register and the synchronized evidence record:
R3, R6, R8 and R9 are still open, and the heritage layer stays behind the flag
on internal origins only. The commercial-rights audit remains a separate gate.

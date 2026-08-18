# Legal questions that do not wait for cultural review

**Prepared 17 August 2026.** Two tracks, deliberately separated.

Most legal questions here depend on what the cultural reviewer concludes — there
is no point asking counsel to opine on Twelve Palaces copy that may change. But
**three questions do not depend on any cultural finding at all**, and holding
them behind the reviewer would extend the critical path for no reason.

Send Track 1 now. Track 2 waits.

---

# TRACK 1 — send to counsel now

## L1. Ownership of the machine-authored Reflection corpus

**This is the one that matters most and depends on nothing else.**

### The facts, stated plainly

`src/qise/reflection-corpus.js` — every user-facing sentence the Reflection
Engine can produce — was written by **Claude (Anthropic), operating as an agent
under the direction of the product owner**, in a working session on 17 August
2026. It is machine-authored. No human drafted the sentences. Full record and
SHA-256 hashes: `docs/CORPUS_PROVENANCE.md`.

`docs/commercial-rights-audit.md` requirement 3 is "a signed contributor
agreement for modern commentary". **There is no author who can enter an
agreement.** That is not a gap we can close by finding the right person to sign;
it is a category question.

### The questions

1. **What, if anything, does the product owner own** in machine-generated text,
   in each intended paid territory? Jurisdictions differ materially on whether
   AI output attracts copyright at all, and on what human contribution is needed
   if it does.
2. **If it is not owned, does that matter for this product?** The corpus ships
   inside a paid app. Unownable text can still be *used*; it may not be
   *exclusive*. Is non-exclusivity an acceptable commercial position here?
3. **What record substitutes for requirement 3?** If no agreement can be signed,
   what artifact should we produce and hash instead so the release check has
   something real to point at?
4. **Does the direction given change the analysis?** The prompts, the contract
   (`READING_EXPERIENCE_CONTRACT.md`), the constraints and the editorial
   decisions were the product owner's. Whether that constitutes sufficient human
   authorship is the crux.

### Why it cannot wait

It gates `qise-passages-v1` and touches every family that ships composed prose.
It is independent of what a cultural reviewer says about 五官 or 四瀆 — the
question is about authorship, not accuracy. And if the answer requires a
different production method, we would rather know before commissioning more
corpus.

## L2. Terms-of-service scope and consequential-use prohibition

Independent of cultural review because it is about what the ToS must say, not
about content.

- **EU AI Act Art. 5(1)(d)** prohibits criminal-risk prediction from profiling
  or personality traits; **Art. 5(1)(f)** prohibits emotion inference in
  workplace and education contexts. Our product does neither, but a third party
  could try to use it that way.
- **Question:** what wording bans hiring, promotion, tenancy, lending,
  insurance, admissions and law-enforcement use effectively, and should we
  decline to expose an API at all rather than rely on terms?

## L3. Third-party licence positions already determined

We need confirmation, not analysis. Our positions:

| Asset | Our position |
|---|---|
| WHO *International Standard Terminologies on TCM* (2022) | CC BY-NC-SA 3.0 IGO — **NonCommercial**, therefore unusable in a paid build. **Not used.** |
| ctext.org | Terms prohibit automated bulk download. **Not scraped**; reasonable excerpts only. |
| Modern 點校 editions | In copyright per 中華書局 v. 北京國學時代文化傳播公司, Beijing First Intermediate People's Court, 2013. **Not used.** |
| Named translations (Unschuld, Bridges, Yap, McCarthy, Kohn, Mei, Xing Wang) | In copyright. **Not reproduced or paraphrased.** All English renderings original. |
| 四庫全書 (1781), 欽定古今圖書集成 (1726) | Public domain by age. **Designated editions** — see `docs/EDITION_DECISIONS.md`. |
| Shuge scan of 神相全編 Ming 致和堂 | Faithful reproduction of a PD work; **no explicit licence stated by the host**. Used for reference; image files not redistributed. |

**Question:** are any of these positions wrong, and is the Shuge caveat
sufficient?

---

# TRACK 2 — after the cultural review

These depend on findings we do not have.

| Question | Depends on |
|---|---|
| R9 / Q4 — EU AI Act Art. 5(1)(g) confirmation | Whether the reviewer agrees geometry-only remains 五形人, and how we then describe it |
| R11 — the fourteen prohibited inferences across territories | Final copy, which the reviewer may change |
| R12 — non-specific safety-gate copy as a General Wellness posture | Gate copy, once written |
| Requirement 5 per family | Requirement 4 per family |
| Store-policy review | All of the above |

Reviewing Track 2 before the cultural log exists means reviewing twice.

---

## What we are not asking counsel to do

Confirm that our reading of a Ming physiognomy text is correct. That is the
cultural reviewer's, and the two roles are not interchangeable — a lawyer
approving a translation and a sinologist approving a compliance posture are the
same category error in opposite directions.

## What returns and where it goes

Track 1 answers feed:

- **L1** → `docs/CORPUS_PROVENANCE.md`, and whatever artifact replaces
  requirement 3 in `commercial-rights-manifest.json`
- **L2** → terms of service; possibly a decision not to expose an API
- **L3** → `docs/RIGHTS_CLOSURE.md`, confirming or correcting the positions above

As with the cultural review, **no legal gate is marked complete by us**. The
returned advice is hashed in unaltered.

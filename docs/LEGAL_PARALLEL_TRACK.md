# Legal questions for counsel

**Prepared 19 August 2026.**

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
The question is about authorship, not accuracy. And if the answer requires a
different production method, we would rather know before commissioning more
corpus.

## L2. Terms-of-service scope and consequential-use prohibition

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

## L4. EU AI Act - colour-derived biometric typing

- **Question:** Whether colour-derived five elements typing or Four Rivers lineage logic constitutes "biometric categorisation" under the EU AI Act, and what obligations arise.

## L5. Prohibited-inference constraints

- **Question:** Confirm that the fourteen prohibited inferences in `OPTION_B_020_DOSSIER.md` §10.2 are effectively banned across all intended territories.

## L6. General Wellness posture

- **Question:** Review the safety-gate copy for compliance with the "General Wellness" product posture to ensure it does not imply a clinical diagnosis or medical recommendation.

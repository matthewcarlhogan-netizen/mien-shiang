# Product north star

**Status: product-owner direction, 30 August 2026. This document sets the product's centre of
gravity. It does not itself approve any specific implementation — `docs/DECISION_REGISTER.md` and
`docs/DECISION_CARDS.md` carry those. Where this document and an older positioning statement in
`docs/PROJECT_CHARTER.md` differ on emphasis rather than on a compliance constraint, this document
governs, because it is the more recent product-owner direction.**

## Consumer promise

> A private daily portrait through time: one guided frame a day, a growing visual history you
> own, self-relative observations that become richer as your history grows, and a source-attested
> heritage library that adds historical depth without pretending to measure who you are.

## Why the user opens the product today

A guided photograph, taken once, in under a minute, with capture aligned by the existing
scanner-first flow (stable eye line, scale, crop, rotation — see
`docs/DAILY_PORTRAIT_ARCHITECTURE.md`). Today's frame is added to the timeline. If a Qi Se reading
is available for today, the user also sees what changed relative to their own history — never
relative to anyone else's face, never a rating of theirs.

The daily behaviour has to stand on its own the first time it is used, with zero history behind
it (see `docs/DAILY_PORTRAIT_ARCHITECTURE.md`'s first-run design) and it has to still be worth
doing on the four-hundredth day with nothing dramatic to report (see
`docs/RETENTION_EXPERIENCE_CONTRACT.md`'s steady-day design). Both are first-class, not edge
cases.

## Why Day 90 is more valuable than Day 3

Day 3 has almost no history: a handful of frames, a Qi Se baseline still forming, heritage shown
once or twice. Day 90 has an actual trajectory — the timeline can play back three months, then/now
comparisons become meaningful because the photographs are real and aligned to each other, the
personal baseline behind Qi Se is mature enough that "what changed today" is a genuine
measurement, and the user has seen enough heritage rotations to notice the pattern of rotation
itself rather than any one card. None of that richness is manufactured; it is what having more
real history actually contains. `docs/RETENTION_EXPERIENCE_CONTRACT.md` names the concrete
capabilities that unlock at 7/30/90/180/365 days and states, and measures (`docs/
HERITAGE_LIBRARY_READINESS.md`), when the honest answer runs out.

## The long-term moat

A photograph archive alone is not defensible — any camera app can take a daily selfie. What
compounds, and what a generic app cannot reproduce in a week, is the **combination**: disciplined,
consistently aligned guided capture; a personal colour/geometry baseline that only gets more
reliable with more real data; a source-attested historical library that adds depth without
claiming to measure the person; and a portable, user-owned archive that still exists if this
product does not. Any one of those alone is replicable quickly. The combination, sustained over
months, is not (see `docs/RETENTION_EXPERIENCE_CONTRACT.md`'s product-moat check).

## Heritage's role

The heritage library is a parallel historical lens, not a second measurement system. It answers
"what did a named historical tradition say about this part or relationship of the face" — with
its source, its edition, and its disagreement with other sources stated plainly (per
`docs/PROJECT_CHARTER.md`'s content-and-evidence section and `docs/INTERPRETATION_SYSTEM.md`). It
never claims a historical text measured, diagnosed, classified or predicted anything about this
particular user. When the corpus cannot honestly support a construct at runtime, the product says
so rather than inventing content to fill the gap (`docs/HERITAGE_LIBRARY_READINESS.md`).

## Trust model

The photograph archive is the most sensitive data this product will ever hold. It stays
local-first by default: no developer-operated central store of customer face photographs, cloud
backup only when the user explicitly turns it on, and a portable, documented export path so the
archive outlives this product if it ever disappears (`docs/LOCAL_AND_CLOUD_DATA_ARCHITECTURE.md`,
`docs/BACKUP_ARCHIVE_FORMAT.md`). "No server" means no developer-operated central store of
customer face photographs by default — it does not mean no vendor authentication configuration is
ever acceptable; the distinction is drawn precisely in `docs/BACKUP_ARCHIVE_FORMAT.md` §"No server
does not mean no authentication configuration".

## Explicit non-goals

None of the following is a feature of this product, in any tier, free or paid, now or in any
future iteration without a separate, explicit product-owner decision reversing this document:

- attractiveness scoring
- age scoring or estimation
- beauty progression / "glow-up" framing
- personality scoring or trait inference
- health diagnosis or any clinical claim
- longevity, mortality or lifespan claims
- fortune-telling or prediction
- wealth, rank, or career-outcome claims
- fixed character or destiny claims
- between-user comparison of any kind
- appearance ranking, leaderboards, or population percentile framing

These mirror the fourteen prohibited inferences already recorded as an absolute product constraint
in `docs/PROJECT_CHARTER.md`'s 17 August 2026 amendment (citing `docs/OPTION_B_020_DOSSIER.md`
§10.2) and the entertainment/self-discovery positioning in `docs/DECISION_REGISTER.md`. This
document does not weaken either; it restates them here because the Daily Portrait timeline is a
new surface where a "before/after" visual frame invites exactly this kind of appearance judgment
by default, and the product must actively resist that default (see
`docs/DAILY_PORTRAIT_ARCHITECTURE.md`'s "no appearance judgment from the timeline").

## What this document is not

It is not a schedule, and it is not a specification. The schedule and specification live in
`docs/DAILY_PORTRAIT_ARCHITECTURE.md`, `docs/RETENTION_EXPERIENCE_CONTRACT.md`,
`docs/LOCAL_AND_CLOUD_DATA_ARCHITECTURE.md`, `docs/BACKUP_ARCHIVE_FORMAT.md` and
`docs/SECURITY_PRIVACY_THREAT_MODEL.md`. It is the sentence and the five reasons behind it that
every one of those documents, and every future feature decision, is checked against.

# Reflection corpus — authorship and provenance record

**Prepared 17 August 2026. This record does NOT satisfy requirement 3 of
`docs/commercial-rights-audit.md`.** That requirement is a *signed contributor
agreement for modern commentary*. This document records accurately how the
material was produced so a human can decide what to sign. It is not a substitute
for the signature, and the family remains `Blocked`.

## What the corpus is

`src/qise/reflection-corpus.js` — every user-facing sentence the Reflection
Engine can produce.

| Artefact | SHA-256 |
|---|---|
| `src/qise/reflection-corpus.js` | `eb16fc4cad94a449234feeaa1e3b25fc24a7b6c36d79af07bf1b9a24d666b089` |
| `src/qise/reflection.js` | `7b5b6c6f70209ed88474b146a5c408073f32c46b85cb2ef91149cc150266e0dc` |

Hashes are of the reviewed version. Any edit invalidates them and this record
must be regenerated — which is the point of recording them rather than asserting
the file is fine.

## How it was produced

The corpus was written by **Claude (Anthropic), operating as an agent under the
direction of the product owner**, in a working session on 17 August 2026. It is
machine-authored. No human drafted the sentences.

Stating that plainly matters more than it looks. Requirement 3 exists so modern
commentary has a rights holder who agreed to terms. Machine-generated text has
no author who can enter an agreement, so the question is not "who signs" but
"what does the product owner own, and on what basis" — a determination for
counsel, not for this document, and not one I can make by writing a confident
sentence here.

### What went into it

- **Source material:** the classical passages summarised in the heritage layer
  derive from `docs/OPTION_B_020_DOSSIER.md`, which cites public-domain Chinese
  texts retrieved from Chinese Wikisource recensions of the *Siku Quanshu* and
  the *Gujin Tushu Jicheng*, and a Ming 致和堂 scan hosted by Shuge.
- **Translations:** every English rendering of a classical passage is original to
  this project. **No copyrighted translation was reproduced or paraphrased.**
  The dossier names what must never be used: Unschuld & Tessenow (UC Press),
  Unschuld's *Ling Shu*, Bridges (Elsevier), Joey Yap, McCarthy, Kohn (1986),
  Mei Chun (2016), Xing Wang (Brill), and every 點校 edition — the last per
  中華書局 v. 國學時代, Beijing First Intermediate People's Court, 2013, which held
  that collation and punctuation attract copyright in China.
- **WHO terminology was not used.** The WHO *International Standard Terminologies
  on Traditional Chinese Medicine* (2022) is CC BY-NC-SA 3.0 IGO —
  NonCommercial — and this product has a paywall architecture.
- **ctext.org was not scraped.** Its terms prohibit automated bulk download.
- **The reflective questions** are original writing with no classical source.
  They are not translations and make no claim to be. They are the Reflection
  layer, which the contract defines as our own symbolic join.

### What has NOT happened

- No human editorial review of the writing.
- No cultural review of the heritage summaries or the terminology.
- No legal determination of ownership or licensability, and none of the
  machine-authorship question above.

## What a reviewer would need in order to sign

1. A determination of what the product owner owns in machine-authored text under
   the law of each intended paid territory.
2. Confirmation that the original translations are in fact original — a
   comparison against the named copyrighted translations, which requires access
   to them.
3. An editorial pass on the writing itself.

Until those exist, `qise-passages-v1` stays `pending` in
`docs/commercial-rights-manifest.json`. **Nothing in this document changes a
status.**

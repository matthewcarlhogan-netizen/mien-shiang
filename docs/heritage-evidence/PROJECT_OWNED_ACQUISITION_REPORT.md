# PROJECT-OWNED KANRIPO ACQUISITION REPORT

**Acquisition run:** `2026-08-29T04:49:24Z` (this repository's environment — GitHub Codespace, Linux, Node 22, `git` 2.x).
**Method:** `git clone` of the four Kanripo repositories into a scratch directory **outside** the repo working tree, `git checkout <pinned commit>`, `sha256sum` computed locally in Node (`node:crypto`), `<pb:...>` markers counted from bytes, all 17 `PINNED_PASSAGES.csv` rows located under their claimed markers. No mirror, no OCR, no Wikisource, no secondary quotation.
**Reproducible runner:** [`scripts/heritage-evidence/acquire-and-verify.mjs`](../../scripts/heritage-evidence/acquire-and-verify.mjs) — output committed at [`docs/heritage-evidence/acquisition-verify.json`](acquisition-verify.json) and [`acquisition-verify-report.txt`](acquisition-verify-report.txt).
**Dossier under verification:** `MIEN_SHIANG_PINNING_PASS.md`, SHA-256 of its **newline-normalized UTF-8 text** `c67d1ca45a51acaaf7444a25a70ad64c3d54116cf9131727092c596f586e65ed`. This basis is deliberate: Git may materialize the same dossier with LF or CRLF depending on host settings.

```bash
# exact reproduction
node scripts/heritage-evidence/acquire-and-verify.mjs "$HOME/kanripo-acq" \
  --json  docs/heritage-evidence/acquisition-verify.json \
  --report docs/heritage-evidence/acquisition-verify-report.txt
# exit 0 = commits match, 17/17 hashes match, every passage found under its marker
```

---

## 1. Commit verification — 4 / 4 MATCH

All four repositories: `defaultBranch = master`; author = committer = `Chris Wittern <chris@mbp3>`; single commit `Normalized character representations from  normlist-2016-02-05.txt`; `#+PROPERTY: BASEEDITION WYG` (文淵閣四庫全書) in every file — **`editionFingerprint = WYG-Siku` for all four**.

| Kanripo ID | Title | Repo URL | Expected commit (dossier §1) | Resolved commit | Match | Commit date (ISO) | Tree SHA |
|---|---|---|---|---|:--:|---|---|
| KR3g0043 | 月波洞中記 | `https://github.com/kanripo/KR3g0043` | `f69732902fc82fb6b1f759cb7bf5a910c0b903a3` | `f69732902fc82fb6b1f759cb7bf5a910c0b903a3` | ✅ | `2016-02-05T19:15:36+09:00` | `f6e5f28e888b0ac423dcf428513358cb872ccbee` |
| KR3g0044 | 玉管照神局 | `https://github.com/kanripo/KR3g0044` | `0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74` | `0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74` | ✅ | `2016-02-05T19:15:43+09:00` | `514674dc525c5cc7d0f20e52b17b687a43143b02` |
| KR3g0045 | 太清神鑑 | `https://github.com/kanripo/KR3g0045` | `b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5` | `b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5` | ✅ | `2016-02-05T19:15:51+09:00` | `56b1f11100fe86d19e3a9c5b1d7a7e7f3c638a87` |
| KR3g0046 | 人倫大統賦 | `https://github.com/kanripo/KR3g0046` | `b408ea0b969672a1f52e5ec371f9fe3250976e58` | `b408ea0b969672a1f52e5ec371f9fe3250976e58` | ✅ | `2016-02-05T19:15:59+09:00` | `8e24912d0d90b761371a845758433a7359faa96d` |

Dossier §1's commit-date column is `+09:00` local (JST); the same instants are `2016-02-05T10:15:36Z … 10:15:59Z` UTC.

---

## 2. File SHA-256 — expected vs actual — 17 / 17 MATCH

Every one of the 17 text files listed in dossier §1 exists at the pinned commit and its SHA-256 matches byte-for-byte.

| File | bytes | Expected (dossier §1) = Actual (this run) |
|---|--:|---|
| `KR3g0043_000.txt` | 3 182 | `8a6d691c920337f7e9f4aa38abc3861cb67df49fe4ef4a88e26bec3330e123e3` |
| `KR3g0043_001.txt` | 15 387 | `0949bfb991e41969459bb33d18486afb1af75c1c317c013f12792a9fc8647d87` |
| `KR3g0043_002.txt` | 19 195 | `2a8081bd08e903fbe4663fa6ff07e4cd79e4469653f4d32644d84062e30c3251` |
| `KR3g0044_000.txt` | 2 244 | `f5282f5b527ff1272c9496cd7de7fad4de49e643da39df4ac77717c2603ceb1d` |
| `KR3g0044_001.txt` | 28 204 | `17b56dac2b3946af53707a20cecb42e956eff7a88b8e9b806a35ea19f95ad9f3` |
| `KR3g0044_002.txt` | 35 246 | `3552be8d0e553471250d5a4fd6f21e3f454ebffd8249c027d744cda0e4f8c5cc` |
| `KR3g0044_003.txt` | 22 273 | `3631ca4efadab24550d72543b2d282627f67ebe0b48dc855977e65479994abd2` |
| `KR3g0045_000.txt` | 3 459 | `9f51d7ff776db4e7a9d819bb607c0e9c3a8f5c27cf861aab54f3d452c912c894` |
| `KR3g0045_001.txt` | 20 242 | `c8f0b607e00a9e2d02bf788dc2c6c820714351228f8ec820cbf389861ea0ed3c` |
| `KR3g0045_002.txt` | 24 645 | `bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9` |
| `KR3g0045_003.txt` | 31 562 | `fd37503591c2a4cf1c8f0d3926122c9c2f0cff84119ca064b4c09bd52e98357b` |
| `KR3g0045_004.txt` | 18 082 | `84231b131823701455abf6ce63bad56c6638c5c15b5d6b0730dfd710a01f8d47` |
| `KR3g0045_005.txt` | 17 094 | `b02b8bee6fd5cbabe98f0e064f3487d3585019e10b0b5fe1efcb559f46d33dc7` |
| `KR3g0045_006.txt` | 13 984 | `d9ba7fbfe9c6422a5cec36ae134d693d95cc7cfd036674bddf3996aab6a7ca35` |
| `KR3g0046_000.txt` | 3 554 | `1727a126b7cc496022001d9189bcf9ef187d3b862d02f2cf3339fecc0492a5bb` |
| `KR3g0046_001.txt` | 58 870 | `61234896eb42479e01e9629042564137a64fdf465c459a4e8d7da2437adada2f` |
| `KR3g0046_002.txt` | 51 802 | `f0ce21224063b6cd2c385d3e9ad80f70452f449b1f7853af39bf280343e7c613` |

Non-text tracked files (not in the 17): `.gitignore` (identical `0a04dd0d…` across all four), `Readme.org` (title + version table + TOC only). Repo structure matches the pinning pass exactly.

---

## 3. `<pb:...>` folio markers — total 600 (dossier: "~600" — CONFIRMED)

Format `<pb:{ID}_WYG_{JJJ}-{FF}{a|b}>`, e.g. `<pb:KR3g0045_WYG_002-18a>` = 太清神鑑, 文淵閣 edition, juan 2, folio 18 recto. `¶` marks a column/line break; `/` splits a double-column interlinear note.

| File | markers | File | markers | File | markers |
|---|--:|---|--:|---|--:|
| KR3g0043_000 | 6 | KR3g0044_003 | 43 | KR3g0045_005 | 32 |
| KR3g0043_001 | 29 | KR3g0045_000 | 7 | KR3g0045_006 | 27 |
| KR3g0043_002 | 36 | KR3g0045_001 | 36 | KR3g0046_000 | 7 |
| KR3g0044_000 | 4 | KR3g0045_002 | 46 | KR3g0046_001 | 57 |
| KR3g0044_001 | 50 | KR3g0045_003 | 59 | KR3g0046_002 | 55 |
| KR3g0044_002 | 73 | KR3g0045_004 | 33 | **TOTAL** | **600** |

**Consequence:** the project's prior "Kanripo transcriptions carry no leaf markers; no folio is derivable" premise (23 Aug addendum §1.3, §5 Q5) is **false for all four texts**. `folioLocatorStatus = VERIFIED` and `folioLocatorKind = "WYG_PB"` are now achievable for every pinned passage — the `folioLocatorKind` enum in `src/heritage/schema.js` already contains `WYG_PB`.

---

## 4. Passage location — 17 / 17 found under the claimed marker

Every one of the 17 `PINNED_PASSAGES.csv` rows was located in the freshly cloned bytes, under its claimed `<pb:...>` marker, in the claimed juan and section. **14** match the dossier's quoted Chinese as a contiguous run after stripping Mandoku markup (`¶`, `/`, `　`, `<pb:>`); **3** (the 人倫大統賦 rows, all `xue-yannian-commentary` layer) match as documented *reading-throughs* — the dossier's quote flattens the double-column notes and reads across short interlinear phonological glosses, but every substantive run is present under the marker, in order. Full row detail in [`PROJECT_OWNED_PINNED_PASSAGES.csv`](PROJECT_OWNED_PINNED_PASSAGES.csv); transcription-fidelity notes in [`RESEARCH_ERRATA.md`](RESEARCH_ERRATA.md) §T.

| status | count | passageIds |
|---|--:|---|
| `VERIFIED` (contiguous) | 14 | tq-j2-wuguan, tq-j5-mianbu-santing, tq-j6-shen-santing, tq-j1-shuoge-xiangcheng, tq-j1-miaojue-xiangying, tq-j1-sidu-cosmological, tq-j3-lunxin-zeshu, tq-j2-wuyue, tq-j2-sidu, yb-j1-heyue, yb-j2-wuyue-similes, yb-j2-jiuzhou-colour, yg-j1-wuxingxing, yg-j3-santing-pingdeng |
| `VERIFIED_WITH_TRANSCRIPTION_NOTE` (reading-through) | 3 | rl-j1-sidu, rl-j1-wuyue, rl-j1-wuguan |
| `PASSAGE_NOT_FOUND` | 0 | — |

---

## 5. Hard-stop check — NONE TRIGGERED

| Hard-stop condition | Result |
|---|---|
| expected file SHA-256 ≠ project-owned SHA-256 | **none** — 17/17 identical |
| a quoted passage cannot be found under its claimed locator | **none** — 17/17 located under the claimed `<pb:>` marker |
| a pinned commit does not exist / is unreachable | **none** — 4/4 resolved and matched |
| acquired repo structure differs materially from the pinning pass | **none** — 3+4+7+3 = 17 text files, exactly as §1 |
| a "mechanical" registry change actually needs historical interpretation | see `REPO_RECONCILIATION_MATRIX.md` — the rows needing interpretation are flagged `PRODUCT_OWNER_DECISION_REQUIRED`, not executed |

Two new passageIds were added beyond the dossier's 17 (see `PROJECT_OWNED_PINNED_PASSAGES.csv` and `RESEARCH_ERRATA.md`): `tq-j1-shierdgong` (the Twelve Palaces enumeration at `<pb:KR3g0045_WYG_001-17b>`) and `tq-j3-xunzi-explicit` (the explicit `荀子曰` citation at `<pb:KR3g0045_WYG_003-2b>`). Both are project-verified from raw bytes; neither is a correction to a dossier passage, both are *additions* the dossier's single-codepoint / single-locator searches missed.

**PROJECT-OWNED EVIDENCE — ACQUISITION: PASS.**

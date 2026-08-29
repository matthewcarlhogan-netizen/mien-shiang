# PROJECT-OWNED SOURCE REGISTER

The four Kanripo witnesses as a project-owned acquisition, plus the Phase D
surrogate-rights finding. This register is the source-side companion to
[`PROJECT_OWNED_PINNED_PASSAGES.csv`](PROJECT_OWNED_PINNED_PASSAGES.csv);
`sourceId`s here are the ones already in `src/reading/provenance.js`
(`SOURCE_REGISTRY`).

---

## 1. The four witnesses

All: `editionFingerprint = WYG-Siku` (文淵閣四庫全書; `#+PROPERTY: BASEEDITION WYG` in every file); hosted at `github.com/kanripo`; single commit by `Chris Wittern`, `2016-02-05`, `Normalized character representations from normlist-2016-02-05.txt`; `defaultBranch = master`; remote branches observed `master`, `WYG`, `_data`; no in-repo `LICENSE`/`COPYING`.

| Kanripo ID | Work | Attribution (per Kanripo repo metadata / Siku 提要) | project commit | project retrievedAt |
|---|---|---|---|---|
| KR3g0043 | 月波洞中記 (Yuebo dongzhongji) | 闕名 (anonymous); Theobald: preface a later forgery, core possibly pre-Song → `ATTRIBUTION_UNCERTAIN` | `f69732902fc82fb6b1f759cb7bf5a910c0b903a3` | `2026-08-29T04:49:24Z` |
| KR3g0044 | 玉管照神局 (Yuguan zhaoshen ju) | attributed 南唐·宋齊邱; likely early Song → `ATTRIBUTION_UNCERTAIN` | `0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74` | `2026-08-29T04:49:24Z` |
| KR3g0045 | 太清神鑑 (Taiqing shenjian) | repo metadata carries 後周·王朴; the Siku 提要 itself rejects it as an anonymous Song composition → `ATTRIBUTION_CONTRADICTED` at the surrogate | `b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5` | `2026-08-29T04:49:24Z` |
| KR3g0046 | 人倫大統賦 (Renlun datong fu) | file header verbatim: `金　張行簡　撰` / `元　薛延年　注`. **The 賦 is Jin; the 注 is Yuan** — a real chronological gap between the two layers of one witness. Commentary is set in parentheses `( … )` throughout — every Five Mountains / Four Rivers / Five Officers passage in the file sits inside parentheses and is therefore **Yuan commentary, not the Jin 賦.** | `b408ea0b969672a1f52e5ec371f9fe3250976e58` | `2026-08-29T04:49:24Z` |

Per-file SHA-256: see [`PROJECT_OWNED_ACQUISITION_REPORT.md`](PROJECT_OWNED_ACQUISITION_REPORT.md) §2.

---

## 2. sourceId → project-owned pinning

The fields below map straight onto the **existing** `sourceRecord()` shape in
`src/reading/provenance.js` (`repository`, `repositoryCommit`, `repositoryFile`,
`sha256`, `retrievedAt`, `editionFingerprint`, `folioLocator`,
`folioLocatorStatus`, `sourceAccess: "STABLE_REMOTE"`) — **no schema change is
required to pin any of these.**

| sourceId (repo) | repository / commit | repositoryFile | editionFingerprint | maps to passageIds |
|---|---|---|---|---|
| `heritage-five-mountains` (太清 五嶽) | `kanripo/KR3g0045` @ `b3e5b69b…` | `KR3g0045_002.txt` | `WYG-Siku` | `tq-j2-wuyue` |
| `heritage-four-rivers-primary` (太清 四瀆) | `kanripo/KR3g0045` @ `b3e5b69b…` | `KR3g0045_002.txt` | `WYG-Siku` | `tq-j2-sidu` |
| `heritage-five-officers` (太清 五官) | `kanripo/KR3g0045` @ `b3e5b69b…` | `KR3g0045_002.txt` | `WYG-Siku` | `tq-j2-wuguan` |
| `heritage-three-sections-taiqing` (太清 三停) | `kanripo/KR3g0045` @ `b3e5b69b…` | `KR3g0045_006.txt` (卷六 body) **and** `KR3g0045_005.txt` (卷五 facial — NEW) | `WYG-Siku` | `tq-j6-shen-santing`, `tq-j5-mianbu-santing` |
| `heritage-five-elements-taiqing` (太清 五形) | `kanripo/KR3g0045` @ `b3e5b69b…` | `KR3g0045_004.txt` (卷四「五形」) | `WYG-Siku` | *(none pinned this pass — see errata E-9)* |
| `heritage-twelve-palaces-taiqing` (太清 十二宫) | `kanripo/KR3g0045` @ `b3e5b69b…` | `KR3g0045_001.txt` (卷一 成和子統論) | `WYG-Siku` | `tq-j1-shierdgong` **(NEW)** |
| `heritage-taiqing-juan1-mountains-rivers` (太清 卷一 五嶽四瀆要相應) | `kanripo/KR3g0045` @ `b3e5b69b…` | `KR3g0045_001.txt` | `WYG-Siku` | `tq-j1-miaojue-xiangying`, `tq-j1-sidu-cosmological` |
| `heritage-taiqing-form-qise-interaction` (太清 卷四 論㸔形神體像) | `kanripo/KR3g0045` @ `b3e5b69b…` | `KR3g0045_004.txt` | `WYG-Siku` | *(section present; specific predicate not pinned this pass)* |
| `heritage-taiqing-juan4-form-shen-reciprocity` (太清 卷四 神須形/形須神) | `kanripo/KR3g0045` @ `b3e5b69b…` | `KR3g0045_004.txt` | `WYG-Siku` | *(not pinned this pass)* |
| `xunzi-feixiang` — **as cited within 太清 卷三** | `kanripo/KR3g0045` @ `b3e5b69b…` | `KR3g0045_003.txt` | `WYG-Siku` | `tq-j3-lunxin-zeshu` (allusion), `tq-j3-xunzi-explicit` (`荀子曰`, **NEW**, variant text) |
| `heritage-five-mountains-renlun-datong` / `heritage-four-rivers-renlun-datong` (人倫大統賦 薛注) | `kanripo/KR3g0046` @ `b408ea0b…` | `KR3g0046_001.txt` (卷上) | `WYG-Siku` | `rl-j1-wuyue`, `rl-j1-sidu`, `rl-j1-wuguan` |
| `heritage-yuebo-dongzhongji-configuration` (月波洞中記) | `kanripo/KR3g0043` @ `f6973290…` | `KR3g0043_001.txt` (卷上 河嶽), `KR3g0043_002.txt` (卷下) | `WYG-Siku` | `yb-j1-heyue`, `yb-j2-wuyue-similes`, `yb-j2-jiuzhou-colour` |
| `heritage-five-elements-taiqing` **↔ 玉管** — a NEW sourceId is needed for 玉管照神局 (see errata E-7 / manifest M-14) | `kanripo/KR3g0044` @ `0fa9edb2…` | `KR3g0044_001.txt` (卷上, 呂洞賓賦), `KR3g0044_003.txt` (卷下) | `WYG-Siku` | `yg-j1-wuxingxing`, `yg-j3-santing-pingdeng` |
| `heritage-four-rivers-renlun-fengjian` (人倫風鑑) | **not directly held** — a *named comparandum* quoted inside `KR3g0045_001.txt` (16×) and `KR3g0044_001.txt` (1×); see errata E-3 | `WYG-Siku` (host texts) | — |

Sources **not** in the Kanripo corpus and unchanged by this pass:
`heritage-five-elements` (靈樞·陰陽二十五人 — medical, VERIFIED, NOT a Kanripo witness — see Decision 2),
`heritage-three-sections` / `heritage-three-sections-sxqb` (神相全編 / received Ma Yi),
`heritage-twelve-palaces` / `heritage-twelve-palaces-discovery-surrogate` (神相全編 / Baidu surrogate),
`heritage-five-mountains-mayi` / `-sxqb` / `-shenyi`,
`heritage-four-rivers-sxqb-shoujuan-xiangshuo` / `-sxqb-juan2`,
`heritage-five-officers-sxqb` / `-medical`,
`heritage-taiqing-shidian-discovery`.

---

## 3. PHASE D — surrogate-rights inspection

**Question (per brief):** does the specific digital surrogate/transcription have an explicit licence sufficient to move the repo's existing rights field?

**Inspected, per repo:** `git ls-files` (LICENSE / COPYING / NOTICE — none present); `Readme.org` (title + `版本 | WYG |【四庫全書・文淵閣】` + TOC only, no rights notice); `KR3g004X_000.txt` 提要 (no rights notice); GitHub repo metadata (`gh api repos/kanripo/KR3g0045` → `license: null`); GitHub org metadata (`gh api orgs/kanripo` → description); `kanripo.org` (HTTP 403 to automated fetch — corroborated instead via secondary sources).

**Found:**
- **No in-surrogate licence.** None of the four repositories carries a LICENSE/COPYING file; GitHub's licence detector reports `license: null` for each.
- **An explicit org-level statement.** The GitHub organisation `kanripo` description reads verbatim: *"Comprehensive collection of premodern Chinese texts. **Licensed as CC BY SA 4.0.**"* Corroborated by multiple independent secondary sources (conference papers, university library research guides) all reporting the Kanseki Repository as **CC BY-SA 4.0**. Coordinator: Christian Wittern, Institute for Research in Humanities, Kyoto University.
- **Underlying work:** 文淵閣四庫全書 recensions of Song/Jin/Yuan texts — public domain by age. The CC BY-SA 4.0 claim attaches to Kanripo's transcription/encoding layer (Mandoku markup, the `<pb:>` markers, the 2016-02-05 character normalisation), not to the historical text.

**Verdict, per repo (KR3g0043 / 0044 / 0045 / 0046): `AMBIGUOUS`.**

Reasoning — this is *more* than the repo's current `SURROGATE_RIGHTS_NOT_DECLARED` (an explicit licence claim does exist and is well-corroborated) but does *not* reach a clean `EXPLICIT_RIGHTS_FOUND` sufficient to move the gate to `CLEARED`, because:
1. the statement is a one-line GitHub org bio, **not** a LICENSE file in the surrogate, **not** a per-work grant, and **not** retrievable this pass from `kanripo.org` itself (403);
2. **CC BY-SA 4.0 is ShareAlike (copyleft).** For a commercial, paywalled product that embeds substantial transcribed passages, the ShareAlike obligation is an unresolved question for counsel — directly parallel to the concerns `docs/CORPUS_PROVENANCE.md` already records for the WHO TCM terminology (NC) and the 點校 editions (中華書局 v. 國學時代, 2013).

**Recommendation (not a decision):** record the finding on each affected `SOURCE_REGISTRY` record — `surrogateRights` stays below `CLEARED`; add an `authorshipNote` / a rights note stating "Kanripo org-level CC BY-SA 4.0 declared; not carried in-surrogate; ShareAlike commercial implications unresolved — counsel". Do **not** silently upgrade to `cleared` / `CLEARED`. This is a `PRODUCT_OWNER_DECISION_REQUIRED` / counsel item, not a mechanical change. It does **not** block an internal prototype (see `PROTOTYPE_NOW.md`).

Sources for the licence finding:
- [github.com/kanripo](https://github.com/kanripo) (org description)
- `gh api repos/kanripo/KR3g0045` → `"license": null`
- [Index of DH Conferences — "Kanripo and Mandoku"](https://dh-abstracts.library.virginia.edu/works/1972)
- [ctext.org/static/shanghai2018/wittern-kanripo-breakout.pdf](https://ctext.org/static/shanghai2018/wittern-kanripo-breakout.pdf)

# MIEN SHIANG — PRIMARY-WITNESS PINNING + DISPUTED-CLAIM ADJUDICATION

**Retrieval timestamp (all four repos):** `2026-08-27T02:16:47Z`
**Method:** direct `git clone` of the Kanripo repositories into a network-enabled container; passages read from the cloned working-tree bytes; SHA-256 computed locally with `sha256sum`. No mirror, no OCR, no secondary quotation.
**Repo access to `matthewcarlhogan-netizen/mien-shiang`:** not attempted in this pass — no repo was mounted. All statements about product contracts, runtime semantics, `ABSTRACT_LINEAGE_OVERRIDES`, and Stage-2/Stage-3 architecture remain **BLOCKED (repo-dependent)** and are taken as given from the brief.

---

## TL;DR — five things changed

1. **The pinning gap is closed.** All four repos cloned; commit SHAs, file SHA-256s, and `<pb:...>` folio markers obtained. **The earlier "Kanripo carries no leaf markers" conclusion is REFUTED** — every file carries markers of the form `<pb:KR3g0045_WYG_002-18a>`. `folioLocator` is derivable for every passage below.
2. **A facial 三停 exists in the pinnable corpus.** 太清神鑑 卷五 論靣部 gives explicit facial boundaries. The prior dossier's claim that facial thirds has no Siku witness is **REJECTED**.
3. **三停平等 exists in the pinnable corpus.** 玉管照神局 卷下 reads 「三停平等能和美」. The prior claim that 平等 belongs exclusively to the 神相全編/麻衣 lineage is **REJECTED**.
4. **The Five Officers disagreement is far larger than reported.** 人倫大統賦 differs from 太清神鑑 on **four of five office titles**, not just the fifth member.
5. **人倫風鑑 is a real cited work.** It is cited **16 times by name** in 太清神鑑 卷一 alone as a variant-reading witness, and twice more as 〈人倫風鑑同〉. The prior ~60–70% estimate that it was not an independent work is **REJECTED**.

---

# 1. PINNED_SOURCE_REGISTER.md

All four: `defaultBranch = master`; remote branches observed = `master`, `WYG`, `_data`. Base edition property in every file: `#+PROPERTY: BASEEDITION WYG` (文淵閣四庫全書). **editionFingerprint = WYG-Siku for all four.** Pinning upgrades locator precision and integrity only — **not** date, lineage priority, or textual authority.

| Kanripo ID | Title | Repo URL | Commit SHA (pinned) | Commit date |
|---|---|---|---|---|
| KR3g0043 | 月波洞中記 | `https://github.com/kanripo/KR3g0043` | `f69732902fc82fb6b1f759cb7bf5a910c0b903a3` | 2016-02-05T19:15:36+09:00 |
| KR3g0044 | 玉管照神局 | `https://github.com/kanripo/KR3g0044` | `0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74` | 2016-02-05T19:15:43+09:00 |
| KR3g0045 | 太清神鑑 | `https://github.com/kanripo/KR3g0045` | `b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5` | 2016-02-05T19:15:51+09:00 |
| KR3g0046 | 人倫大統賦 | `https://github.com/kanripo/KR3g0046` | `b408ea0b969672a1f52e5ec371f9fe3250976e58` | 2016-02-05T19:15:59+09:00 |

**SHA-256 of every retrieved file** (lower-case, as computed at the pinned commits):

```
KR3g0043 (月波洞中記)
8a6d691c920337f7e9f4aa38abc3861cb67df49fe4ef4a88e26bec3330e123e3  KR3g0043_000.txt
0949bfb991e41969459bb33d18486afb1af75c1c317c013f12792a9fc8647d87  KR3g0043_001.txt
2a8081bd08e903fbe4663fa6ff07e4cd79e4469653f4d32644d84062e30c3251  KR3g0043_002.txt

KR3g0044 (玉管照神局)
f5282f5b527ff1272c9496cd7de7fad4de49e643da39df4ac77717c2603ceb1d  KR3g0044_000.txt
17b56dac2b3946af53707a20cecb42e956eff7a88b8e9b806a35ea19f95ad9f3  KR3g0044_001.txt
3552be8d0e553471250d5a4fd6f21e3f454ebffd8249c027d744cda0e4f8c5cc  KR3g0044_002.txt
3631ca4efadab24550d72543b2d282627f67ebe0b48dc855977e65479994abd2  KR3g0044_003.txt

KR3g0045 (太清神鑑)
9f51d7ff776db4e7a9d819bb607c0e9c3a8f5c27cf861aab54f3d452c912c894  KR3g0045_000.txt
c8f0b607e00a9e2d02bf788dc2c6c820714351228f8ec820cbf389861ea0ed3c  KR3g0045_001.txt
bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9  KR3g0045_002.txt
fd37503591c2a4cf1c8f0d3926122c9c2f0cff84119ca064b4c09bd52e98357b  KR3g0045_003.txt
84231b131823701455abf6ce63bad56c6638c5c15b5d6b0730dfd710a01f8d47  KR3g0045_004.txt
b02b8bee6fd5cbabe98f0e064f3487d3585019e10b0b5fe1efcb559f46d33dc7  KR3g0045_005.txt
d9ba7fbfe9c6422a5cec36ae134d693d95cc7cfd036674bddf3996aab6a7ca35  KR3g0045_006.txt

KR3g0046 (人倫大統賦)
1727a126b7cc496022001d9189bcf9ef187d3b862d02f2cf3339fecc0492a5bb  KR3g0046_000.txt
61234896eb42479e01e9629042564137a64fdf465c459a4e8d7da2437adada2f  KR3g0046_001.txt
f0ce21224063b6cd2c385d3e9ad80f70452f449b1f7853af39bf280343e7c613  KR3g0046_002.txt
```

**Reproduction command** (exactly what was run):

```bash
for id in KR3g0043 KR3g0044 KR3g0045 KR3g0046; do
  git clone --quiet "https://github.com/kanripo/$id" "$id"
  ( cd "$id" && git log -1 --format='commit=%H date=%aI' && sha256sum "$id"_*.txt )
done
```

## 1.1 Folio markers — the earlier conclusion was wrong

Marker counts per file (`grep -o '<pb:[^>]*>' | wc -l`):

| File | markers | File | markers |
|---|---|---|---|
| KR3g0043_000 | 6 | KR3g0045_000 | 7 |
| KR3g0043_001 | 29 | KR3g0045_001 | 36 |
| KR3g0043_002 | 36 | KR3g0045_002 | 46 |
| KR3g0044_000 | 4 | KR3g0045_003 | 59 |
| KR3g0044_001 | 50 | KR3g0045_004 | 33 |
| KR3g0044_002 | 73 | KR3g0045_005 | 32 |
| KR3g0044_003 | 43 | KR3g0045_006 | 27 |
| KR3g0046_000 | 7 | KR3g0046_001 | 57 |
| KR3g0046_002 | 55 | | |

Format: `<pb:{ID}_{EDITION}_{JUAN}-{FOLIO}{a|b}>`, e.g. `<pb:KR3g0045_WYG_002-18a>` = 太清神鑑, WYG edition, juan 2, folio 18 recto. `¶` marks column/line breaks. **`folioLocatorStatus = VERIFIED` is now achievable for every pinned passage.** The 23 Aug addendum's §1 constraint 3 and §5 Q5 ("structurally unavailable, not merely blocked") are both wrong for these four texts.

## 1.2 Attribution notes at the surrogate

- **KR3g0045 太清神鑑** — Kanripo repo metadata carries the traditional ascription 後周·王朴. Received scholarship (Theobald; the Siku 提要 itself) treats it as an anonymous Song composition borrowing Wang Pu's name. `ATTRIBUTION_CONTRADICTED` applies at the surrogate.
- **KR3g0046 人倫大統賦** — the file header reads verbatim: `金　張行簡　撰` / `元　薛延年　注`. **The commentator is dated 元 (Yuan), not 金 (Jin).** The project's `RLDTF-XUE` record should be corrected: the 賦 is Jin, the 注 is Yuan — a real chronological gap between the two layers of the same witness.
- **KR3g0046 layer separation is SOLVED.** In the WYG transcription the 薛延年 commentary is set inside parentheses `( … )`. The 23 Aug addendum's "Q3-adjacent granularity problem" (賦 vs 注 indistinguishable) is resolved: **every** Five Mountains / Four Rivers / Five Officers passage in 人倫大統賦 sits inside parentheses and is therefore **Yuan commentary, not the Jin 賦.**
- **KR3g0043 月波洞中記** — `闕名` (anonymous); Theobald notes the preface is a forgery while the core may be pre-Song. `ATTRIBUTION_UNCERTAIN`.
- **KR3g0044 玉管照神局** — attributed 南唐·宋齊邱; likely early Song. `ATTRIBUTION_UNCERTAIN`.

---

# 2. PINNED_PASSAGES.csv

```csv
passageId,sourceId,repoUrl,commitSha,fileSha256,filePath,juan,section,pbMarker,textualLayer,passageChinese,translation,retrievedAt
tq-j2-wuyue,taiqing-shenjian,https://github.com/kanripo/KR3g0045,b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5,bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9,KR3g0045_002.txt,卷二,五嶽,<pb:KR3g0045_WYG_002-17b> to <pb:KR3g0045_WYG_002-18a>,base-text,"五嶽者上應天之五星下鎮地之五方髙峻敦厚所以卓然立於乾坤之内者以其相資而成天地之大也人亦有所像焉故額為衡嶽欲得方而廣頷為恒嶽欲得圓而厚左顴為泰嶽右顴為華嶽左右欲得圓而正鼻為嵩嶽欲得髙而峻故五嶽須要豐隆而相朝髙峻而不陷乃相之貴矣(人倫風鑑同)","The Five Peaks correspond above to heaven's five stars and below anchor earth's five directions; lofty and substantial, they stand distinct within creation because they mutually support one another and so complete the greatness of heaven and earth. The human form likewise has an image of this. Thus the forehead is Heng peak, wanting to be square and broad; the han (lower jaw) is Heng(perm) peak, wanting to be round and thick; the left cheekbone is Tai peak, the right cheekbone is Hua peak, both wanting to be round and upright; the nose is Song peak, wanting to be high and steep. Therefore the Five Peaks must be full and mutually facing, lofty and not sunken; this is a noble physiognomy. (The Renlun fengjian agrees.)",2026-08-27T02:16:47Z
tq-j2-sidu,taiqing-shenjian,https://github.com/kanripo/KR3g0045,b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5,bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9,KR3g0045_002.txt,卷二,四瀆,<pb:KR3g0045_WYG_002-18a> to <pb:KR3g0045_WYG_002-18b>,base-text,"地之四瀆者所以相朝以接其流通人之形貎亦有像焉且鼻為濟目為淮耳為江口為河故四瀆欲得端直清大眀浄流暢涯岸成就者則應於神故貴而多智也若夫醜而不端則為愚人毁而陷者則為賤類也(人倫風鑑同)","Earth's Four Watercourses mutually face one another so as to join their flow. The human form likewise has an image of this: the nose is Ji, the eye is Huai, the ear is Jiang, the mouth is He. Thus the Four Watercourses should be upright, clear, large, bright, clean, flowing freely, with formed banks; then they answer to Shen, hence noble and of much wit. If ugly and not upright, a foolish person; if damaged and sunken, a base sort. (The Renlun fengjian agrees.)",2026-08-27T02:16:47Z
tq-j2-wuguan,taiqing-shenjian,https://github.com/kanripo/KR3g0045,b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5,bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9,KR3g0045_002.txt,卷二,五官,<pb:KR3g0045_WYG_002-18b>,base-text,"五官者目為鑒察官鼻為審辨官口為出納官耳為採聽官眉為保夀官五者欲得清而秀豐而隆或一官好則貴十年或有缺陷者及醜惡者㐫","The Five Officers: the eye is the Inspecting Officer, the nose the Discriminating Officer, the mouth the Intake-and-Issue Officer, the ear the Gathering-and-Listening Officer, the eyebrow the Longevity-Preserving Officer. The five should be clear and fine, full and prominent. If one officer is good, ten years of rank; if any is defective or ugly, ill fortune.",2026-08-27T02:16:47Z
tq-j5-mianbu-santing,taiqing-shenjian,https://github.com/kanripo/KR3g0045,b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5,b02b8bee6fd5cbabe98f0e064f3487d3585019e10b0b5fe1efcb559f46d33dc7,KR3g0045_005.txt,卷五,論靣部,<pb:KR3g0045_WYG_005-7b> to <pb:KR3g0045_WYG_005-8a>,base-text,"靣之三停自髪際下至眉間為上停自眉間至鼻凖為中停自凖人中至頰為下停夫三停者以像三才也上像天中像人下像地上停長而豐隆方而廣濶者主貴中停隆而凖峻而静者主壽也下停方而滿端而厚者主富也若上停尖狭缺陷者主多刑厄之灾妨尅父母卑賤之相也中停短小偏塌者主不義不仁智識短少不得兄弟妻兒之力亦中年破散也下停長而狭尖而薄者主無田宅一生貧苦而艱辛也三停皆稱乃上相之人矣","The face's three sections: from the hairline down to between the brows is the upper section; from between the brows to the nose-tip is the middle section; from the tip and philtrum to the cheeks/jaw is the lower section. The three sections image the Three Powers: upper images heaven, middle images man, lower images earth. An upper section long, full, square and broad governs rank; a middle section full with the tip steep and composed governs longevity; a lower section square, full, upright and thick governs wealth. If the upper is pointed, narrow or defective it governs much punishment and calamity, harm to parents, a lowly physiognomy. If the middle is short, small, lopsided or collapsed it governs unrighteousness and inhumanity, scant wit, no support from brothers, wife or children, and midlife dispersal. If the lower is long and narrow, pointed and thin, it governs no fields or dwelling, a life of poverty and hardship. When all three sections are proportionate, this is a person of superior physiognomy.",2026-08-27T02:16:47Z
tq-j6-shen-santing,taiqing-shenjian,https://github.com/kanripo/KR3g0045,b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5,d9ba7fbfe9c6422a5cec36ae134d693d95cc7cfd036674bddf3996aab6a7ca35,KR3g0045_006.txt,卷六,三停,<pb:KR3g0045_WYG_006-6a> to <pb:KR3g0045_WYG_006-6b>,base-text,"上停長者大吉昌中停長者近君王下停長者皆庸俗逺走他方主不良　又云身三停相稱及上下匀稠則為富貴之人也上長下短背聳三山則為公卿之位上短下長腰身怯薄一生奔走貧苦之輩矣","One whose upper section is long: great auspiciousness. One whose middle section is long: close to the sovereign. One whose lower section is long: all common and vulgar, travelling far to other regions, portending ill. It is also said: if the body's three sections are proportionate and upper and lower evenly substantial, this is a person of wealth and rank. Upper long and lower short with the back rising in three ridges: the position of a high minister. Upper short and lower long with a timid thin waist and body: one of a lifetime of running about in poverty and hardship.",2026-08-27T02:16:47Z
tq-j1-shuoge-xiangcheng,taiqing-shenjian,https://github.com/kanripo/KR3g0045,b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5,c8f0b607e00a9e2d02bf788dc2c6c820714351228f8ec820cbf389861ea0ed3c,KR3g0045_001.txt,卷一,說歌,<pb:KR3g0045_WYG_001-2a>,base-text,"不露不麄不枯槁三停大體求相稱","Not exposed, not coarse, not withered; the three sections broadly seek proportion.",2026-08-27T02:16:47Z
tq-j1-miaojue-xiangying,taiqing-shenjian,https://github.com/kanripo/KR3g0045,b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5,c8f0b607e00a9e2d02bf788dc2c6c820714351228f8ec820cbf389861ea0ed3c,KR3g0045_001.txt,卷一,相法妙訣,<pb:KR3g0045_WYG_001-6b>,base-text,"相人形貎有多般須辨三停端不端五嶽四瀆要相應","In reading human form there are many kinds; one must discern whether the three sections are upright or not; the Five Peaks and Four Watercourses must correspond to one another.",2026-08-27T02:16:47Z
tq-j1-sidu-cosmological,taiqing-shenjian,https://github.com/kanripo/KR3g0045,b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5,c8f0b607e00a9e2d02bf788dc2c6c820714351228f8ec820cbf389861ea0ed3c,KR3g0045_001.txt,卷一,說歌,<pb:KR3g0045_WYG_001-1a>,base-text,"五嶽四瀆皆有神金木水火土為分","The Five Peaks and Four Watercourses all have Shen; metal wood water fire earth make the divisions.",2026-08-27T02:16:47Z
tq-j3-lunxin-zeshu,taiqing-shenjian,https://github.com/kanripo/KR3g0045,b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5,fd37503591c2a4cf1c8f0d3926122c9c2f0cff84119ca064b4c09bd52e98357b,KR3g0045_003.txt,卷三,心術論,<pb:KR3g0045_WYG_003-1b>,base-text,"此古人有論心擇術之戒也","This is the ancients' admonition on assessing the mind and choosing one's method.",2026-08-27T02:16:47Z
yb-j1-heyue,yuebo-dongzhongji,https://github.com/kanripo/KR3g0043,f69732902fc82fb6b1f759cb7bf5a910c0b903a3,0949bfb991e41969459bb33d18486afb1af75c1c317c013f12792a9fc8647d87,KR3g0043_001.txt,卷上,河嶽,<pb:KR3g0043_WYG_001-5a> to <pb:KR3g0043_WYG_001-5b>,base-text,"凡相人靣五嶽欲其相朝四瀆欲其不混形神備足富貴之相所謂五嶽者頥為恒嶽額為衡嶽鼻為嵩嶽左顴為泰嶽右顴為華嶽所謂四瀆者眼為淮耳為江口為河鼻為濟髙成曰嶽深厚曰瀆嶽欲成而瀆欲清","In reading a human face, the Five Peaks should mutually face one another and the Four Watercourses should not be muddled; form and Shen complete, a physiognomy of wealth and rank. The so-called Five Peaks: the yi (jaw) is Heng(perm) peak, the forehead is Heng peak, the nose is Song peak, the left cheekbone is Tai peak, the right cheekbone is Hua peak. The so-called Four Watercourses: the eye is Huai, the ear is Jiang, the mouth is He, the nose is Ji. What rises high is called a peak; what is deep and substantial is called a watercourse. Peaks should be well-formed and watercourses should be clear.",2026-08-27T02:16:47Z
yb-j2-wuyue-similes,yuebo-dongzhongji,https://github.com/kanripo/KR3g0043,f69732902fc82fb6b1f759cb7bf5a910c0b903a3,2a8081bd08e903fbe4663fa6ff07e4cd79e4469653f4d32644d84062e30c3251,KR3g0043_002.txt,卷下,(五嶽及有小氣所管屬者),<pb:KR3g0043_WYG_002-10a> to <pb:KR3g0043_WYG_002-10b>,base-text,"五嶽及有小氣所管屬者衡如滿月南嶽泰如鷄卵東嶽華若方銀西嶽嵩若髙發中嶽恒如倒提北嶽五嶽全者及餘皆好無剋陷者食禄主貴","The Five Peaks and the minor qi they govern: Heng like a full moon (South Peak); Tai like a hen's egg (East Peak); Hua like squared silver (West Peak); Song like a high crown (Centre Peak); Heng(perm) like an inverted lift (North Peak). One whose Five Peaks are complete and whose remainder is all good, without clashing or sinking, receives emolument and governs rank.",2026-08-27T02:16:47Z
yb-j2-jiuzhou-colour,yuebo-dongzhongji,https://github.com/kanripo/KR3g0043,f69732902fc82fb6b1f759cb7bf5a910c0b903a3,2a8081bd08e903fbe4663fa6ff07e4cd79e4469653f4d32644d84062e30c3251,KR3g0043_002.txt,卷下,(九州),<pb:KR3g0043_WYG_002-10b>,base-text,"雍州白色常潤冀州青黒色主酒色上亡兖州青紅色主吉昌青州青色吉豫州黄色吉","Yong province: white colour, constantly moist. Ji province: blue-black colour, governs death through wine and lust. Yan province: blue-red colour, governs auspiciousness. Qing province: blue colour, auspicious. Yu province: yellow colour, auspicious.",2026-08-27T02:16:47Z
rl-j1-sidu,renlun-datongfu,https://github.com/kanripo/KR3g0046,b408ea0b969672a1f52e5ec371f9fe3250976e58,61234896eb42479e01e9629042564137a64fdf465c459a4e8d7da2437adada2f,KR3g0046_001.txt,卷上,四瀆,<pb:KR3g0046_WYG_001-10b> to <pb:KR3g0046_WYG_001-11a>,xue-yannian-commentary,"四瀆須宜深且闊(四瀆者耳為江口為河眼為淮鼻為濟四瀆須宜深闊崖岸有川流之形不欲汗漫破缺在天地者江淮河濟在人者眼鼻口耳)","The Four Watercourses should be deep and broad. [Commentary:] The Four Watercourses — the ear is Jiang, the mouth is He, the eye is Huai, the nose is Ji. They should be deep and broad, with banks having the form of a flowing stream, not wanting to be diffuse, broken or deficient. In heaven and earth they are Jiang, Huai, He, Ji; in man they are eye, nose, mouth, ear.",2026-08-27T02:16:47Z
rl-j1-wuyue,renlun-datongfu,https://github.com/kanripo/KR3g0046,b408ea0b969672a1f52e5ec371f9fe3250976e58,61234896eb42479e01e9629042564137a64fdf465c459a4e8d7da2437adada2f,KR3g0046_001.txt,卷上,五嶽,<pb:KR3g0046_WYG_001-11a>,xue-yannian-commentary,"五嶽必要穹與隆(五嶽者額為南嶽衡山鼻為中嶽嵩山頦為北嶽恒山左顴為東嶽㤗山右顴為西嶽華山五嶽俱要豐隆有峻極之勢)(萬金秘語云南嶽如滿月㤗如雞卵華如方銀嵩高發恒如倒提五嶽全者及其餘皆好無尅陷者食祿主貴)","The Five Peaks must be vaulted and swelling. [Commentary:] The Five Peaks — the forehead is South Peak Mt Heng, the nose is Centre Peak Mt Song, the ke (chin) is North Peak Mt Heng(perm), the left cheekbone is East Peak Mt Tai, the right cheekbone is West Peak Mt Hua. All five should be full and swelling with a soaring posture. [Further commentary:] The Wanjin miyu says: South Peak like a full moon, Tai like a hen's egg, Hua like squared silver, Song a high crown, Heng(perm) like an inverted lift. One whose Five Peaks are complete and whose remainder is all good, without clashing or sinking, receives emolument and governs rank.",2026-08-27T02:16:47Z
rl-j1-wuguan,renlun-datongfu,https://github.com/kanripo/KR3g0046,b408ea0b969672a1f52e5ec371f9fe3250976e58,61234896eb42479e01e9629042564137a64fdf465c459a4e8d7da2437adada2f,KR3g0046_001.txt,卷上,五官,<pb:KR3g0046_WYG_001-11a> to <pb:KR3g0046_WYG_001-11b>,xue-yannian-commentary,"五官(荀子注司主也又識也)欲其明而正(五官者一口二鼻三耳四目五人中欲其明而端正不宜孤露偏斜　眼為監察官耳為審聽官鼻為嗅臭官口為出納官人中為保夀官)","The Five Officers [gloss: per the commentary on Xunzi, 'officer' means to superintend, also to discern] should be bright and upright. [Commentary:] The Five Officers — first the mouth, second the nose, third the ear, fourth the eye, fifth the philtrum. They should be bright and upright, not solitary, exposed, lopsided or slanting. The eye is the Supervising-Inspecting Officer, the ear the Examining-Listening Officer, the nose the Smelling Officer, the mouth the Intake-and-Issue Officer, the philtrum the Longevity-Preserving Officer.",2026-08-27T02:16:47Z
yg-j1-wuxingxing,yuguan-zhaoshenju,https://github.com/kanripo/KR3g0044,0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74,17b56dac2b3946af53707a20cecb42e956eff7a88b8e9b806a35ea19f95ad9f3,KR3g0044_001.txt,卷上,(呂洞賓賦),<pb:KR3g0044_WYG_001-4b> to <pb:KR3g0044_WYG_001-5a>,base-text,"人有金木水火土之象有飛禽走獸之倫金不嫌方木不嫌痩水不嫌肥火不嫌尖土不嫌濁似金得金剛毅深似木得木資財阜似水得水文章貴似火得火兵機大似土得上多櫃庫似禽者不嫌瘦似獸者不嫌肥","Human beings have the images of metal, wood, water, fire and earth, and the classes of flying birds and running beasts. Metal does not object to being square; wood does not object to being lean; water does not object to being stout; fire does not object to being pointed; earth does not object to being turbid. Resembling metal and obtaining metal: firm, resolute, deep. Resembling wood and obtaining wood: resources and wealth abundant. Resembling water and obtaining water: literary distinction, noble. Resembling fire and obtaining fire: military strategy, great. Resembling earth and obtaining earth [text reads 上 for 土]: many storehouses. One resembling a bird does not object to leanness; one resembling a beast does not object to stoutness.",2026-08-27T02:16:47Z
yg-j3-santing-pingdeng,yuguan-zhaoshenju,https://github.com/kanripo/KR3g0044,0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74,3631ca4efadab24550d72543b2d282627f67ebe0b48dc855977e65479994abd2,KR3g0044_003.txt,卷下,(詩曰; adjacent to 鴿形),<pb:KR3g0044_WYG_003-13a>,base-text-verse,"詩曰體秀行藏語媚端雙眸明媚衆人歡三停平等能和美官髙財足志多般","A verse says: body fine, bearing composed, speech charming and correct; both eyes bright and winning, delighting the crowd; the three sections equal and able to be harmonious and beautiful; office high, wealth sufficient, aspirations manifold.",2026-08-27T02:16:47Z
```

**Every row above is mechanically reproducible**: clone the repo, `git checkout <commitSha>`, verify `sha256sum <filePath>`, then locate `<pbMarker>` and read forward.

---

# 3. DISPUTED_CLAIMS_ADJUDICATION.md

## A. Five Mountains 五嶽

### A1. Membership and anatomical mapping — evidence table

| Witness | Juan/§ | Forehead | Lower face | Left cheek | Right cheek | Nose | Directional labels? |
|---|---|---|---|---|---|---|---|
| 月波洞中記 (卷上 河嶽) | `001-5a` | 衡嶽 | **頥** 恒嶽 | 泰嶽 | 華嶽 | 嵩嶽 | **No** |
| 月波洞中記 (卷下) | `002-10a/b` | 衡=南嶽 | 恒=北嶽 | 泰=東嶽 | 華=西嶽 | 嵩=中嶽 | **Yes** |
| 太清神鑑 (卷二 五嶽) | `002-17b/18a` | 衡嶽 | **頷** 恒嶽 | 泰嶽 | 華嶽 | 嵩嶽 | **No** |
| 人倫大統賦 (卷上, 薛注) | `001-11a` | 南嶽衡山 | **頦** 北嶽恒山 | 東嶽㤗山 | 西嶽華山 | 中嶽嵩山 | **Yes** |

**Answers to the seven narrow questions:**

1. **Membership:** identical across all four readings — 衡 / 恒 / 泰 / 華 / 嵩. No disagreement.
2. **Anatomical mapping:** identical in assignment. Forehead=衡, lower face=恒, left cheek=泰, right cheek=華, nose=嵩.
3. **Lower-face terminology: THREE distinct terms, not two.** 月波 頥 (jaw/cheek), 太清 頷 (lower jaw/mandible), 人倫 頦 (chin point). The prior dossier reported only 頷/頦 and flagged the 月波 term as an OCR-uncertain 順 — **that is now resolved from bytes: it is 頥, a third term.** These are anatomically adjacent but not identical regions; the divergence is real and must be carried.
4. **Directional labels:** present in 人倫's commentary and in **月波 卷下**; absent from 月波 卷上 and from 太清 卷二. **The prior dossier's claim that "the directional cosmology is genuinely a Renlun feature, not a Taiqing one" is DOWNGRADED** — it is not a Renlun feature either; it is a feature of a *particular passage type* (the simile/star-correspondence passage) that 月波 卷下 and 人倫's commentary both carry, and that 太清 卷二 does not.
5. **Relational wording:**
   - 太清 卷二: 「以其相**資**而成天地之大也」 (of the actual mountains, cosmological) + 「故五嶽須要**豐隆**而**相朝**髙峻而不陷」 (of the face).
   - 月波 卷上: 「五嶽欲其**相朝**四瀆欲其**不混**」.
   - 人倫 薛注: 「五嶽俱要**豐隆**有峻極之勢」 — **豐隆 yes, 相朝 no.**
   So 相朝 is attested in 太清 and 月波 and **not** in 人倫; 豐隆 is attested in all three.
6. **Are 月波 and 太清 one lineage or two witnesses sharing doctrine?** The wording is *not* copied: 月波 「五嶽欲其相朝」 vs 太清 「五嶽須要豐隆而相朝」; 月波 defines via 「髙成曰嶽深厚曰瀆」, 太清 via a five-star/five-direction cosmology absent from 月波 卷上. They share the *predicate* 相朝 and the *mapping*, not the *text*. **Disposition: two witnesses sharing doctrine, not one textual lineage.** Calling them "the Taiqing–Moon-Waves lineage" (as the prior dossier did) overstates the relationship. Note also the cross-link runs the *other* way than expected: 月波 卷下's simile set (滿月/雞卵/方銀/髙發/倒提) is reproduced almost verbatim in **人倫's** commentary, attributed there to 萬金秘語 — so the transmission cluster on that specific passage is 月波 ↔ 人倫, not 月波 ↔ 太清.
7. **Does 人倫 lack the relationship or express it differently?** It expresses **fullness (豐隆/穹隆/峻極)** but **not mutual facing (相朝)**. It is a genuinely different predicate, not a paraphrase.

**Historical disposition: `MULTIPLE_WITNESSES_SAME_RELATION`** — for 相朝 specifically, with exactly two witnesses (太清神鑑 卷二, 月波洞中記 卷上), independently worded. For 豐隆, three witnesses. For the lower-face anatomy, `CONTESTED_RELATION` across three terms.

## B. Four Rivers 四瀆

| Witness | 江 | 河 | 淮 | 濟 | Layer |
|---|---|---|---|---|---|
| 月波洞中記 卷上 | 耳 | 口 | 眼 | 鼻 | base text |
| 太清神鑑 卷二 | 耳 | 口 | 目 | 鼻 | base text |
| 人倫大統賦 卷上 | 耳 | 口 | 眼 | 鼻 | **Yuan commentary** |

**All three pinned witnesses agree completely.** There is no disagreement *inside the pinnable Siku corpus*. The eye/mouth dispute is entirely between this bloc and the 麻衣 lineage.

**麻衣 eye/mouth swap:** no inspectable primary or early witness was obtained in this pass. The 麻衣 reading (目=河, 口=淮) is therefore recorded **`RECORDED_NOT_VERIFIED`** and is **not** promoted. Do not harmonise; do not delete. The disagreement stands as: pinned Siku bloc (3 witnesses, 2 base-text + 1 commentary) vs unpinned 麻衣/神相全編 tradition.

**Additional relational finding:** 太清 卷二 applies **相朝 to the rivers as well** — 「地之四瀆者所以相朝以接其流通」. The prior dossier treated 相朝 as a mountains-only predicate. It is not.

**Mountain↔River relational rules (pinned):**
- 月波 卷上: joint clause 「五嶽欲其相朝四瀆欲其不混」 + explicit contrast 「髙成曰嶽深厚曰瀆嶽欲成而瀆欲清」.
- 太清 卷一 相法妙訣: 「五嶽四瀆要**相應**」 — a *correspondence* predicate between the two systems, distinct from 相朝. This is a new row.

## C. Five Officers 五官 — the disagreement is much larger than reported

| Office | 太清神鑑 卷二 (base text) | 人倫大統賦 卷上 (薛延年 commentary) |
|---|---|---|
| eye 目/眼 | **鑒**察官 | **監**察官 |
| nose 鼻 | **審辨**官 | **嗅臭**官 |
| mouth 口 | 出納官 | 出納官 |
| ear 耳 | **採聽**官 | **審聽**官 |
| fifth member | **眉** 為保夀官 | **人中** 為保夀官 |
| enumeration | unordered list | ordered: 一口 二鼻 三耳 四目 五人中 |

**Four of five office titles differ.** The prior dossier reported this as a single-member dispute (眉 vs 人中). **DOWNGRADED / RECLASSIFIED.** Characters are recorded exactly as they appear — 鑒察官 and 監察官 are both attested and neither is a normalisation of the other; 保夀官 (not 保壽官) is the form in both witnesses. 舌 is absent from both. Do not modernise inside the evidence field.

Also pinned: 人倫's commentary glosses 五官 with an explicit citation of the Xunzi commentary tradition — 「五官(荀子注司主也又識也)」.

## D. Three Sections 三停 — four distinct objects, never to be merged

| # | Object | Earliest pinned witness | Wording | Anatomical domain | Layer |
|---|---|---|---|---|---|
| 1 | **BODY 三停** | 太清神鑑 卷六 三停 `006-6a/6b` | 上停長者大吉昌…下停長者皆庸俗逺走他方主不良 | body | base text, primary predicate |
| 2 | **FACIAL 三停** | 太清神鑑 卷五 論靣部 `005-7b/8a` | 靣之三停自髪際下至眉間為上停…自凖人中至頰為下停 | face | base text |
| 3 | **相稱 (proportional)** | 太清神鑑 卷一 說歌 `001-2a`; 卷五 (三停皆稱); 卷六 (又云…相稱) | 三停大體求相稱 / 三停皆稱 / 身三停相稱 | both | base text + 又云 secondary |
| 4 | **平等 (equality)** | **玉管照神局 卷下 `003-13a`** | 三停平等能和美 | unspecified (verse) | base-text verse |

**Findings:**
- **The facial/body distinction is internal to 太清神鑑.** One text carries both, in different juan, with different predicates. Juan 五 is facial and uses 稱; juan 六 is bodily (身三停) and is ranked. **They must not be merged**, and the prior dossier was right to insist on this — but wrong to conclude that 太清 has *only* a body version.
- **The prior claim that facial thirds has no Siku witness is REJECTED.** 卷五 論靣部 is a full facial definition with boundaries, a 三才 correspondence, and per-section predicates.
- **The prior claim that 平等 belongs exclusively to the 神相全編/麻衣 lineage is REJECTED.** 玉管照神局 — a Southern Tang/early Song Siku witness, pinned — reads 三停平等. The 相稱/平等 distinction is still a real wording difference, but it is **not** a clean inter-lineage marker separating Siku from Ming.
- **Ranked/auspicious predicates:** 卷六 (body) is differential-ranked; 卷五 (facial) assigns 主貴 / 主壽 / 主富 per section. Both are fortune/rank/longevity predicates → `prohibitedForUserInference: true`.
- **Age/life-stage associations:** **not found** in the 三停 sections of any of the four pinned texts. What was found instead is a separate age-run system in 人倫's commentary at `001-12a` (十年運 / 二十五年 / 五年運 etc.), which is the 13-position-age-map territory the product explicitly excludes. **Age/life-stage overlay on 三停 is `SOURCE_REQUIRED` in the pinned corpus** — treat as a later overlay until a witness is produced.
- **Inheritance/alteration:** 太清 卷五's 三停皆稱 and 卷六's 相稱 are consistent within the text; 玉管's 平等 is independent. No evidence of one inheriting from the other was found.

## E. Five Forms — see §6 below.

## F. Twelve Palaces — see §7 below.

---

# 4. CORRECTED_RELATIONSHIP_ATLAS.csv

**Field-semantics change per Part 5:** `runtimePotential` no longer encodes a visibility policy inferred from `prohibitedForUserInference`. Where the prior atlas wrote `source-panel-only` on the strength of a safety flag alone, this atlas writes `PRODUCT_DECISION_REQUIRED`. `HISTORICAL_EVIDENCE_ONLY` is used only where the historical evidence itself cannot support a runtime claim (e.g. unpinned witness).

```csv
relationshipId,family,relationshipClass,fromParticipant,toParticipant,direction,condition,historicalClaim,sourceId,lineageId,sourcePassageChinese,translation,juan,section,folio,sectionLocatorStatus,folioLocatorStatus,citationStatus,evidenceStrength,textualLayer,disagreementId,prohibitedForUserInference,runtimePotential,notes
five-mountains-membership-yuebo,fiveMountains,ANATOMICAL_MAPPING,fiveMountains,forehead-yi-cheeks-nose,none,none,"forehead=Heng yi(jaw)=Heng(perm) nose=Song left-cheek=Tai right-cheek=Hua",yuebo-dongzhongji,yuebo,"所謂五嶽者頥為恒嶽額為衡嶽鼻為嵩嶽左顴為泰嶽右顴為華嶽",The Five Peaks: yi(jaw)=Heng(perm) forehead=Heng nose=Song left cheekbone=Tai right cheekbone=Hua,卷上,河嶽,KR3g0043_WYG_001-5a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,five-mountains-lower-face-term,false,ELIGIBLE,"no directional labels; lower-face term is 頥 (third variant); commit f6973290"
five-mountains-membership-taiqing,fiveMountains,ANATOMICAL_MAPPING,fiveMountains,forehead-han-cheeks-nose,none,none,"forehead=Heng han(mandible)=Heng(perm) left-cheek=Tai right-cheek=Hua nose=Song",taiqing-shenjian,taiqing,"故額為衡嶽欲得方而廣頷為恒嶽欲得圓而厚左顴為泰嶽右顴為華嶽左右欲得圓而正鼻為嵩嶽欲得髙而峻",Forehead=Heng (square broad) han=Heng(perm) (round thick) left cheekbone=Tai right cheekbone=Hua (round upright) nose=Song (high steep),卷二,五嶽,KR3g0045_WYG_002-18a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,five-mountains-lower-face-term,false,ELIGIBLE,"no directional labels; lower-face term is 頷; 〈人倫風鑑同〉 note follows"
five-mountains-membership-renlun-xue,fiveMountains,ANATOMICAL_MAPPING,fiveMountains,forehead-ke-cheeks-nose,none,none,"forehead=South/Heng nose=Centre/Song ke(chin)=North/Heng(perm) left=East/Tai right=West/Hua",renlun-datongfu,xue-yannian,"五嶽者額為南嶽衡山鼻為中嶽嵩山頦為北嶽恒山左顴為東嶽㤗山右顴為西嶽華山",Five Peaks: forehead South Mt Heng nose Centre Mt Song ke(chin) North Mt Heng(perm) left East Mt Tai right West Mt Hua,卷上,五嶽,KR3g0046_WYG_001-11a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,xue-yannian-commentary,five-mountains-lower-face-term,false,ELIGIBLE,"Yuan commentary layer NOT the Jin fu; directional labels present; 㤗=泰 recorded not normalised"
five-mountains-directional-labels-yuebo,fiveMountains,CORRESPONDENCE,fiveMountains,five-directions,none,none,"Heng=South Tai=East Hua=West Song=Centre Heng(perm)=North with shape similes",yuebo-dongzhongji,yuebo,"衡如滿月南嶽泰如鷄卵東嶽華若方銀西嶽嵩若髙發中嶽恒如倒提北嶽",Heng like a full moon (South) Tai like a hen's egg (East) Hua like squared silver (West) Song like a high crown (Centre) Heng(perm) like an inverted lift (North),卷下,五嶽及有小氣所管屬者,KR3g0043_WYG_002-10a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,false,ELIGIBLE,"REFUTES prior claim that directional labels are a Renlun-only feature; near-identical text appears in Renlun commentary attributed to 萬金秘語"
five-mountains-mutual-facing-taiqing,fiveMountains,MUTUAL_RELATION,fiveMountains,fiveMountains,reciprocal,"all five full and not sunken","the five peaks must be full and mutually facing lofty and not sunken",taiqing-shenjian,taiqing,"故五嶽須要豐隆而相朝髙峻而不陷乃相之貴矣",Therefore the Five Peaks must be full and mutually facing lofty and not sunken; this is a noble sign,卷二,五嶽,KR3g0045_WYG_002-18a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,true,PRODUCT_DECISION_REQUIRED,"貴 = rank predicate; the 相朝 relation itself is separable from the rank claim"
five-mountains-mutual-facing-yuebo,fiveMountains,MUTUAL_RELATION,fiveMountains,fiveMountains,reciprocal,none,"the five peaks should mutually face one another",yuebo-dongzhongji,yuebo,"凡相人靣五嶽欲其相朝",In reading a human face the Five Peaks should mutually face one another,卷上,河嶽,KR3g0043_WYG_001-5a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,true,PRODUCT_DECISION_REQUIRED,"second independent witness to 相朝; wording differs from Taiqing so not a copy"
five-mountains-mutual-support-cosmological-taiqing,fiveMountains,MUTUAL_RELATION,mountains-of-earth,mountains-of-earth,reciprocal,none,"the actual mountains mutually support one another and so complete heaven and earth",taiqing-shenjian,taiqing,"所以卓然立於乾坤之内者以其相資而成天地之大也",They stand distinct within creation because they mutually support one another and so complete the greatness of heaven and earth,卷二,五嶽,KR3g0045_WYG_002-18a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,false,ELIGIBLE,"about geographic mountains not the face; grounds the facial analogy 人亦有所像焉"
five-mountains-fullness-renlun-xue,fiveMountains,CONDITION,fiveMountains,fullness-loftiness,none,none,"all five peaks should be full and swelling with a soaring posture",renlun-datongfu,xue-yannian,"五嶽俱要豐隆有峻極之勢",All five peaks should be full and swelling with a soaring posture,卷上,五嶽,KR3g0046_WYG_001-11a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,xue-yannian-commentary,none,false,ELIGIBLE,"豐隆 present but 相朝 ABSENT in Renlun; a different predicate not a paraphrase"
four-rivers-membership-yuebo,fourRivers,ANATOMICAL_MAPPING,fourRivers,ear-eye-mouth-nose,none,none,"eye=Huai ear=Jiang mouth=He nose=Ji",yuebo-dongzhongji,yuebo,"所謂四瀆者眼為淮耳為江口為河鼻為濟",The Four Watercourses: eye=Huai ear=Jiang mouth=He nose=Ji,卷上,河嶽,KR3g0043_WYG_001-5a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,four-rivers-eye-mouth,false,ELIGIBLE,"agrees with Taiqing and Renlun"
four-rivers-membership-taiqing,fourRivers,ANATOMICAL_MAPPING,fourRivers,ear-eye-mouth-nose,none,none,"nose=Ji eye=Huai ear=Jiang mouth=He",taiqing-shenjian,taiqing,"且鼻為濟目為淮耳為江口為河",The nose is Ji the eye is Huai the ear is Jiang the mouth is He,卷二,四瀆,KR3g0045_WYG_002-18a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,four-rivers-eye-mouth,false,ELIGIBLE,"CONFIRMS prior correction: this is 卷二 not 卷一; 卷一 has only the cosmological verse"
four-rivers-membership-renlun-xue,fourRivers,ANATOMICAL_MAPPING,fourRivers,ear-eye-mouth-nose,none,none,"ear=Jiang mouth=He eye=Huai nose=Ji",renlun-datongfu,xue-yannian,"四瀆者耳為江口為河眼為淮鼻為濟",The Four Watercourses: ear=Jiang mouth=He eye=Huai nose=Ji,卷上,四瀆,KR3g0046_WYG_001-10b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,xue-yannian-commentary,four-rivers-eye-mouth,false,ELIGIBLE,"Yuan commentary layer; agrees with both base-text witnesses"
four-rivers-membership-mayi,fourRivers,DISAGREEMENT,fourRivers,ear-eye-mouth-nose,none,none,"ear=Jiang eye=He(Yellow) mouth=Huai nose=Ji",mayi-shenxiang,mayi,NOT_RETRIEVED,eye=Yellow River and mouth=Huai (swapped relative to the pinned bloc),unknown,四瀆,null,NOT_LOCATED,NOT_LOCATED,NO_INSPECTABLE_WITNESS,RECORDED_NOT_VERIFIED,unknown,four-rivers-eye-mouth,false,HISTORICAL_EVIDENCE_ONLY,"DOWNGRADED from prior atlas; no primary or early witness obtained; do not harmonise do not delete"
four-rivers-mutual-facing-taiqing,fourRivers,MUTUAL_RELATION,fourRivers,fourRivers,reciprocal,none,"earth's four watercourses mutually face so as to join their flow",taiqing-shenjian,taiqing,"地之四瀆者所以相朝以接其流通",Earth's Four Watercourses mutually face one another so as to join their flow,卷二,四瀆,KR3g0045_WYG_002-18a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,false,ELIGIBLE,"NEW: 相朝 is not a mountains-only predicate; prior dossier missed this"
four-rivers-answer-to-shen-taiqing,fourRivers,DIRECTED_RELATION,fourRivers,shen,directed,"rivers upright clear large bright clean flowing with formed banks","well-formed watercourses answer to Shen",taiqing-shenjian,taiqing,"故四瀆欲得端直清大眀浄流暢涯岸成就者則應於神故貴而多智也",Thus the Four Watercourses should be upright clear large bright clean and flowing with formed banks; then they answer to Shen hence noble and of much wit,卷二,四瀆,KR3g0045_WYG_002-18a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,true,PRODUCT_DECISION_REQUIRED,"an EXPLICIT textual relation between a facial system and Shen; 貴/多智 are rank and character predicates"
mountains-rivers-joint-eval-yuebo,crossSystem,SEQUENCE,fiveMountains,fourRivers,none,none,"peaks should face and rivers should not be muddled evaluated in one clause",yuebo-dongzhongji,yuebo,"五嶽欲其相朝四瀆欲其不混形神備足富貴之相",The Five Peaks should mutually face and the Four Watercourses should not be muddled; form and Shen complete a physiognomy of wealth and rank,卷上,河嶽,KR3g0043_WYG_001-5a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,true,PRODUCT_DECISION_REQUIRED,"genuine joint evaluation; 富貴 predicate present"
mountains-rivers-correspondence-taiqing,crossSystem,MUTUAL_RELATION,fiveMountains,fourRivers,reciprocal,none,"the Five Peaks and Four Watercourses must correspond to one another",taiqing-shenjian,taiqing,"須辨三停端不端五嶽四瀆要相應",One must discern whether the three sections are upright; the Five Peaks and Four Watercourses must correspond,卷一,相法妙訣,KR3g0045_WYG_001-6b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,false,ELIGIBLE,"NEW: 相應 correspondence predicate distinct from 相朝; also co-locates 三停 with the pair"
mountains-rivers-contrast-yuebo,crossSystem,CONTRAST,fiveMountains,fourRivers,none,none,"what rises high is a peak what is deep and substantial is a watercourse; peaks want form rivers want clarity",yuebo-dongzhongji,yuebo,"髙成曰嶽深厚曰瀆嶽欲成而瀆欲清",What rises high is called a peak; what is deep and substantial is called a watercourse. Peaks should be well-formed and watercourses should be clear,卷上,河嶽,KR3g0043_WYG_001-5b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,false,ELIGIBLE,"explicit definitional contrast between the two systems"
five-officers-membership-taiqing,fiveOfficers,MEMBERSHIP,fiveOfficers,eye-nose-mouth-ear-eyebrow,none,none,"eye=jian(inspect) nose=shenbian mouth=chuna ear=caiting eyebrow=baoshou",taiqing-shenjian,taiqing,"五官者目為鑒察官鼻為審辨官口為出納官耳為採聽官眉為保夀官",The Five Officers: eye=Inspecting nose=Discriminating mouth=Intake-and-Issue ear=Gathering-Listening eyebrow=Longevity-Preserving,卷二,五官,KR3g0045_WYG_002-18b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,five-officers-titles,false,ELIGIBLE,"鑒察官 not 監察官; 保夀官 not 保壽官; no 舌; characters not normalised"
five-officers-membership-renlun-xue,fiveOfficers,MEMBERSHIP,fiveOfficers,mouth-nose-ear-eye-philtrum,none,none,"1 mouth 2 nose 3 ear 4 eye 5 philtrum; eye=jian(supervise) ear=shenting nose=xiuchou mouth=chuna philtrum=baoshou",renlun-datongfu,xue-yannian,"五官者一口二鼻三耳四目五人中欲其明而端正不宜孤露偏斜　眼為監察官耳為審聽官鼻為嗅臭官口為出納官人中為保夀官",The Five Officers: first mouth second nose third ear fourth eye fifth philtrum; they should be bright and upright not solitary exposed lopsided or slanting. Eye=Supervising-Inspecting ear=Examining-Listening nose=Smelling mouth=Intake-and-Issue philtrum=Longevity-Preserving,卷上,五官,KR3g0046_WYG_001-11a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,xue-yannian-commentary,five-officers-titles,false,ELIGIBLE,"FOUR of five titles differ from Taiqing not just the fifth member; ordered enumeration"
five-officers-one-official-ten-years-taiqing,fiveOfficers,DIRECTED_RELATION,oneOfficer,rank-ten-years,directed,"one officer well-formed","one good officer yields ten years of rank; defect or ugliness yields ill fortune",taiqing-shenjian,taiqing,"或一官好則貴十年或有缺陷者及醜惡者㐫",If one officer is good then ten years of rank; if any is defective or ugly then ill fortune,卷二,五官,KR3g0045_WYG_002-18b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,true,PRODUCT_DECISION_REQUIRED,"rank and duration prediction"
five-officers-xunzi-gloss-renlun,fiveOfficers,IDENTITY,guan-officer,superintend-discern,none,none,"the term 'officer' glossed via the Xunzi commentary as to superintend and to discern",renlun-datongfu,xue-yannian,"五官(荀子注司主也又識也)",The Five Officers [gloss: per the commentary on Xunzi 'officer' means to superintend also to discern],卷上,五官,KR3g0046_WYG_001-11a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,xue-yannian-commentary,none,false,ELIGIBLE,"explicit intertextual citation of the Xunzi commentary tradition"
facial-three-sections-boundaries-taiqing,threeSections,ANATOMICAL_MAPPING,facialThreeSections,hairline-brow-nosetip-jaw,none,none,"upper=hairline to between brows; middle=between brows to nose tip; lower=tip and philtrum to cheeks/jaw",taiqing-shenjian,taiqing,"靣之三停自髪際下至眉間為上停自眉間至鼻凖為中停自凖人中至頰為下停",The face's three sections: hairline to between the brows is upper; between the brows to the nose tip is middle; from the tip and philtrum to the cheeks is lower,卷五,論靣部,KR3g0045_WYG_005-7b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,false,ELIGIBLE,"NEW: REFUTES prior claim that facial thirds has no Siku witness; FACIAL domain distinct from 卷六 body"
facial-three-sections-sancai-taiqing,threeSections,CORRESPONDENCE,facialThreeSections,three-powers,none,none,"the three sections image the Three Powers: upper heaven middle man lower earth",taiqing-shenjian,taiqing,"夫三停者以像三才也上像天中像人下像地",The three sections image the Three Powers: upper images heaven middle images man lower images earth,卷五,論靣部,KR3g0045_WYG_005-7b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,false,ELIGIBLE,"cosmological correspondence with no predictive claim attached in this clause"
facial-three-sections-predicates-taiqing,threeSections,DIRECTED_RELATION,facialThreeSections,rank-longevity-wealth,directed,"per-section form conditions","upper governs rank middle governs longevity lower governs wealth",taiqing-shenjian,taiqing,"上停長而豐隆方而廣濶者主貴中停隆而凖峻而静者主壽也下停方而滿端而厚者主富也",An upper section long full square and broad governs rank; a middle section full with the tip steep and composed governs longevity; a lower section square full upright and thick governs wealth,卷五,論靣部,KR3g0045_WYG_005-7b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,true,PRODUCT_DECISION_REQUIRED,"rank longevity and wealth predicates all present"
facial-three-sections-proportion-taiqing,threeSections,CONDITION,facialThreeSections,proportion,none,"all three proportionate","when all three sections are proportionate this is a superior physiognomy",taiqing-shenjian,taiqing,"三停皆稱乃上相之人矣",When all three sections are proportionate this is a person of superior physiognomy,卷五,論靣部,KR3g0045_WYG_005-8a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,three-sections-predicate,true,PRODUCT_DECISION_REQUIRED,"稱 family not 平等; facial domain"
body-three-sections-ranked-taiqing,threeSections,DIRECTED_RELATION,bodyThreeSections,fortune-rank,directed,"which section is longest","upper long great auspiciousness; middle long near the sovereign; lower long common and wandering",taiqing-shenjian,taiqing,"上停長者大吉昌中停長者近君王下停長者皆庸俗逺走他方主不良",Upper long: great auspiciousness. Middle long: near the sovereign. Lower long: all common and vulgar travelling far portending ill,卷六,三停,KR3g0045_WYG_006-6a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,three-sections-predicate,true,PRODUCT_DECISION_REQUIRED,"BODY sections; differential-ranked; MUST NOT be merged with the 卷五 facial rows"
body-three-sections-proportion-taiqing,threeSections,QUALIFICATION,bodyThreeSections,proportion,none,"proportionate and evenly substantial","also said: proportionate body thirds indicate wealth and rank",taiqing-shenjian,taiqing,"又云身三停相稱及上下匀稠則為富貴之人也",It is also said: if the body's three sections are proportionate and upper and lower evenly substantial this is a person of wealth and rank,卷六,三停,KR3g0045_WYG_006-6b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text-secondary-layer,three-sections-predicate,true,PRODUCT_DECISION_REQUIRED,"又云 marks a secondary layer inside the base text; 相稱 not 平等; explicitly 身三停"
three-sections-proportion-shuoge-taiqing,threeSections,QUALIFICATION,threeSections,proportion,none,none,"the three sections broadly seek proportion",taiqing-shenjian,taiqing,"不露不麄不枯槁三停大體求相稱",Not exposed not coarse not withered; the three sections broadly seek proportion,卷一,說歌,KR3g0045_WYG_001-2a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text-verse,three-sections-predicate,false,ELIGIBLE,"domain unspecified in this verse; third internal witness to the 相稱 predicate"
three-sections-equality-yuguan,threeSections,CONDITION,threeSections,equality,none,none,"the three sections equal and able to be harmonious and beautiful",yuguan-zhaoshenju,yuguan,"三停平等能和美官髙財足志多般",The three sections equal and able to be harmonious and beautiful; office high wealth sufficient aspirations manifold,卷下,詩曰 (adjacent to 鴿形),KR3g0044_WYG_003-13a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text-verse,three-sections-predicate,true,PRODUCT_DECISION_REQUIRED,"REFUTES prior claim that 平等 is exclusive to the Shenxiang-quanbian/Mayi lineage; verse context; domain unspecified"
five-forms-like-with-like-yuguan,fiveForms,DIRECTED_RELATION,elemental-form,outcome,directed,"form resembles an element and obtains that same element","five like-with-like pairings each with one outcome",yuguan-zhaoshenju,yuguan,"似金得金剛毅深似木得木資財阜似水得水文章貴似火得火兵機大似土得上多櫃庫",Resembling metal and obtaining metal: firm resolute deep. Wood: resources and wealth abundant. Water: literary distinction noble. Fire: military strategy great. Earth: many storehouses,卷上,呂洞賓賦,KR3g0044_WYG_001-4b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,true,PRODUCT_DECISION_REQUIRED,"exactly FIVE like-with-like pairs NOT a 5x5 grid; text reads 得上 for 得土; wealth rank and character predicates"
five-forms-tolerance-yuguan,fiveForms,QUALIFICATION,elemental-form,form-predicate,directed,none,"each element has a shape it does not object to",yuguan-zhaoshenju,yuguan,"金不嫌方木不嫌痩水不嫌肥火不嫌尖土不嫌濁",Metal does not object to being square; wood to being lean; water to being stout; fire to being pointed; earth to being turbid,卷上,呂洞賓賦,KR3g0044_WYG_001-4b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,false,ELIGIBLE,"a tolerance rule not a classifier; must not be inverted into colour or shape typing"
five-forms-verse-shenxiang,fiveForms,IDENTITY,fiveForms,five-element-shapes,none,none,"wood thin metal square water fat earth thick fire narrow-top broad-base",shenxiang-quanbian,mayi,NOT_RETRIEVED,wood thin metal square water fat earth thick like a turtle-back top-pointed broad-base is fire,unknown,五行形,null,NOT_LOCATED,NOT_LOCATED,NO_INSPECTABLE_WITNESS,RECORDED_NOT_VERIFIED,ming,none,true,HISTORICAL_EVIDENCE_ONLY,"DOWNGRADED; no cleanly licensed machine-readable witness obtained"
renlunfengjian-agrees-mountains,fiveMountains,IDENTITY,taiqing-fiveMountains,renlunfengjian-fiveMountains,none,none,"the Renlun fengjian agrees with this Five Mountains passage",taiqing-shenjian,taiqing,"(人倫風鑑同)",(The Renlun fengjian agrees.),卷二,五嶽,KR3g0045_WYG_002-18a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,editorial-collation-note,none,false,ELIGIBLE,"collation note inside the base text; names a lost comparandum witness"
renlunfengjian-agrees-rivers,fourRivers,IDENTITY,taiqing-fourRivers,renlunfengjian-fourRivers,none,none,"the Renlun fengjian agrees with this Four Rivers passage",taiqing-shenjian,taiqing,"(人倫風鑑同)",(The Renlun fengjian agrees.),卷二,四瀆,KR3g0045_WYG_002-18b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,editorial-collation-note,none,false,ELIGIBLE,"second occurrence"
renlunfengjian-variant-witness-taiqing,sourceCriticism,CONTRAST,taiqing-shenjian,renlun-fengjian,none,none,"the Renlun fengjian is cited sixteen times in juan one as a variant-reading witness",taiqing-shenjian,taiqing,"(人倫風鑑云隂陽之氣氛氲) … (人倫風鑑洞𤣥經同) … (人倫風鑑千字文同)","(The Renlun fengjian reads: the qi of yin and yang, dense and swirling) … (The Renlun fengjian and the Dongxuan jing agree) … (The Renlun fengjian and the Qianziwen agree)",卷一,說歌/又歌,KR3g0045_WYG_001-1a through 001-6a,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,editorial-collation-note,none,false,ELIGIBLE,"16 occurrences counted; listed alongside 洞玄經 and 千字文 as distinct titled works; REFUTES prior estimate that it was probably not an independent work"
mountains-provinces-colour-yuebo,crossSystem,CORRESPONDENCE,facial-provinces,five-colours,none,"colour appearing at a province","each of the nine provinces on the face carries a colour with an outcome",yuebo-dongzhongji,yuebo,"雍州白色常潤冀州青黒色主酒色上亡兖州青紅色主吉昌青州青色吉豫州黄色吉",Yong province white colour constantly moist; Ji province blue-black governs death through wine and lust; Yan province blue-red governs auspiciousness; Qing province blue auspicious; Yu province yellow auspicious,卷下,五嶽及有小氣所管屬者,KR3g0043_WYG_002-10b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,true,PRODUCT_DECISION_REQUIRED,"an EXPLICIT colour-to-facial-region relation in the pinned corpus; death predicate present; NOT a licence for modern colour measurement"
xunzi-allusion-taiqing,negativeCanonical,QUALIFICATION,taiqing-shenjian,xunzi-feixiang,directed,none,"the text invokes the ancients' admonition on assessing the mind and choosing one's method",taiqing-shenjian,taiqing,"此古人有論心擇術之戒也",This is the ancients' admonition on assessing the mind and choosing one's method,卷三,心術論,KR3g0045_WYG_003-1b,VERIFIED,VERIFIED,PINNED_COMMIT,VERIFIED_PRIMARY,base-text,none,false,ELIGIBLE,"NEW: 論心/擇術 is verbatim Xunzi Feixiang vocabulary; a physiognomy manual citing the classic critique of physiognomy"
xunzi-antiphysiognomy,negativeCanonical,CONTRAST,physiognomy,moral-choice,directed,none,"reading the form is inferior to assessing the mind which is inferior to choosing one's method",xunzi-feixiang,none,"相形不如論心論心不如擇術",Reading the form is not as good as assessing the mind; assessing the mind is not as good as choosing one's method,非相,非相,null,NOT_LOCATED,NOT_LOCATED,NOT_RETRIEVED_THIS_PASS,RECORDED_NOT_VERIFIED,warring-states,none,false,HISTORICAL_EVIDENCE_ONLY,"DOWNGRADED from VERIFIED_PRIMARY: not retrieved from an inspectable witness in this pass; carry as negative finding; pin against a ctext or Wikisource oldid before promoting"
```

**Removed from the atlas entirely:** `qise-shen-cojuan-taiqing` — see §4 audit below.

---

# 5. CORRECTED_RELATIONSHIP_ATLAS.md

## Part 4 audit — does the text actually assert a relationship?

| Prior row | Verdict |
|---|---|
| five-mountains-membership-taiqing / -yuebo / -renlun | **KEPT.** Explicit assignments. All three now pinned; 月波's lower-face term resolved to 頥. |
| five-mountains-mutual-facing-taiqing / -yuebo | **KEPT.** 相朝 is an explicit reciprocal predicate, not co-presence. |
| mountains-rivers-joint-eval-yuebo | **KEPT.** Single clause governing both systems. |
| four-rivers-membership-taiqing / -yuebo / -renlun | **KEPT and pinned.** |
| four-rivers-membership-mayi | **KEPT but DOWNGRADED** to `RECORDED_NOT_VERIFIED`, `HISTORICAL_EVIDENCE_ONLY`. |
| five-officers-membership-taiqing / -renlun | **KEPT and RECLASSIFIED** — the disagreement covers four titles, not one member. |
| five-officers-one-official-ten-years | **KEPT.** Explicit conditional. |
| body-three-sections-ranked / -proportion | **KEPT**, domain re-labelled explicitly BODY. |
| three-sections-proportion-shuoge | **KEPT.** |
| five-forms-generation-yuguan | **KEPT, renamed** `five-forms-like-with-like-yuguan`, upgraded to `VERIFIED_PRIMARY`. Note it is *not* a generation (相生) relation — it is like-with-like (似X得X). The prior name asserted a doctrine the text does not state. |
| five-forms-verse-shenxiang | **KEPT but DOWNGRADED**, no witness. |
| renlunfengjian-agrees-mountains / -rivers | **KEPT and pinned.** |
| **qise-shen-cojuan-taiqing** | **REMOVED FROM THE ATLAS.** The only evidence was that 論神 and 氣色 headings occupy 太清神鑑 卷三. That is co-presence. Reclassified `EDITORIAL_ONLY` and moved out of the historical relationship set. It may be recorded as an editorial observation about juan organisation; it must not sit in a relationship atlas. *(Note: a genuine Shen relation was found elsewhere and added — `four-rivers-answer-to-shen-taiqing`, 卷二 「則應於神」. That one is a real directed relation.)* |
| xunzi-antiphysiognomy | **KEPT but DOWNGRADED** to `RECORDED_NOT_VERIFIED` — not retrieved from an inspectable witness in this pass. |

**New rows added (all pinned):** `five-mountains-directional-labels-yuebo`, `five-mountains-mutual-support-cosmological-taiqing`, `five-mountains-fullness-renlun-xue`, `four-rivers-mutual-facing-taiqing`, `four-rivers-answer-to-shen-taiqing`, `mountains-rivers-correspondence-taiqing`, `mountains-rivers-contrast-yuebo`, `five-officers-xunzi-gloss-renlun`, `facial-three-sections-boundaries-taiqing`, `facial-three-sections-sancai-taiqing`, `facial-three-sections-predicates-taiqing`, `facial-three-sections-proportion-taiqing`, `three-sections-equality-yuguan`, `five-forms-tolerance-yuguan`, `renlunfengjian-variant-witness-taiqing`, `mountains-provinces-colour-yuebo`, `xunzi-allusion-taiqing`.

## Coverage arithmetic

Rows in the corrected atlas: **34.**
- `VERIFIED_PRIMARY` and pinned (commit + SHA-256 + `<pb:>`): 34 − 3 = **31**. The three exceptions are `four-rivers-membership-mayi`, `five-forms-verse-shenxiang`, `xunzi-antiphysiognomy`, all `RECORDED_NOT_VERIFIED`.
- Distinct constructs represented: 三停 (facial + body counted separately) = 2, 五形, 十二宮 = 0 (absent), 五嶽, 四瀆, 五官, 五色/氣色-adjacent, 神 = **8**.
- Rows with `prohibitedForUserInference: true`: 14 (counting: five-mountains-mutual-facing ×2, four-rivers-answer-to-shen, mountains-rivers-joint-eval, five-officers-ten-years, facial-three-sections-predicates, facial-three-sections-proportion, body-three-sections-ranked, body-three-sections-proportion, three-sections-equality-yuguan, five-forms-like-with-like, mountains-provinces-colour, five-forms-verse-shenxiang, four-rivers-membership-mayi) = **14**.
- Rows marked `ELIGIBLE` (no historical prohibition, pinned): 34 − 14 − 2 (`xunzi-antiphysiognomy` and… correction: xunzi-antiphysiognomy is already counted as unpinned and not prohibited) → 34 − 14 = 20 rows without a prohibition flag, of which 18 are pinned and 2 are not (`xunzi-antiphysiognomy` is 1; recount: unpinned rows are mayi [prohibited=false], shenxiang-verse [prohibited=true], xunzi [prohibited=false]) → **pinned and unprohibited = 20 − 2 = 18.**
- Disagreement clusters: **4** — `five-mountains-lower-face-term` (3 members), `four-rivers-eye-mouth` (3 pinned agreeing + 1 unpinned dissenting), `five-officers-titles` (2 members), `three-sections-predicate` (5 members across 相稱/平等 and body/facial).

---

# 6. FIVE_FORMS_25_TYPE_VERDICT.md

**Question:** does any physiognomic source in the heritage corpus contain a 25-type structure?

**Search performed:** full-text scan of all 17 files across the four pinned repositories for 二十五, 五行形, 五形, and the 似X得X pattern.

**Results:**
- `二十五` occurs exactly **twice** in the entire corpus, both times as an **age number**, neither in a typological structure:
  - KR3g0043_002 `<pb:...002-15b>`: 「二十以上二十五以下」 — an age band in a longevity passage.
  - KR3g0046_001 `<pb:...001-12a>`: 「主二十五年吉運」 — a year-count in the age-run (運) commentary.
- **The 玉管照神局 passage is a FIVE-member like-with-like set, not a 5×5 grid.** The text reads 「似金得金…似木得木…似水得水…似火得火…似土得上」 — five pairings only. There is no 似金得木, 似金得水, etc. **A 5×5 = 25 grid does not exist in this text.** The prior pass's hypothesis that a 「似X得Y」 grid might be the origin of the product's 25-type statement is **falsified from the bytes.**
- 太清神鑑 卷四 contains a **五形** section plus an animal-form catalogue (鶴形者, 鳯形者, 龜形者, 犀形者, 虎形者, 獅子形者, 龍形者) and 五短之形 / 五長之形. None of these is a 25-type structure, and none is a 5×5 subdivision of the five elements. The animal forms are a *parallel, non-elemental* taxonomy.
- 玉管照神局 likewise pairs the elements with 飛禽走獸 classes — again parallel, not multiplicative.
- **`十二宮` and any 5×5 elemental subdivision: zero occurrences across all four texts.**

**Verdict on the product's 25-type statement: (C) borrowed from 黃帝內經/靈樞**, with a secondary possibility of (B).

Reasoning: the only well-attested 25-type structure in the Chinese body-reading world is 靈樞·陰陽二十五人, which is explicitly 五形 × five 五音 gradations = 25. That is a **medical** text, not a physiognomic one, and it is not part of the pinnable heritage corpus. No physiognomic witness in the corpus contains 25 subdivisions. The product statement therefore describes a structure that exists, but in a source the heritage layer does not draw on.

**Consequence for the contradiction:** the previous dossier's conclusion ("25-type belongs to 靈樞 and should be excluded") is **CONFIRMED as a historical matter.** The product contract's assertion that "the heritage source has a 25-type structure that must be disclosed" is **not supported by any physiognomic primary source in the corpus.** Whether the contract should be amended is a product-owner decision and is not made here. What research can say: if the contract's 25-type disclosure is meant to describe the *heritage layer*, it is describing 靈樞, and the disclosure should either name 靈樞 explicitly as a medical parallel or be withdrawn. **Estimate: ~85% that the product statement entered the corpus via a secondary summary that conflated 靈樞's 陰陽二十五人 with the physiognomic 五形人** — the two share the phrase 五形 and are routinely merged in practitioner literature. Reason for the residual 15%: 神相全編 is unpinnable and could in principle carry a 25-fold expansion that no accessible witness shows.

---

# 7. TWELVE_PALACES_PROVENANCE.md

*Provenance only. No routing or suppression disposition is issued here.*

1. **Presence in the four pinned texts: ZERO.** The string `十二宮` does not occur in any of the 17 files of KR3g0043, KR3g0044, KR3g0045 or KR3g0046. This is a byte-level negative result at pinned commits, reproducible with `grep -c 十二宮`.
2. **What 太清神鑑 carries instead:** 卷二 has 面部一百二十位 (the 120-position face map) as its positional system. The two systems are structurally different — a 120-cell topography vs a 12-palace scheme — and are not variants of each other.
3. **Individual palace *names* do occur as ordinary vocabulary**, which is important not to mistake for the system: 財帛 appears in KR3g0043 (1), KR3g0044 (2), KR3g0045 (9), KR3g0046 (10); 妻妾 in KR3g0044 (2), KR3g0045 (2), KR3g0046 (2); 奴僕 in KR3g0043 (1), KR3g0044 (9), KR3g0045 (2), KR3g0046 (3); 疾厄 in KR3g0045 (2). **These are the words, not the palace system.** Counting them as evidence of 十二宮 would be exactly the co-presence error this pass exists to catch.
4. **Earliest inspectable witness containing the system:** none obtained in this pass. The 麻衣 / 神相全編 lineage remains the transmitting tradition, and remains unpinnable — no cleanly licensed machine-readable witness was located (the constraints reported in the 23 Aug addendum are unchanged; nothing new was retrieved).
5. **Membership and anatomical placement:** cannot be given at `VERIFIED_PRIMARY` from any witness inspected in this pass. Any membership list the project currently holds is `RECORDED_NOT_VERIFIED` until a witness is pinned.
6. **Relationship to 紫微斗數:** the twelve palace names overlap substantially with the 紫微斗數 natal-chart palace set. **Whether this is borrowing, shared administrative-cosmological vocabulary, or independent development cannot be determined from the evidence inspected here.** What can be said negatively: the overlap cannot be adjudicated from the pinned Siku physiognomy corpus, because that corpus does not contain the system at all. Determining direction of borrowing would require pinned witnesses of both traditions with datable recensions — neither of which this pass obtained.
7. **Literal historical terminology recorded, per the brief:** 妻妾宮, 奴僕宮, 疾厄宮 are recorded verbatim as the traditional names. No product presentation decision is made here.

---

# 8. FIVE_MOUNTAINS_STAGE3_DECISION_INPUT.md

**Historical input, restated:** for the 相朝 relationship specifically, the disposition is `MULTIPLE_WITNESSES_SAME_RELATION` — two independently-worded base-text witnesses (太清神鑑 卷二; 月波洞中記 卷上), plus a third witness (人倫大統賦, 薛延年 commentary) that carries **豐隆 but not 相朝**. The lower-face anatomy is `CONTESTED_RELATION` across three terms (頥 / 頷 / 頦).

**Note on scope (Part 5C):** `MULTIPLE_WITNESSES_SAME_RELATION` is a statement about texts. It says nothing about whether the current single-lineage Stage-3 engine can mechanically reach a multi-witness cluster. That remains **BLOCKED (repo-dependent)**.

| Option | Historical upside | Historical distortion risk | Implementation consequence | Erases disagreement? | Requires changing frozen Stage-2 semantics? |
|---|---|---|---|---|---|
| **1. ROUTE_TO_SINGLE_NAMED_LINEAGE** (e.g. → 太清神鑑) | Renders the best-attested 相朝 wording with a full pinned locator. Taiqing is the only witness carrying 相朝 *and* 豐隆 in one clause. | High. Silently discards 月波 (independent 相朝 witness, arguably earlier) and 人倫 (豐隆-only). Presents 頷 as *the* lower-face term when three are attested. Creates false lineage certainty on a Qing WYG recension. | Smallest change. Fits the existing single-lineage route. | **Yes** — erases the 頥/頷/頦 split and the 相朝-absent Renlun position. | No. |
| **2. KEEP_ABSTRACT_PRIMARY_UNROUTED** | Zero distortion. Preserves the honest state: the relation is multiply witnessed and no single witness is privileged. | None historically. The risk is product-side (heritage layer under-renders). | No change; `ABSTRACT_LINEAGE_OVERRIDES` stays `Object.freeze({})`. Five Mountains material stays `LINEAGE_RESEARCH_ONLY`. | No. | No. |
| **3. DEFER_PENDING_MULTI_WITNESS_ARCHITECTURE** | Same as 2 today, but names the actual blocker: the evidence supports a two-witness presentation that the engine cannot yet express. | None historically. Risk is schedule, not fidelity. | Requires a multi-witness render path (parallel witness cards + a disagreement field) before anything ships. Larger work item. | No — it is the option that eventually *shows* the disagreement. | **Likely yes** if Stage-2 semantics assume one lineage per construct. This must be checked against the repo, which was not accessible. |
| **4. SUPPRESS_RELATION_PENDING_EVIDENCE** | None. | Discards genuinely well-attested, now fully pinned material — over-correction. The evidence gap that motivated suppression has been closed by this pass. | Removes Five Mountains from runtime. | Vacuously no. | No. |

**RESEARCH RECOMMENDATION — NOT PRODUCT DECISION: Option 3, `DEFER_PENDING_MULTI_WITNESS_ARCHITECTURE`,** with Option 2 as the correct interim state (they are compatible: 2 describes what the runtime does today; 3 describes what should unblock it).

Why not 1: routing to 太清神鑑 would assert a lineage priority the evidence does not support. 月波洞中記 carries 相朝 in independent wording and is plausibly the earlier witness; picking Taiqing because it is the fuller passage is the "silently chose one lineage because it was convenient" failure. Why not 4: the pinning gap that justified caution is now closed — 31 of 34 rows carry commit, hash and folio. Why 3 over bare 2: the historical work is finished for this family; what remains is an architecture limitation, and labelling it as such is more accurate than leaving it as an open research question.

**Caveat the product owner must resolve, not research:** whether Option 3 requires changing frozen Stage-2 semantics depends on repo facts this pass could not read.

---

# 9. CHANGES_FROM_PREVIOUS_DOSSIER.md

**CONFIRMED**
- Four Rivers assignment passage is in 太清神鑑 **卷二**, not 卷一; 卷一 carries only the cosmological verse 「五嶽四瀆皆有神金木水火土為分」. *(Verified at `<pb:KR3g0045_WYG_002-18a>` and `<pb:KR3g0045_WYG_001-1a>`.)*
- 太清神鑑 五官 reads 鑒察官 (not 監察官), 眉為保夀官, 一官好則貴十年, and omits 舌.
- 太清神鑑 卷六 三停 is **body** sections (身三停) with a differential-ranked primary predicate and a 相稱 secondary via 又云.
- 太清神鑑 卷一 說歌 reads 三停大體求相稱.
- 太清神鑑 卷二 五嶽 gives non-directional mountain names with lower face = 頷 and the predicate 五嶽須要豐隆而相朝.
- 人倫大統賦 gives directional labels with lower face = 頦; orthographic variant 㤗 = 泰 present and recorded.
- 〈人倫風鑑同〉 notes follow both the 五嶽 and 四瀆 sections.
- 十二宮 is absent from all four Siku physiognomy witnesses.
- 25-type does not belong to the physiognomic corpus (verdict C).
- WYG is a Qing recension; pinning does not upgrade priority.

**DOWNGRADED**
- `four-rivers-membership-mayi`: `RECORDED_NOT_VERIFIED` → unchanged status but explicitly barred from promotion; no witness obtained.
- `five-forms-verse-shenxiang`: `RECORDED_NOT_VERIFIED`; no witness obtained.
- `xunzi-antiphysiognomy`: was `VERIFIED_PRIMARY` in the prior atlas → now `RECORDED_NOT_VERIFIED`. Not retrieved from an inspectable witness in this pass. Pin it against a ctext or Wikisource permanent `oldid` before restoring.
- Claim that "the directional cosmology is genuinely a Renlun feature, not a Taiqing one": downgraded — 月波 卷下 also carries directional labels.
- Claim that 月波 and 太清 constitute "one textual lineage": downgraded to *two witnesses sharing doctrine*. Wording is not shared.

**REJECTED**
- **"Kanripo transcriptions carry no leaf markers; no folio is derivable, now or later."** False. Every file carries `<pb:...>` markers. 23 Aug addendum §1.3 and §5 Q5 are wrong for these texts.
- **"The 平等 wording belongs to the Shenxiang quanbian / Mayi lineage, not to this one."** False. 玉管照神局 卷下 `<pb:KR3g0044_WYG_003-13a>` reads 三停平等能和美.
- **"Facial thirds has no witness in the Siku corpus."** False. 太清神鑑 卷五 論靣部 gives full facial boundaries, a 三才 correspondence, and per-section predicates.
- **"The Five Officers disagreement is the fifth member (眉 vs 人中)."** Incomplete to the point of being wrong: four of five office titles differ.
- **"人倫風鑑 is probably not an independent work (~60–70%)."** Rejected. Cited 16 times by name in 太清神鑑 卷一 as a variant-reading witness, and listed alongside 洞玄經 and 千字文 as a distinct titled work. **Updated estimate: ~85% that 人倫風鑑 was a real, independent, now-lost text** (reason for residual uncertainty: no surviving witness or catalogue entry, so its independence rests entirely on how the Taiqing compiler and the Siku editors treated it).
- **"The 薛延年 commentary cannot be distinguished from the 賦 in the plain text."** Rejected. The WYG transcription sets commentary in parentheses. **All** Five Mountains / Four Rivers / Five Officers material in 人倫大統賦 is commentary.
- Hypothesis that a 5×5 「似X得Y」 grid in 玉管照神局 produced the product's 25-type statement. Falsified: only five like-with-like pairs exist.

**RECLASSIFIED**
- `qise-shen-cojuan-taiqing`: relationship → **`EDITORIAL_ONLY`, removed from the atlas.** Co-presence in 卷三 is not a relation. Replaced by a genuine Shen relation found in 卷二 (`four-rivers-answer-to-shen-taiqing`, 「則應於神」).
- `five-forms-generation-yuguan` → renamed `five-forms-like-with-like-yuguan` and upgraded to `VERIFIED_PRIMARY`. It is **not** a 相生 generation relation; the prior name asserted doctrine the text does not state.
- `runtimePotential` for every row previously set to `source-panel-only` purely on the strength of `prohibitedForUserInference: true` → **`PRODUCT_DECISION_REQUIRED`.** A safety flag is not a visibility policy (Part 5).
- 人倫大統賦 commentator's date: 金 → **元** per the file header (`金 張行簡 撰 / 元 薛延年 注`). The `RLDTF-XUE` record needs correcting: a Jin 賦 with a Yuan 注.
- Five Mountains historical disposition: prior dossier's product-facing `CARRY_MULTIPLE` → historical `MULTIPLE_WITNESSES_SAME_RELATION` (for 相朝) + `CONTESTED_RELATION` (for lower-face anatomy). The software disposition is now issued separately in §8 and is **not** the same object.

**STILL_UNRESOLVED**
- 神相全編 remains unpinnable. No new access route was attempted or obtained in this pass. The asymmetry stands: peripheral Song/Jin witnesses fully pinned; the late-Ming compilation supplying most modern doctrine, not.
- 麻衣 lineage: no inspectable witness. The Four Rivers eye/mouth dispute therefore remains one-sided in evidential quality — three pinned witnesses vs an unpinned tradition. **Do not resolve it on that basis**; evidential availability is not textual priority.
- Twelve Palaces membership, placement, earliest witness, and the 紫微斗數 borrowing direction — all `SOURCE_REQUIRED`.
- Age/life-stage overlay on 三停 — no witness in the pinned corpus; `SOURCE_REQUIRED`.
- Whether Option 3 in §8 requires changing frozen Stage-2 semantics — **BLOCKED (repo-dependent).**
- The mien-shiang repository itself was not read in this pass; the 25-type contract wording and the Twelve Palaces product decision were taken from the brief, not verified.

---

**Sources:** Kanseki Repository (Kanripo) — `github.com/kanripo/KR3g0043` @ `f69732902fc82fb6b1f759cb7bf5a910c0b903a3`, `KR3g0044` @ `0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74`, `KR3g0045` @ `b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5`, `KR3g0046` @ `b408ea0b969672a1f52e5ec371f9fe3250976e58`, all `BASEEDITION WYG` (文淵閣四庫全書), cloned and read 2026-08-27T02:16:47Z, SHA-256 per file listed in §1; prior project research — *Mien Shiang Interpretation Knowledge Base v1* (20 Aug 2026), *Heritage Source Verification Addendum* (23 Aug 2026), and the *Canonical Heritage Relationship Atlas + Lineage Routing Dossier* (this project). Scholarship referenced for attribution context only, not quoted: Livia Kohn, *Asian Folklore Studies* 45.2 (1986): 227–258 (DOI 10.2307/1178619); Xing Wang, *Physiognomy in Ming China* (Brill 2020, ISBN 978-90-04-42954-3); Ulrich Theobald, chinaknowledge.de. All English renderings above were produced fresh for this project. Not verified in this pass: 麻衣神相, 神相全編, 荀子·非相, and the mien-shiang repository.

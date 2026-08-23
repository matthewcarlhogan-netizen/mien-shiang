/*
 * THE COMPONENT CORPUS.
 *
 * Contract §5: do not author one paragraph per mathematical combination.
 * Author components that respond to one dimension each, and let composition
 * produce the variation. Contract §17: every component earns its place — a
 * larger corpus of vague fragments is worse than a smaller one that is sharp,
 * because vagueness is what makes two different days read the same.
 *
 * ── THE THREE LAYERS ARE SEPARATE HERE, NOT JUST IN THE UI ─────────────────
 * OBSERVATION components may only describe what was measured against the
 * person's own baseline. HERITAGE components may only report what a source
 * says, attributed. BRIDGE components are the only place the two are allowed
 * to touch, and they are written so the join is visibly a placing-beside, not
 * an inference. That separation lives in the data structure so it survives a
 * designer who has never read the contract.
 *
 * ── WHAT THE PROSE MAY NOT DO ──────────────────────────────────────────────
 * No banned stem from `no-medical-language.test.js`. No second-person future.
 * No absolute or cross-user quantity — every observation is this person against
 * their own recent readings, because that is the only comparison the product
 * computes. Nothing here may claim the face reveals character, state or
 * outcome.
 */

/* ── LAYER 1 — OBSERVATION ───────────────────────────────────────────────── */

/** What rose, in plain words. Never a colour name presented as a finding. */
export const ASCENDANT_SUBJECT = Object.freeze({
  chi: "warmth",
  huang: "a golden cast",
  qing: "a cooler, greener cast",
  bai: "paleness",
  hei: "shadow",
  ping: "your usual range",
});

export const REGION_PLACE = Object.freeze({
  centre: "through the centre of your face",
  periorbital: "around your eyes",
  overall: "across your face as a whole",
});

/*
 * Three shapes for the observation sentence.
 *
 * Same facts, different syntax: one leads with the thing, one leads with the
 * place, one leads with the comparison. Cadence is what a returning reader
 * notices before vocabulary, so the variation lives in the sentence structure.
 */
export const OBSERVATION_SHAPES = Object.freeze([
  ({ subject, place, verb, object }) => `There is ${subject} ${place} that ${verb} ${object}.`,
  ({ subject, place, verb, object }) => `${place[0].toUpperCase()}${place.slice(1)}, ${subject} ${verb} ${object}.`,
  ({ subject, place, verb, object }) => `Against ${object}, ${subject} ${place} ${verb} it.`,
]);

export const DIRECTION_VERB = Object.freeze({
  up: "has risen above",
  down: "has fallen below",
  mixed: "has moved unevenly against",
  none: "sits inside",
});

export const MAGNITUDE_QUALIFIER = Object.freeze({
  /*
   * "level" carried an empty string until the component audit pointed out what
   * that meant: a day on which nothing moved got a shorter reading than a day
   * on which something did, as though steadiness were an absence rather than an
   * observation. It is the most common day most users will have. It gets a
   * sentence.
   */
  level: ["Nothing has stepped outside your own scatter today. That is a reading too, not the absence of one.",
          "Everything today falls inside the spread of your own recent readings. Steady is information, not silence."],
  slight: ["It is a small difference, but it is a real one — it stands outside the ordinary scatter of your own readings.",
           "Small, and still not noise: it sits past the range your own readings usually wander through."],
  clear: ["The difference is easy to separate from your usual variation.",
          "There is enough here that ordinary day-to-day wobble does not account for it."],
  marked: ["This is the furthest this has sat from your own baseline in the span the app can see.",
           "Nothing in the record the app holds has sat this far out. Worth noticing, whatever it turns out to mean."],
});

export const HEADLINE = Object.freeze({
  chi: {
    up: ["Something is running warmer today.",
         "Today arrives with more heat in it than the last few.",
         "Warmth has moved to the front of the picture."],
    down: ["The warmth has drawn back.",
           "Today is cooler than the days just behind it.",
           "The heat has stepped out of the foreground."],
    mixed: ["Warmth is moving in two directions at once.",
            "Today pulls warm in one place and away in another.",
            "The heat is unevenly distributed rather than simply up or down."],
  },
  huang: {
    up: ["A golden cast has come forward.",
         "There is more gold in today than in the days before it.",
         "Gold has risen through the picture."],
    down: ["The gold has receded.",
           "Today holds less gold than the recent run.",
           "The golden cast has stepped back."],
    mixed: ["The gold is unevenly placed today.",
            "Gold gathers in one place today and thins in another.",
            "The golden cast is patchy rather than general."],
  },
  qing: {
    up: ["Something cooler has surfaced.",
         "Today runs cooler than the days immediately behind it.",
         "A cool cast has come to the surface."],
    down: ["The cool cast has lifted.",
           "Today is less cool than the recent run.",
           "The coolness has drained out of the picture."],
    mixed: ["The cool cast is uneven today.",
            "Coolness settles in one place today and lifts in another.",
            "The cool is patchy rather than even."],
  },
  bai: {
    up: ["There is more paleness than is usual for you.",
         "Today reads paler than the days just behind it.",
         "Paleness has come forward in the picture."],
    down: ["The paleness has filled back in.",
           "Today carries more colour than the recent run.",
           "The pale has receded from the foreground."],
    mixed: ["Paleness is sitting unevenly.",
            "Today thins in one place and fills in another.",
            "The paleness is local rather than general."],
  },
  hei: {
    up: ["There is more shadow than you usually carry.",
         "Today sits deeper in shadow than the days before it.",
         "Shadow has gathered rather than scattered."],
    down: ["The shadow has eased.",
           "Today holds less shadow than the recent run.",
           "The shadow has loosened its hold."],
    mixed: ["The shadow has shifted rather than settled.",
            "Shadow deepens in one place today and lifts in another.",
            "The shadow has moved rather than grown."],
  },
  ping: {
    none: ["Today sits inside your own usual range.",
           "Nothing today steps outside the range of your recent readings.",
           "Today reads as one of your ordinary days."],
  },
});

/* ── LAYER 1b — HISTORY. Contract §10. ───────────────────────────────────── */

export const HISTORY_LINE = Object.freeze({
  calibrating: {
    steady: ["The app is still learning what ordinary looks like for you. Until it has a few more readings, it has nothing of yours to compare today against.",
             "There is no personal range yet to measure today against. That comes from repetition, and repetition takes days."],
  },
  establishing: {
    first: ["This is the first time it has appeared since the app started keeping your baseline.",
            "Nothing like this sits in the short record so far. It is new to the picture, or the picture is still too short."],
    repeating: ["It has shown up before in the short record the app holds so far.",
                "This has surfaced once already in the little history there is."],
    persisting: ["It has been present in each of the last readings, which is most of what the app knows about you.",
                 "It has held across the recent run — though the run is short enough that holding does not mean much yet."],
    settling: ["It was present recently and is drawing back toward the range the app has been learning.",
               "It has begun returning toward the middle of what little the app has learned."],
    steady: ["The picture the app holds of your ordinary range is still filling in.",
             "The record is still short, so ordinary is still being defined."],
  },
  established: {
    first: ["In the record the app holds, this has not appeared before.",
            "Across everything the app has kept, there is no earlier instance of this."],
    repeating: ["This is not the first time — it has surfaced before and then gone quiet again.",
                "It has come and gone before. The pattern is intermittent rather than new."],
    persisting: ["What began as a small difference has stayed present across several readings now. Persistence is more interesting than size.",
                 "It has not let go across several readings. Duration, rather than depth, is what stands out."],
    settling: ["The movement in these recent readings is easing back toward your usual range.",
               "What had moved is on its way home. The return is as much a part of the pattern as the departure."],
    steady: ["Nothing is standing out against the range the app has learned for you.",
             "Against a record this long, today is unremarkable — which is its own kind of answer."],
  },
});

/* ── LAYER 1c — CONFIDENCE. Contract §11: it changes the voice. ──────────── */

export const CONFIDENCE_VOICE = Object.freeze({
  high: ["The capture was clean, so this reading is on solid ground.",
         "Conditions were good enough that the measurement can carry its own weight."],
  moderate: ["Conditions were reasonable, so take this as a real signal held lightly.",
             "Good enough to mean something, not good enough to lean on."],
  limited: ["Today's light makes this harder to separate from the conditions than usual. Hold it loosely.",
            "The room is doing some of the work here. Take it as a hint rather than a finding."],
  below: ["Today's conditions were not good enough to tell a real difference from an artefact of the capture.",
          "The capture and the face cannot be told apart today, so nothing here would be worth saying."],
});

/* ── LAYER 1d — AVAILABILITY. Contract §12. ──────────────────────────────── */

export const AVAILABILITY_LINE = Object.freeze({
  read: [""],
  abstained_capture: [
    "Not read today. The capture did not carry enough usable detail, so there is nothing here worth telling you about.",
    "Nothing to report from this one. The frame did not hold enough to work from, and an answer built on that would be invention.",
  ],
  abstained_anatomy: [
    "Not read, and not readable from this angle at all. Assessing this region needs depth that a straight-on photograph cannot supply, so it is left out rather than estimated.",
    "This one stays blank by design. A face-on photograph cannot recover the depth the reading would need, and no amount of retaking changes that.",
  ],
  abstained_confidence: [
    "Not read today. Something may have moved, but it cannot be separated from today's lighting, and a guess dressed as an observation is worse than a gap.",
    "Held back today. There may be something here, but the room and the face are not separable in this capture, so the honest answer is silence.",
  ],
  abstained_calibrating: [
    "Not read yet. There is no personal baseline to compare against until the app has watched you for a few more days.",
    "Too early. The comparison this reading needs is against your own past readings, and there are not enough of them yet.",
  ],
});

/* ── LAYER 2 — HERITAGE. Attributed, sourced, never about the user. ──────── */

export const HERITAGE_CONSTRUCT_LABEL = Object.freeze({
  threeSections: "Three Sections",
  fiveElements: "Five Elements",
  twelvePalaces: "Twelve Palaces",
  fiveMountains: "Five Mountains",
  fourRivers: "Four Rivers",
  fiveOfficers: "Five Officers",
});

/*
 * A missing source clearance is rendered as a deliberate gap, not as a blank
 * card and never as the disputed heritage prose. These strings describe the
 * project's source-review decision; they do not paraphrase the tradition.
 */
export const HERITAGE_REVIEW_COPY = Object.freeze({
  passage: (label) => `${label} stays in the research ledger, not in this reading: its source record has not cleared verification for reader-facing interpretation.`,
  attribution: (label) => `Mien Shiang source review ledger — ${label}`,
  bridge: (label) => `There is no ${label} passage to place beside today's observation. The gap is deliberate: unresolved source work remains unresolved.`,
  question: "What is protected by leaving an old claim unanswered until its source can be checked?",
});

export const HERITAGE = Object.freeze({
  threeSections: {
    primary: {
      text: "The face was divided into three sections, upper, middle and lower. One much-quoted line — eight characters, from a text whose authorship is disputed — holds that when the three stand equal, the reading is auspicious.",
      source: "Received Ma Yi material; attribution and predicate are contested",
      note: "That single line is the whole basis for the balanced-thirds idea. It is a maxim, not a system.",
    },
  },
  fiveElements: {
    primary: {
      text: "The Inner Classic sets out five forms — wood, fire, earth, metal, water — and gives each a face: long, tapering, round, square, uneven.",
      source: "Huangdi Neijing, Lingshu, Yin-Yang Twenty-Five Types; anonymous composite text",
      note: "The source actually divides these five again into twenty-five. Almost every modern retelling, including this one, keeps the five and drops the rest.",
    },
  },
  twelvePalaces: {
    primary: {
      text: "Twelve regions of the face were named as palaces, each given a domain of life to preside over.",
      source: "Shenxiang Quanbian; the exact Twelve Palaces body locator remains unresolved",
      note: "The same twelve names belong to an entirely different astrological system, so the labels travel further than the physiognomy does.",
    },
  },
  fiveMountains: {
    primary: {
      text: "Five peaks were mapped onto the face: the forehead in the south, the chin in the north, the two cheekbones east and west, and the nose at the centre. The centre was where the others were said to find their balance.",
      source: "Taiqing Shenjian, a Song-era text attributed to Wang Pu; the attribution was rejected by the Siku editors",
      note: "The sources agree on the cheekbones and disagree on the chin — jaw, chin point, or a whole lower-face zone, depending which you read.",
    },
  },
  fourRivers: {
    primary: {
      text: "Four waterways were mapped onto the face: the ears, the eyes, the mouth and the nose, each asked to be deep, broad and clear.",
      source: "Taiqing Shenjian; ears, eyes, mouth and nose are assigned to four named waterways",
      note: "Two lineages disagree about the eyes and the mouth. This is the first of them.",
    },
    variant: {
      text: "Four waterways were mapped onto the face — but in this line of transmission the eye is the Yellow River and the mouth is the Huai, the reverse of the other reading.",
      source: "Shenxiang Quanbian head-volume Xiangshuo witness",
      note: "Neither reading is a corruption of the other. Both are reinforced elsewhere in their own texts. The disagreement is a thousand years old and unresolved.",
    },
  },
  fiveOfficers: {
    primary: {
      text: "Five features were given official titles, as though the face were a small government: the ear gathers word, the eye inspects, the nose discerns, the mouth keeps the accounts.",
      source: "Shenxiang Quanbian; the formula wording was not verified against a primary edition",
      note: "A fifth officer, the eyebrow, was titled for longevity. That part is left out here, and deliberately.",
    },
  },
});

/* ── LAYER 3 — THE BRIDGE. The only place the layers may touch. ──────────── */

export const BRIDGE_OPENER = Object.freeze([
  "That does not mean what the app measured carries the meaning they gave it. But placed beside their idea, it leaves a question worth sitting with:",
  "Their reading and this measurement are not the same kind of claim, and the join between them is ours rather than theirs. Still, the two beside each other suggest something:",
  "One is a measurement of light on skin; the other is a thousand-year-old way of looking. Holding them together is a choice, not a deduction — and it opens onto this:",
]);

export const BRIDGE_ABSTAINED = Object.freeze([
  "Even with nothing measured today, the passage is worth sitting with:",
  "There is no observation to place beside it today, which leaves the old idea to stand on its own:",
  "Nothing was measured to bring to this, so take the passage by itself:",
]);

/**
 * The reflective question. Keyed by heritage construct and by what rose, so the
 * question actually responds to today rather than being a fortune-cookie
 * attached to an unrelated number.
 */
export const REFLECTION = Object.freeze({
  threeSections: {
    chi: ["What has been asking for more of you than its share lately?",
          "Where is the demand on you out of proportion to what it returns?",
          "If one part of your week is taking the rest hostage, which part?"],
    huang: ["Where are you carrying more weight than the situation actually asked for?",
            "What did you agree to hold that was never really yours?",
            "Which load would nobody notice you putting down?"],
    qing: ["What have you been holding at a distance?",
           "Which thing keeps getting deferred to a version of you with more time?",
           "What are you waiting to feel ready for?"],
    bai: ["What have you been spending without replacing?",
          "Where is the outflow steady and the inflow assumed?",
          "What have you been running on rather than living on?"],
    hei: ["What has been keeping you up, and is it worth what it is taking?",
          "Which unfinished thing follows you into the evening?",
          "What are you turning over at night that daylight would settle in ten minutes?"],
    ping: ["What is currently in proportion in your life, and what is quietly not?",
           "If the three parts of your week were meant to stand equal, which is tallest?",
           "Where is the balance real, and where is it just unexamined?"],
  },
  fiveElements: {
    chi: ["Which part of you has been running hot — and is that appetite or friction?",
          "What are you burning through at the moment, and by choice?",
          "Where does the heat in your week come from: wanting, or grinding?"],
    huang: ["What have you been slow and steady about, and has steady become stuck?",
            "Which routine is holding you up, and which is just holding you?",
            "What has been reliable so long that nobody checks it any more?"],
    qing: ["What are you growing that has not broken the surface yet?",
           "Which thing are you tending with no evidence it is working?",
           "What would be embarrassing to admit still matters?"],
    bai: ["What have you cut back to essentials, and did you cut too close?",
          "Which economy of yours has stopped being discipline and started being cost?",
          "What did you strip out that you now quietly miss?"],
    hei: ["What are you going deep on, and what is it costing at the surface?",
          "Which depth are you working at, and who has stopped hearing from you because of it?",
          "What have you sunk into that would be hard to climb out of quickly?"],
    ping: ["If you had to name your own shape this week, what would you name?",
           "Which of the five would a friend name for your month?",
           "What form has your week actually taken, as opposed to the one you planned?"],
  },
  twelvePalaces: {
    chi: ["Which relationship has been taking up the most room in your head?",
          "Who occupies your attention out of proportion to the time you spend with them?",
          "Which conversation keeps replaying without resolving?"],
    huang: ["What obligation are you carrying that was never formally agreed?",
            "Which duty attached itself to you without anyone deciding?",
            "What would fall over if you simply stopped doing it — and would that be bad?"],
    qing: ["Who have you not replied to yet, and why not?",
           "Which message is open in your head rather than your inbox?",
           "What is the actual reason that one is still waiting?"],
    bai: ["What have you given away this week without noticing?",
          "Where did your time go that you would not have chosen in advance?",
          "Which generosity of yours has become an expectation?"],
    hei: ["What are you keeping to yourself that would be lighter if shared?",
          "Which thing have you decided not to trouble anyone with?",
          "Who would want to know the thing still unsaid?"],
    ping: ["Which part of your life would you most want to be reading well right now?",
           "If one region of your life could be steady this month, which would you pick?",
           "Where would good news land hardest?"],
  },
  fiveMountains: {
    chi: ["What has moved toward the centre of your attention lately, and what has moved away?",
          "If your week had a middle, what is sitting in it?",
          "Which thing has quietly become the axis everything else arranges around?"],
    huang: ["What are you standing on that has gone unchecked for a while?",
            "Which foundation are you assuming rather than testing?",
            "What holds you up that you last looked at years ago?"],
    qing: ["What is on the horizon that you keep not looking at directly?",
           "Which distance are you avoiding measuring?",
           "What is coming that keeps getting postponed?"],
    bai: ["What have you been holding up that could be set down?",
          "Which peak are you maintaining for the look of it?",
          "What are you keeping high that nobody is watching?"],
    hei: ["What are you carrying at the base of things, out of sight?",
          "Which weight sits underneath the visible part of your week?",
          "What is the thing you would mention last, if at all?"],
    ping: ["What in your life is currently load-bearing?",
           "If one thing gave way this month, which would take the rest with it?",
           "Which of your peaks is doing the balancing for all the others?"],
  },
  fourRivers: {
    chi: ["What has been flowing freely, and what has been running fast enough to flood?",
          "Where is the current helping you, and where has it stopped being steerable?",
          "What has picked up more speed than you intended to give it?"],
    huang: ["What has silted up that used to move easily?",
            "Which channel of yours has narrowed without anyone deciding to narrow it?",
            "What used to be effortless and now takes a run-up?"],
    qing: ["What have you been letting run cold?",
           "Which connection are you maintaining at the minimum viable temperature?",
           "What have you kept open but stopped feeding?"],
    bai: ["What has run low that you keep drawing on anyway?",
          "Which reserve do you draw on as though it refills itself?",
          "What are you withdrawing from that has not had a deposit in months?"],
    hei: ["What have you dammed, and what is pooling behind it?",
          "Which thing have you stopped, and where has the pressure gone?",
          "What is accumulating because you closed a channel rather than redirected it?"],
    ping: ["What is moving well in your life right now, and what has stopped?",
           "If four things should be running clear, which one is not?",
           "Where is there flow, and where is there only the memory of it?"],
  },
  fiveOfficers: {
    chi: ["What have you been saying yes to faster than you meant to?",
          "Which agreement did you make before you had finished thinking?",
          "Where has your speed of response outrun your judgement?"],
    huang: ["What are you keeping the accounts on that nobody asked you to?",
            "Which ledger are you maintaining in your head alone?",
            "What are you tallying that would be better forgotten or better said?"],
    qing: ["What have you noticed but not yet named out loud?",
           "Which observation are you sitting on?",
           "What do you know without yet letting yourself conclude it?"],
    bai: ["What have you been listening for that has not come?",
          "Which answer are you still waiting on, and how long has it been?",
          "What would you do differently if you stopped waiting for it?"],
    hei: ["What have you seen clearly and chosen not to act on yet?",
          "Which thing is obvious to you and still undone?",
          "What are you giving yourself permission to postpone one more week?"],
    ping: ["Which of your own judgements have you been overruling lately?",
           "Where do you keep talking yourself out of a first read that was right?",
           "What does the quieter part of you keep saying?"],
  },
});

/** Contract §13 — never imply rotation was caused by measurement. */
export const ROTATION_DISCLOSURE = "Today's passage comes from the rotation through the traditional systems, not from anything the app measured.";

/** Contract §14 — self-report is user-reported, and said to be. */
export const SELF_REPORT_BRIDGE = Object.freeze({
  energy: "You marked your energy",
  sleep: "You marked your sleep",
  jawTension: "You marked jaw tension",
  mood: "You marked your mood",
});

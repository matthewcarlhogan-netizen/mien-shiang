/*
 * "What the science says".
 *
 * ── HOW THIS IS WRITTEN, AND WHY ───────────────────────────────────────────
 * Neutrally. This screen is information, not an apology and not a disclaimer.
 * It does not hedge the research to protect the product, and it does not
 * perform contrition about the product either — both would be a tone that
 * invites the reader to skip it.
 *
 * It is reachable in ONE TAP from the results screen. Not buried in an About
 * page, not behind a settings menu, and not dismissible by tapping past it
 * before it has been shown.
 *
 * This file is the single source for that content so the copy lint has one
 * surface to scan and the text cannot drift between screens.
 */

export const SCIENCE_TITLE = "What the science says";

export const SCIENCE_INTRO =
  "You've just read a face reading. Here is what research actually shows about reading faces, stated " +
  "plainly, because you should have both.";

export const SCIENCE_POINTS = [
  {
    id: "no-basis",
    heading: "Physiognomy has no scientific basis",
    body:
      "The claim at the centre of face reading — that the shape of a face reveals character — is not " +
      "supported by evidence. This is true of the Chinese tradition this app draws on, and equally true " +
      "of the European tradition of Lavater and della Porta. These systems are old, they are culturally " +
      "significant, and they are interesting. None of that makes them predictive.",
  },
  {
    id: "fwhr",
    heading: "The facial width-to-height findings are small and contested",
    body:
      "Facial width-to-height ratio is the most-studied claim of this kind. Reported correlations with " +
      "behaviour are small — around r = 0.10 to 0.16 — and they are actively disputed, with replication " +
      "attempts and meta-analyses arriving at weaker results than the original studies. A correlation of " +
      "that size says nothing usable about any individual person, which is why this app shows the ratio " +
      "as a plain proportion and attaches no meaning to it.",
  },
  {
    id: "ml-physiognomy",
    heading: "Machine learning has not rescued the idea",
    body:
      "Studies claiming to predict personality or behaviour from photographs with machine learning report " +
      "small effects, and are widely criticised for reviving physiognomy in a new form. A recurring " +
      "problem is that models pick up on the photograph rather than the face — expression, pose, grooming, " +
      "camera and background — and are then reported as having read the person.",
  },
  {
    id: "first-impressions",
    heading: "First impressions are fast, and they are about the viewer",
    body:
      "Willis and Todorov (2006) found that people form confident impressions of traits like " +
      "trustworthiness from a face in about 100 milliseconds, and that longer looking mostly increases " +
      "confidence rather than accuracy. Those impressions are highly consistent between viewers — which " +
      "is exactly why they are unreliable. Shared snap judgements reflect shared stereotypes held by the " +
      "people looking, not information about the person being looked at.",
  },
  {
    id: "what-this-is",
    heading: "So what is this app doing?",
    body:
      "Showing you what a tradition says, with its sources named and its internal disagreements left " +
      "visible. The measurements are real — proportions and complexion values are genuinely computed from " +
      "your photo. The meanings attached to them are traditional, not evidential, and every line of the " +
      "reading is phrased to say so.",
  },
];

/** Cited so a reader can check the strongest specific claim on the screen. */
export const SCIENCE_REFERENCES = [
  "Willis, J. & Todorov, A. (2006). First impressions: making up your mind after a 100-ms exposure to a " +
  "face. Psychological Science, 17(7), 592–598.",
];

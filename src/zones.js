/*
 * Facial zone geometry — measurement configuration only.
 *
 * ── WHY THIS IS SEPARATE FROM BOTH MODULES ─────────────────────────────────
 * These landmark sets define WHERE the colorimetry engine samples. They are
 * measurement configuration, exactly like the constants in engine.js, and are
 * consumed by both modules. Neither owns them.
 *
 * Nothing interpretive lives here. The organ correspondences that used to sit
 * alongside these definitions were Module A content wearing measurement
 * clothing — "Liver — detoxification, emotional regulation" asserts a
 * physiological function, which is a health claim inside what is meant to be
 * an entertainment module. They now live in rules-a.js as attributed tradition.
 *
 * LATERALITY — verified against MediaPipe's own FaceLandmarksConnections:
 *   FACE_LANDMARKS_RIGHT_EYE contains 33, 133
 *   FACE_LANDMARKS_LEFT_EYE  contains 263, 362
 * So MediaPipe names sides from the SUBJECT's anatomy: 234 is the subject's
 * RIGHT, 454 the subject's LEFT. The original spec had these swapped, which
 * would invert the whole Liver/Lung cheek distinction.
 *
 * Front cameras mirror the preview, which inverts laterality AGAIN — so the
 * capture path un-mirrors before landmarking.
 */

export const ROIS = {
  glabella: {
    label: "Glabella", side: "midline",
    idx: [9, 151, 108, 107, 55, 8, 285, 336, 337], pad: 0.14,
  },
  center_forehead: {
    label: "Central forehead", side: "midline",
    idx: [10, 21, 54, 67, 251, 284, 297], pad: 0.16,
  },
  periorbital_right: {
    label: "Under eye (your right)", side: "right",
    idx: [33, 133, 7, 144, 145, 153, 154, 155, 246], pad: 0.22,
  },
  periorbital_left: {
    label: "Under eye (your left)", side: "left",
    idx: [263, 362, 373, 374, 380, 381, 382, 249, 466], pad: 0.22,
  },
  nose_bridge: {
    label: "Nose bridge", side: "midline",
    // MUST span both sidewalls, not just the dorsal midline. The original set
    // ([6, 197, 195, 5, 168]) was five collinear midline points, so its convex
    // hull was 4.2px wide on a 768x1024 working canvas against extractRegions'
    // 8px floor — the zone was dropped on EVERY real face, which silently
    // killed the malar safety gate that reads it. See CLAUDE.md item 23.
    // 196/419 and 3/248 are the sidewall pairs at t=0.42 and t=0.60 of the
    // nasion->tip axis: below the medial canthi, above the alae (which begin
    // around 0.10 face-widths off midline). Measured hull: 37.8 x 81.9 px.
    idx: [168, 6, 197, 195, 196, 419, 3, 248], pad: 0.10,
  },
  nose_apex: {
    label: "Nose tip", side: "midline",
    idx: [4, 1, 19, 94, 2, 98, 327, 129, 358], pad: 0.10,
  },
  cheek_right: {
    label: "Cheek (your right)", side: "right",
    idx: [234, 118, 119, 100, 120, 47, 126, 209], pad: 0.06,
  },
  cheek_left: {
    label: "Cheek (your left)", side: "left",
    idx: [454, 347, 348, 329, 349, 277, 355, 429], pad: 0.06,
  },
  nasolabial_right: {
    label: "Smile line (your right)", side: "right",
    idx: [129, 209, 49, 64, 98, 97, 165, 92], pad: 0.10,
  },
  nasolabial_left: {
    label: "Smile line (your left)", side: "left",
    idx: [358, 429, 279, 294, 327, 326, 391, 322], pad: 0.10,
  },
  perioral_upper: {
    label: "Upper lip area", side: "midline",
    idx: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291], pad: 0.12,
  },
  chin: {
    label: "Chin", side: "midline",
    idx: [152, 148, 149, 150, 377, 378, 379, 176, 400, 175], pad: 0.10,
  },
};

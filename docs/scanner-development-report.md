# Face Scanner Development Report

## How we arrived at the current Mien Shiang face scanner

**Date:** 14 August 2026  
**Repository reviewed:** `matthewcarlhogan-netizen/mien-shiang`

## Executive summary

The current face scanner was not produced by simply adding MediaPipe face landmarks to a camera preview. It evolved through repeated failures in camera behaviour, pose measurement, coordinate alignment, lighting, focus, motion, capture timing, confidence, and biometric-data handling.

Many of the most serious defects initially looked correct:

- a camera constraint could resolve without actually being applied;
- a pose gate could be fully tested while receiving hard-coded zeroes in the live app;
- an orthonormality check could approve both a rotation matrix and its incorrect transpose;
- a mirrored preview could look right while the measurement canvas sampled the opposite side of the face;
- a pixel-count check could confidently approve a closed, nearly black eye region;
- a specular filter could delete every pixel from a perfectly even sclera sample;
- a technically accepted frame could still sit so close to a threshold that it should not support a confident result.

The scanner we have now is therefore built around a different principle: **do not trust a successful API call, a single passing frame, or a plausible-looking output. Verify the state, require stable evidence, preserve uncertainty, and abstain when the evidence is inadequate.**

The present system includes:

- consent enforcement before camera access and face inference;
- a live front-camera preview with mobile error recovery;
- ten capture-quality gates;
- actionable Face, Light, Clear, and Still guidance;
- exposure warm-up and verified camera-mode negotiation;
- autofocus and screen-light assistance;
- a stable hold followed by a robust nine-frame burst;
- smoothed face regions and robust colour reduction;
- explicit scan confidence and low-confidence abstention;
- a strict derived-data-only persistence boundary.

The live scanner is substantially more defensible than the original path, but Android physical-device validation, complete resource-lifecycle ownership, and the still-image fallback remain release work.

A later stress review also found two important weaknesses that remain in the current code: the underexposure gate still uses an absolute dark-skin-pixel threshold, and the 22% distance threshold was moved from inner to outer eye corners without being re-derived for the new measurement. These are recorded below as unresolved scanner defects, not rewritten as completed fixes.

## 1. Where the scanner began

The original technical direction was straightforward:

1. open the front camera;
2. run MediaPipe FaceLandmarker;
3. map facial regions from the returned mesh;
4. inspect colour and geometry;
5. accept a frame and produce a reading.

This established the basic capability, but it assumed that the browser camera, the landmark model, and the live UI were all operating in the same state and coordinate space. In practice, mobile cameras are asynchronous and device-dependent. Exposure takes time to settle, advanced constraints may be ignored, autofocus varies by browser, a video can report itself playing before it has real dimensions, and CSS mirroring can make the displayed preview differ from the pixel buffer.

The scanner therefore had to become a controlled capture system rather than a one-frame image analyser.

## 2. Consent had to become an enforced technical boundary

### Challenge

A consent screen is not sufficient if the camera or FaceLandmarker can be reached through another code path. A still image, retry action, or direct module call could otherwise begin biometric processing without passing through the visible screen.

### Resolution

Consent was moved into the capture functions themselves:

- camera startup asserts current consent;
- FaceLandmarker creation independently asserts current consent;
- a missing, corrupt, or superseded grant fails closed;
- consent is versioned so a material processing change forces a new decision;
- withdrawal is coupled to deletion of locally retained readings.

This changed consent from UI copy into a runtime invariant. There is no legal scanner path that merely assumes the consent screen was previously shown.

## 3. The camera could be open while the preview was still unusable

### Challenge

On mobile Safari and embedded browsers, `video.play()` can resolve while `videoWidth` and `videoHeight` are still zero. Attempting to draw that frame can fail inside the animation loop, leaving a frozen preview while the camera indicator remains on.

### Resolution

The scanner now:

- attaches the stream;
- waits for real, non-zero frame dimensions;
- listens for metadata and playable-frame events;
- applies an eight-second readiness timeout;
- stops treating a resolved play promise as proof of a usable camera frame;
- converts camera failures into specific next actions.

Permission denial, no camera, another app using the camera, unsupported constraints, insecure origin, and unknown startup errors now produce different recovery guidance rather than the same dead preview.

## 4. Exposure and white balance were being locked too early

### Challenge

The original path attempted to lock exposure and white balance immediately after `getUserMedia()`. On Android, automatic exposure commonly needs roughly half a second to two seconds to converge. Locking immediately could freeze the camera's dark opening value.

This created a particularly misleading loop: the scanner reported underexposure and instructed the user to find more light, but the app had disabled the automatic mechanism that could respond to that light.

Another problem was that `applyConstraints()` may silently strip an unsupported setting and still resolve successfully. A successful promise did not prove that the camera was locked.

### Resolution

The current scanner:

- starts in a pending/automatic state;
- waits for usable frames;
- requires the capture gates to pass;
- allows at least 1,500 milliseconds for exposure to settle;
- requests supported locks only after convergence;
- reads `getSettings()` to verify what actually applied;
- records the achieved mode as `locked`, `partial`, or `auto`;
- can release a stale lock back to continuous automatic operation when conditions change.

Automatic mode is treated as a valid outcome. Camera locking improves consistency when available; it is not a requirement that excludes ordinary devices.

## 5. Framing guidance used the wrong interpretation of eye distance

### Challenge

The distance gate required an interocular span of at least 22% of the frame width, but “interocular” did not specify inner or outer eye corners.

On MediaPipe's canonical face, the inner-corner span is around 15% at normal framing, while the outer-corner span is around 35%. Applying the 22% threshold to the inner corners made a correctly framed user appear permanently too far away.

### Partial resolution and remaining threshold problem

The scanner now explicitly uses the outer canthi, MediaPipe landmarks 33 and 263. This removed the original impossible loop at ordinary framing.

However, the implementation retained the original 22% threshold. That number was originally discussed against a different eye span. Re-pointing the threshold changed its physical meaning: if the outer-canthi span is roughly 35% at normal framing, a 22% outer threshold continues passing when the face is much farther away and occupies substantially less of the frame.

That slack can reduce sclera sample area and compress facial detail toward the fixed-kernel focus floor. The threshold therefore still needs to be re-derived from an explicit maximum acceptable capture distance and verified on real devices. A value around 30% outer-canthi span has been proposed as a starting point for testing, not as a completed decision.

The larger lesson is that every threshold must name the exact measurement behind it and be justified against that measurement. A reasonable number attached to an ambiguous quantity is broken; a stale number attached to a newly clarified quantity is also broken.

## 6. The pose gate existed but was not measuring pose

### Challenge

The pose gate was pure, tested, and apparently complete. The live capture loop, however, supplied:

```js
{ yaw: 0, pitch: 0, roll: 0 }
```

The gate therefore passed every frame. The tests proved that the gate function worked when given real values; they did not prove that the application supplied real values.

An attempted matrix-based solution created a second trap. MediaPipe transformation matrices require the correct memory layout. Reading a column-major rotation as row-major produces its transpose. Both a rotation matrix and its transpose are orthonormal, so an orthonormality check confidently approved either interpretation.

Roll also could not be treated as the raw projected angle between the eyes. Combined yaw and pitch introduce a cross-axis projection term. Near the gate boundary, that bias could allow an incorrectly tilted head to pass.

### Resolution

The current scanner:

- derives pose from measured landmarks;
- records which axes were actually measurable;
- never converts a missing pose axis into zero;
- judges the worst measured axis;
- limits yaw and pitch to 12 degrees and roll to 8 degrees;
- corrects roll for the yaw-by-pitch projection term;
- uses regression cases where a known composed rotation must be recovered.

This fixed both the dead live gate and the more subtle cross-axis escape near the threshold.

## 7. The preview looked mirrored correctly while the measurements were reversed

### Challenge

The front-camera preview was mirrored with CSS, which is normal for a selfie experience. The capture loop then also flipped the measurement canvas under the assumption that it was “un-mirroring” the video.

CSS affects only display. It does not change the pixels received by `drawImage()` or MediaPipe. The extra canvas flip moved the pixel buffer into the opposite coordinate space from the landmarks. Off-centre regions sampled their reflections, and left/right cheek regions were exchanged.

The preview still looked natural, which made this defect easy to miss.

### Resolution

The measurement canvas is now drawn without the additional flip. The displayed preview may remain mirrored, but the raw video pixels, landmark coordinates, and sampling polygons stay in one unmirrored space.

This established a strict rule: display transformations and measurement transformations must be handled separately.

## 8. Focus detection initially measured the wrong thing

### Challenge

Ordinary brightness variance was used as a softness signal. That does not measure focus. A sharply captured, evenly lit cheek can have low brightness variance, while a blurred shadow edge can have high variance.

On mobile devices, focus capability also differs substantially. Some cameras support continuous focus, some expose single-shot focus, and some expose neither.

### Resolution

The scanner now:

- measures spatial four-neighbour Laplacian variance;
- treats missing focus evidence as unevaluated rather than passing;
- requests continuous autofocus only after capability detection;
- can request a fresh focus cycle after persistent softness;
- restores continuous focus after a supported single-shot request;
- tells the user to clean the lens, disable portrait blur, and hold still.

The focus gate is now tied to spatial detail instead of general image contrast.

## 9. Lighting checks needed to separate different failure causes

### Challenge

“Bad lighting” was not one problem. It included:

- clipped highlights;
- deep underexposure;
- strong side light;
- unusual coloured illumination;
- unstable automatic exposure;
- a dark or closed eye region;
- specular reflections in the sclera.

A single lighting failure could not give the user an effective correction.

Two particularly deceptive defects were found.

First, a rank-based specular filter treated the brightest 5% of pixels as candidates. In a perfectly even region, every pixel can share the same rank and local maximum, so the filter removed the entire sample. A tiny catchlight could also sit above the 95th percentile and escape a pure percentile cut.

Second, a closed or nearly black eye region could contain hundreds of pixels. Quantisation made the dark RGB channels appear equal, producing a confident neutral ratio. The pixel-count requirement passed even though the sample contained no trustworthy light information.

### Resolution

The scanner now separates the causes:

- overexposure checks the fraction of skin samples at or above level 250;
- the current underexposure gate checks the fraction of skin samples at or below level 12;
- side light compares median lightness across both cheeks;
- unusual illumination checks the sclera channel-ratio deviation;
- sclera validity requires both sufficient pixels and a minimum median lightness;
- failure reasons distinguish `too_dark` from `too_few_pixels`;
- specular rejection uses a brightness floor above the median and requires a genuine local peak.

The UI can therefore suggest the right response: move away from direct light, face the light, use plain white light, open the eyes naturally, or use neutral screen light.

### Remaining blocking issue: underexposure is still skin-dependent

The current underexposure implementation cannot cleanly separate scene illumination from skin reflectance. An absolute dark-pixel threshold applied to skin will be reached under different ambient light levels for different skin reflectances. The stress review estimated a roughly 7.5× spread between its lightest and darkest example bands.

This means the existing gate can tell a darker-skinned user to find more light in a room where a lighter-skinned user passes. That disparity is inherent in the measurement definition; it does not need device testing to establish that the design is unsafe.

The gate should be redesigned around illumination evidence that is independent of skin reflectance. Candidate inputs are:

- camera exposure state, gain, or exposure-time evidence when the browser exposes trustworthy settings;
- sclera median lightness as an existing cross-check;
- a combination of sensor evidence and sclera validity.

This change is **not yet implemented**. Fairness testing must verify the replacement, but testing should not be used to justify retaining the current absolute skin threshold.

## 10. Mobile assistance had to help without changing the evidence

### Challenge

The scanner needed to help in dark rooms and on soft-focus phones without secretly modifying the captured measurement or trapping the user indefinitely.

### Resolution

The current assistance system includes:

- a display-only preview lift for underexposed scenes;
- an offer of neutral screen light after persistent darkness;
- automatic screen-light activation for persistent darkness, uneven light, or softness where appropriate;
- autofocus recovery on capable cameras;
- a delayed “use current light” option for unavoidable side or coloured light;
- reset of the stable-capture latch whenever the lighting state changes.

The preview may be made easier to see, but the underlying measurement pixels are not post-processed to manufacture a pass. Screen light changes the real illumination and is held consistently through the stability interval and burst.

## 11. Requiring extreme stillness was unrealistic

### Challenge

A two-pixel motion limit sounded precise but was below the practical floor of handheld human movement. Breathing and involuntary head motion make that requirement unrealistic.

Raw pixels also scale with camera resolution. The same physical movement appears twice as large in pixels on a 2,560-pixel stream as on a 1,280-pixel stream.

### Resolution

The scanner:

- normalises motion to a 1,280-pixel reference width;
- uses a six-pixel normal motion limit;
- allows a small assisted ceiling after the capture grace period;
- gains stability from repeated sampling rather than demanding impossible stillness.

This changed the design from “find one perfectly motionless frame” to “capture a short, stable sequence and reduce it robustly.”

## 12. A single passing frame was not reliable enough

### Challenge

One frame can pass because of temporary autofocus, exposure, landmark jitter, or a brief alignment coincidence. Capturing immediately on the first pass made the output sensitive to noise.

### Resolution

The scanner now requires:

- all unresolved gates to remain acceptable for 650 milliseconds;
- reset of that hold after any gate regression, screen-light change, or capture-mode transition;
- a nine-frame capture burst;
- smoothing of ROI polygon vertices across trailing frames;
- trimmed and median-based reduction of region values.

The burst approach absorbs normal handheld movement and transient sensor noise without pretending the user can remain perfectly still.

## 13. Ten technical gates were too much for the user

### Challenge

The capture engine needed detailed, independently testable gates. Presenting all ten directly would make the user diagnose pose, exposure fractions, illuminant ratios, motion, focus variance, eye visibility, and ROI coverage at once.

### Resolution

The interface condenses the technical state into four guides:

| User guide | Underlying gates |
|---|---|
| Face | Pose, distance, sclera visibility, readable regions |
| Light | Overexposure, underexposure, side light, unusual illumination |
| Clear | Focus/softness |
| Still | Motion |

The scanner shows one worst-first action. Messages state the fix rather than accusing the user of failure.

After 3.5 seconds, only small, evaluated light or motion imperfections may be accepted as an assisted capture. Missing inputs, bad framing, unreadable regions, closed-eye sampling, and softness remain hard stops.

## 14. Passing capture quality did not automatically justify confidence

### Challenge

All accepted captures originally risked appearing equally trustworthy. A frame that barely crossed several thresholds could look the same as a strong, stable capture.

### Implemented approach and remaining limitation

The current scanner calculates confidence with the minimum of the independent limiting factors:

- sclera confidence;
- fraction of readable regions;
- inverse frame jitter;
- an assisted-capture confidence ceiling.

Assisted captures are capped at 0.78. Confidence below 0.60 triggers a hollow/low-confidence state and downstream abstention.

The scanner preserves the gate margins so an observation that scraped through a boundary is distinguishable from one with generous margin.

This was an important product shift: uncertainty is now part of the output instead of being hidden behind a successful capture animation.

The minimum is a useful hard ceiling because one bad factor cannot be averaged away. It cannot, however, distinguish one marginal factor from several simultaneously marginal factors. A future revision may keep the minimum as the ceiling and add an accumulation penalty across the remaining factors.

The 0.78 assisted ceiling and 0.60 abstention threshold are not calibrated probabilities. Until they are validated against repeated-scan stability or another observable error measure, they should be treated as ordinal capture-grade thresholds.

## 15. Biometric privacy required a positive storage list

### Challenge

The live capture object necessarily contains images, pixels, landmark geometry, region polygons, and intermediate samples. Copying or spreading that object into storage could silently retain biometric data.

A real defect demonstrated the problem: a nested object spread appeared to copy a harmless scalar map, but any future debug payload attached to that map would pass through with it.

### Resolution

Persistence now constructs the stored record field by field from a closed list:

- constructs an explicit derived record without spreading or traversing the live capture object;
- copies only named scalar fields and explicitly shaped derived structures;
- stores only the derived observations required for local comparison;
- applies the same boundary to export and sharing;
- deletes readings and consent together.

A recursive forbidden-key check still rejects images, pixels, landmarks, embeddings, blobs, data URLs, and device fingerprints. This is defence in depth, not the primary boundary. The primary boundary is the field-by-field constructor; the negative scan exists to catch a future regression in that constructor.

The safest biometric dataset is the one the app never retains.

## 16. What the current scanner does today

The implemented live path now:

1. verifies current consent;
2. opens the front camera;
3. waits for a real usable frame;
4. establishes MediaPipe landmark processing;
5. keeps measurement pixels aligned with unmirrored landmarks;
6. calculates real pose, light, focus, motion, eye, distance, and region evidence;
7. shows one actionable correction;
8. provides supported focus and neutral-light assistance;
9. waits for stable passing conditions;
10. captures and robustly reduces nine frames;
11. assigns capture mode, clean/assisted tier, gate margins, jitter, and confidence;
12. abstains when confidence is inadequate;
13. persists only allow-listed derived values.

That is the face scanner we have at the moment: not merely a camera with landmarks, but a consent-gated, quality-controlled, confidence-aware local measurement pipeline.

## 17. What remains incomplete

The following work is part of the scanner plan but should not be described as shipped:

### Complete capture-session ownership

One lifecycle owner still needs to control the stream, animation loop, landmarker, canvases, cancellation state, and asynchronous callbacks. Cleanup must be proven on success, retry, navigation, backgrounding, interruption, and error.

### Still-image fallback

A consent-preserving selfie fallback is required for camera denial, camera unavailability, interruptions, and repeated live-camera failure. It must use the same quality, confidence, local-processing, and disposal rules as the live path.

### Physical Android validation

The scanner still requires repeated testing across low-, mid-, and high-tier Android devices and varied lighting. The important outputs are completion rate, abstention rate, p95 capture time, frame jitter, achieved camera mode, crash-free completion, and repeated-scan stability.

### Distance-threshold calibration

The 22% outer-canthi threshold must be re-derived from the largest acceptable face-to-camera distance, then tested against sclera sample area, ROI readability, and focus sensitivity. The current threshold should not be described as calibrated merely because it fixed the earlier inner-canthi loop.

### Underexposure-gate redesign

The absolute skin-pixel threshold is a blocking fairness defect by construction. Replace it with sensor-side illumination evidence and/or sclera lightness, then verify the replacement across the declared lighting and ITA-band matrix.

### Fairness validation

Rejection and abstention must be measured across lighting conditions and the user's own baseline ITA bands. A materially higher failure rate in darker bands is a blocking scanner defect to investigate, not a reason to weaken all thresholds.

Device testing measures residual disparity after design-time problems are removed. It is not the first line of detection for a threshold that is already skin-tone-dependent by definition.

### Confidence calibration

The current confidence output is a capture grade, not a calibrated probability. Repeated-scan agreement under matched conditions should be used to test the 0.78 assisted ceiling, the 0.60 abstention threshold, and any accumulation penalty added to the current worst-factor ceiling.

### Capture-time budget and abandonment

The documented serial costs imply a typical capture around five seconds, with a much longer tail when camera readiness or user correction is slow. The Android roadmap already sets a release target of p95 scan completion within 12 seconds after permission, but the current report has no evidence that the target has been met.

Testing must record abandonment as well as completion, tagged by camera readiness, gate correction, stable hold, or burst. A hard-abort time and explicit fallback path remain product decisions; an eight-second p95 and fifteen-second abort have been proposed by the stress review but are not current implementation commitments.

### Pose accuracy against physical ground truth

The pose regression suite proves the maths against synthetic composed rotations. It does not prove landmark-derived pose accuracy on naturally asymmetric faces. Physical checks at marked angles near the 12-degree yaw/pitch and 8-degree roll boundaries remain outstanding.

### Motion normalization across camera fields of view

Normalizing to a 1,280-pixel reference removes stream-resolution dependence but not camera field-of-view dependence. If the Android matrix shows device-specific motion rejection, normalize motion to interocular span or another face-relative scale and re-derive the limit.

### Regulatory classification and user notice

Consent and notice are separate concepts. Article 50(3) of the EU AI Act requires deployers of biometric-categorisation or emotion-recognition systems to inform exposed people that the system is operating. A legal/product classification is still required to determine whether this scanner falls within that definition. If it does, an explicit scanner notice must be added before processing; it should not be assumed to be satisfied by the existing consent grant. See the [official consolidated EU AI Act text](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02024R1689-20260727).

That 27 July 2026 consolidation incorporates [Regulation (EU) 2026/1744, the Digital Omnibus on AI](https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng). The amendment delayed Chapter III high-risk requirements until 2 December 2027 for Annex III stand-alone systems and 2 August 2028 for Annex I product-embedded systems, while the Article 50(3) notice text remains in the consolidated Act under the general application framework. Classification must therefore answer two separate questions: whether this scanner is a biometric-categorisation or emotion-recognition system subject to Article 50 notice obligations, and independently whether any use case is high-risk and subject to the delayed Chapter III timetable.

### Raw-versus-corrected colour bake-off

Both colour pipelines can be retained for evaluation, but synthetic fixtures cannot decide which is more stable under real lighting. The decision needs repeated real-face captures under daylight, warm, cool, and mixed light.

## Conclusion

The current face scanner was shaped less by adding features than by removing false certainty.

Each major improvement came from finding a place where the system could look successful while being wrong: an ignored camera constraint, a dead pose gate, a transposed rotation, a mirrored coordinate mismatch, a dark eye mistaken for a neutral reference, a focus metric measuring brightness, or a single passing frame treated as stable evidence.

The stress review showed that this principle must also be applied to the meaning of thresholds. The outer-canthi distance gate and absolute skin-pixel underexposure gate both contain plausible, testable code while the quantity-to-threshold relationship remains unjustified or unfair. Unit tests can prove the implementation matches the formula; they cannot prove the formula measures the intended physical condition.

We overcame those problems by moving verification closer to the real boundary:

- verify camera settings after applying them;
- verify live data reaches every gate;
- verify coordinate spaces rather than trusting the preview;
- verify sample quality, not just sample quantity;
- require stability across time, not one frame;
- preserve margins and confidence, not only pass/fail;
- explicitly abstain when evidence is weak;
- positively define what may be stored.

The result is a scanner that is more reliable, more understandable, and more privacy-conscious, but not yet release-complete. The remaining work is now clearer: replace the skin-dependent underexposure gate, re-derive the distance threshold, calibrate confidence, prove pose and motion behaviour on physical Android devices, complete lifecycle ownership, ship the still-image fallback, and record real-world stability and fairness evidence before release.

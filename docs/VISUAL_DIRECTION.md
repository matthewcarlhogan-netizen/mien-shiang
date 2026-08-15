# Visual direction and authorship gate

## Purpose

Mien Shiang should feel like a private contemporary reading room: part editorial column, part field atlas, part carefully kept personal record. It is not a generic AI dashboard, a mystical-game interface or a wellness-template skin.

A visual masterpiece here means disciplined authorship, not more visual effects. Every screen earns its atmosphere through hierarchy, proportion, material, language and useful detail.

## Existing visual foundation

Preserve and develop the system already grounded in the product:

- Pale mineral paper or deep ink as ground, with the five approved colour families as meaningful accents.
- Cinnabar used sparingly as a mark of attention, not as decoration.
- Editorial type for reflection, tabular type for measurements, and an appropriate CJK serif role where Chinese text is shown.
- Fine rules, revealed structure and data that reads as an instrument rather than a dashboard.
- A visible distinction between measured material, cultural context, uncertainty and invitation.

The source of truth for palette and type intent is `src/ui/qise/palette.js`. Do not replace it with trend-led colours, arbitrary gradients or a generic component theme.

## North-star composition

Each major screen needs one visual thesis that can be stated in one sentence before implementation. Examples: “a quiet threshold before a private scan”, “a daily note held inside an instrument reading”, or “a personal column accruing over time”.

The thesis determines hierarchy, spacing, type, colour and motion. It is not a slogan to decorate a card. If a proposed screen has no thesis, stop and design before coding.

The first viewport must have one clear focal point. Prefer composition, rhythm, progressive disclosure and whitespace over stacks of equally weighted cards. A data display appears only when it helps a person understand change, range, provenance or uncertainty.

## Post-scan computation reveal

A dedicated post-scan reveal is appropriate when genuine computation remains after capture. Its visual thesis is “your reading taking shape from visible, bounded evidence”: an original, non-photographic face field on which eligible regions and measurement points appear in the same order that the production pipeline completes them.

This screen must reveal work, not imitate work:

- Drive every stage from a real production event. Suggested plain-language stages are capture quality, eligible regions, comparison with the person's own history, and reflection assembly—but show only stages the current run actually performs.
- A point, region or line may appear only if it corresponds to an approved input used by that reading. Do not animate all 478 landmarks, a full mesh or invented connections merely to look technical. Ineligible or abstaining regions stay absent or are explained as not read.
- Prefer a canonical, non-identifying face diagram. If a transient visual derives from the person's live landmarks, it remains on-device and in volatile memory, must not reconstruct a recognisable face, and is erased on success, failure, cancellation and backgrounding with the rest of the capture material.
- Never show a fabricated percentage, countdown or stage duration. If progress cannot be measured, use named stage completion instead.
- Do not hold a completed reading merely to make the process appear expensive. If work completes quickly, the reveal becomes a brief transition; if it takes longer, the same sequence expands naturally with the real events.
- Keep one persistent privacy line visible, such as “Working on this device · your face image is not being stored.”
- Provide a reduced-motion version in which regions change state without sequential fading. Failure and abstention leave the face field calmly and return a useful next action.

The result should feel considered because the system exposes its real care, not because the interface wastes the person's time. Verification must cover fast and slow devices, offline operation, interrupted/backgrounded capture, reduced motion, and the release of all transient face data.

## Cultural responsibility

Chinese visual culture is not a bag of props. Do not add Chinese characters, seals, scrolls, temple imagery, calligraphy or “ancient” texture merely to signal atmosphere.

A culturally specific visual element needs documented context: what it is, why it belongs in this moment, how it is used respectfully, and whether it is an original or licensed asset. Use contemporary Chinese editorial, print, material and interaction references alongside historical references; do not freeze the culture in an imagined past.

## Research requirement before a major visual change

Before changing a complete journey, design system, landing screen, results screen or share card, the responsible agent must add a short visual research note to the PR description or `docs/design/`. It must contain:

1. The screen’s visual thesis and user moment.
2. At least six cited references across at least three different source families: editorial/print, material or spatial design, contemporary Chinese visual culture, and digital interaction. Record what is learned, not just images collected.
3. One explicit statement of what will *not* be copied from each reference.
4. Asset provenance, licence and attribution requirements.
5. A mobile-first sketch or screenshot plan for the resting, loading, empty/abstaining, error and long-text states.

Research is evidence for an original composition, never permission to reproduce somebody else’s work.

## System parameters

### Typography

- Use the established roles—display, passage, numeric and CJK—rather than accumulating novelty fonts.
- Add a typeface only with a licence, offline/self-hosted delivery plan, CJK coverage where relevant, fallback stack and accessibility review.
- Never use a display font for dense body copy or data. Numbers that invite comparison use tabular figures.
- Type must remain legible at the largest supported text setting; avoid thin weights for small text.

### Colour and material

- The five-colour palette communicates relationships. Colour must never be the only carrier of a state, result or action.
- Each accent has one stable semantic job. Do not use the same hue for an action, a warning and decorative texture.
- No purple glow, blue-to-pink “AI” gradient, generic aurora, rainbow spectrum, glass-card grid or decorative starfield.
- Text and essential icons meet at least WCAG AA contrast: 4.5:1 for normal text and 3:1 for large text. Test both light and dark/high-contrast appearances.

### Layout and interface

- Design mobile-first, with generous breathing room and intentional asymmetry where it improves the reading rhythm.
- A card, border, chart, badge or animation requires a job. Repeated containers without hierarchy are rejected.
- Empty, loading, error and abstention states receive the same art direction as successful readings.
- Controls remain obvious, labelled, keyboard reachable and large enough to use; refinement must never conceal action.

### Images, symbols and motion

- Favour original diagrams, field marks, measured linework, typography and licensed/commissioned art over generic generated imagery.
- Do not ship an unmodified AI-generated hero image, face, seal, cosmic landscape or texture merely because it is available. If generative tools assist an asset, it needs human art direction, editing, provenance and a product-specific reason to exist.
- Motion explains a transition, measurement or hierarchy. It is brief, interruptible and disabled or simplified for `prefers-reduced-motion`.
- Never use an animated “AI thinking”, scanning beam, sparkle cloud or orbit as proof of intelligence. The product earns trust by showing honest states and useful provenance.

## Writing and visual unity

The words are part of the composition. Headlines and reading passages must be intriguing, concrete and restrained; UI labels remain plain. Do not use vague luxury language, empty mysticism, motivational filler or generic AI affirmation.

A visual and verbal treatment passes only if it could not be transplanted unchanged into a horoscope, meditation, beauty-rating or generic AI app.

## Review gate

Before a user-facing visual change can be called complete, include:

- Screenshots of the primary and edge states at the target mobile width, plus a wide layout if supported.
- A short statement of the visual thesis, reference note and asset provenance.
- Contrast, keyboard/focus, text-scaling and reduced-motion checks.
- A content-density review: can someone identify the focal point, next action, evidence/uncertainty and privacy boundary without reading every word?
- An originality review: remove every element that exists only to look “AI”, “mystical” or fashionable.

Accessibility is part of the aesthetic standard. Apple’s guidance treats accessible interfaces as intuitive, perceivable and adaptable, and uses WCAG Level AA contrast as a practical baseline. [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility/) [Apple typography guidance](https://developer.apple.com/design/human-interface-guidelines/typography?changes=_5)

## Decision rule

When beauty and clarity conflict, resolve the conflict through better composition—not by hiding information or adding ornament. When originality and usefulness conflict, choose usefulness with a distinctive execution. When evidence is weak, show restraint.

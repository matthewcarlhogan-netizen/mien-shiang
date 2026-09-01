# OG share card

## Visual thesis and user moment

The share preview is **a quiet reading room introduced as an editorial cover**:
one clear product name, one honest sentence about what happens on-device, and
a restrained red field carrying the existing mark language without pretending
to be the reader's result. The user moment is the link preview before somebody
decides whether to open the app.

The card keeps the first viewport legible at a glance: the title and product
purpose lead on the left, while the red field supplies recognition on the
right. The composition is flat and print-like rather than a dashboard or
synthetic technology illustration. The mark is intentionally unpersonalised;
it contains no face, scan output, landmark, percentage, or interpretation.

## Reference note

These references informed the composition. They are research references only;
no image, lettering, motif, or layout is copied from them.

1. [The Metropolitan Museum of Art — Pair of Square Seals with Cloud and Rock Pattern](https://www.metmuseum.org/art/collection/search/73666)
   (material / Chinese visual culture): the square seal is a compact physical
   object with a carved boundary and a deliberate relationship between surface
   and mark. We keep the compact boundary and line discipline; we do **not**
   copy the cloud-and-rock relief, stone texture, or object silhouette.
2. [V&A — Chinese wallpapers and the chinoiserie style](https://www.vam.ac.uk/articles/chinese-wallpapers-and-the-chinoiserie-style)
   (material / spatial design): a repeated paper field can establish atmosphere
   through rhythm and surface rather than a single illustrative scene. We keep
   the idea of a calm field and fine rules; we do **not** reproduce wallpaper,
   landscape, flora, fauna, or chinoiserie decoration.
3. [Design Museum — Teacher Exhibition Notes](https://designmuseum.org/asset/download?id=ca3c77f4-81d5-4f28-9552-75d9c322654f)
   (contemporary graphic design / print): typography is treated as a public
   act of communication, not decoration. We keep a strong typographic lead and
   a restrained hierarchy; we do **not** copy the exhibition identity,
   poster-making language, or any displayed lettering.
4. [Apple Human Interface Guidelines — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
   (digital interaction): a focal point, generous space, alignment, and
   progressive disclosure make a small surface understandable quickly. We keep
   the left-to-right priority and breathing room; we do **not** copy Apple's
   controls, materials, iconography, or colour treatment.
5. [Apple Human Interface Guidelines — Images](https://developer.apple.com/design/human-interface-guidelines/images)
   (digital interaction / asset delivery): fixed dimensions, contrast, and
   testing at actual display sizes matter for bitmap artwork. We keep a 1200 ×
   630 PNG, high contrast, and a text-free dependency on external fonts; we do
   **not** copy Apple's illustrative examples or platform chrome.
6. [Google Design — Brand Identity with Material Design](https://design.google/library/staying-true-to-your-identity-material-branding)
   (digital / editorial systems): a product can apply its own voice through
   typography and colour while keeping hierarchy functional, and a mark belongs
   at a high-level touchpoint. We keep the product-specific type-and-colour
   system; we do **not** copy Material cards, elevation, motion, or example
   brands.
7. [The Pattern](https://www.thepattern.com/) and [The Pattern on the App Store](https://apps.apple.com/us/app/the-pattern/id1071085727)
   (contemporary personal software): the experience leads with intimate,
   reflective language and enough space for the user to feel addressed rather
   than marketed at. We keep the quiet, personal invitation and text-led
   pacing; we do **not** copy astrology vocabulary, natal-chart imagery,
   relationship labels, onboarding copy, or the app's interface.
8. [Co–Star](https://www.costarastrology.com/) and [Design Matters on Co–Star](https://recordings.designmatters.io/how-the-design-of-the-astrology-app-co-star-is-conquering-the-masses/)
   (contemporary digital editorial): a spare field, strong contrast, and one
   legible focal statement can carry a distinctive product voice without a
   crowded illustration. We keep the directness and restraint; we do **not**
   copy its black-and-white system, celestial symbols, horoscope language,
   illustrations, social mechanics, or screenshots.

## Asset provenance and licence

`og-image.svg` is original work authored for this repository. It uses only
palette values already declared in `src/ui/qise/palette.js`, system font
fallbacks, and simple SVG primitives. `src/og-image.png` is a locally rendered
1200 × 630 rasterisation of that SVG for social crawlers. No third-party image,
font, seal, or texture is embedded, and no generative image asset is used. The
linked references are not assets and are not reproduced.

## Mobile-first verification plan

- Resting/link preview: confirm the 1200 × 630 card remains readable when
  reduced to a narrow mobile preview and that the mark is not mistaken for a
  personal result.
- Loading/empty: verify the app entry still exposes the same title, purpose,
  and privacy boundary before a photo is selected.
- Abstaining/error: verify the app's no-face, ambiguous-face, and low-quality
  states retain a clear retake action and do not imply that the share image is
  a scan result.
- Long text: check the card's fixed text at mobile preview scale and keep all
  reader-facing copy outside the image; the image must not be asked to carry a
  long reading passage.
- Wide layout: inspect the card at native size and at 2× raster scale for
  crisp rules, contrast, and no clipped text.

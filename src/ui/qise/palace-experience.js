const BURST_GLYPHS = Object.freeze(["·", "✦", "○", "◇", "·", "✧"]);

/**
 * Adds the intentionally playful layer to the palace list: each palace opens
 * like a small threshold and emits its own colour burst. No face image or
 * reading data is retained by this interaction.
 */
export function bindPalaceExperience(container, {
  reducedMotion = false,
  onDelight = () => {},
} = {}) {
  if (!container) return () => {};

  const enter = (button) => {
    const card = button.closest(".palace-card");
    const detail = card?.querySelector(".palace-reveal");
    if (!card || !detail) return;
    const opening = detail.hidden;
    for (const other of container.querySelectorAll(".palace-card[data-open='true']")) {
      if (other === card) continue;
      other.dataset.open = "false";
      other.querySelector(".palace-reveal").hidden = true;
      other.querySelector(".palace-enter").setAttribute("aria-expanded", "false");
    }
    card.dataset.open = String(opening);
    detail.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));
    if (!opening || reducedMotion) return;

    const burst = document.createElement("span");
    burst.className = "palace-burst";
    burst.setAttribute("aria-hidden", "true");
    BURST_GLYPHS.forEach((glyph, index) => {
      const particle = document.createElement("i");
      particle.textContent = glyph;
      particle.style.setProperty("--particle", String(index));
      burst.append(particle);
    });
    card.append(burst);
    burst.addEventListener("animationend", () => burst.remove(), { once: true });
  };

  const click = (event) => {
    const enterButton = event.target.closest(".palace-enter");
    if (enterButton && container.contains(enterButton)) enter(enterButton);
    const delight = event.target.closest("[data-delight]");
    if (delight && container.contains(delight)) onDelight(delight.dataset.delight);
  };
  container.addEventListener("click", click);
  return () => container.removeEventListener("click", click);
}

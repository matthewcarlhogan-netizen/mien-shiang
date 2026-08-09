/* A local appearance preference. It carries no reading data and never leaves
 * the device. System preference is the default until the user chooses. */
export const THEME_STORAGE_KEY = "qise.theme";
export const THEMES = Object.freeze(["light", "dark"]);
export const THEME_COLOURS = Object.freeze({ light: "#DCDBD3", dark: "#151311" });

export function resolveTheme(saved, prefersDark = false) {
  return THEMES.includes(saved) ? saved : (prefersDark ? "dark" : "light");
}

export const nextTheme = (theme) => theme === "dark" ? "light" : "dark";

export function createThemeController({ root, button, storage, media, themeMeta = null }) {
  let saved = null;
  try { saved = storage && storage.getItem(THEME_STORAGE_KEY); } catch { /* system default */ }
  let theme = resolveTheme(saved, Boolean(media && media.matches));

  const render = () => {
    root.dataset.theme = theme;
    button.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    button.setAttribute("aria-pressed", String(theme === "dark"));
    button.setAttribute("aria-label", theme === "dark"
      ? "Use light appearance"
      : "Use dark appearance");
    if (themeMeta) themeMeta.setAttribute("content", THEME_COLOURS[theme]);
  };

  const toggle = () => {
    theme = nextTheme(theme);
    try { if (storage) storage.setItem(THEME_STORAGE_KEY, theme); } catch { /* session-only */ }
    render();
    return theme;
  };

  button.addEventListener("click", toggle);
  render();

  return { get theme() { return theme; }, toggle };
}

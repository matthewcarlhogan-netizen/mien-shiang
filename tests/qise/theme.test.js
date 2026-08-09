import { test } from "node:test";
import assert from "node:assert/strict";

import {
  THEME_STORAGE_KEY, THEMES, createThemeController, nextTheme, resolveTheme,
} from "../../src/ui/qise/theme.js";

function fixture({ saved = null, prefersDark = false } = {}) {
  const values = new Map(saved ? [[THEME_STORAGE_KEY, saved]] : []);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const root = { dataset: {} };
  const attrs = new Map();
  let click = null;
  const button = {
    textContent: "",
    setAttribute: (key, value) => attrs.set(key, value),
    addEventListener: (event, handler) => { if (event === "click") click = handler; },
  };
  const controller = createThemeController({
    root, button, storage, media: { matches: prefersDark },
  });
  return { attrs, button, click: () => click(), controller, root, storage, values };
}

test("only light and dark are valid themes", () => {
  assert.deepEqual(THEMES, ["light", "dark"]);
  assert.equal(resolveTheme("sepia", false), "light");
  assert.equal(resolveTheme("sepia", true), "dark");
});

test("the stored choice wins over the phone preference", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("first use follows the phone preference", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
});

test("the toggle persists, updates the document and describes the next action", () => {
  const f = fixture({ saved: "light" });
  assert.equal(f.root.dataset.theme, "light");
  assert.equal(f.button.textContent, "Dark mode");
  assert.equal(f.attrs.get("aria-pressed"), "false");

  f.click();
  assert.equal(f.controller.theme, "dark");
  assert.equal(f.root.dataset.theme, "dark");
  assert.equal(f.values.get(THEME_STORAGE_KEY), "dark");
  assert.equal(f.button.textContent, "Light mode");
  assert.equal(f.attrs.get("aria-pressed"), "true");
  assert.equal(f.attrs.get("aria-label"), "Use light appearance");
});

test("theme transitions are reversible", () => {
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "light");
});

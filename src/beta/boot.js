/* The beta's entry point, and the only file with a top-level side effect.
 *
 * It exists because beta.js must stay importable: a module that wires the DOM
 * at import time cannot be loaded under node --test, and this repo has already
 * shipped a broken import path behind a green suite for exactly that reason
 * (CLAUDE.md item 18a).
 *
 * It is a separate FILE rather than an inline <script> because the beta's CSP
 * is `script-src 'self' 'wasm-unsafe-eval'` with no 'unsafe-inline', copied
 * verbatim from src/qise.html. An inline module would be blocked outright.
 */

import { init } from "./beta.js";

init().catch((error) => {
  console.error("beta: boot failed", error);
});

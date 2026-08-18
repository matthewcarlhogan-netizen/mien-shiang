#!/bin/bash
# SessionStart hook for Claude Code on the web.
#
# Brings a fresh remote container to the state the documented commands assume:
# dependencies installed, and dist/ built. The build is not optional here --
# `npm run lint:bundle` scans the ARTEFACT, not the tree (CLAUDE.md item 22), so
# without a build the compliance guards have nothing to read and report zero
# files scanned. A guard that passes by scanning nothing is the false-green this
# repo has shipped twice; the hook exists partly to stop it happening in a
# session too.
#
# No `|| true`, no swallowed errors: CLAUDE.md Verification Protocol item 6.
set -euo pipefail

# Local checkouts already have their own environment. Only the disposable
# remote container needs rebuilding from scratch on every session.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "session-start: not a remote session, nothing to do"
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"
echo "session-start: preparing $(pwd)"
echo "session-start: node $(node -v), npm $(npm -v)"

# `npm install` rather than `npm ci` on purpose. The container image is cached
# after this hook completes, and install reuses an existing node_modules where
# ci deletes and refetches it every time. CI still uses `npm ci` -- that is the
# reproducibility gate, and this is not it.
echo "session-start: installing dependencies"
npm install --no-audit --no-fund

# Build so `npm run lint:bundle` has an artefact to scan (see above) and so the
# dev server, which serves dist/, can start without a separate step.
echo "session-start: building dist/"
npm run build

# Floor check, mirroring the one in CI: a build that produced nothing must not
# be reported as a build. Exit code 0 is not evidence that work happened
# (Verification Protocol item 2).
# dist/ is checked for existence FIRST, on its own. `find dist` on a missing
# directory fails, and under `set -o pipefail` that aborts the script at the
# assignment below -- so the explicit message underneath, written for exactly
# this case, would never reach the log. The reader would get find\'s "No such
# file or directory" and nothing saying what it meant. A guard whose diagnostic
# is unreachable in the case it guards is the shape of defect CLAUDE.md keeps a
# list of.
if [ ! -d dist ]; then
  echo "session-start: ERROR - the build reported success but created no dist/" >&2
  exit 1
fi

dist_files="$(find dist -type f | wc -l)"
echo "session-start: dist/ contains ${dist_files} files"
if [ ! -f dist/index.html ] || [ "${dist_files}" -lt 20 ]; then
  echo "session-start: ERROR - dist/ exists but holds ${dist_files} files and/or no index.html" >&2
  exit 1
fi

# Browser tests (`npm run test:browser`) need a Chromium. The remote image ships
# one and points PLAYWRIGHT_BROWSERS_PATH at it, so downloading is both wasteful
# and, on a locked-down network, a hang. Report what is there instead of
# assuming, and do not fail the session over it -- the node:test suite, the
# build and the lint are all reachable without a browser.
if [ -x "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}/chromium" ]; then
  echo "session-start: chromium present at ${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}/chromium"
else
  echo "session-start: NOTE - no preinstalled chromium found; 'npm run test:browser' will need 'npx playwright install chromium'"
fi

echo "session-start: ready. npm test | npm run lint:bundle | npm start"

/* Zero-dependency static server for local development.
 *
 * PWA install and getUserMedia both require a secure context, which means
 * https OR localhost. localhost counts, so this is enough for desktop testing.
 * To test on a phone you need real https — see CLAUDE.md ("Deploying"). */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, not .pathname: on Windows .pathname yields "/C:/..." with
// forward slashes and percent-encoding, which join() then rewrites to
// "\C:\...". That never startsWith(ROOT), so the traversal guard below
// rejected every request with 403 and the whole app was unservable.
const ROOT = fileURLToPath(new URL(
  process.argv.includes("--dist") ? "../dist/" : "../src/",
  import.meta.url,
));

// The trailing separator on ROOT is load-bearing: it is what stops the
// startsWith() guard below from admitting a sibling directory such as
// "src-old" or "src.bak". Do NOT "fix" that guard to startsWith(ROOT + sep) —
// ROOT already ends in one, the doubled separator matches nothing join() ever
// produces, and every request 403s. That is item 8 reintroduced. Assert the
// invariant rather than trusting the URL above to keep its trailing slash.
if (!ROOT.endsWith(sep)) {
  throw new Error(`ROOT must end with ${JSON.stringify(sep)}; got ${JSON.stringify(ROOT)}`);
}

const PORT = process.env.PORT || 5173;

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".svg": "image/svg+xml", ".mjs": "text/javascript",
  ".wasm": "application/wasm", ".task": "application/octet-stream",
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    // Block path traversal out of src/.
    const full = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ""));
    if (!full.startsWith(ROOT)) { res.writeHead(403).end("Forbidden"); return; }

    const body = await readFile(full);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(full)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
}).listen(PORT, () => {
  console.log(`\n  Mien Shiang dev server\n  http://localhost:${PORT}\n`);
});

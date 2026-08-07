# Getting onto Android with minimal cost

Status: the web app is done and verified. For a free/minimal-cost Android path,
use GitHub Pages for the PWA install route first. That gets you an installable
site without paying for hosting or packaging.

## What GitHub Pages can do

- public HTTPS URL
- `manifest.webmanifest`
- service worker
- Chrome install prompt on Android

That is enough for a phone-friendly app install.

## What GitHub Pages cannot do by itself

It does not give you control of `/.well-known/assetlinks.json` at the origin
root for a GitHub Pages project site. So a full Trusted Web Activity / app-link
setup needs either:

- a custom domain, or
- a host where you control the origin root.

## Step 1 — publish the site

Publish the `src/` directory to GitHub Pages.

After deploy, check the manifest:

```bash
curl -i https://<your-github-pages-url>/manifest.webmanifest
```

It should return `200` with `content-type: application/manifest+json`.

Then open the site on an Android phone in Chrome. You should be offered
*Install app* / *Add to Home screen*. If not, stop there and fix the hosting.

## Step 2 — if you want a true app shell later

Move to a custom domain or a host that lets you serve:

```text
https://<host>/.well-known/assetlinks.json
```

That is the piece needed for app-link verification and a browser-chrome-free
TWA.

## Also outstanding

The three icons are valid and correctly sized but are **placeholder art**.
Replace them before any public listing — the icon is the app's only branding
surface on a home screen.

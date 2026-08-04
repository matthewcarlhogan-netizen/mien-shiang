# Getting to an installable APK

Status: the web app is done and verified. What remains is hosting and packaging,
and both need decisions or credentials that only you have.

## Why this can't be finished by an agent session

Two hard blockers, both confirmed rather than assumed:

1. **Bubblewrap's first run is interactive.** `bubblewrap init` opens with
   *"Do you want Bubblewrap to install the JDK?"* and continues through package
   id, app name, colours and signing details. Run from a non-interactive shell
   it dies with `ERR_USE_AFTER_CLOSE: readline was closed`. It has to be run
   from a real terminal by a human.
2. **There is no HTTPS origin yet.** Trusted Web Activity rejects HTTP outright.
   Creating a hosting account is something you have to do yourself.

You do **not** need to pre-install a JDK or the Android SDK. Bubblewrap installs
and manages compatible versions itself on first run — let it, unless this
machine already has a managed Android toolchain.

## Step 1 — host it (pick Netlify or Cloudflare Pages, not GitHub Pages)

**Publish directory is `src/`.** Nothing else is deployed; `scripts/serve.js` is
a local dev server only.

This choice is not arbitrary. Digital Asset Links must be served from the
**origin root**:

```
https://<host>/.well-known/assetlinks.json
```

- **Netlify** → `yoursite.netlify.app`, **Cloudflare Pages** → `yourproject.pages.dev`.
  You control the root of that subdomain, so `/.well-known/` is yours. Both work.
- **GitHub Pages project site** → `username.github.io/mien-shiang/`. The origin
  is `username.github.io`, whose root is served by a *different* repo
  (`username.github.io`). You cannot place `assetlinks.json` for it from this
  repo, so TWA verification cannot pass. Only usable if you also own that user
  site repo, or you attach a custom domain.

A custom domain works with any of them and is the cleanest long-term answer.

After deploying, verify by hand before going further:

```bash
curl -i https://<your-host>/manifest.webmanifest
```

It must return `200` and `content-type: application/manifest+json`. Then open the
URL on an Android phone in Chrome — you should be offered *Install app* / *Add to
Home screen*. **If you are not offered it, stop.** The APK will not work either,
and the reason will be in the Manifest panel of remote DevTools
(`chrome://inspect` on desktop with the phone connected).

## Step 2 — build the APK

```bash
bubblewrap init --manifest https://<your-host>/manifest.webmanifest
```

Review what it proposes. **The package id is permanent for a Play listing** —
something like `app.yourdomain.mienshiang`. Then:

```bash
bubblewrap build
```

This produces a signed APK (and an AAB for Play).

**Back up the keystore the moment it is created.** Losing it means you can never
ship an update under the same identity; leaking it means someone else can. It is
already in `.gitignore` — keep it that way.

## Step 3 — Digital Asset Links, which is where this usually goes wrong

If verification fails the app still runs, but with a **browser address bar
across the top**, which defeats the whole point. It fails silently. Expect to
debug it.

Get the fingerprint:

```bash
bubblewrap fingerprint --help
```

Check what your installed version actually does before assuming. Google's own
ChromeOS documentation says Bubblewrap no longer generates `assetlinks.json` and
directs you to the `fingerprint` command; several current third-party guides
still describe it as generating the file. Both claims are in circulation — trust
your installed binary over either.

Place the result at `src/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.yourdomain.mienshiang",
    "sha256_cert_fingerprints": ["AA:BB:CC:..."]
  }
}]
```

Redeploy, then confirm it is actually reachable — some static hosts silently 404
dotted directories:

```bash
curl -i https://<your-host>/.well-known/assetlinks.json
```

**The fingerprint gotcha:** if you ever use Google Play App Signing, Play
re-signs your upload with a *different* key, and the fingerprint here must then
be the one shown in the Play Console — not the one from your local keystore.
This is the single most common cause of a TWA shipping with a visible address
bar. For a sideloaded APK, the local keystore fingerprint is the correct one.

## Step 4 — the gate

Install on a physical Android device. It must:

- open full screen with **no address bar** (if there is one, go back to step 3),
- show your icon on the home screen,
- still render with the device in **airplane mode**.

## Before any Play Store listing

Not relevant to a sideloaded APK. Google Play applies additional policy to
health-related apps, and in some jurisdictions a tool that assesses skin can
fall within medical device regulation. The constraint that referral output never
names a disease is deliberate and load-bearing — see CLAUDE.md. Do not weaken it
to make a listing more compelling. That is a question for a qualified adviser,
not something to resolve in code.

## Also outstanding

The three icons are valid and correctly sized but are **placeholder art**.
Replace them before any public listing — the icon is the app's only branding
surface on a home screen.

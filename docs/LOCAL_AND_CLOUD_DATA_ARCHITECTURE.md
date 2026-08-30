# Local and cloud data architecture

**Status: product-owner-directed architecture, 30 August 2026.** Specifies where Daily Portrait
and Qi Se data live, how durable "local" actually is, and the full data inventory required before
any face photograph is persisted. No code in this repository as a result of this document; gated
on `docs/DECISION_CARDS.md`'s charter-amendment card.

## The pipeline

```
Capture
  |
Quality gate (existing Qi Se gates, reused for the measurement path; portrait capture may
             use a lighter framing-only check — see docs/DAILY_PORTRAIT_ARCHITECTURE.md)
  |
Measurement path ─────────────────────────→ Qi Se record (src/qise/store.js, unchanged)
  |
Timeline derivation (alignment/crop, per docs/DAILY_PORTRAIT_ARCHITECTURE.md's
                     measurement/display separation — reads the SAME capture, writes a
                     SEPARATE derived artefact, never feeds back into the line above)
  |
Canonical daily frame
  |
Local archive (new module tree — see "Where this lives" below)
  |
Optional encrypted backup adapter (docs/BACKUP_ARCHIVE_FORMAT.md; never required for capture)
```

**Cloud failure must never block capture.** Today's photograph is taken and stored locally
regardless of network state, backup connection state, or provider-token validity. A failed or
absent backup surfaces as a visible pending/failed state (below), never as a blocked capture flow
and never as silent data loss.

## Browser storage is not magically permanent — researched, not assumed

Platform facts relevant to a multi-year, potentially multi-gigabyte photo archive, stated with
their actual reliability rather than treated as "IndexedDB means forever":

- **IndexedDB can store `Blob`/binary data directly** in modern browsers (this has been broadly
  true since Chrome ~58/Firefox ~51/Safari ~14, well within this product's supported range), so
  the archive does not need to base64-encode image bytes into JSON, and should not — that would
  roughly double storage cost for no benefit.
- **`navigator.storage.persist()`** is the standard mechanism to request that a browser treat an
  origin's storage as "persistent" (exempt from the eviction-under-pressure behaviour applied to
  "best-effort" storage). Support and the exact grant heuristic (usage history, bookmarked/
  installed status, notification permission, etc.) vary by browser and are decided by the browser,
  not the page — a request can be silently denied. The archive must call this on first Daily
  Portrait use and **must not assume it was granted**; `navigator.storage.estimate()` should be
  polled periodically to detect approaching quota before the browser does something about it
  unasked.
- **The Origin Private File System (OPFS)**, via `navigator.storage.getDirectory()`, is a
  faster, file-like storage option available in an installed/standalone PWA context on the
  platforms this product already targets (Chromium-based browsers broadly; Safari's OPFS support
  has historically lagged and should be feature-detected, not assumed). It is a candidate for
  the display-frame tier specifically (large sequential reads for playback) but is not assumed as
  the only storage mechanism — IndexedDB remains the fallback and the source of truth for record
  metadata regardless of where blob bytes physically live.
- **Quotas are heuristic and browser-specific**, typically some percentage of available disk on
  desktop and materially tighter on mobile; there is no fixed number this document can state as
  true across the product's target devices, which is exactly why `estimate()` polling and the
  storage-pressure UX below exist instead of a hard-coded ceiling.
- **Safari/iOS PWA behaviour is the most eviction-prone case this product targets.** Non-installed
  Safari tabs have historically applied an aggressive (roughly seven-day, subject to change)
  script-writable-storage eviction policy for sites without recent interaction; an installed
  (Add to Home Screen) PWA is materially safer but not immune, and Apple's own guidance has
  changed this behaviour across OS versions without a stable public commitment. **This product must
  treat "installed" as a materially different reliability tier from "browser tab" and say so to
  the user** (see storage-pressure UX below) rather than presenting one uniform confidence level.
- **Uninstalling the app, clearing site data, or a user selecting "clear browsing data" all
  destroy IndexedDB/OPFS contents for the origin, with no recovery path other than a prior backup
  or export.** This is not a bug to route around; it is the reason `docs/BACKUP_ARCHIVE_FORMAT.md`
  exists at all.
- **Low-storage-device behaviour**: on a device near its storage ceiling, the OS/browser may evict
  this origin's storage without any in-page signal firing first, on some platforms. `estimate()`
  polling reduces but does not eliminate this risk — it is a best-effort mitigation, stated as
  such, not a guarantee.

## Storage-pressure behaviour

- **No silent pruning, ever.** The product never deletes an old daily frame automatically to make
  room for a new one. If the user wants space-saving behaviour (e.g., "keep display frames only
  for the last N days locally, rely on backup for the rest"), that is a named, documented,
  user-chosen policy — opt-in, reversible, and stated in plain language what it does before it is
  turned on. Absent that explicit choice, storage pressure is surfaced, never silently resolved by
  deleting the user's photographs.
- **Usage estimate surfaced proactively.** The product polls `navigator.storage.estimate()`
  periodically (not on every capture — a lightweight interval is sufficient) and warns the user
  before capacity is exhausted, with a concrete, actionable next step (back up, export, or free
  device storage) rather than a generic warning.
- **Graceful full-storage handling.** If a write genuinely fails due to `QuotaExceededError`, the
  product must not silently lose the day's capture: it holds the captured frame in memory long
  enough to offer the user an immediate choice (retry after freeing space, or export this one
  frame directly) rather than failing invisibly. It must not crash the capture flow.
- **User-visible recovery options are always present**: export (local, provider-agnostic) and, if
  configured, cloud backup, are both reachable from the same screen that reports storage pressure.

## The full data inventory

Every datum a Daily Portrait archive stores, its reason, location, retention, deletion path,
whether it leaves the device, and whether it is encrypted. This inventory is maintained as the
authoritative privacy record for the feature; PR C's implementation is checked against it, and any
new field proposed during implementation is added here before it ships, not after.

| Datum | Why it exists | Where | How long | How deleted | Leaves device? | Encrypted? |
|---|---|---|---|---|---|---|
| Timeline display-frame image bytes | The core product — the visual history itself | New IndexedDB/OPFS store, separate tree from `src/qise/store.js` | Until user deletes that day, deletes the archive, or (opt-in, explicit) a space-saving policy prunes local copies with a verified backup already in place | Per-record delete; full-archive delete via the same `deleteAll()`-shaped eraser pattern `src/qise/consent.js` already requires for withdrawal | Only if the user explicitly enables cloud backup (`docs/BACKUP_ARCHIVE_FORMAT.md`) or export | Locally: no (device-level disk encryption is the OS's job, out of scope here). In backup: yes, client-side, before upload — see `docs/SECURITY_PRIVACY_THREAT_MODEL.md` |
| Canonical-day slot record (schema in `docs/DAILY_PORTRAIT_ARCHITECTURE.md`) | Bookkeeping: which day, which frame, which transform, which status | Same new store, alongside the bytes | Same lifecycle as the image it describes | Same as above | Metadata travels with the backup if backup is enabled; not separately transmitted otherwise | Same as backup treatment above |
| Raw capture buffer (pre-alignment) | Transient input to both the measurement path and the display-frame derivation | Volatile memory only, for the duration of one capture | Milliseconds to seconds — released the same tick as Qi Se's existing `releaseCapture()` pattern | N/A — never written | No | N/A |
| Qi Se measurement record | Unchanged — this document does not alter `src/qise/store.js` | Existing Qi Se IndexedDB store | Unchanged existing behaviour | Unchanged existing `deleteAll()` | Unchanged (never, today) | Unchanged (not encrypted today; out of this document's scope) |
| Consent record(s) | Authorises processing/storage; see `docs/DECISION_CARDS.md`'s consent-domain-separation card for whether Daily Portrait gets its own | `localStorage`, mirroring `src/qise/consent.js`'s existing pattern | Until withdrawn | `withdraw()`-shaped eraser, mandatory argument, same pattern as `src/qise/consent.js` | No | No (it is a small structured record, not sensitive content itself) |
| Backup provider connection state (token presence/validity, not the token's cryptographic material) | UI needs to know "connected/disconnected/needs reauth" | `localStorage` or equivalent | Until disconnected | Explicit disconnect | The token itself is held by the browser's OAuth/CloudKit session machinery, not hand-rolled storage in this app | Not applicable — no long-lived secret is stored by this app directly; see `docs/SECURITY_PRIVACY_THREAT_MODEL.md` |
| Encryption key material (if the encryption decision card is approved) | Protects backup content | Per `docs/SECURITY_PRIVACY_THREAT_MODEL.md`'s key-recovery design — never on our server | Until the user rotates or loses it | User-initiated; loss is unrecoverable by design unless a recovery-key mechanism is chosen | Only ever leaves the device if the chosen recovery design explicitly requires it (e.g., a recovery phrase the user records themselves) — never silently | Not applicable to the key itself; it is the thing that encrypts everything else |

## Where this lives

A **new module tree**, separate from `src/qise/**` and `src/ui/qise/**`, for two reasons already
established by reading the current code this session:

1. `src/qise/store.js` refuses any record key matching
   `/image|pixel|landmark|embedding|blob|dataUrl/i` **on every write**
   (`tests/qise/persistence-shape.test.js`). A Daily Portrait image is exactly what that guard
   exists to keep out — it is not weakened or special-cased; Daily Portrait gets its own store
   with its own allow-list guard modelled on the same pattern, in its own file.
2. `tests/qise/no-network.test.js` fails any `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/
   `EventSource` under both `src/qise/**` and `src/ui/qise/**`. A cloud backup adapter cannot live
   in either tree; it belongs in its own tree with its own, separately-scoped network guard (a
   guard that exists specifically *because* this tree is allowed to reach the network, with its
   own tests proving it reaches only the configured provider and nothing else).

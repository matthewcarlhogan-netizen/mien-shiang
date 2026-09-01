# Backup archive format, provider adapter, and recovery design

**Status: product-owner-directed architecture, 30 August 2026.** Specifies the provider-agnostic
archive format, the backup-vs-export distinction, the provider adapter contract, and the
encryption/recovery design. No implementation exists in this repository as a result of this
document. `docs/PROVIDER_CAPABILITY_MATRIX.md` is the factual basis for what each provider can
actually do; this document does not force Google and Apple behind a symmetric abstraction that
overstates either.

## "No server" does not mean "no authentication configuration"

Stated precisely, because the north star's wording is easy to over-read: **"no server" means no
developer-operated central store of customer face photographs by default.** It does not mean no
vendor-side configuration of any kind is acceptable. What is acceptable: Google OAuth/application
client configuration, Apple/CloudKit application configuration, provider-hosted authentication,
user-owned cloud storage. What is not acceptable, by default, without a separately approved
exception: uploading every customer image to our own database/bucket, central plaintext face-photo
storage, or a hidden developer-controlled media archive. **No application secret that must remain
secret may ship in browser JavaScript** — `docs/PROVIDER_CAPABILITY_MATRIX.md` already establishes
that Google's PKCE flow does not require one in the browser, and CloudKit's browser-facing API
token is, by Apple's own design, not a server-only secret (the server-to-server key, which *is*
sensitive, is not used by this app's browser-only path at all).

## Cloud is backup, not primary storage

The application remains local-first per `docs/LOCAL_AND_CLOUD_DATA_ARCHITECTURE.md`. Cloud backup
is: optional (off by default), incremental (does not re-upload unchanged frames), resumable
(survives an interrupted connection), integrity-checked (a checksum, not just a completed HTTP
request), recoverable (an actual restore path is tested, not assumed), and explicitly visible (the
user always knows the current state, never has to guess).

**`upload completed` is not `backup verified`.** These are different facts and the state model
below keeps them different:

| State | Meaning |
|---|---|
| `local-only` | Never attempted to back up, or backup is disabled |
| `pending` | Queued or in-flight |
| `backed-up` | Uploaded **and** integrity-checked against a checksum computed before upload |
| `verification-failed` | Uploaded, but the post-upload checksum did not match — treated as NOT backed up until re-uploaded |
| `disconnected` | Provider authorisation lost (revoked, expired, never granted) |
| `conflict` | Two writers (see multi-device policy below) produced incompatible states for the same day |
| `restore-required` | A gap was detected between local state and the remote manifest that only a restore can resolve |

An `upload completed` HTTP 200 moves a frame from `pending` to `backed-up` **only after** the
integrity check passes; a request that succeeds at the transport layer but fails verification
lands in `verification-failed`, never silently in `backed-up`.

## Portable export is not cloud backup

Two genuinely different concepts, kept genuinely different in the UI and in the code:

- **Cloud backup** — a machine-restorable, encrypted archive living on a provider the user
  connected, restorable by this app on a new device once reauthenticated.
- **User export** — a portable, user-controlled copy (a downloaded file), restorable without this
  app's cloud integration at all, and the thing that actually answers "does my archive outlive
  this product" (below). "Export" never means "we silently also uploaded it to Google" — the two
  actions are always separately initiated and separately confirmed.

## The archive format — one versioned, provider-agnostic schema

```
archive/
  manifest        (format version, archive id, device/session identifiers, checksums index,
                   creation and last-modified timestamps, entry count)
  frames/         (one entry per canonical-day timeline frame — the display-frame bytes,
                   chunked/encrypted as the encryption design in this document specifies)
  records/        (the canonical-day slot records — schema from
                   docs/DAILY_PORTRAIT_ARCHITECTURE.md — plus, optionally, the linked Qi Se
                   measurement records the user has not excluded from backup)
  checksums/      (per-entry content hashes, independent of any provider's own integrity
                   mechanism, so corruption is detectable without trusting the transport)
```

The physical encoding (chunked, encrypted, provider-specific object layout) is an implementation
detail of the adapter; **the logical manifest/frames/records/checksums shape is provider-neutral
and is the thing that gets versioned.** Requirements:

- **Explicit format version**, checked on every read; an unknown future version fails safely
  (refuses to interpret data it does not understand, surfaces a clear "this archive needs a newer
  version of the app" message) rather than guessing at a best-effort parse.
- **Deterministic manifest** — the same logical archive state always serialises to the same
  manifest bytes, which is what makes corruption and partial-backup detection possible by
  comparison rather than by trusting whatever the provider says was uploaded.
- **Forward migration strategy** — each format version states what changed from the last one and
  how an old archive is upgraded on read, mirroring the discipline `src/qise/store.js`'s own
  `DB_VERSION`/`onupgradeneeded` pattern already applies to the Qi Se IndexedDB schema.
- **Corruption and partial-backup detection** — the checksums index lets a restore verify every
  frame it downloads against what the manifest claims exists, and report exactly which entries are
  missing or corrupt rather than failing the whole restore opaquely.
- **No provider-specific meaning embedded in core records** — a `records/` entry never contains a
  Google-specific or Apple-specific field; provider identifiers live only in the adapter's own
  bookkeeping, never in the archive's logical schema.

## The provider adapter contract

One narrow interface, implemented once per provider, kept out of `src/qise/**`/`src/ui/qise/**`
per `docs/LOCAL_AND_CLOUD_DATA_ARCHITECTURE.md`'s network-guard reasoning:

```
connect()             -> begins the provider's own auth flow (OAuth/PKCE for Drive,
                          Apple ID web sign-in for CloudKit — see the capability matrix
                          for why these are NOT symmetric UX)
disconnect()          -> revokes local knowledge of the connection; does not
                          itself delete remote data (see "delete/disconnect/restore
                          are different" below)
status()              -> one of the states in the table above
uploadChunk(chunk)     -> resumable-upload-aware; returns per-chunk checksum
                          confirmation
downloadChunk(id)      -> resumable-download-aware where the provider supports it
verify(manifest)      -> compares remote state against the manifest's checksums,
                          without necessarily downloading full content
listRevisions()       -> for conflict/rollback bookkeeping (see multi-device policy)
deleteRemote()        -> removes the provider-side backup only — never touches
                          local state
```

Core archive logic (manifest construction, chunking, checksum computation, migration) is entirely
provider-independent and calls this interface; it never branches on "is this Google or Apple."
**Mock/fake provider adapters exist for deterministic CI tests, and real OAuth/CloudKit
credentials are never required for unit tests** — this mirrors the existing repo pattern of
injecting factories/dependencies at the boundary (`createLandmarkerWithFallback()`,
`attachCameraPreview()`, `qise/wakelock.js`) specifically so the untestable-by-a-developer-machine
path (a real provider round-trip) is not the only path anything can verify.

## The backup failure matrix

Every one of these is a named, designed-for case, not a happy-path assumption: network loss
halfway through an upload; the browser/tab killed mid-sync; provider quota exhausted; provider
token expired; provider permission revoked (outside our app, from the user's account settings);
cloud file corrupted; one frame missing from an otherwise-complete backup; a stale manifest (local
thinks it's ahead of what the provider actually has); a duplicate upload (retry logic uploaded the
same frame twice); a partial restore (interrupted mid-way); a wrong recovery key entered; an
archive-version mismatch on restore; local storage cleared *after* a verified backup existed
(recoverable — that is the point of the backup); and a new-device restore with no prior local
state at all. Each of these must produce a **distinguishable, correct** state from the table
above, not a generic "something went wrong."

## Multi-device conflicts

A serverless, cloud-backed archive still has concurrency: two devices could both add a frame for
the same canonical day, one could delete while the other edits, etc. **For v1, this design
constrains supported behaviour to one active writing device at a time** — stated explicitly here,
not left implicit: a second device may *restore and view* the archive, but the moment it also
tries to *write* (capture a new frame, delete an old one) while another device holds the active
write session, the adapter surfaces `conflict` rather than silently applying a last-write-wins
merge that could destroy a photograph. Revisioning (`listRevisions()`), a device/session
identifier recorded per write, and checksums together make conflict *detectable*; resolving a
genuine two-device conflict beyond "the second writer is told to reconcile manually" is explicitly
out of this v1 design and is named as an architecture backlog item, not silently attempted.

## Delete / disconnect / restore / export are different operations

Five distinct actions, each proven by a test to affect only its own store:

1. **Disconnect cloud** — stops authorisation/sync. Does not delete local data. Does not delete
   remote data.
2. **Delete local archive** — removes device data. Does not touch the remote backup (the remote
   copy is exactly how a locally-deleted archive gets restored later, if the user wants that).
3. **Delete cloud backup** — removes the provider-side copy only (`deleteRemote()`). Does not
   touch local data.
4. **Withdraw processing/storage consent** — the broader action; per `docs/DECISION_CARDS.md`'s
   consent-domain-separation card, this may or may not also trigger 2 and 3 depending on which
   consent domain was withdrawn, and until that card is decided, the existing, stronger
   `withdraw() → deleteAll()` coupling in `src/qise/consent.js` is the model followed, not weakened.
5. **Export** — produces a portable copy; touches no existing store, local or remote, at all.

## Encryption and key recovery — no hand-waving

**Threat model** (fully enumerated in `docs/SECURITY_PRIVACY_THREAT_MODEL.md`; summarised here for
the parts that shape the archive format specifically): a compromised or subpoenaed cloud provider
should not be able to read the archive's contents; a stolen device should not, by itself, expose
the cloud copy (it may expose the *local* copy, which is a device-security problem this document
does not solve); the app's own developers should not be able to read a user's backed-up
photographs.

**What this buys, precisely:** client-side encryption, performed before any chunk leaves the
device, using a key never transmitted to or held by this product's developers or infrastructure.
**"End-to-end encrypted" is only claimed if the architecture genuinely supports it** — specifically,
if the decryption key is derived from something only the user holds (a passphrase, a generated
recovery key, or a platform credential never exposed to us) and is never stored anywhere alongside
the ciphertext it protects. **A key stored next to its ciphertext in equally-accessible cloud data
is not meaningful client-side protection**, and this design does not do that.

**Key recovery is a product feature, not an afterthought**, because encryption without a recovery
path is permanent data loss waiting to happen. Options evaluated, consistent with the no-face-server
strategy (none of them require us to hold or escrow the key):

- **User passphrase** — simplest, but "forgot my passphrase" means permanent loss unless combined
  with one of the options below; the UI must state this consequence truthfully at setup time, not
  bury it in a settings page.
- **Generated recovery key** — a machine-generated key the user is shown once and told to record
  themselves (paper, password manager); recoverable if kept, permanently lost if not, exactly like
  a cryptocurrency seed phrase, and the UI copy should not undersell that comparison.
- **Platform credential** — where the OS/browser offers a secure, user-controlled credential store
  (e.g., a platform passkey/credential manager) that can wrap the archive key, this reduces "forgot
  my passphrase" risk without us ever holding the key — but ties recovery to that platform's own
  account-recovery process, which is a dependency worth naming rather than hiding.
- **No secret-key escrow on our server, ever, unless a separate, explicit product-owner decision
  approves it** — escrow would mean this product's infrastructure could decrypt user photographs,
  which contradicts the entire premise of this document.

**The UI must never promise "we can restore your archive" under a design where only the customer
possesses the key.** If the user loses both their passphrase and their recovery key (where
generated), the honest statement is that the backup is permanently unrecoverable, stated before the
user needs to hear it in a crisis, not after.

**XSS limitations while the archive is unlocked.** Client-side encryption protects data at rest
and in transit to the provider; it does not protect against a successful cross-site-scripting
attack against this app's own origin while the user has the archive unlocked in that session — a
compromised page can read whatever the page itself can read, decrypted or not. This is stated
plainly rather than implied away by the word "encrypted": encryption defends against a compromised
*provider* or a *stolen backup file*, not against a compromised *running page*.

## A lifetime archive must outlive the app

If Mien Shiang ceased to exist five years from now, the customer must still be able to recover
their photographs. "The backup exists in an app-hidden folder" (per `docs/
PROVIDER_CAPABILITY_MATRIX.md`'s finding on `appDataFolder`) is **not sufficient on its own** —
that is precisely why the export path (above) is a separate, required capability, not an optional
nicety: a documented, versioned archive format (this document) plus a **standalone, documented
recovery path** that does not depend on this product's servers being alive (there are none to
depend on) or even this product's own client code running, is the actual answer. A minimal
standalone recovery utility — a small, documented script or reference implementation that can read
the archive format and, given the user's own key, produce plain image files — is a named backlog
item for whenever the encryption-and-recovery decision card (`docs/DECISION_CARDS.md`) is approved
and real key material exists to design around. This design does not build lock-in disguised as
privacy: the format is documented specifically so it does not require us, specifically, to remain
in business.

# Security and privacy threat model

**Status: product-owner-directed architecture, 30 August 2026.** Bounded threat model for the
Daily Portrait archive and its optional cloud backup. Does not make unsupported legal claims about
what any jurisdiction requires; states technical facts and this product's chosen mitigations.

## Threats and mitigations

| Threat | What it exposes | Mitigation in this design | Residual risk, stated plainly |
|---|---|---|---|
| **Device theft** | Local, unencrypted-at-rest archive (device disk encryption is the OS's responsibility, not this app's) | Out of scope for app-level mitigation beyond not making it worse; the app does not add its own plaintext export of the archive to an easily-found location | A stolen, unlocked device exposes local photographs. This is true of any photo app and is not solved by this design. |
| **Browser profile access** (shared computer, synced browser profile, another local user account) | Local IndexedDB/OPFS contents for this origin | Standard browser same-origin isolation; no app-level secondary lock is proposed in this pass — named as a possible future decision (an in-app PIN/biometric re-auth gate) rather than assumed | Anyone with access to the browser profile has access to the local archive, same as any other site's local storage |
| **Cross-site scripting (XSS) against this app's own origin** | Whatever the page itself can read while running — decrypted archive contents if unlocked in that session | Standard web hardening (CSP, no `innerHTML` of untrusted content — consistent with this repo's existing lint discipline) reduces likelihood; client-side encryption does **not** protect against this once the archive is unlocked in-page, and `docs/BACKUP_ARCHIVE_FORMAT.md` says so explicitly rather than overselling "encrypted" | A successful XSS while the archive is unlocked can read decrypted content. This is a limitation of client-side encryption in general, not a gap specific to this design. |
| **Malicious browser extension** | Same class of access as XSS — an extension with page-content permissions can read what the page can read | No app-level mitigation is possible against a user-installed extension with sufficient permissions; out of scope, named rather than ignored | Present for any web app; not specific to this one |
| **Stolen provider token** (OAuth access token, CloudKit API token) | Access to the app-scoped backup folder/container only — `docs/PROVIDER_CAPABILITY_MATRIX.md` confirms `appDataFolder` and CloudKit private-database access are both app-scoped, not general account access | Standard OAuth/CloudKit token scoping already limits blast radius to this app's own data; encrypted-at-rest backup content means a stolen token exposes ciphertext, not photographs, if the encryption decision card is approved | A stolen token still lets an attacker delete or corrupt the backup (availability), even if confidentiality is preserved by encryption |
| **Cloud provider compromise** (Google or Apple infrastructure breach) | Whatever is stored server-side | Client-side encryption before upload means a provider-side breach exposes ciphertext only, provided the encryption/recovery design (`docs/BACKUP_ARCHIVE_FORMAT.md`) is actually implemented as specified — this is the primary reason that design insists on real client-side encryption rather than relying on "the provider encrypts data at rest" (which protects against a *different* threat: physical media theft at the provider, not us trusting the provider with plaintext) | Metadata (file sizes, upload timestamps, access patterns) is typically still visible to the provider even when content is encrypted — traffic-analysis risk, named rather than solved here |
| **Leaked backup file** (a downloaded export shared or exposed accidentally) | Full archive contents if unencrypted; ciphertext if the user's export is encrypted | Export defaults are specified in `docs/BACKUP_ARCHIVE_FORMAT.md`; whether exports are encrypted by default is a consequence of the encryption decision card, not yet decided | An unencrypted export, once shared, is fully exposed — no different from sharing any photo file |
| **Lost recovery key / forgotten passphrase** | Permanent inability to decrypt a backup — an availability loss, not a confidentiality one | `docs/BACKUP_ARCHIVE_FORMAT.md`'s key-recovery design names this consequence and requires the UI to state it truthfully at setup, not after the fact | By design, if no server-side escrow exists (the whole point), this loss is genuinely unrecoverable — stated as a real cost of real end-to-end encryption, not hidden |
| **Corrupt archive** (partial write, provider-side corruption, interrupted sync) | Availability — a damaged or unreadable backup | The checksum-based integrity model in `docs/BACKUP_ARCHIVE_FORMAT.md` detects this at restore time rather than silently serving corrupted data as if valid | Detection is not repair — a genuinely corrupted remote copy with no other backup is lost, which is why local-first (never *requiring* cloud) is the primary defence, not cloud backup itself |
| **Unauthorised second device** (someone else's device restores the user's archive, e.g. a shared or previously-authorised family device) | Confidentiality — another person's device gaining read access | Provider-level authorisation (the user must actively sign in on the new device) is the actual gate; the multi-device write-conflict policy in `docs/BACKUP_ARCHIVE_FORMAT.md` is a data-integrity control, not an access control, and this row is named as a distinct concern so it is not mistaken for that one | If the user's provider account itself is shared or compromised, this app inherits that exposure — same as any cloud-backed app |
| **Accidental sharing** (the user shares a Daily Portrait export or share-card image without realising what it contains) | Whatever is in the shared artefact | The existing `sharecard.js`-style discipline (locked-by-default, whole-content-or-nothing, no bare unlabeled figures — CLAUDE.md items 34-36) is the model any Daily Portrait share/export feature follows; export of the raw archive is a distinctly labelled, deliberate action, never bundled silently into a "share" action meant for a single reading | User intent is the only real control here; the design's job is to make the distinction between "share a reading" and "export my whole photo archive" impossible to blur, not to prevent a user from deliberately sharing their own export |

## Multi-device conflict policy — cross-reference

Full policy in `docs/BACKUP_ARCHIVE_FORMAT.md`: v1 constrains supported behaviour to one active
writing device, surfacing `conflict` rather than attempting a silent merge that could destroy a
photograph.

## Analytics decision boundary

Two categories, kept structurally distinct so a decision to enable one is never a silent decision
to enable the other:

**Local product metrics** — computed entirely on-device, never transmitted anywhere, useful for
in-app features only (e.g., "you've captured 47 days" shown to the user themselves). No decision
gate needed beyond ordinary feature review; this is not telemetry.

**Optional aggregate telemetry** — anything that would tell the product owner, in aggregate, how
the product is actually used (D1/D7/D30 return rate, timeline-playback engagement, backup
activation rate, export/year-in-review usage, reading depth, heritage exploration rate). This
category is a **named, defined, but explicitly not-yet-implemented** event taxonomy:

| Event | What it would measure |
|---|---|
| `daily_capture_completed` | D1/D7/D30/D90 return cadence |
| `timeline_playback_opened` | which playback modes get used |
| `backup_connected` / `backup_disconnected` | cloud-backup adoption |
| `export_generated` | portable-export and year-in-review usage |
| `reading_tier_viewed` (Tier 1/2/3) | reading-depth engagement |
| `heritage_construct_viewed` | heritage-exploration breadth |

**Nothing in this table is implemented.** No telemetry SDK, no analytics call, no hidden beacon
exists anywhere in this codebase as a result of this document — confirmed by `tests/qise/
no-network.test.js`'s existing, unmodified scope. Enabling any of it is a separate, explicit
product-owner decision (`docs/DECISION_CARDS.md`'s analytics-boundary card), because a
local-first, no-account product's biggest privacy asset is currently that there is nothing to
enable by accident.

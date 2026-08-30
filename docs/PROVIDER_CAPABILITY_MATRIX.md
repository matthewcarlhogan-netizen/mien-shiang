# Cloud backup provider capability matrix

**Status: research, verified against current official documentation this session (30 August
2026), not from memory. This document does not authorise implementation of either provider — see
`docs/DECISION_CARDS.md`. No OAuth code, no client IDs, no provider credentials exist anywhere in
this repository as a result of this document.**

## Method

Every capability below is classified into exactly one of:

- **Technically possible** — works from a pure browser/PWA surface today, no special app-review
  or native step required.
- **Possible with platform/app configuration** — works from the web, but requires a registered
  app/container, API token, or comparable platform-side setup beyond writing browser JavaScript.
- **Requires native packaging** — needs an installed native app (iOS/Android), not achievable from
  a web page alone.
- **Unsuitable for our archive requirements** — technically available but disqualified by a
  concrete constraint stated below.
- **Unknown / not established by official documentation** — the fetched documentation this session
  did not state an answer; stated honestly rather than guessed.

**This document does not start from the conclusion that iCloud has no web parity with Google
Drive, and that conclusion is not where the research below lands.** CloudKit JS gives a web page
real access to a user's private iCloud-backed *application* data. What is different — and material
to the archive design — is stated in the comparison table, not asserted up front.

## Google Drive

Verified against `developers.google.com/workspace/drive/api/guides/appdata`,
`developers.google.com/identity/oauth2/web/guides/overview`, and
`developers.google.com/workspace/drive/api/guides/manage-uploads` this session.

| Capability | Finding | Classification |
|---|---|---|
| `appDataFolder` / `drive.appdata` scope | "This folder is only accessible by your app and its contents are hidden from the user and from other Google Drive apps." "The folder can't be accessed using the Drive user interface (UI)." | Technically possible |
| Browser/PWA OAuth | Google Identity Services supports the authorization-code-with-PKCE flow for public (browser) clients, which is the currently recommended pattern for apps that cannot keep a secret. | Technically possible |
| Web-application OAuth client secret requirement | A "Web application" OAuth client type is issued a client secret by the Cloud Console, but Google's own guidance treats browser JS apps as **public clients**: "browser-based applications are not able to store confidential information," and the client secret "is needed only for server-side operations." **No client secret needs to ship in browser JavaScript for the PKCE flow this archive would use.** | Technically possible |
| Token refresh in a pure browser app (no backend) | "Automatic refresh of expired access tokens has been removed... your app must handle Google API error responses, request, and obtain a new, valid access token." A silent (no-backend) re-auth is possible via Google Identity Services but re-prompts the user more often than a server-held refresh token would. | Technically possible, with a UX cost the archive design must plan for (a "reconnect" state — see `docs/BACKUP_ARCHIVE_FORMAT.md`'s state model) |
| `appDataFolder` visibility to the user | Confirmed hidden from the user's own Drive UI (see row 1). This is a **double-edged fact**: it protects the archive from accidental user deletion via the Drive UI, but it also means the user cannot casually verify "is my backup there" without going through our app or the Drive API's own tooling — relevant to the §28 "does the archive outlive the app" requirement, see below. | Technically possible, with a documented consequence |
| Uninstall / manual deletion behaviour | "The application data folder is deleted when a user uninstalls your app from their My Drive. Users can also delete your app's data folder manually." Both are irreversible from our side. | Technically possible; must be surfaced as an explicit backup-loss risk in `docs/SECURITY_PRIVACY_THREAT_MODEL.md` |
| Resumable upload/download | "A resumable upload lets you resume an upload operation after a communication failure interrupts the flow of data." Documented upload-size guidance: simple/multipart uploads recommended ≤5 MB, resumable recommended above that. Not stated whether this size guidance or the resumable mechanism differs for `appDataFolder` specifically — no evidence it does. | Technically possible |
| Quota — does `appDataFolder` count against the user's Drive/Google Account quota | **Unknown / not established by official documentation** — the fetched pages define what the folder is and how it behaves, but do not state whether its bytes count toward the user's overall storage quota. This must be verified directly (a live test account) before committing to `appDataFolder` as the storage location for a multi-year, potentially multi-gigabyte encrypted archive. |
| Revocation / disconnect | Standard OAuth revocation applies: the user can revoke the app's Drive access from their Google Account settings at any time, independent of our app's own "disconnect" button. A backup left in `appDataFolder` after a revocation the user initiated outside our app is a real orphan-data scenario (see `docs/SECURITY_PRIVACY_THREAT_MODEL.md`). | Technically possible; consequence must be handled |
| Suitability as a **lifetime portable** archive vs. app-managed backup | `appDataFolder` is deliberately invisible and inaccessible outside our app (rows above). That makes it a good **app-managed backup location**, and a poor **lifetime portable archive** on its own — a user cannot open Drive five years after this product disappears and find their photos in `appDataFolder` without a tool that still knows the folder's app-scoped access rules. See `docs/BACKUP_ARCHIVE_FORMAT.md`'s "outlives the app" requirement: the portable-export path (a regular, visible Drive file or a downloaded archive) is the mechanism that actually satisfies that requirement, not `appDataFolder` alone. | Unsuitable for our archive requirements, **as the sole storage location** — suitable as the automatic-backup location alongside a separate, visible, user-initiated export |

## Apple iCloud / CloudKit

Verified against `developer.apple.com/documentation/cloudkitjs` and CloudKit Web Services setup
documentation this session, corroborated by search of current developer-forum and reference
material.

| Capability | Finding | Classification |
|---|---|---|
| CloudKit JS current support | Apple's documentation for CloudKit JS is live and current; no deprecation notice was found in this session's research. | Technically possible (with configuration — see below) |
| Access to the user's **private** CloudKit database from a web app | CloudKit JS explicitly supports this: a web page can authenticate an end user and read/write their private database records via `apiTokenAuth`, the same underlying mechanism native apps use. This is real browser access to real per-user iCloud-backed data — not merely a public/shared database. | Possible with platform/app configuration |
| Container/app prerequisites | A CloudKit **container** must exist before CloudKit JS can use it. Container creation can be done **either through the Apple Developer portal / CloudKit Dashboard, or through Xcode** — it is not exclusively an Xcode-only step. In practice, container identifiers are conventionally scoped like an app bundle ID (`iCloud.com.example.app`), which means CloudKit's tooling is built around "this container belongs to a registered app," even when no native app ships. | Possible with platform/app configuration — **not** "requires native packaging" outright, but tied to Apple Developer Program membership and a registered container in a way Google's OAuth client is not tied to a registered "app" in the same sense |
| API token / web-services configuration | An **API token** is generated via the CloudKit Dashboard and configured in the CloudKit JS client (`apiTokenAuth`). Separately, a **server-to-server key** (a locally generated public/private key pair, public half uploaded to the Dashboard) exists for server-side/script access to the *public* database — not needed for our private-database, browser-only use case. | Possible with platform/app configuration |
| Authentication requirement | CloudKit JS requires the end user to authenticate with their **Apple ID** through Apple's own web sign-in flow to grant the web app access to their private database — a materially different, heavier UX than Google's OAuth popup (a full iCloud sign-in redirect, not a one-click consent screen). | Possible with platform/app configuration |
| Asset/binary storage suitable for image chunks | CloudKit's `CKAsset` type is the documented mechanism for storing binary blobs (files) as part of a record, and is the correct primitive for archive frame chunks if this provider is chosen. | Technically possible |
| User iCloud quota | **Unknown / not established by official documentation this session** — CloudKit's private database is understood to draw from the user's own iCloud storage quota (the same pool as their Camera Roll/iCloud Drive), which is a materially different quota model from Drive's `appDataFolder`, but this session's fetched pages did not state the exact accounting; must be verified directly before committing to a chunking/quota strategy. |
| What requires Xcode / native packaging specifically | Nothing in the *end-user-facing* runtime path strictly requires Xcode — CloudKit JS itself runs in any browser. Container creation and API token issuance can be done via the web-based Developer portal. What is **not** available from a pure web surface: **native push-notification-driven sync triggers** (CloudKit's `CKSubscription`/silent-push mechanism, which is APNs-based and requires a native app), and any UX that wants the OS-level "iCloud Drive" file-picker integration a native/packaged app gets via `NSUbiquitousContainer`/`UIDocumentPickerViewController`. | Requires native packaging, for those two specific capabilities only |
| Restore / deletion / account-loss behaviour | Not independently verified this session beyond the general CloudKit behaviour that private-database records are scoped to the authenticated user's iCloud account; if the user's Apple ID is lost or disabled, standard Apple account-recovery process applies, external to our control — same category of risk as Google account loss. | Possible with platform/app configuration; risk carried into `docs/SECURITY_PRIVACY_THREAT_MODEL.md` |

## The honest parity finding

**CloudKit JS provides real browser access to private, per-user iCloud-backed application data. It
is not a fabricated capability, and it is not equivalent to a generic user-selected "back this app
up to my iCloud Drive folder" experience the way `appDataFolder` is not equivalent to a
user-selected Drive folder either — both are app-scoped storage areas, not user-visible general
storage.** The material difference from Google's flow is not "possible vs. impossible"; it is:

1. **Container provisioning is more tightly coupled to "an app" as a first-class registered
   entity** than a Drive OAuth client is — CloudKit's tooling and identifier conventions assume an
   app exists, even though a native app is not strictly required to create a container or issue an
   API token.
2. **End-user authentication is a full Apple ID web sign-in**, not a lightweight OAuth consent
   popup — a heavier, more interruption-prone UX for a feature meant to feel optional and
   low-friction.
3. **Two specific capabilities — silent push-triggered sync and native file-picker/iCloud Drive
   integration — genuinely require native packaging.** Everything else in this matrix does not.

The provider-agnostic archive format (`docs/BACKUP_ARCHIVE_FORMAT.md`) is designed so neither
provider's specific constraints leak into the archive's own schema; the adapter contract
(`docs/BACKUP_ARCHIVE_FORMAT.md`'s provider-adapter section) is written around what each provider
can actually do, per this matrix, rather than forcing both behind one symmetric interface that
would either overpromise CloudKit's ease of use or underuse Drive's simpler OAuth model.

## What remains unverified, and must be checked before either provider is implemented

Per this document's own honesty requirement, these are explicitly **not** established by this
session's research and must be verified directly (a live developer account, a real test upload)
before `docs/DECISION_CARDS.md`'s backup-provider card can be closed:

1. Whether `appDataFolder` bytes count against the user's overall Google Account storage quota.
2. The exact iCloud quota accounting for CloudKit private-database `CKAsset` storage.
3. Real-world resumable-upload behaviour specifically inside `appDataFolder` (the documentation
   describes resumable uploads generally, not scoped to this folder).
4. Whether Google's implicit-flow predecessor (`javascript-implicit-flow`, mentioned in search
   results as a still-indexed page) is still a supported alternative or fully superseded by the
   PKCE-based Identity Services flow referenced above — this session's fetch targeted the current
   `oauth2/web/guides/overview` page and did not separately re-verify the older page's status.

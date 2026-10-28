<div align="center">

# opencode-mail-exchange

OpenCode V2 plugin for on-prem Exchange: mail, calendar and contacts over EWS + NTLM.

![OpenCode V2](https://img.shields.io/badge/OpenCode-V2-black)
![npm](https://img.shields.io/npm/v/opencode-mail-exchange)
![Bun](https://img.shields.io/badge/Bun-1.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Biome](https://img.shields.io/badge/Biome-2.5-green)
![License](https://img.shields.io/badge/license-MIT-blue)

**English** · [Русский](README.ru.md)

</div>

## Table of Contents

- [About](#about)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Usage](#usage)
  - [Tools](#tools)
  - [Recipients](#recipients)
  - [Errors](#errors)
  - [Sync](#sync)
- [Storage](#storage)
- [Limits](#limits)
- [Not Implemented](#not-implemented)
- [Roadmap](#roadmap)
- [Risks](#risks)
- [Development](#development)
- [License](#license)

## About

Reads and sends mail, lists calendar events and contacts from an on-prem Exchange mailbox through EWS with
NTLM. Runs inside OpenCode V2 as a native TypeScript plugin: Bun executes `src/index.ts` directly, no build step.

Verified on Exchange 2016 (build 15.1.2507.6), NTLMv2, internal CA. Bun 1.4.2, `@opencode/plugin` 2.0.26.
Attachment extraction is pure JS (no native modules); CI runs on Linux, Windows and macOS. 276 tests.

## Features

- 14 `mail_*` tools: accounts, folders, list, search, get, read-attachment, save-attachment, delete/empty-deleted, sync, draft, send, calendar, contacts.
- Multiple mailboxes in one process with per-account credentials and SQLite.
- Storage modes `off` / `metadata` / `full`; local SQLite index in `metadata`/`full`, `off` = EWS-only.
- EWS/NTLM with explicit XML escaping, recipient validation and attachment limits.
- Attachment text extraction: `.docx`/`.docm`, `.xlsx`/`.xlsm`, `.pdf` (text layer) and plain text.
- Request timeout and cancellation via `context.signal`; multi-account routing with `AsyncLocalStorage`.

### Built With

- [OpenCode V2](https://opencode.ai/v2/docs/) (`@opencode/plugin`)
- [Bun](https://bun.sh/) 1.4
- TypeScript 5.9 (strict)
- [Biome](https://biomejs.dev/) 2.5
- [`ews-javascript-api`](https://github.com/gautamsi/ews-javascript-api) 0.15.3 + own NTLM XHR provider (`axios` + `@ewsjs/ntlm-client`)
- [`fflate`](https://github.com/101arrowz/fflate) 0.8 + [`yauzl`](https://github.com/thejoshwolfe/yauzl) 3.4 (streaming ZIP) + [`unpdf`](https://github.com/unjs/unpdf) 1.9 (PDF text in a worker)
- [`saxes`](https://github.com/lddubeau/saxes) 6 (linear OOXML SAX) + [`word-extractor`](https://github.com/morungos/node-word-extractor) 1.0 (legacy `.doc`) + [`@e965/xlsx`](https://www.npmjs.com/package/@e965/xlsx) 0.20 (legacy `.xls`)
- SQLite + FTS5 via `bun:sqlite`

## Getting Started

### Prerequisites

- OpenCode V2 with `@opencode/plugin` 2.0.26 (live session verification — R5 — is not done yet)
- Bun 1.4.2 (tested)
- Exchange on-prem with EWS enabled and an NTLM domain account
- Internal CA: set `caFile` per account (applied at runtime); `NODE_EXTRA_CA_CERTS` is a fallback for runtimes without `tls.setDefaultCACertificates` and for standalone scripts

### Installation

From npm (recommended):

```bash
opencode plugin add opencode-mail-exchange
```

OpenCode installs the package into its cache (on Windows usually
`C:\Users\<you>\.cache\opencode\npm\opencode-mail-exchange@latest\<timestamp>\node_modules\opencode-mail-exchange`);
`opencode plugin list` shows the plugin entry (ID, version, source). The package is loaded on the next config reload. A bare
`"opencode-mail-exchange"` entry loads the plugin but registers **no** `mail_*` tools until account credentials
are configured (`options.accounts`, or top-level `ewsUrl`/`username`/`password`) — the plugin log then says
`not configured`.

Then configure it in `opencode.jsonc` (the full example below). From source:

```bash
git clone https://github.com/OniVe/opencode-mail-exchange.git
cd opencode-mail-exchange
bun install
```

and use `"package": "file:///C:/path/to/opencode-mail-exchange"` instead of the npm name.

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": [
    {
      "package": "opencode-mail-exchange",
      "options": {
        "storage": "metadata",
        "dataDir": "C:/Users/me/AppData/Local/opencode/mail-exchange",
        "accounts": [
          {
            "id": "primary",
            "ewsUrl": "https://exchange.example.com/EWS/Exchange.asmx",
            "username": "DOMAIN\\bot",
            "selfAddress": "bot@example.com"
          },
          {
            "id": "shared",
            "ewsUrl": "https://exchange.example.com/EWS/Exchange.asmx",
            "username": "DOMAIN\\sharedbot",
            "selfAddress": "shared@example.com"
          }
        ]
      }
    }
  ]
}
```

Passwords normally come from env, one per account; inline `password` is accepted but not recommended.
For the OpenCode background service, `{file:...}` is usually easier: it is resolved by the config loader, so no
service restart and no environment variables are needed.

```jsonc
"accounts": [
  {
    "id": "primary",
    "ewsUrl": "https://exchange.example.com/EWS/Exchange.asmx",
    "username": "DOMAIN\\bot",
    "selfAddress": "bot@example.com",
    "password": "{file:C:/Users/me/.config/opencode/secrets/mail-primary.txt}"
  }
]
```

The file contains the password only, one line. Env variables (`MAIL_PASSWORD_<ID>` / `MAIL_PASSWORD`) are read by
the **background service process** at `setup()`, not by the terminal that starts `opencode`; a project `.env`
is not read. `{env:VAR}` works in config too, but still requires the variable in the service environment.

`MAIL_PASSWORD` is the fallback when no per-account variable is set. `<ID>` is the account id uppercased with
non-alphanumerics replaced by `_`; a single account gets `default`, multiple accounts without explicit ids get
`account-1`, `account-2`, …

With `caFile`, the plugin adds the PEM to the runtime trust store via `tls.setDefaultCACertificates`, so
`NODE_EXTRA_CA_CERTS` is not required for EWS calls. If the runtime lacks that API, the plugin warns; set
`NODE_EXTRA_CA_CERTS` before starting OpenCode. A missing `caFile` path is a `ConfigError` at startup; an
existing file that cannot be read or parsed is logged and skipped for that account, while valid `caFile`
entries are still applied. A PEM replaced at the same path is re-applied on the next setup (content hash).
Rotation is append-only: the previous root stays trusted until the process restarts; restart OpenCode to
revoke a compromised CA. Standalone Bun scripts that import the plugin sources do not inherit the service
trust store; run them with `NODE_EXTRA_CA_CERTS=<root-ca.pem>` or inside the OpenCode process. A TLS/CA failure
is reported as `EWS TLS/CA handshake failed; check NODE_EXTRA_CA_CERTS...`.

### Configuration

URL, username and password have no defaults. Examples use `example.com`.

| Option | Env | Default | Purpose |
|---|---|---|---|
| `accounts[]` | — | — | account list; without it, top-level fields describe one account |
| `id` | — | `default` / `account-N` | account id for the `account` argument; `[A-Za-z0-9][A-Za-z0-9._-]*`; directory name under `<dataDir>/<id>` |
| `ewsUrl` | `MAIL_EWS_URL` | — (required) | `https://server/EWS/Exchange.asmx`; `http://` is accepted but unencrypted |
| `username` | `MAIL_USER` | — (required) | `DOMAIN\user`; NTLM requires the domain |
| `password` | `MAIL_PASSWORD_<ID>` / `MAIL_PASSWORD` | — (required) | password; env recommended |
| `selfAddress` | `MAIL_SELF` | username part (local part, not an address) | mailbox address |
| `storage` | `MAIL_STORAGE` | `metadata` | `off` / `metadata` / `full`; an unknown value raises `ConfigError` |
| `dataDir` | `MAIL_DATA_DIR` | `%LOCALAPPDATA%\opencode\mail-exchange\<hash>` / `~/.local/share/...` | root; with `accounts`, `<dataDir>/<id>` unless the account sets `dataDir`; `<hash>` = `sha256(lowercase username)[:16]` |
| `maxMessages` | `MAIL_MAX_MESSAGES` | 2000 (max 20000) | local index size; fractions truncated, minimum 1 |
| `retentionDays` | `MAIL_RETENTION_DAYS` | 365 (max 3650) | record TTL |
| `maxBodyBytes` | `MAIL_MAX_BODY_BYTES` | 100000 (max 1,000,000) | body truncation, UTF-8 bytes |
| `syncIntervalMinutes` | `MAIL_SYNC_INTERVAL_MINUTES` | 5 (max 1440) | index refresh interval |
| `allowSend` | `MAIL_ALLOW_SEND` | `true` | allow `mail.send`; `true/false/1/0/yes/no/on/off`; unknown value raises `ConfigError` |
| `requestTimeoutMs` | `MAIL_REQUEST_TIMEOUT_MS` | 30000 | EWS call timeout, ms (≤120000); covers the whole call, including the NTLM preflight; a hanging stream is bounded by twice this value of socket inactivity plus `signal`/`disconnect` |
| `codemode` | `MAIL_CODEMODE` | `false` | `false` — direct tools; `true` — only through Code Mode `execute` (global) |
| `caFile` | `MAIL_CA_FILE` | — | PEM root/intermediate CA; applied to the runtime TLS trust store at setup (fallback: `NODE_EXTRA_CA_CERTS`); a missing path is a `ConfigError`, invalid content is logged and skipped |

Top-level options are inherited by `accounts[]`; per-account values win, except `codemode` (global).
`dataDir` must be a normal path: extended-length (`\\?\`) and device (`\\.\`) namespaces are rejected with
`ConfigError`.

## Usage

### Tools

| Tool | Purpose |
|---|---|
| `mail_accounts` | list accounts (id, address, EWS URL, storage mode) |
| `mail_folders` | folders with unread/total |
| `mail_list` | messages in a folder (metadata incl. `size`; `attachmentCount` when known; paging) |
| `mail_search` | local FTS + EWS body search (Inbox), merged and deduplicated; same fields as `mail_list` |
| `mail_get` | message + body; `size` (when known), `attachmentCount` (when known), `fetched` / `bodyCached` |
| `mail_read_attachment` | list attachments, or extract text from `.doc`/`.docx`, `.xls`/`.xlsx`, `.pdf`/plain text (`index` or `attachmentId`; `sheet` for Excel) |
| `mail_save_attachment` | download one file attachment to `<dataDir>/attachments/...` and return `path`, `size`, `sha256` |
| `mail_delete` | delete by ids; soft (move to Deleted Items; the old id becomes invalid) or `hard: true` (permanent) |
| `mail_empty_deleted` | permanently delete top-level items in Deleted Items (subfolders remain); requires `confirm: true` |
| `mail_sync` | incremental `SyncFolderItems`; `{synced, complete}` |
| `mail_draft` | create a draft |
| `mail_send` | send; a copy is kept in Sent Items by default (`SendAndSaveCopy`), `saveCopy: false` disables it; `{sent: true}` (EWS returns no id) |
| `mail_calendar` | events in a range |
| `mail_contacts` | contacts; `query` scans up to 500 contacts page by page |

Permissions: `mail.read` (read tools), `mail.draft`, `mail.send`, `mail.delete` (`mail_delete` and
`mail_empty_deleted`). `mail_empty_deleted` is irreversible and requires `confirm: true`; `confirm` is a
model-level guard, while the effective gate is the `mail.delete` permission. Prefer soft deletion
(`mail_delete` without `hard`) for everything else.
`account` selects the mailbox; the first account is the default.
`codemode: false` (default) lists tools directly; `codemode: true` exposes them only through `execute`.

### Deleting

`mail_delete` moves messages to Deleted Items by default; `hard: true` permanently deletes them.
`mail_empty_deleted` permanently deletes the top-level items in Deleted Items; subfolders are left in place.
Both need the `mail.delete` permission; `mail_empty_deleted` additionally requires `confirm: true`.

In a configured local index both delete modes tombstone the affected rows. Exchange assigns a new ItemId
when an item is moved to Deleted Items, so the old id becomes invalid: run `mail_sync` for `deleted` to get the
new id; a plain `mail_list` may serve a fresh cache and not show the new row until the sync interval.
`mail_get`/`mail_delete` by an old id will fail until that sync. Emptying also tombstones
every indexed row in `deleted`. If EWS rejects the whole batch, the index is left unchanged; per-item failures
apply only the confirmed deletions and the call fails with the counts and the first reason. A transport
failure after the request may leave the outcome unknown: run `mail_sync` before retrying.

Ids are passed to EWS `DeleteItem`, so pass mail ids only. If a meeting id is supplied, EWS deletes it with
`SendToNone` (attendees are not notified); the plugin does not distinguish item classes before deleting.

### Attachments

`mail_read_attachment` lists attachments for one message (`messageId` only) or extracts one: pass `index`
(position in the current list) or `attachmentId` from the list. Use `attachmentId` for stable re-reads; `index`
is positional and can point to another file if the message changed. Supported formats: `.doc`/`.docx`/`.docm`,
`.xls`/`.xlsx`/`.xlsm`, `.pdf` (text layer only) and plain text (`text/*`, `.txt`, `.csv`, `.json`, `.xml`,
`.html`, ...). Legacy `.doc`/`.xls` use pure-JS OLE/BIFF parsers; images and other binaries are not decoded.

`mc:AlternateContent`: the first `mc:Choice` that yields text wins; later choices and `mc:Fallback` are ignored.

Reading is bounded: 20 MiB per attachment, the first 200 PDF pages (`truncated: true` when more), ZIP caps of
32 MiB per required entry and 64 MiB total, 50 sheets / 5,000 rows / 500,000 cells / 1,000 columns, and 1,000,000
characters maximum (`maxChars`, default 100,000, min 1,000). For Excel, pass `sheet` (worksheet name or 1-based
index) to extract one sheet with the full character budget; a sheet read bypasses the text cache. If a numeric
sheet name exists, the exact name wins over the 1-based index. Extracted text is cut with `truncated: true`; a
scanned PDF returns empty text with a note (no OCR). PDF and office (DOCX/XLSX/legacy) parsing runs in a worker
(15 s timeout); abort terminates it. Text attachments are decoded in-process. This keeps a crafted attachment
from blocking the plugin event loop. Worker memory is not capped by the Bun runtime: peak scales with input
(measured ~650 MB for a 17.7 MB legacy `.xls`), with the 20 MiB attachment size cap as the outer bound.
Malformed XML (an undeclared namespace prefix or an undefined entity) is rejected with an error instead of
being partially parsed.

`mail_save_attachment` writes the original file under `<dataDir>/attachments/<hash>/<name>` (only there; the name is sanitized, the extension preserved) and returns its absolute path, written name, size and sha256, so an agent can parse large files with its own code. Same 20 MiB limit as reading.

With `storage: full` the extracted text is cached on demand in `attachment_text` + `attachment_fts` (no
background download) for messages already present in the local index (run `mail_sync` first). Repeated reads by
`attachmentId` avoid EWS; `mail_search` also returns cached attachment matches as
`attachmentMatch: {id, name, snippet}`. The cache is invalidated by delete/empty/prune and by a sync change of
`hasAttachments`/`attachmentCount`; a replaced attachment with the same count can keep stale text.
`storage: metadata` and `off` never write this cache; switching away from `full` deletes the cached
text (`attachment_text`/`attachment_fts`), so returning to `full` starts with cold reads again.

### Message fields

`mail_list`, `mail_search` and `mail_get` include `size` (EWS `ItemSize`, bytes) whenever the item
summary carries it. On a live EWS page these fields come from the existing `AllProperties` response; a
cached page missing them performs at most one `BindToItems` batch (Size/HasAttachments/Attachments + To/Cc,
no Body) and persists the result; a confirmed Success is not retried, while Error/Warning/empty batches
retry after a 60-second cooldown. `attachmentCount` (inline attachments included) is
present when the item was loaded with the `Attachments` property: in a `mail_get` that performs a bind, and
in `mail_list`/`mail_search` results from a live EWS page or after that batch. For a cached row, 0 is derived
from `hasAttachments: false`; a row with attachments omits the count until a live bind. The count is a cached
measurement and can be stale after attachments change. A body cached by an older index may omit both fields.
`hasAttachments` remains the cheap boolean. `mail_get` persists the learned `size`/`attachmentCount` in the
local index. Per-item rows with an unconfirmed batch load (`Error`/`Warning`) are omitted. If the whole batch
load fails, rows fall back to the FindItems envelope: `id`, `subject`, `size`, `hasAttachments`; there is no
`attachmentCount` and `recipientsKnown` is `false`; cached/search paths then enrich recipients lazily, while a
live `mail_list` page returns the envelope as-is (it may have an empty `to`).

Search scope: every search merges local FTS (`inbox`, `sent`, `drafts`, `deleted`) with the EWS subject/body
search in `Inbox`, deduplicating by id and returning the newest `limit` matches. With `storage: full`, local
results also include cached attachment text; such rows carry `attachmentMatch` (EWS search does not cover
attachments). Other folders are not covered by the EWS half. Expect one EWS `FindItems` call (~0.5 s), one
`LoadPropertiesForItems` (GetItem) for a non-empty page, and one `BindToItems` when the result contains messages
with unknown recipients or missing `size`/`attachmentCount`; that batch does not request `Body`.

Local FTS treats punctuation inside a word as a token boundary and keeps the parts adjacent (`R&D` and
`R & D` both match `R D`). Numeric fragments and email addresses are matched as phrase prefixes first, with an
all-token prefix fallback (`202-10` matches `2026-10-23`).

Runtime note: tool names, `codemode` visibility and permission enforcement are defined by `@opencode/plugin`
(2.0.26). Live verification in a running OpenCode session is tracked as R5 in
[docs/roadmap.md](docs/roadmap.md) and is not done yet.

### Recipients

`SyncFolderItems` does not return `To`/`Cc`. For a page with unknown recipients, or with missing
`size`/`attachmentCount`, `mail_list`/`mail_search` performs one `BindToItems` (`ToRecipients` + `CcRecipients` +
`Size` + `HasAttachments` + `Attachments`, no `Body`) and caches the result; `mail_get` also updates
`to`/`cc`. `recipientsKnown: true` means the values are reliable (including "no recipients");
`false` means enrichment failed or missed its budget, `to` is empty and `cc` is omitted.

The enrichment budget covers the EWS wait (`min(2000, max(500, requestTimeoutMs/5))` ms); persisting the
page to SQLite is local work and is not part of that budget. On timeout, transport error or a non-Success
batch, unconfirmed rows are returned with unknown fields and enrichment is parked for 60 seconds.

### Errors

A failed tool is a successful `Result` with `content: "ERROR: ..."` and `metadata.error: true`; the host sees
`completed`, not a crashed call. Stack traces are not returned. SOAP errors keep `Message`/`ErrorCode`;
timeout, TLS and cancellation are mapped to actionable text.

`mail_send` is not idempotent: a timeout or cancellation after `Send()`/`SendAndSaveCopy()` leaves delivery unknown;
retrying may duplicate the message. A copy is saved in Sent Items by default and only when the send succeeds; pass
`saveCopy: false` to send without it. Prefer
`mail_draft` + explicit confirmation.

### Sync

`mail_sync` returns `{synced, complete}`. `complete: false` means 50 rounds were not enough
(`MoreChangesAvailable` still true) — call it again. Non-indexable folders and `storage: "off"` return
`{synced: 0, complete: true, skipped: "not-indexed" | "storage-off"}`.

## Storage

SQLite (`bun:sqlite`, WAL, FTS5) under `dataDir`; with `accounts`, `<dataDir>/<id>/mail.db`.

- `off` — no index, everything via EWS.
- `metadata` — headers, preview, FTS; bodies on demand.
- `full` — plus body cache (up to `maxBodyBytes`) and on-demand attachment text cache/FTS.

The default location is outside the project. It is not restricted by location: if you point it into a repository,
the index (plaintext) will land there. Keep it outside; `.gitignore` covers `mail.db*` and `*.sqlite*`, but does
not enforce it. Extended-length and device namespaces are rejected (see Configuration). Use BitLocker/EFS if disk
encryption is required. Encryption is planned in [docs/roadmap.md](docs/roadmap.md) (R1).

## Limits

- HTML body: subject, body, recipient names and attachment names are XML-escaped; without this, HTML is stored
  empty without an error.
- Inline images: `contentId` + `isInline`; HTML references `cid:<contentId>`.
- Attachments: 40 MiB (41.9 MB) per attachment and 10 per message, checked before EWS. These checks are
  per-attachment/count, not a total request cap: a 413 can still occur when the combined request exceeds the
  IIS/EWS limit. Memory ~3.5–4.2× the file size.
- Attachment text reading: 20 MiB per file, first 200 PDF pages, 32 MiB/64 MiB ZIP caps, 50 sheets / 5,000
  rows / 500,000 cells / 1,000 columns, 1,000,000 characters; per-sheet Excel reads; legacy `.doc`/`.xls`; no OCR.
- Cold start: EWS import ~0.3 s; full plugin load ~0.4 s, RSS ~105 MB; first EWS call adds ~0.45 s (live).
- Multiple mailboxes: one process, per-account credentials and SQLite, `AsyncLocalStorage` routing.

## Not Implemented

- OCR for scanned PDFs.
- `mail_move`, flags, reply/forward.
- Graph backend for Exchange Online.
- EPA `Require` on FE EWS: NTLM without channel binding will fail.

## Roadmap

See [docs/roadmap.md](docs/roadmap.md): SQLite encryption with body search, Graph backend for Exchange Online.

## Risks

See [risks.md](risks.md) for the full list (plaintext SQLite, library maintenance, EWS retirement in Exchange
Online).

## Development

```bash
bun install
bun run typecheck
bun test
bun run lint
```

Live smoke (read-only): `lab/smoke.ts`; env and CA setup: `lab/spike-ews/README.md`.

## License

MIT. See [LICENSE](LICENSE).

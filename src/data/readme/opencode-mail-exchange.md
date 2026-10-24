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

Verified on Exchange 2016 (build 15.1.2507.6), NTLMv2, internal CA. Bun 1.4.2, `@opencode/plugin` 2.0.26,
117 tests.

## Features

- 10 `mail_*` tools: accounts, folders, list, search, get, sync, draft, send, calendar, contacts.
- Multiple mailboxes in one process with per-account credentials and SQLite.
- Storage modes `off` / `metadata` / `full`; local SQLite index in `metadata`/`full`, `off` = EWS-only.
- EWS/NTLM with explicit XML escaping, recipient validation and attachment limits.
- Request timeout and cancellation via `context.signal`; multi-account routing with `AsyncLocalStorage`.

### Built With

- [OpenCode V2](https://opencode.ai/v2/docs/) (`@opencode/plugin`)
- [Bun](https://bun.sh/) 1.4
- TypeScript 5.9 (strict)
- [Biome](https://biomejs.dev/) 2.5
- [`ews-javascript-api`](https://github.com/gautamsi/ews-javascript-api) 0.15.3 + `@ewsjs/xhr` 3.1.3
- SQLite + FTS5 via `bun:sqlite`

## Getting Started

### Prerequisites

- OpenCode V2 with `@opencode/plugin` 2.0.26 (live session verification — R5 — is not done yet)
- Bun 1.4.2 (tested)
- Exchange on-prem with EWS enabled and an NTLM domain account
- `NODE_EXTRA_CA_CERTS` pointing to the root CA PEM when EWS uses an internal CA

### Installation

From npm (recommended):

```bash
opencode plugin add opencode-mail-exchange
```

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

Passwords normally come from env, one per account; inline `password` is accepted but not recommended:

```bash
export MAIL_PASSWORD_PRIMARY='...'
export MAIL_PASSWORD_SHARED='...'
export NODE_EXTRA_CA_CERTS='/path/to/root-ca.pem'   # internal CA only
```

`MAIL_PASSWORD` is the fallback when no per-account variable is set. `<ID>` is the account id uppercased with
non-alphanumerics replaced by `_`; a single account gets `default`, multiple accounts without explicit ids get
`account-1`, `account-2`, …

Without `NODE_EXTRA_CA_CERTS`, Bun does not trust an internal CA; the symptom is an opaque
`undefined is not an object (evaluating 'response.headers')` from `@ewsjs/xhr`, not `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

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
| `requestTimeoutMs` | `MAIL_REQUEST_TIMEOUT_MS` | 30000 | EWS timeout, ms (≤120000) |
| `codemode` | `MAIL_CODEMODE` | `false` | `false` — direct tools; `true` — only through Code Mode `execute` (global) |
| `caFile` | `MAIL_CA_FILE` | — | PEM existence check and `NODE_EXTRA_CA_CERTS` hint; TLS trust is set by that env only |

Top-level options are inherited by `accounts[]`; per-account values win, except `codemode` (global).
`dataDir` must be a normal path: extended-length (`\\?\`) and device (`\\.\`) namespaces are rejected with
`ConfigError`.

## Usage

### Tools

| Tool | Purpose |
|---|---|
| `mail_accounts` | list accounts (id, address, EWS URL, storage mode) |
| `mail_folders` | folders with unread/total |
| `mail_list` | messages in a folder (metadata, paging) |
| `mail_search` | local FTS + EWS body search (Inbox), merged and deduplicated |
| `mail_get` | message + body; `fetched` / `bodyCached` |
| `mail_sync` | incremental `SyncFolderItems`; `{synced, complete}` |
| `mail_draft` | create a draft |
| `mail_send` | send; `{sent: true}` (EWS `Send` returns no id) |
| `mail_calendar` | events in a range |
| `mail_contacts` | contacts; `query` scans up to 500 contacts page by page |

Permissions: `mail.read` (read tools), `mail.draft`, `mail.send`.
`account` selects the mailbox; the first account is the default.
`codemode: false` (default) lists tools directly; `codemode: true` exposes them only through `execute`.

Search scope: every search merges local FTS (`inbox`, `sent`, `drafts`, `deleted`) with the EWS subject/body
search in `Inbox`, deduplicating by id and returning the newest `limit` matches. Other folders are not covered
by the EWS half. Expect one EWS `FindItems` call (~0.5 s), one `LoadPropertiesForItems` (GetItem) for a
non-empty page, and one `BindToItems` when the result contains messages with unknown recipients.

Local FTS treats punctuation inside a word as a token boundary and keeps the parts adjacent (`R&D` and
`R & D` both match `R D`). Numeric fragments and email addresses are matched as phrase prefixes first, with an
all-token prefix fallback (`202-10` matches `2026-10-23`).

Runtime note: tool names, `codemode` visibility and permission enforcement are defined by `@opencode/plugin`
(2.0.26). Live verification in a running OpenCode session is tracked as R5 in
[docs/roadmap.md](docs/roadmap.md) and is not done yet.

### Recipients

`SyncFolderItems` does not return `To`/`Cc`. For a page with unknown recipients, `mail_list`/`mail_search`
performs one `BindToItems` (`ToRecipients` + `CcRecipients`) and caches the result; `mail_get` also updates
`to`/`cc`. `recipientsKnown: true` means the values are reliable (including "no recipients");
`false` means enrichment failed or missed its budget, `to` is empty and `cc` is omitted.

Enrichment adds at most `min(2000, max(500, requestTimeoutMs/5))` ms of latency. On timeout the page is returned
with `recipientsKnown: false` and enrichment is parked for 60 seconds.

### Errors

A failed tool is a successful `Result` with `content: "ERROR: ..."` and `metadata.error: true`; the host sees
`completed`, not a crashed call. Stack traces are not returned. SOAP errors keep `Message`/`ErrorCode`;
timeout, TLS and cancellation are mapped to actionable text.

`mail_send` is not idempotent: a timeout or cancellation after `Send()` leaves delivery unknown; retrying may
duplicate the message. Prefer `mail_draft` + explicit confirmation.

### Sync

`mail_sync` returns `{synced, complete}`. `complete: false` means 50 rounds were not enough
(`MoreChangesAvailable` still true) — call it again. Non-indexable folders and `storage: "off"` return
`{synced: 0, complete: true, skipped: "not-indexed" | "storage-off"}`.

## Storage

SQLite (`bun:sqlite`, WAL, FTS5) under `dataDir`; with `accounts`, `<dataDir>/<id>/mail.db`.

- `off` — no index, everything via EWS.
- `metadata` — headers, preview, FTS; bodies on demand.
- `full` — plus body cache, up to `maxBodyBytes`.

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
- Cold start: EWS import ~0.3 s; full plugin load ~0.4 s, RSS ~105 MB; first EWS call adds ~0.45 s (live).
- Multiple mailboxes: one process, per-account credentials and SQLite, `AsyncLocalStorage` routing.

## Not Implemented

- Reading attachment content: `mail_get` returns metadata only.
- `mail_move`, flags, reply/forward.
- Graph backend for Exchange Online.
- EPA `Require` on FE EWS: NTLM without channel binding will fail.

## Roadmap

See [docs/roadmap.md](docs/roadmap.md): SQLite encryption with body search, Graph backend for Exchange Online,
own XHR provider replacing the global axios patch.

## Risks

See [risks.md](risks.md) for the full list (plaintext SQLite, library maintenance, EWS retirement in Exchange
Online, global axios patch).

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

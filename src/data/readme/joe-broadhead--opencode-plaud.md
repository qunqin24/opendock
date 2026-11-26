# Plaud

Plaud voice recordings for OpenCode, on [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract) v0.
Plaud's hosted MCP server holds the credentials and OpenCode owns the sign-in, one server per account alias. The plugin
adds contract methods on top of it: an events source of recordings, a recent-recordings snapshot, `probe` and `status`,
and one local export that writes a recording's audio, transcript or note to a file. Plaud's own MCP tools pass through
unchanged.

## Install

```sh
opencode plugin add github:we-the-rebel-alliance/plaud-plugin#v0.0.0
```

The plugin needs OpenCode `>=2.4.1 <2.5.0`; it refuses an untested release with `HOST_UNTESTED`, unless
`allowUntestedHost` is set.

## Sign in

The mechanism is `mcp`: Plaud's own server holds the credentials, and OpenCode keys the OAuth per server. Sign in once
per alias through OpenCode's MCP sign-in:

| Alias | MCP server |
|---|---|
| `default` | `plaud` |
| `work` | `plaud-work` |
| `personal` | `plaud-personal` |

Configure the aliases in the plugin's options:

```json
{
  "accounts": {
    "default": {},
    "work": {}
  }
}
```

With no `accounts` option there is one `default` account, on the `plaud` server. With more than one alias, a call that
takes an account must name one; without one it is refused with `ACCOUNT_REQUIRED`. To keep the `default` server beside
another alias, name `default` in the map as above.

## Access

`access` is `all` (the default), `ask-changes` or `read-only`. Every read runs at every level. The export is class
`export` and effect `local`: it runs at `all`, asks at `ask-changes` and is refused at `read-only`. The export also
writes only inside `exportRoots`, and outside the project only where the caller's `external_directory` rules allow it.

## Options

| Option | Default | Meaning |
|---|---|---|
| `access` | `all` | `all`, `ask-changes` or `read-only`. |
| `accounts` | one `default` | One profile per alias; a Plaud profile has no fields. |
| `allowUntestedHost` | `false` | Start outside `>=2.4.1 <2.5.0` instead of refusing. |
| `url` | `https://mcp.plaud.ai/mcp` | The one Plaud MCP endpoint every account's server uses; plain `http` only on localhost. |
| `exportRoots` | `["~/Plaud"]` | The folders an export may write in; the first holds the default destination. |
| `maxAudioBytes` | `2147483648` | The largest audio file one export downloads. |
| `exportTimeoutMs` | `1800000` | How long one export may take, in milliseconds. |

The full table is in [Configuration](docs/configuration.md).

## Capabilities

<!-- generated:capabilities -->
### Methods

| Method | Class | Accounts | Operations |
|---|---|---|---|
| `status` | read | none | — |
| `probe` | read | optional | `get_current_user` |
| `events_list` | read | optional | `list_files` |
| `recent` | read | optional | `list_files` |
| `plan_export` | read | optional | — |
| `export` | export | optional | `get_file`, `get_note`, `get_transcript` |
| `mcp:get_current_user` | read | none | — |
| `mcp:get_file` | read | none | — |
| `mcp:get_note` | read | none | — |
| `mcp:get_transcript` | read | none | — |
| `mcp:list_files` | read | none | — |

### Sources

| Source | Kind | Reads or output | Method | Cost |
|---|---|---|---|---|
| `plaud.recordings` | events | `meeting` | `events_list` | free |
| `plaud.recent` | snapshot | `list` | `recent` | free |

### Actions

| Action | Effect | Preview | Commit |
|---|---|---|---|
| `plaud.export` | local | `plan_export` | `export` |

### Bus events

None.
<!-- /generated:capabilities -->

## Errors

<!-- generated:errors -->
| Code | Meaning |
|---|---|
| `NEEDS_SIGN_IN` | the account is not signed in |
| `SCOPE_MISSING` | the call needs a scope the person has not confirmed |
| `ACCOUNT_REQUIRED` | the plugin serves several accounts and the call names none |
| `ACCOUNT_UNKNOWN` | the call names an alias the plugin does not serve |
| `ACCOUNT_MISMATCH` | the item belongs to another account |
| `CURSOR_INVALID` | the cursor is malformed, or belongs to another source, account or scope |
| `CURSOR_EXPIRED` | the provider no longer keeps the history the cursor names |
| `RATE_LIMITED` | the provider asked the plugin to slow down |
| `BUDGET_EXCEEDED` | the read would cost more than the person allows |
| `SOURCE_DISABLED` | the person turned this source or action off |
| `TOO_LARGE` | the answer is larger than the source's maxBytes |
| `INPUT_INVALID` | the input does not match the method's schema |
| `SOURCE_UNKNOWN` | the plugin declares no such source |
| `SCHEMA_VIOLATION` | an answer does not keep the contract's shape |
| `PERMISSION_DENIED` | the person's grant does not cover the call |
| `PLAN_INVALID` | the plan is missing, or belongs to another method |
| `PLAN_USED` | the plan was already used by an earlier commit |
| `GRANT_INVALID` | the action grant did not verify, or was already spent |
| `HOST_UNTESTED` | OpenCode is outside the plugin's tested range |
| `OPTIONS_INVALID` | the plugin's options do not match their schema |
| `UNAVAILABLE` | the provider could not be reached |
<!-- /generated:errors -->

## Troubleshooting

- **A call says `ACCOUNT_REQUIRED`.** More than one alias is configured; pass `account: "work"` (or another alias the
  next step lists). With one alias you can leave it out.
- **A call says `NEEDS_SIGN_IN`.** Sign in to that alias's server (`plaud` or `plaud-<alias>`) through OpenCode's MCP
  sign-in, then read `status`; a failed or disabled server is an `error` there with a reason.
- **An export says `PERMISSION_DENIED`.** The destination is outside `exportRoots`, or it is outside the project and
  the agent's or session's `external_directory` rules do not allow it. Add the folder to the rules or to
  `exportRoots`; an ask is a refusal, so no prompt appears.
- **An export says `INPUT_INVALID`.** A file already exists at the destination and the plan did not say `overwrite`, or
  the destination is a folder or an export root itself.
- **`events_list` says `UNAVAILABLE` and names a probe.** A page names its account's owner: call `probe` for that
  account after a restart, then list again.
- **A cursor is refused.** A cursor belongs to one plugin, source, account and scope. Read again with `since`, without
  the cursor; do not reuse another account's cursor.
- **`HOST_UNTESTED`.** The OpenCode release is outside the tested range; install 2.4.1, or set `allowUntestedHost`.

## Docs

- [Capabilities](docs/capabilities.md)
- [Accounts](docs/accounts.md)
- [Configuration](docs/configuration.md)
- [Automations](docs/automations.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)

## Working in this repository

- `src/index.ts` is the one entry: `Plugin.define`, the host gate, the accounts and one `register` call.
- `src/handlers/` holds one file per method; `src/provider/` is the only place Plaud's endpoint and tool names live.
- `dist/` is generated by `npm run bundle` and is committed, so an install needs no build.
- `fixtures/conformance.json` is recorded from the synthetic two-account provider with `npm run fixtures`.
- `npm run check` runs typecheck, build, unit, host, pack, `plugin-kit check` and `plugin-kit docs --check`.

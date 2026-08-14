# opencode-meat

Read [meat](https://github.com/boldsoftware/meat) **reading diffs** inside OpenCode.

`meat` abridges a git diff with an LLM — it drops everything not worth reading and prints
the remainder plus a one-line summary. This plugin runs the `meat` CLI directly from the
TUI: `/meat` asks which model should read the diff and then gets out of the way. meat thinks
in a background subprocess while you keep typing and sending prompts; a spinner above the
prompt counts the seconds, a toast says when it is done, and the finished diff opens in a
full-screen window that renders it the way OpenCode's own `/diff` does. **No prompt is ever
sent to your agent** — the slash command never reaches a session, so it costs no agent
tokens and leaves no message behind.

The same abridging is also exposed as a `meat` tool, so an agent can ask for it on purpose.

## Prerequisites

Install the `meat` binary yourself — the plugin never installs it:

```sh
go install meat.dev/cmd/meat@latest
```

## Install

The plugin has two halves — a server-side tool and the TUI window — and OpenCode
discovers them differently. Naming the package in `opencode.json`'s `plugins` array loads
**only the server half**: as of `0.0.0-next-16741` the TUI plugin loader reads
`<config>/plugins/tui/` and `<project>/.opencode/plugins/tui/` and nothing else. So install
by dropping two one-line files into your config directory (`~/.config/opencode`, or
wherever `OPENCODE_CONFIG_DIR` points).

```jsonc
// <config>/package.json — OpenCode runs an install here at startup
{
  "name": "opencode-config",
  "private": true,
  "dependencies": { "@suiramdev/opencode-meat": "^0.6.0" }
}
```

```ts
// <config>/plugins/meat.ts — the tool
export { default } from "@suiramdev/opencode-meat"
```

```ts
// <config>/plugins/tui/meat.ts — the window
export { default } from "@suiramdev/opencode-meat/tui"
```

Leave the package **out** of `opencode.json`'s `plugins` array: these two files already
load both halves from one install, and a config entry would install a second copy.

The `package.json` is not optional. The window is a Solid component, so its module has to
resolve `@opentui/solid` and `solid-js`; they arrive as peer dependencies of this package,
but only if something installs it into a `node_modules` the plugin file can see. A plugin
file with no reachable `node_modules` fails with `Cannot find package 'solid-js'`.

## Usage

| Command             | Reads                              |
| ------------------- | ---------------------------------- |
| `/meat`             | `HEAD`                             |
| `/meat HEAD~3`      | that commit                        |
| `/meat main...HEAD` | the range                          |
| `/meat -staged`     | `git diff --staged`                |
| `/meat -w`          | `git diff` (unstaged working tree) |

`/meat` opens a model picker first; cancelling it (escape) does nothing at all — no
subprocess, no window. Picking a model starts `meat` and hands the prompt straight back:
nothing takes over the screen, and the choice is remembered for next time.

While meat reads, a line above the composer keeps count — a spinner and a clock that both
move — and you can keep typing and sending prompts past it:

```
⠙ meat is reading HEAD~3 · 12s
✓ meat read HEAD~3 · ctrl+x d to open
```

Every read also ends in a toast, naming the key that opens it:

```
meat read HEAD~3
ctrl+x d to open · Rename the npm package and add the LICENSE
```

The toast is what covers the routes with no composer, the welcome page above all. The two
prompt-side slots that reach those routes — `prompt.footer.end` and `home.footer` — are
single-winner slots that OpenCode's own footers already claim, and mounting there deletes
them (context usage, cost, subagent and shell counts), so this plugin stays out.

Several reads can be in flight at once; each gets its own line and its own toast. A failed
read raises an error toast, so a failure is never silent even when the prompt is out of
sight.

| Command / key         | Does                                                         |
| --------------------- | ------------------------------------------------------------ |
| `ctrl+x d`            | Open a finished reading diff (`<leader>d`)                    |
| `/meat-diff`          | The same, spelled as a command                               |
| `meat.dismiss`        | Clear the finished lines above the prompt (command palette)   |

Opening clears that read's line, and the diff stays in memory: close it and reopen it as
often as you like. With more than one finished read, opening asks which one. A read that is
still going says so instead of opening a half-empty window, and a failed read opens to
meat's own error plus the exact argv it ran.

The last eight reads are kept, oldest finished ones dropped first; a read still in flight is
never dropped. Nothing survives a TUI restart.

The window renders through OpenTUI's own `<diff>` — the renderable behind OpenCode's
`/diff` — so a reading diff arrives with a sign gutter, line numbers, diff colouring and
tree-sitter syntax highlighting, under one file header and one hunk header at a time. It
opens side by side when the terminal is at least 100 columns wide, unified below that.

| Key                    | In the diff window   |
| ---------------------- | -------------------- |
| `j` / `k`, `↓` / `↑`   | scroll a line        |
| `ctrl+f` / `ctrl+b`    | scroll a page        |
| `pagedown` / `pageup`  | scroll a page        |
| `g`                    | back to the top      |
| `v`                    | split ↔ unified      |
| `esc` / `q`            | back where you were  |

The agent can also call the `meat` tool directly — "use the meat tool to review HEAD~2".

## Which models are offered

meat picks its transport from the model id alone: an id like `claude-…` (optionally behind
an `anthropic/` prefix) goes to the Anthropic Messages API, everything else to the OpenAI
Responses API. The picker lowers each OpenCode model onto that split and sets the matching
environment for the subprocess:

| Provider                                   | meat sees                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| Provider id `anthropic`, or any provider loading `@ai-sdk/anthropic`, with a `claude-…` id | `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` (a trailing `/v1` is trimmed, because meat appends `/v1/messages`) |
| OpenAI                                     | `OPENAI_API_KEY`                                                                  |
| Any OpenAI-compatible gateway (OpenCode Zen, OpenRouter, a local proxy…) | `OPENAI_API_KEY`, `OPENAI_BASE_URL` from the provider's catalog entry |

Both signals matter. The provider id is checked because a provider served by a custom
module — an OAuth login plugin, say — reports a `file://` URL as its package; the package is
checked because providers like Kimi For Coding speak the Anthropic Messages API under their
own id.

A key is passed when OpenCode exposes one. When it does not — a Claude Pro/Max login, or
any credential OpenCode injects at request time — the entry reads
`through your OpenCode login` and the call goes through the relay below.

Two combinations cannot be expressed and are left out of the picker, which reports how many
it hid:

- an Anthropic-Messages provider serving non-Claude ids (meat would dial the OpenAI
  Responses API against an Anthropic endpoint);
- a Claude id served by a gateway, such as OpenRouter's `anthropic/claude-…` (meat would
  dial `api.anthropic.com` with the gateway's key).

The first entry, **meat default**, passes no `-model` at all and lets meat use `$MEAT_MODEL`
or its own default with whatever credentials are already in your environment.

Gateways that implement `/v1/chat/completions` but not `/v1/responses` are offered but will
fail; meat's own error is shown in the window.

## Subscription logins (Claude Pro/Max)

meat authenticates with `x-api-key` and nothing else (`meat/anthropic.go`), and Anthropic
answers `401 invalid x-api-key` when that header carries a subscription OAuth token. That is
the failure behind `meat: AnthropicModel.APIKey is empty` on a setup like
[`@suiramdev/opencode-anthropic-auth`](https://github.com/suiramdev/opencode-anthropic-auth):
the credential exists, but it is not a key and OpenCode never hands it to the TUI anyway.

So the plugin's **server half** starts a loopback relay and the TUI points meat at it:

```
meat ──x-api-key: <local secret>──▶ 127.0.0.1:<port> ──Authorization: Bearer <token>──▶ api.anthropic.com
```

- The token is resolved **per request** from OpenCode's own credential store, so its refresh
  near expiry is picked up and no token is ever cached by this plugin.
- A minted key (that plugin's *Create an API Key* flow stores one in an OAuth-shaped
  credential) is forwarded as `x-api-key` instead, because that is what it is.
- The relay binds loopback only and requires a random per-run secret, which is what meat
  sends as its `x-api-key`. Without it no other local process can spend your subscription.
- One listener per server process, not per plugin instance: OpenCode loads a server plugin
  per request — hundreds of times in a working session — so a relay tied to an instance
  would almost never be listening when meat runs.
- The url and secret are published under `~/.cache/opencode-meat/`, keyed by config
  directory, so two profiles running at once cannot hand each other's credential to meat.
  The writer's pid is checked on read, so a server that died is ignored rather than sending
  meat at a closed port.
- The request is shaped to look like the client the subscription is for: `user-agent`,
  the two OAuth betas, and two leading `system` blocks — a billing header carrying a hash
  of the first user message, then the client identity string. This is **not** cosmetic.
  Measured with one `max_tokens: 1` request, changing nothing but the shape:

  | Sent | Anthropic answers |
  | --- | --- |
  | bearer + oauth beta | `429 rate_limit_error` |
  | + user-agent, identity and billing blocks | `200` |
  | …and again with meat's own lowercase tool names | `200` |

  Tool names are therefore left alone. Those constants mirror
  `@suiramdev/opencode-anthropic-auth`, which owns the same handshake for OpenCode's own
  requests; they are copied rather than imported because that package exports only its entry
  and provider, and lives in OpenCode's plugin cache rather than beside this one. Keep them
  in step: a client version Anthropic stops recognising comes back as a rate-limit error,
  not as an authentication one.
- `retry-after` and `anthropic-ratelimit-*` are passed back to meat, so a throttled run can
  be read from its own output.

This needs both halves installed (the server half holds the credential, the TUI spawns
meat). With only the window installed, keyless entries fall back to your environment.

## Options

Options come from the plugin entry in your config and apply to both halves.

| Option    | Type                     | Default  | Effect                                            |
| --------- | ------------------------ | -------- | ------------------------------------------------- |
| `model`   | `string`                 | meat's   | Passed as `meat -model <model>`, and the label of the picker's default entry |
| `binary`  | `string`                 | `"meat"` | Path to the meat executable (resolved via `PATH`) |
| `env`     | `Record<string, string>` | `{}`     | Merged over the environment meat derives, so it always wins |
| `noCache` | `boolean`                | `false`  | Passed as `meat -no-cache`                        |

```jsonc
{
  "plugins": [
    {
      "package": "@suiramdev/opencode-meat",
      "options": {
        "env": {
          "OPENAI_BASE_URL": "https://<openai-compatible-endpoint>/v1",
          "OPENAI_API_KEY": "sk-…"
        }
      }
    }
  ]
}
```

Recognized environment variables are meat's own: `OPENAI_API_KEY`, `OPENAI_BASE_URL`,
`ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `MEAT_MODEL`, `MEAT_CACHE`.

Results are cached under `~/.meat`, keyed by rubric + model + diff contents, so re-running
on an unchanged diff is instant. `noCache: true` forces a recompute.

## Local development

A checkout wires the same two halves, but from source. The TUI file resolves `solid-js` and
`@opentui/solid` out of this repo's own `node_modules`, which is why they are devDependencies
here:

```jsonc
// opencode.jsonc — server half
{ "plugins": [{ "package": "./src/index.ts", "options": {} }] }
```

```ts
// .opencode/plugins/tui/meat.ts — TUI half
export { default } from "../../../src/tui.js"
```

`bun run typecheck` checks both.

Load one copy or the other, never both — and move **both** shims out of the way, not just
the window:

```sh
rm <config>/plugins/meat.ts <config>/plugins/tui/meat.ts
```

The TUI half is the mild collision: two copies register the same commands and the same
slot, and a read started by one is invisible to the other. The **server** half is fatal.
Both copies define the plugin id `meat`, and a duplicate id does not skip the second
plugin — it aborts the whole set for that directory:

```
ERROR failed to reload plugins cause="Die(Error: Duplicate plugin ID: meat)"
```

Every other plugin goes down with it, an authentication plugin included, so the symptom is
a checkout that reports no integrations and no login while every other directory is fine.
A set that already registered is never torn down, so a directory that loaded cleanly once
keeps working until the next server restart — which is what makes this look intermittent.

Any module of this plugin that touches Solid has to be `.tsx`, JSX or no JSX. OpenCode hands
plugins its own Solid runtime by rewriting their `solid-js` imports, but the rewrite a local
checkout gets is `@opentui/solid`'s transform plugin, whose file filter only matches
`.tsx`/`.jsx`. A `.ts` module links against a second copy of Solid instead: its signals work
among themselves, and nothing they change ever reaches a component.

## Notes

- The abridged diff is a **reading** diff, not an applicable patch: meat drops lines and
  leaves the original `@@` counts stale by design. The window restates each hunk header over
  the lines that survived — otherwise OpenTUI's diff parser rejects the patch outright — and
  splits the patch per file, since the renderable only ever draws the first one. Hunk starts
  are meat's own and are left alone, so line numbers are right at the top of every hunk and
  drift by however much was elided further down it.
- A missing binary surfaces as a tool error naming the `go install` command.
- meat's own errors (missing API key, `no diff to read`, bad revision) are passed through
  verbatim from its stderr.
- `ctrl+x d` is only the default: it is the command `meat.show`, so `tui.json`'s `keybinds`
  can move it (`"meat.show": "<leader>D"`) or switch it off with `"none"`. The line above the
  prompt reads the live binding, and says `/meat-diff` when there is none.
- Nothing is cancellable mid-read: meat is left to finish or fail on its own. It caches under
  `~/.meat`, so a read you stopped caring about costs nothing the next time.

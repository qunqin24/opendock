# opencode-funes

A [funes](https://github.com/huggingface/funes) integration for OpenCode: it gives OpenCode
funes's read tools, and keeps your memory current by converting each session into funes's
[turns format](https://github.com/huggingface/funes/blob/main/docs/funes-jsonl.md) as you work.

It follows funes's
[integration contract](https://github.com/huggingface/funes/blob/main/docs/add.md#the-integration-contract),
so it needs funes **1.4.0** or newer. It works with OpenCode 1 (**1.18.29** or newer) and
OpenCode 2, and is developed against **1.18.31** and **2.0.20**.

## Install

Install the package and hand funes the bundle in it:

```sh
npm install -g opencode-funes
funes add opencode --from "$(npm root -g)/opencode-funes/opencode"
funes add opencode <user|org>/funes-memory --from "$(npm root -g)/opencode-funes/opencode"
```

A clone of this repository works the same way: name its `opencode` directory with `--from`.

funes asks you to confirm before it runs files it did not publish — once, until they change.
The second form binds a memory: recall reads it, and `funes add` does the first push there.

What the install puts on the machine:

| Where | What |
| --- | --- |
| `~/.funes/agents/opencode/` | The bundle, with the records and state it keeps beside it. |
| `~/.config/opencode/plugins/funes.ts` | One file that loads the plugin from the bundle; under `$XDG_CONFIG_HOME` when that is set. Both OpenCode 1 and 2 load it from there. A file of that name funes did not write is left alone, and the install stops. |
| `~/.funes/spool/opencode/` | Where the plugin writes turns files, and funes drains them. |

Nothing in your `opencode.json` is edited. The plugin registers the MCP server when OpenCode
loads its configuration, and only when `mcp.funes` is absent:

```json
{
  "mcp": {
    "funes": { "type": "local", "command": ["/path/to/funes", "mcp"], "enabled": true }
  }
}
```

A bound memory follows `mcp` in that command. Existing MCP entries, including a disabled or
custom funes server, are preserved. The agent discovers the tools from funes itself; the
plugin does not restate them. OpenCode 2 has no configuration hook: there the plugin registers
the same server through the MCP domain, again only when none named `funes` is configured, and
it shows up as `mcp.servers.funes` in OpenCode 2's terms.

Re-run `funes add opencode [memory]` to change the memory, and name `--from` again to install
a newer version. Either also makes the plugin convert each project's history anew, which is
how a memory is rebuilt. `funes remove opencode` takes the plugin file, the spool and the
bundle away, and leaves your memory and OpenCode's own sessions untouched.

## What is indexed, and when

When OpenCode starts in a project, the plugin lists that project's sessions, child sessions
included, and converts those changed since its last sweep there — all of them the first
time, which is how existing history gets in. After that it converts a session each time it
goes idle. Every conversion writes the session whole, as
`~/.funes/spool/opencode/<session id>.funes.jsonl`, then runs `funes index --harness opencode`
once for everything written. funes stores the turns it does not hold and drops the rest.

One message is one turn. Reasoning, text, and tool inputs, outputs and errors are kept;
unsupported parts are omitted, and a message left with nothing is not a turn. Unfinished
assistant messages and messages with pending or running tools wait for a later idle or
sweep. Each turn keeps the session's directory as `cwd`, from which funes derives the repo.
OpenCode 2 stores a message as one object rather than parts, and the same exchange makes the
same turns: user and synthetic text are the user's turns, an assistant turn's parent is the
user message before it, and agent, model and location switches, shell runs, compactions and
idle markers are not turns.

OpenCode 1 hands the plugin a client for its server. OpenCode 2 hands it none, so the plugin
reads sessions through the background service it runs in, whose URL and password the service
registers in `~/.local/state/opencode/service.json` (under `$XDG_STATE_HOME` when set). A
plugin hosted by anything else — `opencode serve` in the foreground, an embedded server —
finds no registration naming its process, logs that, and still registers recall. A session has
gone idle when OpenCode 2 reports its execution ended. The service loads one plugin instance
per project it serves and hands each the whole event stream; an instance converts the sessions
of its own project and leaves the rest to theirs.

funes is append-only, and OpenCode's history is not. A turn's `seq` is given once, in the
order turns are first converted, and the plugin remembers it beside the bundle: a message
that replaces a reverted one takes the next number, never the reverted one's. Later edits,
reverts and deletions in OpenCode do not replace or remove what funes already holds. A
snapshot is not a transaction across concurrent OpenCode edits.

One conversion or index runs at a time. Repeated idle events coalesce, and those arriving
during a run remain queued. Errors are logged and retried after 1, 2, 4, ... seconds, capped
at 60 seconds. The queue is in memory; a restart sweeps again. Disposal cancels active
requests, processes and timers.

Publishing is not automated: with a memory bound, run `funes push <memory>` when you want
to publish. Recall on a bound memory also reads what this machine has indexed and not
pushed yet.

## Converting by hand

To convert a project's sessions from a running OpenCode server without the plugin — an
archive, another machine — write them to a directory of your own and index that:

```sh
bun install
bun src/cli.ts backfill \
  --url http://127.0.0.1:4096 \
  --directory /absolute/path/to/project \
  --out /absolute/path/to/turns
funes index /absolute/path/to/turns
```

`--url`, an absolute `--directory` and `--out` are required. Standard
`OPENCODE_SERVER_PASSWORD` and optional `OPENCODE_SERVER_USERNAME` (default `opencode`)
provide Basic auth; for an OpenCode 2 service the password is the one in its
`service.json`. It exits nonzero on failure; re-run to retry safely. The turns carry the
ids the plugin gives them, so a session converted this way and one captured live are one
session in the memory. Turns are numbered as the session stands, without the plugin's
record. Neither path writes OpenCode storage or requests model inference.

The CLI tells the two servers apart by `GET /api/info`, which only OpenCode 2 answers. An
OpenCode 1 server is read through the pinned v1 SDK: session lists grow from 100 to 102400
until a response is shorter than the requested limit, avoiding timestamp cursor gaps and the
default 100-session cap, and a saturated ceiling fails explicitly. This relies on OpenCode
1.18.31's runtime `limit` support, which its v1 TypeScript query declaration omits; message
fetches have no limit, so OpenCode returns the complete oldest-first list. An OpenCode 2
server is read through its HTTP API with `fetch`: sessions and messages come in pages of 200
followed by cursor, messages oldest first. The plugin preserves the supplied client's
transport and authentication, including in-process servers, and depends on no `@opencode`
package at runtime.

## Develop

```sh
bun install
bun test
bun run typecheck
FUNES_BIN=/path/to/funes bun test    # also has funes check the converter's output
```

Tests run the bundle as funes installs it — copied into a temporary home, its `setup` run
with the contract's environment — against the real pinned SDK, a local HTTP fixture serving
either OpenCode's API, a stand-in for the OpenCode 2 plugin context and service registration,
and an executable standing in for funes at the subprocess boundary. No inference models or
running funes are required.

```sh
bun run smoke                        # real OpenCode 1 and 2, fetched into .smoke/
```

The smoke test drives the real binaries of both lines, fetched from npm once by
`scripts/smoke`: each is installed with the bundle the way funes installs it, given a fake
model that streams one answer, served in the background, and asked through `opencode run`
for a prompt, until funes is handed the session and the `funes` MCP server is listed. It
needs no model and no network beyond the fetch. `OPENCODE_V1` and `OPENCODE_V2` name binaries
of your own, and `SMOKE_KEEP=1` leaves the temporary homes behind, logs included. Pull
requests run the tests, the typecheck and the smoke test on Linux and macOS.

To try a working copy in OpenCode itself:

```sh
funes add opencode local --from ./opencode
funes remove opencode
```

## Release

Releases are driven by semver tags named `v*.*.*`, signed with a key listed in
`.github/release-allowed-signers` and pointing at a commit on `main`. The release workflow checks
that the tag, `package.json` and `opencode/manifest.json` agree on the version, runs the tests and
the typecheck, publishes to npm with provenance, and creates the GitHub release.

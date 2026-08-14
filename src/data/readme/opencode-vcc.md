# opencode-vcc

A **lossless recall** plugin for [opencode](https://opencode.ai) — a port of
[pi-vcc](https://github.com/sting8k/pi-vcc). When opencode compacts a
conversation, opencode-vcc appends a note to the summary telling the agent it
can recover pre-compaction context via the `recall` tool. The agent can then
search prior turns for specific decisions, file changes, and completed work that
the LLM summary may have omitted.

- **Lossless recall** — the `recall` tool re-reads the full session history
  (including turns hidden by compaction), so nothing is truly gone.
- **Zero LLM cost** — the plugin only appends a static note to opencode's own
  compaction summary; no extra LLM calls are made.
- **Non-invasive** — opencode's native compaction summary is always preserved;
  the plugin just augments it.

## How it works

When opencode compacts a conversation, it produces an LLM-generated summary.
opencode-vcc's `experimental.text.complete` hook detects compaction summary
messages (hard-gated by `info.summary === true && info.agent === "compaction"`)
and appends a `RECALL_NOTE` — a short imperative telling the agent to use the
`recall` tool before starting new work.

The `recall` tool searches the full session history (including pre-compaction
turns) using BM25-ranked search, regex patterns, or browse/expand modes. Results
are fed back to the agent as tool output, recovering any detail the LLM summary
omitted.

## Install

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-vcc"]
}
```

Or drop it in `.opencode/plugins/` / `~/.config/opencode/plugins/` as a local
plugin.

## Commands

### `/recall <query> [page:N]`

Search the full session history and feed the results to the agent as a new turn.

- `<query>` — search terms (natural-language, BM25-ranked) or a regex (any query
  containing regex metacharacters is treated as a pattern).
- `page:N` — results are paged 5 at a time.

Examples:

```
/recall auth bug
/recall "file path" page:2
/recall \b(auth|login)\b
```

## Tool: `recall`

An agent-invocable tool for searching / browsing / expanding prior context —
including turns removed from the live context by compaction.

| Argument | Type      | Meaning                                        |
| -------- | --------- | ---------------------------------------------- |
| `query`  | string?   | Search terms or regex. Omit to browse.         |
| `expand` | number[]? | Entry indices to return in full (untruncated). |
| `page`   | number?   | 1-based page for search results (5 per page).  |

Modes:

- **search** (`query` set) — ranked, paged matches with context snippets.
- **browse** (nothing set) — the last 25 entries.
- **expand** (`expand` set, no `query`) — full content of the given entry indices.
  Invalid indices return an explanatory message.

## Configuration

Settings resolve with the precedence **env > plugin options > sidecar file >
defaults**.

| Key     | Default | Meaning                             |
| ------- | ------- | ----------------------------------- |
| `debug` | `false` | Reserved for future diagnostic use. |

- **Sidecar file** — `~/.config/opencode/opencode-vcc.json` (auto-scaffolded with
  defaults on first load; missing keys are merged non-destructively). Override
  the path with `OPENCODE_VCC_CONFIG_PATH`.
- **Env** — `OPENCODE_VCC_DEBUG` (`true`/`1` or `false`/`0`).

## Development

```
just validate   # nix fmt + tsc --noEmit + bun test
just test
just typecheck
```

Formatting is handled entirely by `nix fmt` (treefmt: prettier + nixfmt). Run
`just validate` before committing.

CI (`.github/workflows/ci.yml`) runs `just ci` (format check + typecheck +
tests) on every push and pull request.

## Releasing

Releases are **tag-driven** — the git tag is the source of truth for the version.

1. Push an annotated tag matching `vX.Y.Z` (or a prerelease like `vX.Y.Z-rc.1`):

   ```
   git tag v0.2.0
   git push origin v0.2.0
   ```

2. `.github/workflows/release.yml` then:
   - re-runs the full CI gate,
   - sets `package.json` version from the tag,
   - publishes to npm (`latest` for releases, `next` for prereleases) with
     provenance, **tokenlessly via OIDC trusted publishing**,
   - creates a GitHub Release with auto-generated notes.

Publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
(OIDC) — no `NPM_TOKEN` secret is stored. The `opencode-vcc` package must exist
on npm (the first publish is done manually) and have a trusted publisher
configured for this repo's `release.yml` workflow. You do **not** commit a
version bump — the workflow derives it from the tag.

## License

MIT

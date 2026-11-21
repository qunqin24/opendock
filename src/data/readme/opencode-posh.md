# POSH plugins + mcp server
Version-matched, secure and optimized documentation for AI coding agents.

## Why use POSH?

- **Save tokens.** Search for the API, inspect its outline, and read only the
  relevant section as Markdown instead of sending an entire documentation page
  to the model. Keep unrelated content out of the context window.
- **Reduce prompt-injection risk.** POSH's
  [security process](https://poshtui.com/docs/security/) includes model-based
  scanning for malicious instructions in documentation. Scanning helps reduce
  risk but cannot eliminate it: agents must still treat retrieved docs as
  untrusted data, not instructions.
- **Better output, fewer correction loops.** Ground generated code in API
  signatures and examples matched to your Ruby version and `Gemfile.lock`.
  Checking the right docs before coding helps avoid invented methods, outdated
  syntax, and retries caused by version mismatches.

## Install POSH
poshtui.com application is a hard dependency in this project.

Posh runs a sync engine that manages documentation locally and servers it through CLI/MCP interface.

```sh
curl -fsSL https://poshtui.com/install.sh | sh
```

```sh
posh activate YOUR_LICENSE_KEY
```

From your Ruby project, download its documentation:

```sh
posh sync
```

## MCP configuration

Add this to your client's MCP configuration, replacing the project path:

```json
{
  "mcpServers": {
    "posh": {
      "command": "posh",
      "args": ["mcp"]
    }
  }
}
```

Transport: local stdio. POSH must be on your client's PATH; otherwise use its
absolute executable path. Update the configured project when switching projects,
or supply `project` on individual tool calls. No API-key environment variable is
required: the executable uses the license activation saved on your computer.

### MCP Bundle

Compatible clients can install the universal `posh-mcp.mcpb` asset from
[POSH releases](https://github.com/skatkov/homebrew-tap/releases). Select your Ruby
project when prompted. The bundle contains the existing platform binaries and
does not bypass license activation. It does not host or upload your project.

### Gemini CLI extension

After installing and activating POSH:

```sh
gemini extensions install https://github.com/skatkov/posh-mcp
```

The extension runs `posh mcp` locally. Ask the agent to pass your absolute Ruby
project directory in tool calls if its working directory is not your project.

### Agent plugins: Claude Code, Codex, OpenCode, and GitHub Copilot CLI

An MCP server alone gets used late, because agents tend to reach for it only
once they are stuck. These plugins connect the server and also tell the agent
to check POSH before relying on memory for Ruby, Rails, and gem work. Install
and activate POSH first.

Claude Code, as two separate prompts:

```text
/plugin marketplace add skatkov/posh-mcp
/plugin install posh@skatkov
```

Codex, then open `/hooks`, trust the POSH hooks, and start a new thread. Codex
skips hooks until they are trusted:

```sh
codex plugin marketplace add skatkov/posh-mcp
codex plugin add posh@skatkov
```

OpenCode 2:

```sh
opencode plugin add opencode-posh
```

GitHub Copilot CLI 1.0.112+:

```sh
copilot plugin marketplace add skatkov/posh-mcp
copilot plugin install posh@skatkov
```

Start a new Copilot session after installing. The plugin reuses the existing
marketplace, skill, and local MCP configuration. Its hooks require Node 18.3+.
Older Copilot versions can install the skill but may silently ignore the hook
used for mode commands; update Copilot before using this integration.

The instructions come from [`skills/posh/SKILL.md`](skills/posh/SKILL.md).
OpenCode adds them to the system prompt of every model request. Claude Code and
Codex have no plugin API for the system prompt, so they receive them as hidden
context at session start, after compaction, and when a subagent starts.
Copilot receives them at session start/resume and when supported subagents start.
Its built-in `general-purpose` agent does not emit the subagent-start hook, and
there is no dedicated post-compaction hook. Ordinary prompts receive a short
current-project directive, not another copy of the full ruleset.

| Command | Effect |
| --- | --- |
| `/posh auto` | Default. Active when the project has a `Gemfile`, `Gemfile.lock`, `gems.rb`, or `*.gemspec`, in the working directory or above it, up to the Git root |
| `/posh` or `/posh on` | Active in every project. Use this when the Ruby app sits in a subdirectory |
| `/posh feedback` | Same as `/posh on`, and the agent ends replies that used POSH with a **POSH feedback** section. The feedback stays in the reply; nothing is sent anywhere |
| `/posh off` | Inactive everywhere |

In Codex, use `$posh` in place of `/posh`. The mode is saved in
`~/.config/posh/agent-mode` and shared by all four agents. Copilot uses its
`userPromptTransformed` hook to apply mode changes and supply the confirmation
instructions without replacing the user's original prompt. These plugins are
not a claim that Anthropic, OpenAI, OpenCode, or GitHub has reviewed or listed them.

#### Redirecting gem source reads

Instructions are advisory, and an agent deep in a task tends to read the
installed gem source anyway. In Claude Code, Codex, OpenCode 2, and Copilot CLI the plugin declines that one
call and says what to run instead: reading a gem's source, or fetching its
documentation over HTTP, is declined once per gem per session when POSH has a
docset for that gem in this project.

The check resolves the Ruby project above the current working directory, stopping
at the Git root, including after entering a worktree. It validates POSH's returned
project against that root, not against an arbitrary subdirectory. It requires a matching locked gem with installed
documentation; private gems with docs are treated the same as public ones.
Redirect instructions pin both search and read to the resolved project, so an MCP
server started in a different project cannot silently select the wrong versions.
Gems with no local docs, git-sourced gems, non-Ruby projects in auto mode,
and `/posh off` are left alone. A broad search of the gem tree gets one
separate nudge when any locked gem has local docs.

All four harnesses run the same JavaScript policy in [`shared/lookup-policy.mjs`](shared/lookup-policy.mjs).
It owns lookup classification, mode and project checks, POSH discovery, redirect
text, and atomic retry markers. The adapters only translate their host contracts:

- Claude Code and Codex use [`hooks/posh-pre-tool-use.mjs`](hooks/posh-pre-tool-use.mjs)
  to turn the shared reason into a `PreToolUse` response. Their shell launcher
  invokes Node only for lookup interception.
- [`opencode/posh.mjs`](opencode/posh.mjs) maps OpenCode's built-in tool inputs,
  resolves the session's current location (or a shell's explicit `workdir`),
  imports the policy directly, and turns its reason into the host SDK's `Tool.Error`.
- [`hooks/posh-copilot-hook.mjs`](hooks/posh-copilot-hook.mjs) maps Copilot's native
  tool inputs and hook responses, uses the payload's current working directory,
  and shares lifecycle guidance and mode changes with OpenCode through
  [`shared/agent-lifecycle.mjs`](shared/agent-lifecycle.mjs). The shell launcher
  only preserves fail-open process behavior; lifecycle responses are serialized once.
  Every transformed prompt refreshes the resolved Ruby project and supersedes
  earlier project paths because Copilot starts plugin MCP servers in the plugin
  directory by default. Leaving Ruby in auto mode revokes the earlier guidance;
  forced-on mode without a resolved project asks the agent to locate one explicitly.
  It emits a native denial for redirects. Its shell launcher exits successfully
  even if Node fails, because Copilot otherwise denies calls on hook crashes.

The policy uses Node's standard library, with no runtime parsing dependencies or
Ruby subprocesses. Claude/Codex interception requires Node 18.3+ on the hook's PATH.
Missing Node, missing or failing POSH, malformed responses, and unwritable
session state all leave normal tool permissions unchanged. A retry of the
same lookup goes through: this is an adoption nudge, not a security boundary
or a ban on implementation-level source inspection. GitHub matching uses
repository names as gem-name hints; it does not cover every repository or
arbitrary shell program.
Shell detection recognizes literal-leading commands (optionally `bundle exec`),
not executable-looking words printed as arguments; compound-command tails are skipped.
Known command options are parsed before classifying operands; search patterns,
scripts, AWK variable values, request bodies and output filenames are not lookup
targets. Unknown option forms are left alone rather than guessing their meaning.
Filesystem detection recognizes Bundler/RubyGems installation layouts and custom
gem homes exported through `GEM_HOME` or `GEM_PATH`; a first-party directory merely
named `gems` is left alone. It does not run `Gem.path`, so arbitrary unexported
RubyGems path overrides are not detected.
Web lookups use the actual URL host and path, not embedded links in a query or fragment.

Claude Code alone supports `POSH_HOOK_DECISION=ask` to request approval instead
of declining the lookup. Codex does not support that response; Codex, Copilot, and OpenCode
always use a one-time denial followed by an allowed retry. In Codex, review the
new hooks in `/hooks` after updating. Hosted tools such as Codex's web search
do not pass through local tool hooks and are not intercepted.

OpenCode requires the 2.3+ plugin SDK; it supplies the runtime SDK, while the
repository pins a development copy for adapter tests. Claude, Codex, and Copilot
hooks do not need the OpenCode SDK. Claude/Codex lifecycle guidance and mode
commands still work without Node; only their lookup interception is skipped
when it is unavailable. Copilot skips all hooks without Node.

Session markers are scoped by project and gem, and live in the plugin's data
directory (or `$XDG_CACHE_HOME/posh/nudged`, defaulting to
`~/.cache/posh/nudged`). The [live evals](evals/README.md) compare behavior with
and without POSH in Claude Code and Codex.

### Cursor plugin

Install and activate POSH first, then paste this into the browser address bar.
Cursor prompts before it installs:

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=posh&config=eyJjb21tYW5kIjoicG9zaCIsImFyZ3MiOlsibWNwIl19
```

The encoded configuration is `{"command":"posh","args":["mcp"]}`. GitHub strips
`cursor://` links, so the one-click button lives in the
[installation docs](https://poshtui.com/docs/installation/#integrations)
instead.

This repository also includes `.cursor-plugin/plugin.json` and root `mcp.json`.
The deeplink adds only the MCP server; the plugin format also carries the POSH
skill, and Cursor lists plugins only after its own review. The integration
launches `posh mcp` locally; pass the intended absolute project path in tool
calls. This is not a claim that Cursor has reviewed or listed the plugin. POSH
remains proprietary software.

## Tools

| Tool | Purpose | Effects |
| --- | --- | --- |
| `docsets` | Discover project versions and installed documentation | Read-only |
| `search` | Find APIs and documentation | Read-only |
| `list` | Browse a docset's indexed entries | Read-only |
| `outline` | Get headings and section references | Read-only |
| `read` | Read a document or section | Read-only |
| `sync` | Download and index documentation | Network access and local cache/index writes |

Start with `docsets`, search using a returned library ref, and read the returned
document or section ref. Sync missing docs, then retry. Do not invent refs or
assume a tool call's project override persists to the next call.

## Testing

Use Node 22.18+ or Node 24.11+:

```sh
npm ci
npm test
npm run test:mutation
```

Tests use a fake POSH executable and temporary projects, not your license or synced
documentation. Mutation testing requires a 100% score; its HTML report is
`reports/mutation/index.html`. Runs are incremental: add `-- --force` after
changing dependencies, configuration, fixtures, or shared test helpers.

## Releasing

One command bumps every host manifest, writes the changelog entry, tags, and
pushes. The tag is what publishes: `.github/workflows/publish.yml` runs the
tests, publishes [`opencode-posh`](https://www.npmjs.com/package/opencode-posh)
to npm through trusted publishing (OIDC, no token in the repository), and opens
the GitHub release from the new changelog entry.

```sh
npm version patch   # or minor, major, or an exact 1.4.0
```

`preversion` runs the tests, `version` mirrors the new number into the Claude,
Codex, Copilot, Cursor, and Gemini manifests and prepends the commits since the last
release to [CHANGELOG.md](CHANGELOG.md), and `postversion` pushes the commit and
its tag. There is no separate confirmation step, so run it only when the release
should go out. npm's first publish of a package cannot use OIDC: publish once
from a workstation, then configure the trusted publisher on npm with repository
`skatkov/posh-mcp` and workflow file `publish.yml`.

## Privacy Policy

See [POSH's privacy policy](https://poshtui.com/privacy-policy). Documentation
lookups read locally synced documentation. Sync requires network access;
license activation and verification contact licensing services. Your MCP client
controls what tool results it sends to its model provider. Do not claim that all
MCP calls are offline or read-only.

## License and support

This repository's integration code and documentation are MIT licensed; see
[LICENSE](LICENSE). POSH itself is proprietary software: see
[LICENSE-POSH](LICENSE-POSH) and the
[Terms of Service](https://poshtui.com/terms-of-service). The MIT licence covers
this repository only. It grants no rights to POSH or its binaries, and no rights
to the POSH name or logo.

Copyright © 2026 KROONI B.V.

- [Homepage](https://poshtui.com)
- [Installation](https://poshtui.com/docs/installation/)
- [Activation](https://poshtui.com/docs/activation/)
- [MCP documentation](https://poshtui.com/docs/mcp/)
- [Support](https://poshtui.com/contact): contact@poshtui.com

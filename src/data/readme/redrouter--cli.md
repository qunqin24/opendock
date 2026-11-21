# RedRouter CLI

Configure Claude Code, Codex 0.170+, OpenCode 1.x and Pi with one explicit RedRouter model. Requires Node.js 20.11+ and separately installed agent tools.

```sh
export REDROUTER_API_KEY="your-key"
npx @redrouter/cli init
```

Get a key at [redrouter.org/keys](https://redrouter.org/keys). The unscoped npm name `redrouter` belongs to an unrelated project. Use the scoped package `@redrouter/cli`.

Init reads the current public catalog and merges user settings. Before saving, it makes one generation capped at 64 output tokens, charged to your trial or credits. It uses the first selected tool's protocol: Messages for Claude Code, Responses for Codex, or Chat Completions for OpenCode/Pi. A failed test leaves configs unchanged. This probe verifies credentials and that protocol; agent versions and their tools can introduce additional compatibility requirements. OpenCode and Pi start with an 8,192-token output cap so the initial request fits the free trial and avoids reserving the model's full output maximum.

```sh
npx @redrouter/cli init --dry-run
npx @redrouter/cli init --tools codex,pi --model red-cyber-1
npx @redrouter/cli init --skip-test
```

Keep `REDROUTER_API_KEY` exported when starting your agents. No key is written to disk. Claude Code uses an API key helper, Codex an environment key, and OpenCode/Pi environment references. Remove conflicting `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_API_KEY` variables from your shell before starting Claude Code. Settings change each selected tool's default provider/model, except Codex, which uses `codex --profile redrouter`. Existing permissions are retained.

Config locations: `~/.claude/settings.json`, `~/.codex/redrouter.config.toml`, `~/.config/opencode/opencode.json(c)`, and `~/.pi/agent/{models,settings}.json`. Standard client directory overrides are honored. JSONC comments and unrelated TOML are preserved. Changed files have private `.redrouter-<id>.bak` backups beside them; restore these to undo setup (delete newly created files). A pre-existing unmanaged Codex profile requires a manual merge. Codex 0.170+ uses a separate profile file; the legacy `[profiles.redrouter]` format is rejected by current Codex. Project-level settings can override user settings.

Setup and error guides: [Claude Code](https://docs.redrouter.org/claude-code), [Codex](https://docs.redrouter.org/codex), [OpenCode](https://docs.redrouter.org/opencode), [Pi](https://docs.redrouter.org/pi), and [troubleshooting](https://docs.redrouter.org/troubleshooting).

## Plugins

Init also installs the OpenCode and Pi plugins for selected tools, using stable local copies under `~/.config/redrouter/integrations`. Both need `REDROUTER_API_KEY` in the agent's environment. They send no prompts or credentials during catalog discovery. User-configured model overrides take precedence over discovered metadata.

OpenCode **1.x**:

```sh
npx @redrouter/cli init --tools opencode
```

Select `redrouter/red-cyber-1`. Init appends a local file URL to your existing `plugin` array. This avoids Git-package loader differences across OpenCode releases. This plugin uses the 1.x `config` hook; OpenCode 2.x uses a different plugin API.

Pi is also installed by init. To install just its plugin through Pi's package manager:

```sh
pi install npm:@redrouter/cli
pi --provider redrouter --model red-cyber-1
```

Pi loads the package's `pi.extensions` entry and registers the provider using its built-in OpenAI Chat Completions adapter. Run `/model` to select another model. Remove an existing static RedRouter provider from `models.json` if you want the plugin's catalog to own that metadata.

## Development

`npm ci && npm test`. MIT licensed. Source of the release package lives in the RedRouter product monorepo's `packages/cli`; this public repository contains only that package. Release with `npm pack`, inspect the tarball, and `npm publish --access public` from an authenticated account with access to the `@redrouter` scope.

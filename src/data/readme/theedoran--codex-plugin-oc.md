# Codex plugin for OpenCode

Use Codex from inside [OpenCode](https://opencode.ai) for code reviews or to delegate tasks to Codex.

`@theedoran/codex-plugin-oc` is a fork of OpenAI's [Codex plugin for Claude Code](https://github.com/openai/codex-plugin-cc), ported to OpenCode. The Codex runtime (the `codex app-server` JSON-RPC driver, the review and task prompts, the job tracking) is the original OpenAI work. This fork replaces the Claude Code integration layer with an OpenCode one: the commands become OpenCode commands, the Codex handlers are exposed as `codex_*` tools that any model can call, background jobs run inside the OpenCode server, and a `codex-rescue` subagent is added. It is not affiliated with OpenAI.

## What You Get

- `/codex-review` for a normal read-only Codex review
- `/codex-adversarial-review` for a steerable challenge review
- `/codex-rescue`, `/codex-status`, `/codex-result`, and `/codex-cancel` to delegate work and manage background jobs
- `/codex-setup` to check that the Codex CLI is installed and authenticated
- the `codex-rescue` subagent, reachable with `@codex-rescue` or through `/codex-rescue`
- the `codex_review`, `codex_adversarial_review`, `codex_task`, `codex_status`, `codex_result`, `codex_cancel`, and `codex_setup` tools, which any model can call directly

## Requirements

- **ChatGPT subscription (incl. Free) or OpenAI API key.**
  - Usage will contribute to your Codex usage limits. [Learn more](https://developers.openai.com/codex/pricing).
- **[Codex CLI](https://developers.openai.com/codex/cli/)** installed and logged in (`npm install -g @openai/codex`, then `codex login`).
- **OpenCode 1.18 or later.**

## Install

From npm:

```bash
opencode plugin @theedoran/codex-plugin-oc
```

Or add it to your `opencode.json` by hand:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@theedoran/codex-plugin-oc"]
}
```

For local development, point the plugin entry at a checkout instead:

```json
{
  "plugin": ["file:///absolute/path/to/codex-plugin-oc/index.mjs"]
}
```

Then start OpenCode and run:

```bash
/codex-setup
```

`/codex-setup` tells you whether Codex is ready. If Codex is missing and npm is available, it offers to install Codex for you. If Codex is installed but not logged in yet, run `codex login` in a terminal.

One simple first run is:

```bash
/codex-review --background
/codex-status
/codex-result
```

## Usage

### `/codex-review`

Runs a normal Codex review on your current work. It gives you the same quality of code review as running `/review` inside Codex directly.

> [!NOTE]
> Code review for multi-file changes can take a while. Run it with `--background` and check `/codex-status`, or wait in the foreground and press Esc to abort.

Use it when you want:

- a review of your current uncommitted changes
- a review of your branch compared to a base branch like `main`

Use `--base <ref>` for branch review. It is not steerable and does not take custom focus text. Use [`/codex-adversarial-review`](#codex-adversarial-review) when you want to challenge a specific decision or risk area.

Examples:

```bash
/codex-review
/codex-review --base main
/codex-review --background
```

This command is read-only and will not perform any changes.

### `/codex-adversarial-review`

Runs a **steerable** review that questions the chosen implementation and design.

It can be used to pressure-test assumptions, tradeoffs, failure modes, and whether a different approach would have been safer or simpler.

It uses the same review target selection as `/codex-review`, including `--base <ref>` for branch review. Unlike `/codex-review`, it can take extra focus text after the flags.

Examples:

```bash
/codex-adversarial-review
/codex-adversarial-review --base main challenge whether this was the right caching and retry design
/codex-adversarial-review --background look for race conditions and question the chosen approach
```

This command is read-only. It does not fix code.

### `/codex-rescue`

Hands a task to Codex through the `codex-rescue` subagent.

Use it when you want Codex to:

- investigate a bug
- try a fix
- continue a previous Codex task
- take a faster or cheaper pass with a smaller model

It supports `--background`, `--wait`, `--resume`, `--fresh`, `--model <model>`, and `--effort <none|minimal|low|medium|high|xhigh>`.

Examples:

```bash
/codex-rescue investigate why the tests started failing
/codex-rescue fix the failing test with the smallest safe patch
/codex-rescue --resume apply the top fix from the last run
/codex-rescue --model gpt-5.4-mini --effort medium investigate the flaky integration test
/codex-rescue --model spark fix the issue quickly
/codex-rescue --background investigate the regression
```

You can also just ask for a task to be delegated to Codex:

```text
Ask Codex to redesign the database connection to be more resilient.
```

**Notes:**

- if you do not pass `--model` or `--effort`, Codex chooses its own defaults.
- if you say `spark`, the plugin maps that to `gpt-5.3-codex-spark`
- follow-up rescue requests can continue the latest Codex task in the repo
- rescue runs are write-capable by default; ask for read-only behavior if you only want a diagnosis

### `/codex-status`

Shows running and recent Codex jobs for the current repository and session.

Examples:

```bash
/codex-status
/codex-status task-abc123
/codex-status task-abc123 --wait
```

### `/codex-result`

Shows the final stored Codex output for a finished job.
When available, it also includes the Codex session ID so you can reopen that run directly in Codex with `codex resume <session-id>`.

Examples:

```bash
/codex-result
/codex-result task-abc123
```

### `/codex-cancel`

Cancels an active background Codex job.

Examples:

```bash
/codex-cancel
/codex-cancel task-abc123
```

### `/codex-setup`

Checks whether Codex is installed and authenticated. If Codex is missing and npm is available, it can offer to install Codex for you.

## How It Works

The plugin wraps the [Codex app server](https://developers.openai.com/codex/app-server). It uses the global `codex` binary installed in your environment and [applies the same configuration](https://developers.openai.com/codex/config-basic).

Each review or task spawns a private `codex app-server` process inside the OpenCode server and closes it when the run finishes, when you cancel it, or when you press Esc.

Background jobs run inside the OpenCode server process, so they need that server to stay alive: the TUI, `opencode serve`, or `opencode web`. A one-shot `opencode run` exits when the answer is printed and takes its background jobs with it; the next plugin start marks those jobs as failed. Job records and logs live under `$XDG_DATA_HOME/opencode/codex-plugin` (defaults to `~/.local/share/opencode/codex-plugin`). Set `CODEX_PLUGIN_DATA_DIR` to move them.

Jobs are scoped to the OpenCode session that started them, so `/codex-status` shows the jobs from your current session by default. Pass `--all` or a job id to see others.

### Common Configurations

If you want to change the default reasoning effort or the default model that gets used by the plugin, define that inside your user-level or project-level Codex `config.toml`. For example, to always use `gpt-5.4-mini` on `high` for a specific project, add the following to a `.codex/config.toml` file at the root of the project:

```toml
model = "gpt-5.4-mini"
model_reasoning_effort = "high"
```

Your configuration will be picked up based on:

- user-level config in `~/.codex/config.toml`
- project-level overrides in `.codex/config.toml`
- project-level overrides only load when the [project is trusted](https://developers.openai.com/codex/config-advanced#project-config-files-codexconfigtoml)

Check out the Codex docs for more [configuration options](https://developers.openai.com/codex/config-reference).

### Moving The Work Over To Codex

Delegated tasks can be resumed inside Codex by running `codex resume` with the session ID you received from `/codex-result` or `/codex-status`.

## Development

```bash
pnpm install
pnpm test
```

Releases use [Changesets](https://github.com/changesets/changesets). Add a changeset with `pnpm changeset` and push to `main`. The release workflow opens a version PR; merging that PR publishes to npm through trusted publishing.

`cli.mjs` exposes the same handlers the tools use, for local debugging:

```bash
node cli.mjs setup --json
node cli.mjs review --base main
node cli.mjs task --write "fix the failing test"
```

## FAQ

### Do I need a separate Codex account for this plugin?

If you are already signed into Codex on this machine, that account works immediately here too. This plugin uses your local Codex CLI authentication.

If you have not used Codex yet, sign in with either a ChatGPT account or an API key. [Codex is available with your ChatGPT subscription](https://developers.openai.com/codex/pricing/), and [`codex login`](https://developers.openai.com/codex/cli/reference/#codex-login) supports both. Run `/codex-setup` to check whether Codex is ready.

### Does the plugin use a separate Codex runtime?

No. This plugin delegates through your local [Codex CLI](https://developers.openai.com/codex/cli/) and [Codex app server](https://developers.openai.com/codex/app-server/) on the same machine, with the same install, authentication state, repository checkout, and configuration you would use directly.

### Can I keep using my current API key or base URL setup?

Yes. Because the plugin uses your local Codex CLI, your existing sign-in method and config still apply. If you need to point the built-in OpenAI provider at a different endpoint, set `openai_base_url` in your [Codex config](https://developers.openai.com/codex/config-advanced/#config-and-state-locations).

## Credits and License

This is a fork. The plugin was originally written by the OpenAI Codex team as [codex-plugin-cc](https://github.com/openai/codex-plugin-cc) for Claude Code, and the Codex runtime here is their work. Edoardo Ranghieri ported it to OpenCode and maintains this fork as [`@theedoran/codex-plugin-oc`](https://www.npmjs.com/package/@theedoran/codex-plugin-oc).

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).

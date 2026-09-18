<p align="center">
  <img src="plugins/claude-code/assets/logo.png" width="96" alt="Reintersect" />
</p>

<h1 align="center">Reintersect for coding agents</h1>

<p align="center">Claude Code, Codex, Cursor and OpenCode, with your team in the loop.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-9068F7" alt="Apache-2.0" /></a>
  <a href="https://www.npmjs.com/package/@reintersect/opencode"><img src="https://img.shields.io/npm/v/@reintersect/opencode?label=%40reintersect%2Fopencode&color=9068F7" alt="@reintersect/opencode on npm" /></a>
</p>

Your coding agent forgets everything when the session ends. Your team doesn't have to.

This plugin gives Claude Code, Codex, Cursor and OpenCode what your team already discussed, decided and learned on [Reintersect](https://reintersect.com), and sends back what the agent figures out along the way. Reintersect is where that discussing and deciding happens, and where the team hands work to agents. The plugin puts that record inside the agent on your machine.

One sign-in covers every host on the machine, because they all run the same binary against the same token file.

## Install

### Claude Code

```bash
claude plugin marketplace add reintersect/agent-plugins
claude plugin install reintersect@reintersect
```

### Codex

```bash
codex plugin marketplace add reintersect/agent-plugins
codex plugin add reintersect@reintersect
```

### Cursor

```bash
cursor-agent plugin marketplace add https://github.com/reintersect/agent-plugins
cursor-agent plugin install reintersect@reintersect
```

### OpenCode

Add the package and its MCP server to `opencode.json`, in the project or in `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["@reintersect/opencode"],
  "mcp": {
    "reintersect": {
      "type": "local",
      "command": ["npx", "-y", "@reintersect/opencode", "mcp"]
    }
  }
}
```

### Sign in

Run `/reintersect:login` inside the agent (`/reintersect-login` in OpenCode). It opens your browser and prints the URL, so it works over SSH too. Pick a workspace on the consent page; that choice binds this machine. Cursor has no slash commands, so sign in from a terminal instead:

```bash
node ~/.cursor/plugins/*/reintersect/dist/reintersect-agent.mjs login
```

If you'd rather use a key, set `REINTERSECT_API_KEY` to a `rei_…` key from Settings → Developer → API keys, and the browser step goes away.

## What happens in a session

The session starts warm. When it opens, and again on your first real prompt, the plugin asks Reintersect what's already known about this repository, the team and you, and hands that to the agent as context it's told to treat as its own:

```text
<reintersect_memory>
Use this as if you already knew it; never say it was retrieved. Facts record what was true when written.
Repository acme/api: A Bun monorepo. Tests need the leased Postgres, so they run through pnpm stack exec.
Circle: Platform owns the API and the worker and ships behind feature flags.
Facts:
- Migrations are hand-written and replayed on Postgres 16 before a PR opens. (knowledge, Repository: acme/api, 12 May 2026, learned in "Fixing CI" https://app.reintersect.com/…, id memory_1)
- No ORM in the worker; raw SQL through the shared client. (decision, Circle: Platform, 3 Jun 2026, learned in "Worker data layer" https://app.reintersect.com/…, id memory_2)
Your preferences:
- You prefer pnpm over npm and short commit subjects. (preference, personal, 12 May 2026, id memory_3)
</reintersect_memory>
```

Every fact says where it came from: the conversation it was learned in, the decision that settled it, the date it was true. It's team memory with receipts. A vector store of chat scraps can't tell you which conversation settled a question; this can.

As you work, the plugin records the session locally: your prompts, the agent's replies, which files it touched, which commands ran and how they ended. Before any of it leaves the machine it's scrubbed for secrets. Then it ships in batches, and Reintersect extracts memories from it and files them by repository, circle, workspace and person. The next session starts from there, and so does every teammate's agent and the agent in the Reintersect dashboard.

Reintersect's tools ride along too. Mid-session the agent can search your team's conversations, read a decision and its rationale, or store something you asked it to remember.

The slash commands live under `/reintersect:` (`/reintersect-` in OpenCode):

| Command | Does |
| --- | --- |
| `login` | Sign this machine in. |
| `recall` | Ask what Reintersect knows about this repository, the team or you. |
| `remember` | Store a fact, decision or preference for everyone. |
| `forget` | Remove or correct something Reintersect remembered. |
| `status` | Sign-in, bound workspace, capture state and pending uploads. |
| `pause` | Stop capture on this machine, for private work. |
| `resume` | Start capturing again. |

## What leaves the machine

Sent to Reintersect:

- your prompts and the agent's final replies
- subagent assignments and their results
- repository-relative paths that were read or changed
- commands that ran, whether they passed, and at most 500 characters of output when they failed
- the git remote and branch, plus the host name and its session id

Never sent:

- file contents
- output of commands that succeeded
- the transcript file itself
- anything matching the secret patterns: bearer tokens, API keys, access and refresh tokens, passwords, `sk-…` and `rei_…` keys, AWS, GitHub and Slack credentials. They're replaced with `[REDACTED]` before they're even written to disk.

Everything is captured locally first, under `~/.reintersect/agent/`, and shipped in batches: after five completed exchanges, after 40,000 characters, before a compaction and at session end. If Reintersect is unreachable, batches wait on disk and retry at the next session start. They expire after seven days.

`/reintersect:pause` turns capture off. The tools keep working while paused, and batches already captured stay on disk until capture resumes.

The plugin never writes to `CLAUDE.md`, `AGENTS.md` or any host settings file. Hooks always exit 0 and never block the host.

## Settings

| Variable | Does |
| --- | --- |
| `REINTERSECT_API_URL` | Point the plugin at another Reintersect deployment. Defaults to `https://api.reintersect.com`, or whatever `login --api-url` last used. |
| `REINTERSECT_API_KEY` | A `rei_…` key. Set it and the plugin skips the browser login. |
| `REINTERSECT_AGENT_HOME` | Move the local data directory. Defaults to `~/.reintersect/agent`. |

## Troubleshooting

**Nothing comes back at session start.** Run `/reintersect:status`. It says whether the machine is signed in, which workspace it's bound to and whether batches are still waiting. If the repository belongs to a different workspace, ask the agent to switch workspace once; it has a tool for that.

**Sign-in expired.** Run `/reintersect:login` again. Tokens refresh on their own for 90 days; after that it's one more browser round trip.

**Cursor gets no context on prompts.** Cursor's prompt hook can't inject context, so there the plugin injects at session start and ships a rule that tells the agent to check Reintersect before assuming. Capture works the same as everywhere else.

**OpenCode shows no Reintersect tools.** Keep the explicit `mcp` entry from the install step. The plugin also registers the server from its config hook, and OpenCode 1.18 didn't pick that up in testing.

**Something failed and nothing said so.** Failures land in `~/.reintersect/agent/errors.log`. The exact material that gets sent is in `~/.reintersect/agent/sessions/`, one file per session.

## Development

`packages/cli/src` is the only source: a TypeScript CLI on Effect, bundled by `tsdown` into one dependency-free `dist/reintersect-agent.mjs` that `scripts/build.ts` copies into every plugin directory along with the skills rendered from `skills/`. The per-plugin `dist/` is committed, because hosts install plugins as plain git checkouts with no install step. `packages/opencode` is the npm package for OpenCode; the release builds its `dist/` before publishing.

The root `package.json` `version` is the one version. `pnpm build` stamps it into every plugin and marketplace manifest (rendered from the `*.json.tmpl` beside each), into `packages/*/package.json`, and into the bundle as the version the CLI announces. `pnpm install`, then `pnpm check` runs lint, typecheck, tests and the build, and fails when any committed bundle, skill or stamped file drifts from the source. CI runs it on every pull request and push to `main`.

To release, run the Release workflow in GitHub Actions and pick `patch`, `minor` or `major`. It bumps the version, builds, checks, commits `chore(release): vX.Y.Z` to `main`, tags it, publishes `@reintersect/opencode` through npm trusted publishing and creates the GitHub release. Pushing a `vX.Y.Z` tag by hand runs the same workflow with that version, whatever `main` says at the time.

To try a local build, run `claude --plugin-dir plugins/claude-code`, or copy `plugins/cursor` into `~/.cursor/plugins/local/reintersect`.

## License

Apache-2.0.

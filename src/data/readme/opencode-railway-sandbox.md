# Railway Sandbox for OpenCode

Give your OpenCode agents a sandbox of their own. `opencode-railway-sandbox` adds a `railway_sandbox` tool that runs
a subagent on a fresh Railway VM instead of your laptop: it copies your project over, runs a headless OpenCode agent
there with full permissions, and hands back a report, a reviewable patch, and (optionally) a live preview URL.

```text
You: I'm working on the launch board. Add a "Preview URLs" item, run the build remotely,
     and give me a preview URL I can share.

Agent: [edits src/main.js] → railway_sandbox(preview: true)
       ... Railway sandbox: npm install, vite build, vite preview ...
       Preview URL: https://opencode-remote-agents-8080-….up.railway.app (HTTP 200, shareable)
```

> **Status:** early prototype. Tested end to end with OpenCode 2.3.0 and Railway Sandboxes (see [Testing](#testing)).

> **Not affiliated with OpenCode.** This is a community plugin. It is not built by, endorsed by, or affiliated with the
> OpenCode team.

## Quick start

Requires OpenCode 2.3 or newer. Paste this into OpenCode:

```text
Install the Railway OpenCode plugin (npm package "opencode-railway-sandbox") globally and tell me how to connect Railway.
```

Then connect Railway with `/connect` → **Railway** → **Sign in with Railway**, and pick the project sandboxes should run
in. Without an account, the plugin tries a free anonymous Railway VM first.

### Try it

Start OpenCode **in the project folder**: the plugin uploads the session's directory to the sandbox.

In an empty folder:

```text
Create a tiny Vite app here called "launch-board" that shows a dark page with a heading "Launch Board" and a list of
three launches with statuses (planned, in progress, shipped). Initialize a git repo and commit it.

Then use the Railway OpenCode plugin's railway_sandbox tool with preview=true to install dependencies, build it, and serve it on a Railway
sandbox, and give me the shareable preview URL. While it runs, explain what's happening on the Railway side.

When the report arrives, show me the changes the remote agent made, apply its patch with railway_sandbox_apply, and
tell me how long the preview stays up and how to stop it early.
```

Or in an existing project:

```text
Using the Railway OpenCode plugin, run my test suite on a Railway sandbox instead of this machine, fix anything that fails there, then show me the patch
and apply it if it looks right.
```

More ideas in [docs/use-cases.md](docs/use-cases.md).

## How it works

```text
OpenCode (your machine)                         Railway
┌──────────────────────────┐                    ┌───────────────────────────────────┐
│ parent agent             │  railway_sandbox   │ VM (Sandbox or free railway.new)   │
│  └─ railway-sandbox ─────┼──── tarball ──────►│  /root/workspace (baseline commit) │
│     plugin               │                    │  opencode serve / opencode run     │
│                          │◄─── report+patch ──┤  headless agent, all permissions   │
│  <railway_sandbox> msg   │◄─── preview URL ───┤  app on $PORT=8080 → public HTTPS  │
└──────────────────────────┘                    └───────────────────────────────────┘
```

1. **Pack.** Git-tracked and untracked-but-not-ignored files (exactly what your local agent sees, minus `.git` and
   ignored output such as `node_modules`). Non-git directories are tarred without `node_modules`/`.git`.
2. **Pick a sandbox** (see [Tiers](#tiers)).
3. **Run.** The remote OpenCode starts from a baseline commit, so its changes come back as an exact `git diff`.
   It runs without approval prompts (the VM is disposable) and the `question` tool is denied (nobody is attached).
4. **Report.** By default the tool returns immediately and the result arrives later as a `<railway_sandbox>` message,
   like OpenCode's built-in subagents. The patch is saved to `$TMPDIR/opencode-railway-sandbox/<task>.patch` and is
   **never applied automatically**; `railway_sandbox_apply` applies it on request.
5. **Preview** (`preview: true`). The remote agent is told the public URL, makes the app serve on `0.0.0.0:$PORT`
   (8080), verifies it through the public URL, and writes its start command. The plugin then swaps the agent server
   for the app and checks the URL answers.

## Tiers

| | Anonymous | Railway account |
|---|---|---|
| Backend | `ssh railway.new` free VM | [Railway Sandboxes](https://docs.railway.com/sandboxes) |
| Needs | nothing (an SSH key is generated per project) | Sign in with Railway, project token, or `RAILWAY_TOKEN` |
| Size | 2 vCPU / 2 GB | plan default (Hobby 4/4, Pro 8/8, up to 32/32) |
| Limits | 60 min build window, 3 boxes per IP per day | per-environment sandbox caps |
| Preview URL | only from your IP until you claim the box | public HTTPS, shareable |
| Model | box's included AI budget, or your forwarded login | your forwarded login, or OpenCode's free default |

Selection order:

1. A connected Railway account always wins (bigger machines, shareable previews).
2. Otherwise the plugin tries an **anonymous** sandbox.
3. If Railway refuses the anonymous box (capacity, daily limit), the plugin starts **Sign in with Railway**, returns the
   link for the agent to relay, and starts the task automatically once you approve.

## Install

The [Quick start](#quick-start) prompt does this for you. To install by hand:

```jsonc
// opencode.jsonc (project) or ~/.config/opencode/opencode.jsonc (global)
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-railway-sandbox",
      "options": {
        // Optional; see Options below.
        "project": "my-railway-project",
      },
    },
  ],
}
```

During development, point `package` at a local checkout (`"/path/to/opencode-railway-sandbox"`) and build the Desktop
panel with `bun run build` (or `bun run dev` to rebuild on change). OpenCode reloads a local plugin when its config or
source changes; running sandbox tasks survive the reload (see below).

> **Gotcha:** if you add or change `exports` in `package.json` while OpenCode is running, its module resolver can keep
> the old `package.json`, and the new parts (such as the Desktop panel) are not found. Restart OpenCode
> (`opencode service restart`) to pick them up.

### Choose a remote model

The remote agent uses your session's model when its login can travel to another machine (API keys and OAuth logins
such as OpenAI). Machine-bound logins, notably **Claude Agent**, cannot, and the remote agent then falls back to
OpenCode's free default model, which is rate-limited and often exhausted. If you use Claude Agent locally, set the
plugin's `model` option to a model from a provider you have connected with an API key or OAuth:

```jsonc
{
  "plugins": [{ "package": "opencode-railway-sandbox", "options": { "model": "openai/gpt-6.1-terra" } }],
}
```

## Connect Railway

Any one of these works; OpenCode stores credentials in its own credential store.

- **Sign in with Railway** (recommended): `/connect` → Railway → Sign in with Railway. Uses OAuth 2.0 + PKCE with a
  public client (no secret). On the consent screen, pick the project(s) OpenCode may create sandboxes in.
  Requested scopes: `openid email profile offline_access project:member`.
- **Project token**: `/connect` → Railway → Railway project token. Scoped to one project and environment.
- **Environment**: set `RAILWAY_TOKEN` (project token) or `RAILWAY_API_TOKEN` + `RAILWAY_ENVIRONMENT_ID` for the
  OpenCode server process.

If nothing is connected and the anonymous tier is unavailable, the agent will tell you and hand you a sign-in link.

## Tools

### `railway_sandbox`

| Input | Description |
|---|---|
| `description` | 3–5 word label |
| `prompt` | Self-contained instructions; the remote agent cannot see your conversation |
| `preview` | Build the app and serve it on a preview URL |
| `variables` | Environment variables for the sandbox, as Railway references (see below) |
| `agent` | Remote agent (default `build`) |
| `model` | `provider/model#variant`, only when you ask for a specific model |
| `wait` | Block until finished instead of running in the background |

### `railway_sandbox_status`

Shows what tasks are doing right now: the remote agent's todo list, its recent tool calls with output, its latest
messages, files changed so far, and time left. Without a task ID it summarizes every active task. Pass `watch: true` to
also get a single-use link (valid 5 minutes) that opens the remote OpenCode session live in a browser. The link is
minted with OpenCode's pairing flow, so the server password never appears in a URL.

The agent is told to use it only when you ask or when it needs progress to decide what to do next, never to poll:
reports still arrive on their own.

```text
You: How's the sandbox doing? Give me a link to watch it.
Agent: railway_sandbox_status(task, watch: true)
       → running 1m, 119m left; todos: [x] extract data [~] pause [ ] run tests;
         last tool: shell (running) sleep 90; files changed: package.json, src/main.js, src/launches.js
         Watch live (single use): https://…up.railway.app/auth/connect/…
```

### `railway_sandbox_message`

Sends a follow-up to a running task's remote agent, like continuing a subagent. `delivery: "steer"` (the default) adds
it to the current turn; `"queue"` runs it after. The task still produces a single report once the remote agent has
finished everything, including the follow-up.

```text
You: Tell it to also add a Testing section to the README.
Agent: railway_sandbox_message(task, "Also add a 'Testing' section to README.md …")
       … the final patch includes README.md
```

Status, messages, and watch links work for Railway Sandbox tasks while the remote agent runs. Anonymous `railway.new`
tasks have no live session to inspect.

### `railway_sandbox_variables`

Lists the Railway project's services and the **names** of their variables (never values), so the agent can write
references for `variables`.

### `railway_sandbox_apply`

Applies a finished task's patch to the local project and reports what happened, trying three strategies in order:

1. A clean `git apply`.
2. A per-file three-way merge (`git merge-file`). The base is the file content the remote run started from, which is
   saved to git's object store when the task finishes. Local edits made in the meantime are kept, and real conflicts
   are left as `<<<<<<< local` / `>>>>>>> railway` markers.
3. `git apply --reject`, which leaves `.rej` files for hunks with no merge base.

It never touches your git index, and it asks for the same `edit` permission as OpenCode's edit tools, so agents that
may not edit (such as Plan) cannot apply. `check: true` only reports whether the patch applies cleanly.

### `railway_sandbox_stop`

Stops a task and destroys its sandbox (for example, to take a preview down early). Takes the task ID from the report.

## Railway variables and private services

With a Railway account, every sandbox joins the project environment's private network. Pass `variables` with
[Railway references](https://docs.railway.com/variables/reference#template-syntax) and Railway resolves them inside
the VM when it is created, so secrets never pass through your machine or the conversation:

```text
You: Use a Railway sandbox connected to my Postgres to add a db-check script and run it.

Agent: railway_sandbox_variables()  → Postgres: DATABASE_URL, PGHOST, …
       railway_sandbox(variables: { DATABASE_URL: "${{Postgres.DATABASE_URL}}" }, …)
```

Use `${{Service.VARIABLE}}` for service variables and `${{shared.VARIABLE}}` for shared ones. Defaults for every task
can go in the plugin's `variables` option. Variables need a Railway account, so a task that passes them skips the
anonymous tier.

## Desktop panel

OpenCode Desktop gets a **Railway Sandboxes** side panel. Open it from the side panel's **+** menu or the command
palette (**Show Railway Sandboxes**). It lists your tasks across projects, showing:

- status and the time left before the sandbox shuts itself down
- preview URLs, with open and copy buttons
- patch state (ready or applied) and the injected variable names
- **Watch live** for running tasks: opens the remote agent's session as a native Desktop tab, like a local session
  (see below)
- a **Stop and destroy** button for running sandboxes

Tabs switch between **Active** (the default) and **All**, which adds finished, failed, and stopped tasks from the last
24 hours, with a count on each. The choice is remembered, and the panel updates live from the plugin's RPC events.

### Remote sessions as native tabs

While a task runs, its sandbox appears in Desktop as a temporary server labelled **Railway**, and **Watch live** opens
the remote agent's session in a normal tab: the live timeline, tool calls, and output. The server disappears when the
task ends. The tab is fully interactive: anything you type goes to the remote agent, and the plugin waits until the
session is idle after your latest message before it collects the patch and reports. Outside Desktop, Watch live falls
back to a single-use browser link.

The panel is a GUI part (`./gui-experimental`), which OpenCode Desktop loads only for plugins in your **global**
`opencode.json(c)`. The web UI lists the plugin but does not run third-party GUI parts.

## Options

| Option | Default | Description |
|---|---|---|
| `project` | — | Railway project (name or ID) when your credential can see several |
| `environment` | `production` | Environment name or ID |
| `environmentId` | — | Skip discovery entirely |
| `model` | parent session's model | Default remote model |
| `agent` | `build` | Default remote agent |
| `anonymous` | `true` | Try a free `railway.new` sandbox when no account is connected |
| `variables` | — | Variables for every task, e.g. `{ "DATABASE_URL": "${{Postgres.DATABASE_URL}}" }` |
| `previewMinutes` | `60` | How long a preview stays up before the VM shuts itself down |
| `maxMinutes` | `120` | Hard cap on a sandbox task, enforced inside the VM |
| `idleTimeoutMinutes` | `10` | How long a finished sandbox lingers before Railway reclaims it (running work keeps it alive regardless) |
| `keepSandbox` | `false` | Keep non-preview sandboxes running after the task |
| `matchVersion` | `false` | Upgrade the sandbox's OpenCode to your local version first |
| `oauthClientId` | built-in | Override the Railway OAuth client |
| `oauthPort` | `19876` | Loopback port registered as `http://127.0.0.1:<port>/callback` |

## Credentials and security

- **Model credentials.** The remote agent uses the same provider as your session when that login can travel: API keys
  are forwarded as-is; OAuth logins are forwarded as a short-lived **access token only** (the refresh token never
  leaves your machine, so the VM cannot rotate your login). Machine-bound logins such as Claude Agent cannot be
  forwarded; the remote agent then uses OpenCode's default model, and the report says so.
- **Forwarded credentials live only inside that VM**, which is destroyed after non-preview tasks.
- **Remote server.** The sandbox's OpenCode server is published on a Railway HTTPS domain protected by a random
  per-task password, and is stopped before a preview starts.
- **Lifetimes are enforced inside the VM** with `timeout`, so a task or preview cannot outlive its cap even if your
  laptop sleeps or OpenCode restarts; Railway's idle timeout then reclaims the sandbox.
- **Your code is copied to Railway.** Ignored files (for example `.env` when it is in `.gitignore`) are not uploaded.
  Untracked files that are not ignored are.

## Limitations

- Changes come back as a patch to review; they are not merged automatically.
- The remote copy has a fresh one-commit history, not your git history.
- Sandbox tasks survive plugin reloads (config edits, plugin updates) and OpenCode restarts: the plugin detaches, and the
  next instance resumes following the task from a stored handle and still delivers the report. Every OpenCode process on
  a machine shares one database, so the process following a task holds a 90-second lease on it, and another process
  takes over only after that lease lapses. Each report is delivered once. Anonymous (`ssh`) tasks cannot be
  resumed; the agent is told they were interrupted.
- If the sandbox's public URL stops answering, the plugin talks to the remote OpenCode with `curl` inside the VM over
  Railway's exec channel, and tolerates up to 3 minutes without contact.
- The anonymous tier is driven over SSH by parsing Railway's welcome manifest; its format is not a stable API.
- OpenCode V2 does not yet let plugins place a child session on a remote workspace, so the remote run is not shown as
  a native child session. See [docs/architecture.md](docs/architecture.md).

## Roadmap

- **Checkpoint caching.** Save each project's installed dependencies as a
  [sandbox checkpoint](https://docs.railway.com/sandboxes#checkpoints) and boot later tasks from it, so repeat runs skip
  `npm install` (often most of a task's time).
- **Native child sessions.** Ask OpenCode to let plugins register workspace drivers, so remote runs appear as native
  child sessions instead of messages. The case is in [docs/architecture.md](docs/architecture.md#why-not-opencodes-native-workspaces).
- **Better model fallback.** When the session's model cannot run remotely (Claude Agent), fall back to a connected
  provider's model instead of OpenCode's quota-limited free model. Until then, set the `model` option
  ([Choose a remote model](#choose-a-remote-model)).
- **Anonymous tier hardening.** Verify the `ssh railway.new` happy path end to end; the welcome-manifest parsing is so far
  tested only against refusals.
- **Sign-in resilience.** Fallback loopback ports for the OAuth callback, and `wait: true` that continues after sign-in.

## Security

See [SECURITY.md](SECURITY.md) for what leaves your machine and how to report a vulnerability.

## Testing

See [docs/testing.md](docs/testing.md) for the end-to-end checklist and the results of the last run.

## Releasing

CI (`.github/workflows/ci.yml`) typechecks, tests, builds the Desktop panel, and dry-runs `npm pack` on every push and
pull request. Publishing a GitHub release publishes to npm (`.github/workflows/release.yml`):

1. Bump `version` in `package.json`, commit, and push.
2. Create a GitHub release tagged `v<version>` (the workflow fails if they differ).
3. The workflow builds and runs `npm publish --provenance`.

One-time setup: publish the first version manually (`npm login`, `bun run build`, `npm publish --access public`), then
on npmjs.com add this repository as a **trusted publisher** (workflow `release.yml`, environment `npm`). After that no
npm token is stored in GitHub.

## License

MIT

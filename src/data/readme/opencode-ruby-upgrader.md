# opencode-ruby-upgrader

An evidence-driven Ruby and Rails migration agent for [OpenCode](https://opencode.ai). It upgrades a project one Ruby minor series at a time toward a researched latest-stable or explicitly pinned Ruby target, researches compatibility guidance, updates affected code and dependencies, and leaves a reviewable migration trail. It ships as an OpenCode plugin: register it in your OpenCode config, then drive it with `/ruby-upgrade`.

## Install

### 1. Install OpenCode

This package is a plugin for [OpenCode](https://opencode.ai), an open-source AI coding agent that runs in your terminal. If you don't have it yet:

```bash
curl -fsSL https://opencode.ai/install | bash
# or: npm install -g opencode-ai
# or: brew install anomalyco/tap/opencode
```

You'll also need an API key for at least one LLM provider — run `/connect` inside OpenCode to sign in or paste a key. The [OpenCode intro](https://opencode.ai/docs/) covers the full first-run setup.

### 2. Register the plugin

Add it to your OpenCode config, either the project config `opencode.json` (or `opencode.jsonc`) beside your project, or the global `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-ruby-upgrader"]
}
```

Register it **per project** if you want the agent available only where you're upgrading; register it globally to use it across repositories. A project-scoped config is the tighter default here, because the upgrader additionally refuses to run outside a linked Git worktree you created yourself (see [Safety model](#safety-model)).

While developing a local checkout, point at the directory instead:

```json
{ "plugin": ["file:///absolute/path/to/opencode-ruby-upgrader"] }
```

OpenCode installs npm plugins automatically at startup and caches them in `~/.cache/opencode/node_modules/`, so there is no separate install step.

### 3. Restart and confirm

Restart OpenCode, then run `opencode` in the worktree you want to upgrade and type `/ruby-upgrade` — or `@ruby-upgrade` to select the agent directly.

## Requirements

OpenCode with plugin support, Node `>=22.5.0`, and Git `>=2.5` for the linked-worktree safety model. Docker is optional and only needed when your host cannot run the Ruby version being tested (see [Security boundaries](#security-boundaries)).

The automatic validation adapters currently recognize Bundler projects using Rails, RSpec, or Minitest. Other stacks still receive a full inventory and research, but need a user-supplied validation command.

The package also installs an `opencode-ruby-upgrader` command. Most of its subcommands are driven by the agent itself; the two you run directly are `dashboard` and `resume`.

npm `>=11` is recommended for contributors and for publishing: npm 11 added the install-script approval gate this repository's release path relies on. It is not required to install or run the package, which ships no install scripts and no runtime dependencies.

## Quick start

From a checkout of the project you want to upgrade (shown with `main` as the default branch):

```bash
# 1. Declare your default branch (the agent fails closed without this — it never guesses)
git config opencode-ruby-upgrader.defaultBranch main

# 2. Create the linked worktree the agent is allowed to work in
#    (replace <target> with the Ruby version you're upgrading to, e.g. 3.4)
git branch ruby-upgrade/ruby-<target>
git worktree add ../<repo>-ruby-<target> ruby-upgrade/ruby-<target>

# 3. Launch OpenCode from that worktree and start the migration
cd ../<repo>-ruby-<target>
opencode
```

Then run `/ruby-upgrade` (or add `--dry-run` to get a no-write assessment first). The agent inventories the project, researches an official-source compatibility ladder, and proposes each validated hop as a local checkpoint commit for your review. See [Safety model](#safety-model) for what it will and will not do automatically.

| Step | Who does it | Result |
|---|---|---|
| Set up worktree + config | You | Linked worktree, agent-ready |
| `/ruby-upgrade` | Agent | Inventories, researches, plans ladder |
| Validate a hop | Agent + Docker | Isolated `bundle exec rspec`, receipt recorded |
| Commit a hop | Agent proposes, **you approve** | Local checkpoint commit with receipt digest |
| Repeat | Loop | One minor series per hop |
| Review & push | **You** | `git log`/dashboard then push the validated branch |

## Before you run it

Three flags bound how much a single run can change.

Use `/ruby-upgrade --dry-run` for a no-write inventory and proposed migration assessment; it creates no report, lock, checkpoint, or durable research evidence. Use `/ruby-upgrade --target <version>` (for example `/ruby-upgrade --target 3.4`) to pin an explicit final Ruby version, or `/ruby-upgrade --stop-after-hop` to validate and commit one hop before stopping.

## Validated end-to-end run

The agent has completed a real end-to-end migration against a public fixture: [`ruby2-rails4-bootstrap-heroku`](https://github.com/lilla021/ruby2-rails4-bootstrap-heroku) (BSD-2-Clause) moved from **Ruby 2.4.10 / Rails 4.2.11.3** to **Ruby 3.4.10 / Rails 7.1.6** across 15 receipt-backed hops. Every hop was validated by `bundle exec rspec` in an isolated Docker container, then committed as a local checkpoint before the next hop began.

- [Upgrade pull request](https://github.com/lilla021/ruby2-rails4-bootstrap-heroku/pull/1) — the full migration: 19 commits, one per reviewed step, with lint and spec checks currently passing on GitHub Actions.
- [Evidence ledger](https://github.com/lilla021/opencode-ruby-upgrader/blob/v0.1.6/E2E_EVIDENCE.md) — every hop's validation receipt, commit SHA, and the fixes the migration required.

This proves the workflow works on a genuinely old, real-world Rails stack. It does not claim every upgrade is safe — see [Safety model](#safety-model) for what the agent refuses to do without you, and [Product limits](#product-limits) for what it cannot prove.

## Safety model

The agent runs durable migrations **only** from a linked Git worktree created by the user. Before starting, explicitly configure the repository default branch with `git config opencode-ruby-upgrader.defaultBranch main` (replace `main` as needed) — see [Quick start](#quick-start) for the three setup commands, which the agent also shows verbatim if you invoke it from a primary checkout. The upgrader fails closed if this configuration is absent and never guesses `main`, `master`, or a remote default. This keeps your normal checkout free for other work. Non-Git projects support dry-run inventory only.

The agent never:

- creates, switches, deletes, merges, pushes, or reconfigures branches or remotes
- publishes or deploys anything
- runs destructive database commands

After every routine Ruby minor-version hop with passing validation, the agent proposes a **local** checkpoint commit through a guarded commit gate and OpenCode asks for confirmation. The gate verifies the linked worktree and non-default branch, exact expected Git history, an empty initial staging area, a complete passing report iteration, and scans staged content for likely credentials. It cannot push, fetch, alter remotes, switch branches, merge, rebase, reset, or amend history. You can review and push any validated checkpoint; a run becomes `complete` only once it reaches its pinned target.

The agent pauses—not guesses—when a migration involves data changes, authentication/authorization, payments, secrets, production configuration, framework-major upgrades, private dependencies, native extensions, or failed validation. Each pause includes evidence and practical options for continuing safely.

Every hop declares its expected changed files before commit. The commit gate blocks undeclared changes, credential-like material, executable Git hooks, non-RubyGems dependency sources, and large lockfile churn unless the user has explicitly reviewed and permitted that specific concern. Any changed lockfile also requires a recorded compatibility and license review. The target Ruby version is pinned with the research timestamp at run start, so a new upstream release cannot silently change the target mid-run. If Git author or commit-signing configuration prevents a commit, the agent reports the exact local setup issue and stops; it never changes Git configuration for you.

## Security boundaries

The agent defaults unknown shell commands to an OpenCode confirmation prompt. Git inspection is allowed, while direct Git mutation, GitHub CLI, publishing, and shell chaining/pipes/substitutions are denied. Dependency installation/updates, recognized tests, state writes, `commit-hop`, and `commit-rails-hop` require confirmation. This protects against accidental agent actions, not malicious project code: dependency installation and tests execute project-controlled code with your local user permissions. Use an isolated environment for repositories you do not trust, and review any command OpenCode asks you to approve.

New reports require `record-executed-iteration --validation <id>` or `record-executed-rails-iteration --validation <test-id>`; asserted results cannot be recorded or committed. The accepted IDs map to fixed no-shell commands: `bundle-rspec`, `bundle-rails-test`, `bundle-rake-test`, `bin-rails-test`, and, for Rails bridges, `rails-app-update`. When the target Ruby is unavailable on your host, the agent runs `prepare-target-runtime --ruby <x.y.z>` after selecting the exact target patch release. One confirmation provisions labeled per-run Ruby and isolated database Docker resources, installs Node, installs Bundler 2.4.22, runs `bundle install`, and, for Rails, creates the isolated test database.

The isolated test database is PostgreSQL by default. If the project declares MySQL through `mysql2` and not PostgreSQL, the runtime is prepared with an isolated MySQL 8.4 server instead. Detection reads declarations rather than incidental words: an `adapter:` line in `config/database.yml`, a `gem "mysql2"` / `gem "pg"` line, a resolved spec in `Gemfile.lock`, or a driver URL. `config/database.yml` wins over gem declarations, because a gem line only says a driver is *available* while the YAML says what the app connects to — so a PostgreSQL project that keeps `gem "mysql2"` for an unrelated import tool still resolves to PostgreSQL. The legacy `mysql` and `trilogy` gems are not recognized, and a project that declares both engines stops preparation and asks you to choose:

```bash
opencode-ruby-upgrader prepare-target-runtime --ruby <x.y.z> --database mysql
```

Both engines run credential-free on a per-run Docker network that carries two ownership labels: the run ID and a SHA-256 hash of the worktree path. Validation compares those labels against a freshly computed hash of the current worktree, so ownership is asserted against the live containers rather than trusted from a file — a copied manifest cannot vouch for another worktree's resources. The hash stays on the Docker labels and is never written into `.ruby-upgrades/`, which means committing your upgrade evidence does not publish a guessable fingerprint of your filesystem path. A network, container, or manifest belonging to a different run or worktree is refused rather than reused, so a second worktree cannot reach, reuse, or delete another worktree's database.

Prepared resources are labelled and bound to the worktree, and validation refuses to use them if they carry extra network attachments, published ports, privileged mode, unexpected mounts or commands, or a drifted image. Docker resources are not removed automatically when a run finishes — they persist so later runs stay reproducible. When you no longer need them, remove the run's containers and network by name and delete `.ruby-upgrades/runtime.json`; the names are recorded in that manifest.

It writes nonsecret `.ruby-upgrades/runtime.json` with the run and worktree binding, the selected engine and container names, both resolved image IDs, and preparation digests; raw output, `DATABASE_URL`, and your local path are never persisted. `docker-bundle-rspec` reuses and verifies that manifest — including that it belongs to the run receiving the receipt, the exact requested Ruby execution, the exact requested database image, and the isolated network — before executing the fixed `docker exec --env DATABASE_CLEANER_ALLOW_REMOTE_DATABASE_URL=true <container> bundle exec rspec`. The safeguard override is scoped to the verified isolated test process; no container name, report path, or environment value is needed from the user.

Receipts persist only an output digest and byte count, plus structured test metrics; raw validation output is deliberately not committed. Docker receipts additionally record the run identity, container IDs, image IDs, and network ID that produced them, so evidence cannot be silently re-pointed at another run or engine. Each receipt also binds to a non-evidence working-tree fingerprint, which the commit gate rechecks after final validation. A checkpoint commit carries the receipt digest.

This is tamper-evident provenance for a committed report, not protection against the same local user rewriting both evidence and Git history.

## Evidence and dashboard

Every run has a generated JSON record and Markdown companion under `.ruby-upgrades/runs/`. Reports contain citations, version hops, dependency and code fixes, test/coverage metrics, smoke-test evidence, risks, and approved local commits. The directory is intentionally versionable and can be opened directly as an Obsidian vault.

As an example, here is one such run rendered in the dashboard — per-hop summaries, test metrics, and citation links. The full process and per-hop detail live in the run reports themselves:

![Example of the local evidence dashboard](https://raw.githubusercontent.com/lilla021/opencode-ruby-upgrader/v0.1.6/docs/dashboard.png)

The same reports open as a vault — each run is a Markdown note paired with its JSON record:

![Example vault view: run reports as paired Markdown and JSON notes](https://raw.githubusercontent.com/lilla021/opencode-ruby-upgrader/v0.1.6/docs/vault.png)

Launch the local-only dashboard from the repository worktree:

```bash
npx opencode-ruby-upgrader dashboard
```

It binds exclusively to `127.0.0.1` on an ephemeral port and remains in the foreground until you stop it with Ctrl-C. The read-only dashboard displays valid Ruby and Rails-bridge reports plus locally discoverable checkpoint commits; it never changes reports, Git state, or uploads code.

The dashboard identifies local checkpoint commits from trailers embedded in those commits. Before the final push, inspect them locally with `git log`, `git show`, and the dashboard; after you push, the same individual commits are available for GitHub review.

## Recovery

Each active run holds a local lock. To stop for review or manual work, transition it to `paused`; that releases the lock without marking the migration complete. Resume the existing report rather than starting a second migration:

```bash
opencode-ruby-upgrader resume --report .ruby-upgrades/runs/<run>.json
```

`complete`, `blocked`, and `paused` runs release their lock. For other blockers, inspect the report and use the documented transition/resume path.

If a resolved Rails version blocks the next Ruby hop, that Ruby run becomes terminal and a separate Rails-bridge run takes over. See the [Rails bridge lifecycle](https://github.com/lilla021/opencode-ruby-upgrader/blob/v0.1.6/docs/rails-bridge.md) reference.

To undo a completed hop, use the reviewable local history: `git revert <hop-sha>`. Do not use reset, rebase, or force-push as routine migration recovery.

## Troubleshooting

### If `/ruby-upgrade` isn't offered

The plugin didn't load. Check that your config file still parses — a stray comma breaks the whole file, not just this plugin — and restart OpenCode.

### If you see `EBADENGINE`

`EBADENGINE` is a warning, not a failure: npm still completes the install. It appears when your Node is older than the `>=22.5.0` floor in [Requirements](#requirements), which exists because Node 18 is end-of-life and this agent runs your project's dependency install and test commands.

To clear it, upgrade Node and reinstall:

```bash
node -v              # confirm >= 22.5.0
npm i opencode-ruby-upgrader
```

Upgrading npm alone cannot fix it. Current npm releases require a recent Node themselves, so npm refuses to install over an older Node. If `engine-strict=true` is set in your npm config, the warning becomes a hard error and the install fails until Node is upgraded.

### Uninstalling

Remove `"opencode-ruby-upgrader"` from your config's `plugin` array and restart OpenCode. Your `.ruby-upgrades/` reports and any checkpoint commits are ordinary local files and Git history — nothing else to clean up.

## Product limits

The upgrader automates evidence collection and compatibility-oriented edits; it cannot prove production behavior, security correctness, deployment safety, or semantic equivalence. It intentionally pauses instead of modifying database behavior, authorization, payments, secrets, and production configuration without a user decision.

The credential scanner is heuristic: it recognizes common token formats and quoted credential-like assignments, but may miss other forms such as arbitrary unquoted YAML values. Run reports are local mutable JSON evidence, so their integrity is bounded by the user and local filesystem permissions rather than a tamper-proof store. Credential-bearing source URLs are redacted from supply-chain evidence. Gemfile source detection is static and may not resolve dynamically computed sources; review those manually and explicitly approve private sources.

## Privacy

No telemetry, no analytics, and no report uploads. Migration evidence is written only under `.ruby-upgrades/` in the current worktree — run reports under `.ruby-upgrades/runs/` and nonsecret runtime metadata in `.ruby-upgrades/runtime.json` — and the dashboard binds to `127.0.0.1` only. Reports may contain target versions, branch names, commit SHAs, changed-file names, dependency source origins, citations, and bounded validation metadata — absolute local paths and recognized credentials are redacted, but redaction is best-effort. Prepared Docker containers, networks, and images stay on your machine and are labelled with the run ID and a one-way hash of the worktree path, never the path itself.

Full detail in [PRIVACY.md](https://github.com/lilla021/opencode-ruby-upgrader/blob/v0.1.6/PRIVACY.md). To report a vulnerability, see [SECURITY.md](https://github.com/lilla021/opencode-ruby-upgrader/blob/v0.1.6/SECURITY.md).

## Contributing

Run the self-contained test suite with `npm test`. A CI environment that installs a supported OpenCode CLI can also run `OPENCODE_RUNTIME_E2E=1 npm run test:opencode`; this verifies the installed runtime is available and the plugin registers its agent/command contract before release.

Database-engine changes require real container evidence, not only mocked tests. `npm run test:docker:mysql` builds a throwaway Rails + `mysql2` project, prepares a real `mysql:8.4` runtime, proves the app connects over the isolated network with a passing RSpec example, checks the resulting receipt and that the persisted manifest stays secret-free, and verifies it left no containers, network, or worktree behind. CI runs this on every pull request, and the release workflow runs it again before publishing. It needs a running Docker daemon and network access to pull images.

CI runs that suite against Node 22, 24, and 26 so the declared `engines.node` range is exercised rather than assumed. Both workflows pin `npm@11.16.0` so the matrix varies Node rather than npm, because `allowScripts` — npm 11's dependency install-script approval gate, used here to narrowly permit the pinned `opencode-ai` postinstall — and npm trusted publishing both require npm 11 or newer. `RELEASING.md` covers the publish path.

## Acknowledgments

This agent was built with [opencode-craft](https://github.com/pauloralves/opencode-craft) (MIT, by [Paulo Alves](https://github.com/pauloralves)) — a senior pair-programming, craftsmanship, and knowledge-ledger skill pack for OpenCode. Its review cadence, evidence discipline, and interview-oriented trade-off notes shaped how this project is designed and presented. Thanks also to the community that produces the [official Ruby release](https://www.ruby-lang.org/en/downloads/releases/) and [Rails](https://guides.rubyonrails.org/) documentation this agent cites.

## Disclaimer

**Use at your own risk.** This tool can modify source code, dependency locks, runtime configuration, and local Git history. It provides automated migration assistance only. You are solely responsible for reviewing changes, maintaining backups, validating tests, and approving any deployment or remote push. The authors provide no warranty and accept no liability for data loss, downtime, broken builds, or other damage arising from its use.

Ruby, Rails, GitHub, and Obsidian are trademarks of their respective owners. The agent cites official documentation and does not redistribute it.

# opencode-ruby-upgrader

An evidence-driven Ruby and Rails migration agent for [OpenCode](https://opencode.ai). It upgrades a project one Ruby minor series at a time toward a researched latest-stable or explicitly pinned Ruby target, researches compatibility guidance, updates affected code and dependencies, and leaves a reviewable migration trail.

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

> Requires Git 2.5+ (linked-worktree safety model) and Docker for the isolated validation container when your host cannot run the Ruby version being tested (see [Security boundaries](#security-boundaries)).

| Step | Who does it | Result |
|---|---|---|
| Set up worktree + config | You | Linked worktree, agent-ready |
| `/ruby-upgrade` | Agent | Inventories, researches, plans ladder |
| Validate a hop | Agent + Docker | Isolated `bundle exec rspec`, receipt recorded |
| Commit a hop | Agent proposes, **you approve** | Local checkpoint commit with receipt digest |
| Repeat | Loop | One minor series per hop |
| Review & push | **You** | `git log`/dashboard then push the validated branch |

## Proof of work

The agent has completed a real end-to-end migration against a public fixture: [`ruby2-rails4-bootstrap-heroku`](https://github.com/lilla021/ruby2-rails4-bootstrap-heroku) (BSD-2-Clause) moved from **Ruby 2.4.10 / Rails 4.2.11.3** to **Ruby 3.4.10 / Rails 7.1.6** across 15 receipt-backed hops. Every hop was validated by `bundle exec rspec` in an isolated Docker container, then committed as a local checkpoint before the next hop began.

- [Upgrade pull request](https://github.com/lilla021/ruby2-rails4-bootstrap-heroku/pull/1) — the full migration: 19 commits, one per reviewed step, with lint and spec checks currently passing on GitHub Actions.
- [Evidence ledger](E2E_EVIDENCE.md) — every hop's validation receipt, commit SHA, and the fixes the migration required.

This proves the workflow works on a genuinely old, real-world Rails stack. It does not claim every upgrade is safe — see [Product limits](#product-limits).

## Safety model

The agent runs durable migrations **only** from a linked Git worktree created by the user. Before starting, explicitly configure the repository default branch with `git config opencode-ruby-upgrader.defaultBranch main` (replace `main` as needed) — see [Quick start](#quick-start) for the three setup commands, which the agent also shows verbatim if you invoke it from a primary checkout. The upgrader fails closed if this configuration is absent and never guesses `main`, `master`, or a remote default. This keeps your normal checkout free for other work. Non-Git projects support dry-run inventory only. The agent never creates, switches, deletes, merges, pushes, or reconfigures branches/remotes. It also never publishes, deploys, or runs destructive database commands.

After every routine Ruby minor-version hop with passing validation, the agent proposes a **local** checkpoint commit through a guarded commit gate and OpenCode asks for confirmation. The gate verifies the linked worktree and non-default branch, exact expected Git history, an empty initial staging area, a complete passing report iteration, and scans staged content for likely credentials. It cannot push, fetch, alter remotes, switch branches, merge, rebase, reset, or amend history. You can review and push any validated checkpoint; a run becomes `complete` only once it reaches its pinned target.

The agent pauses—not guesses—when a migration involves data changes, authentication/authorization, payments, secrets, production configuration, framework-major upgrades, private dependencies, native extensions, or failed validation. Each pause includes evidence and practical options for continuing safely.

Every hop declares its expected changed files before commit. The commit gate blocks undeclared changes, credential-like material, executable Git hooks, non-RubyGems dependency sources, and large lockfile churn unless the user has explicitly reviewed and permitted that specific concern. Any changed lockfile also requires a recorded compatibility and license review. The target Ruby version is pinned with the research timestamp at run start, so a new upstream release cannot silently change the target mid-run. If Git author or commit-signing configuration prevents a commit, the agent reports the exact local setup issue and stops; it never changes Git configuration for you.

## Install

During development:

```json
{ "plugin": ["file:///absolute/path/to/opencode-ruby-upgrader"] }
```

After publishing:

```json
{ "plugin": ["opencode-ruby-upgrader"] }
```

Restart OpenCode, then run `/ruby-upgrade` or select `@ruby-upgrade`.

Git 2.5 or newer is required for the linked-worktree safety model.

## Evidence and dashboard

Every run has a generated JSON record and Markdown companion under `.ruby-upgrades/runs/`. Reports contain citations, version hops, dependency and code fixes, test/coverage metrics, smoke-test evidence, risks, and approved local commits. The directory is intentionally versionable and can be opened directly as an Obsidian vault.

As an example, here is one such run rendered in the dashboard — per-hop summaries, test metrics, and citation links. The full process and per-hop detail live in the run reports themselves:

![Example of the local evidence dashboard](docs/dashboard.png)

The same reports open as a vault — each run is a Markdown note paired with its JSON record:

![Example vault view: run reports as paired Markdown and JSON notes](docs/vault.png)

Launch the local-only dashboard from the repository worktree:

```bash
npx opencode-ruby-upgrader dashboard
```

It binds exclusively to `127.0.0.1` on an ephemeral port and remains in the foreground until you stop it with Ctrl-C. The read-only dashboard displays valid Ruby and Rails-bridge reports plus locally discoverable checkpoint commits; it never changes reports, Git state, or uploads code.

The dashboard identifies local checkpoint commits from trailers embedded in those commits. Before the final push, inspect them locally with `git log`, `git show`, and the dashboard; after you push, the same individual commits are available for GitHub review.

## Controls and recovery

Use `/ruby-upgrade --dry-run` for a no-write inventory and proposed migration assessment; it creates no report, lock, checkpoint, or durable research evidence. Use `/ruby-upgrade --target <version>` (for example `/ruby-upgrade --target 3.4`) to pin an explicit final Ruby version, or `/ruby-upgrade --stop-after-hop` to validate and commit one hop before stopping.

Each active run holds a local lock. To stop for review or manual work, transition it to `paused`; that releases the lock without marking the migration complete. Resume the existing report rather than starting a second migration:

```bash
opencode-ruby-upgrader resume --report .ruby-upgrades/runs/<run>.json
```

`complete`, `blocked`, and `paused` runs release their lock. For other blockers, inspect the report and use the documented transition/resume path. To undo a completed hop, use the reviewable local history: `git revert <hop-sha>`. Do not use reset, rebase, or force-push as routine migration recovery.

If a resolved Rails version blocks the next Ruby hop, record the user-approved bridge, then transition the Ruby run to `blocked`. That Ruby report is terminal: complete the linked Rails lifecycle and start a fresh Ruby run. Every Rails iteration executes `bin/rails app:update` first, records its receipt, reviews that exact working-tree fingerprint, and only then runs final tests. Validate and checkpoint each one with `commit-rails-hop`.

## Security boundaries

The agent defaults unknown shell commands to an OpenCode confirmation prompt. Git inspection is allowed, while direct Git mutation, GitHub CLI, publishing, and shell chaining/pipes/substitutions are denied. Dependency installation/updates, recognized tests, state writes, `commit-hop`, and `commit-rails-hop` require confirmation. This protects against accidental agent actions, not malicious project code: dependency installation and tests execute project-controlled code with your local user permissions. Use an isolated environment for repositories you do not trust, and review any command OpenCode asks you to approve.

New reports require `record-executed-iteration --validation <id>` or `record-executed-rails-iteration --validation <test-id>`; asserted results cannot be recorded or committed. The accepted IDs map to fixed no-shell commands: `bundle-rspec`, `bundle-rails-test`, `bundle-rake-test`, `bin-rails-test`, and, for Rails bridges, `rails-app-update`. When the target Ruby is unavailable on your host, the agent runs `prepare-target-runtime --ruby <x.y.z>` after selecting the exact target patch release. One confirmation provisions labeled per-run Ruby and isolated PostgreSQL Docker resources, installs Node, installs Bundler 2.4.22, runs `bundle install`, and, for Rails, creates the isolated test database.

It writes nonsecret `.ruby-upgrades/runtime.json` with only safe preparation digests and the resolved image ID; raw output and `DATABASE_URL` are never persisted. `docker-bundle-rspec` reuses and verifies that manifest, including the exact requested Ruby execution and resolved image ID, before executing the fixed `docker exec --env DATABASE_CLEANER_ALLOW_REMOTE_DATABASE_URL=true <container> bundle exec rspec`. The safeguard override is scoped to the verified isolated test process; no container name, report path, or environment value is needed from the user. Receipts persist only an output digest and byte count, plus structured test metrics; raw validation output is deliberately not committed. Each receipt also binds to a non-evidence working-tree fingerprint, which the commit gate rechecks after final validation. A checkpoint commit carries the receipt digest. This is tamper-evident provenance for a committed report, not protection against the same local user rewriting both evidence and Git history.

## Product limits

The upgrader automates evidence collection and compatibility-oriented edits; it cannot prove production behavior, security correctness, deployment safety, or semantic equivalence. It intentionally pauses instead of modifying database behavior, authorization, payments, secrets, and production configuration without a user decision. Supported automatic adapters currently recognize Bundler projects using Rails, RSpec, or Minitest; other stacks receive an inventory and require a user-supplied validation command.

The credential scanner is heuristic: it recognizes common token formats and quoted credential-like assignments, but may miss other forms such as arbitrary unquoted YAML values. Run reports are local mutable JSON evidence, so their integrity is bounded by the user and local filesystem permissions rather than a tamper-proof store. Credential-bearing source URLs are redacted from supply-chain evidence. Gemfile source detection is static and may not resolve dynamically computed sources; review those manually and explicitly approve private sources.

Run the self-contained test suite with `npm test`. A CI environment that installs a supported OpenCode CLI can also run `OPENCODE_RUNTIME_E2E=1 npm run test:opencode`; this verifies the installed runtime is available and the plugin registers its agent/command contract before release.

## Acknowledgments

This agent was built with [opencode-craft](https://github.com/pauloralves/opencode-craft) (MIT, by [Paulo Alves](https://github.com/pauloralves)) — a senior pair-programming, craftsmanship, and knowledge-ledger skill pack for OpenCode. Its review cadence, evidence discipline, and interview-oriented trade-off notes shaped how this project is designed and presented. Thanks also to the community that produces the [official Ruby release](https://www.ruby-lang.org/en/downloads/releases/) and [Rails](https://guides.rubyonrails.org/) documentation this agent cites.

## Disclaimer

**Use at your own risk.** This tool can modify source code, dependency locks, runtime configuration, and local Git history. It provides automated migration assistance only. You are solely responsible for reviewing changes, maintaining backups, validating tests, and approving any deployment or remote push. The authors provide no warranty and accept no liability for data loss, downtime, broken builds, or other damage arising from its use.

Ruby, Rails, GitHub, and Obsidian are trademarks of their respective owners. The agent cites official documentation and does not redistribute it.

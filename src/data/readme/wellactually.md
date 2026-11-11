<p align="center">
  <img src="assets/illustration-dark.png#gh-dark-mode-only" width="420" alt="An experienced developer raises one finger over the shoulder of a coding robot">
  <img src="assets/illustration-light.png#gh-light-mode-only" width="420" alt="An experienced developer raises one finger over the shoulder of a coding robot">
</p>

<h1 align="center">Well Actually</h1>

<p align="center">
  Experts correct LLMs:<br>
  <em>"Well actually, there's a better way to do this in [insert technology]."</em>
</p>

Your coding agent is a capable generalist.
It has not spent years in your framework, your niche or closed source enterprise software.
Well Actually brings what the experts there have learned into your agent.

Principles are not hard rules like a linter's.
They are advice, like an expert glancing over a diff who has seen a pattern go wrong twenty times: it is most likely wrong again, and there is a better way.
Your agent hears it and decides.

A principle is advice plus a detector.
The detector looks at what your agent just did, and when it finds something, the agent reads the advice.
Unlike a rules file, nothing sits in your agent's context up front: advice only enters it when it applies.
Anyone can publish principles on [the Well Actually registry](https://wellactually.dev), and you choose whose principles sit on your advisory board.

## Install

The plugin needs [Node](https://nodejs.org) 20 or newer. Use the latest LTS release; Node 20 is retained for compatibility but has reached end of life.
Check with `node --version` before you install it, because without Node no principle reaches your agent.

Claude Code:

```text
/plugin marketplace add passsy/wellactually
/plugin install wellactually@wellactually
/wellactually:login
```

The last line connects this machine to your advisory board and downloads it.

Claude Code leaves auto-update off for marketplaces outside Anthropic's own.
To get new releases of the plugin, type `/plugin`, open the Marketplaces tab, select `wellactually` and choose Enable auto-update.

Codex:

```bash
codex plugin marketplace add passsy/wellactually
```

```bash
codex plugin add wellactually@wellactually
```

Then open Codex, type `/hooks` and press `t` to trust the plugin's hooks, then type `$wellactually:login`.
Codex does not run a new plugin's hooks until you trust them, so no principle reaches the agent before that.

OpenCode:

```bash
opencode plugin add wellactually
```

Then open OpenCode and type `@wellactually-login`.
`opencode plugin add` needs OpenCode 2.
OpenCode 1 from version 1.18.29 runs the plugin too, from a clone of this repository, as [the install guide](https://wellactually.dev/docs/getting-started/install#opencode) shows, and there the skill is `/wellactually-login`.

pi:

```bash
pi install npm:wellactually
```

Then open pi and type `/skill:wellactually-login`.

### CI and cloud agents

A CI runner or a cloud agent starts on a fresh machine every run, where nobody can confirm a login code.
Create a token on [your advisory board](https://wellactually.dev/advisory-board) under connected machines, and store it as the secret `WELLACTUALLY_TOKEN` where the agent runs.
The plugin and the `wellactually` command then sign in with it and never write it to disk.
Run `wellactually sync`, or the plugin's sync skill, at the start of the run, so the advisory board is there before the agent works.
Ratings the agent gives reach the experts as they do from your own machine.
Revoke the token on the website to stop it.

When a newer release of the plugin is out, it tells you at the start of a session, at most once a day, with the command that updates it in your agent.
Set `WELLACTUALLY_UPDATE_CHECK=0` to turn that off.

## What it does on your machine

- When your agent writes or reads a file, gets a prompt or is about to run a shell command, a hook shows that one input to the detectors on your advisory board.
- A detector that finds something puts its expert's advice in front of the agent, once per session in full and as a pointer after that.
- The hook never uses the network.
  It reads the principles `sync` downloaded earlier.
- `sync` runs when a session starts.
  It downloads what is new on your advisory board and reports counts, see "What leaves your machine".
- Once a day, in the background, it checks the published npm release for updates.

## Detectors are other people's code

So they are contained.

- A detector runs in a QuickJS WebAssembly isolate.
  It gets its input as JSON and returns findings as JSON.
  There is no network and no process inside.
- It can read text files on your machine and cannot change any.
  Without a network there is nowhere to send them, and the next point keeps them out of your agent's context.
- It has 100 ms and 32 MB.
  One that exceeds either is stopped and reported, and your agent carries on.
- Whatever a detector reports must occur word for word in its input, or the finding is dropped.
  A detector cannot compose text for your agent at runtime.
- Each download is checked against its content hash before it is stored.
- Updates to principles are automatic.
  What an expert on your advisory board releases runs from your next sync, so follow the experts you trust.
  You can switch off any single principle, or unfollow the expert.

The code that does this is public: [`packages/core/src/detector/sandbox.ts`](packages/core/src/detector/sandbox.ts) is the isolate, and [`packages/cli/src/board/board.ts`](packages/cli/src/board/board.ts) runs an advisory board.

## What leaves your machine

- How often each principle fired: a day, a hash and a count.
- A rating, when your agent gives one: the principle's hash and `up`, `down` or `not_applicable`.
- Review selections, suggestions and completed fixes: the principle and pinned
  revision, event time, an opaque deduplication ID, and priority for suggestions
  and fixes. Reviews do not send helpfulness ratings.

No path, file content, prompt, command or finding is sent.
The daily update check fetches public npm metadata without sending project data.
Ask your agent to switch reporting off, and it turns these reports off.

## Review a change

The `review` skill checks changes, files, folders and projects against your advisory board, including principles without detectors. Git is optional.
Read-only reviewers work through queues of applicable principles. An aggregator
merges duplicate findings into one finding with multiple occurrences. Proof
workers then investigate the findings in isolated worktrees. The report states
coverage, executable proof and limitations; a finding need not have a test to
be useful.

Run `/wellactually:review` in Claude Code or `$wellactually:review` in Codex with a synced advisory board.
Reviews use subagents where supported.
The findings inbox keeps your accept, reject, note and fixed decisions locally.
Posting accepted findings to the PR is a separate explicit action.

All four hosts install the same prebuilt npm package. The marketplace pins a
published version; installation does not build source or run lifecycle scripts.
Existing OpenCode/pi Git install sources remain supported through small adapters
that depend on that same npm package. [Release process](docs/releasing-review.md).

## Write a principle

A principle is a directory, and its name is the principle's id:

```text
avoid-late/
  principle.md      the advice: a heading, one sentence of summary, then the rest
  detector.ts       a handler per event it reacts to: onWrite, onRead, onDelete, onPrompt, onCommand, onOutput
  detector.test.ts  the tests: what the detector reports for an event
```

A detector reads `onWrite({ globs: ["**/*.dart"], *detect(event) { ... yield { line: written.line }; } })`.
A test reads `expect(detect(write("lib/user.dart", code))).toEqual([{ line: 2 }])`.
The tests must pass, make the detector fire at least once, and show it staying quiet at least once.
[Pascal's principles](https://wellactually.dev/e/passsy) on the registry are examples to read.

Write one in the browser on [wellactually.dev](https://wellactually.dev/studio/new), with nothing installed, or ask your agent.
The plugin gives it tools to create a principle, run its tests, try it on a file, probe a repository and publish it.
Building a principle needs esbuild, which the plugin does not carry, so install the SDK in the repository that holds your principles, which brings it:

```bash
npm install --save-dev github:passsy/wellactually#sdk vitest
```

`npm test` then runs the principles' tests with vitest.

A detector may import `@wellactually/sdk/v4`, which is in `packages/sdk`, its own files, and packages from npm that its `package.json` names.
The `v4` is the detector API version it is written against.
Version 4 added the lines a write removed, `event.removed`, and `onDelete` for a deleted file.
A principle written against `v3` keeps running as it was.

## What is in here

| Path              | What it is                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- |
| `hooks`, `skills` | The plugin: when the hook runs, and the skills such as `login`, `sync` and `audit`.   |
| `dist`            | Ignored development build output; install payloads are published to npm.             |
| `opencode`        | Compatibility adapters for existing Git installs, loading the npm runtime.           |
| `packages/core`   | Builds, checks and runs principles: the isolate, the bundler and the tests.           |
| `packages/sdk`    | The types and helpers a detector may import.                                          |
| `packages/cli`    | The command the plugin runs: the hook, the advisory board and the MCP server.         |
| `evaluator`       | Checks with real agents that the framing around advice moves them the right way.      |
| `scripts`         | Builds `dist` and `opencode`, sets the version of a release, writes the `sdk` branch. |

The registry is not in this repository.

## Build it yourself

Development tooling needs Node >=22.18. The prebuilt product supports Node >=20.
CI builds on the latest LTS and checks the package on Node 20.0.0, the latest
Node 22 and 24 releases, and the latest stable Node release. Host applications
may impose a higher Node requirement of their own.

```bash
npm ci --ignore-scripts
npm run build
npm test
npm run package
npm run test:package
```

The local runtime goes in ignored `dist/`. The installable package goes in
ignored `.artifacts/`. Generated bundles and mirrored skills are not committed.
CI builds and exercises the packed archive outside the checkout.

## Test a local plugin build

```bash
npm run install:local -- --host codex
# or --host claude / --host all
```

This builds a private local tarball and switches the selected host to it. Use
`npm run package:local` to prepare it without changing host configuration.
See [local testing and restoring npm installs](docs/releasing-review.md#local-testing-without-publishing).

## Release

Build and test a new exact version with `npm run package -- --version <version>`.
The manual `publish.yaml` workflow can publish the tested tarball using npm trusted
publishing. Verify registry availability and integrity before promoting installer
pointers with `node scripts/version.mjs <published-version>`, refreshing the lockfile
and committing the source changes. See [the release process](docs/releasing-review.md).

The SDK is released to the `sdk` branch, from a checkout of it next to this one:

```bash
git worktree add ../wellactually-sdk sdk
```

```bash
node scripts/release-sdk.mjs ../wellactually-sdk
```

Then commit it there as `Release 0.9.29` and push the `sdk` branch.

## License

[Apache License 2.0](LICENSE)

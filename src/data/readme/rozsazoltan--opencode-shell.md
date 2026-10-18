# opencode-shell

Minimal OpenCode V2 plugin that automatically applies [mise](https://github.com/jdx/mise) project environments to native shell execution and optionally rewrites supported commands with [RTK](https://github.com/rtk-ai/rtk).

## Install

Install [mise](https://github.com/jdx/mise) and, optionally, RTK:

```sh
mise use -g rtk@latest
```

Then add the plugin to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@rozsazoltan/opencode-shell"]
}
```

Mise and RTK work independently: without mise the existing environment is kept; without RTK commands are not rewritten. RTK must be available on the server's managed `PATH`. Set `RTK_DISABLED=1` to bypass rewriting.

Shell activation is not required, including in Desktop. Before each supported shell command, the plugin runs `mise env --json` for that command's cwd with its inherited environment, then resolves RTK using the enriched environment. Nothing is cached or assigned to global `process.env`. If mise is not on PATH, Unix hosts also try the [official installer's](https://mise.jdx.dev/getting-started.html) fixed `~/.local/bin/mise` location. Windows requires mise on the server PATH: package-manager-specific paths are not guessed. No shell profiles are sourced or tools automatically installed.

## Diagnostics

Diagnostics are silent by default. To opt in to sanitized JSON console records, use:

```json
{
  "plugins": [{ "package": "@rozsazoltan/opencode-shell", "options": { "debug": true } }]
}
```

For visible tool output, ask the OpenCode agent: **“Invoke the `opencode_shell_diagnostics` tool with `{}` and show its diagnostic report.”** This no-argument tool returns the report as text through OpenCode's normal tool-result API, even with debug disabled. Its permission category is `opencode_shell_diagnostics`; normal host permissions still apply. It does not grant or bypass permissions.

The slash command `/opencode-shell-diagnostics` submits a request asking the agent to invoke `opencode_shell_diagnostics`, display its full report unchanged, then briefly conclude whether mise environment loading and RTK availability/rewriting work, distinguishing observed results from unmeasured command execution and RTK gain/tracking without additional investigation. It starts the normal agent/tool flow, including an LLM call and the tool's normal host permission checks. The command itself does not generate the report or run diagnostic probes; those run when the agent invokes the tool.

Diagnostics use the same cwd-specific environment-resolution logic at the plugin location, starting from the OpenCode server environment: bounded `mise env --json`, then `mise --version` and `rtk --version` in the managed environment. They do not install tools, approve trust, or execute supplied command arguments. **Environment resolution can run scripts in already trusted mise configurations**, just like the shell hook; only invoke diagnostics in trusted projects. Auto-install and automatic trust confirmation are disabled. Executables on the managed PATH must still be trusted.

The diagnostic location and inherited environment can differ from a shell event's cwd and environment, so this is not an exact replay of the last shell event. The report also includes the last completed hook's sanitized outcomes for this plugin instance (including a denied hook), or `not_observed`. Concurrent hooks report whichever completes last; no commands or environment snapshots are retained.

The RTK version probe now uses the environment after mise, not the unmodified server baseline. The report separately identifies observed RTK availability in the last hook's environment from its numeric rewrite exit code. A skipped rewrite does not measure RTK availability. This last-hook observation is instance-wide, not session-specific. Rewrite `applied` means command text changed; `unchanged` means it did not. Neither proves that OpenCode approved or executed the command, or that RTK recorded token savings: execution and tracking are explicitly `not_measured`.

Debug records contain plugin/OpenCode versions, registration and hook outcomes, fixed skip reasons, and RTK exit codes. They exclude command text, paths, environment values, subprocess output, and raw errors. Logging failures do not affect shell execution. The local dev entrypoint supports the same option and command under the `opencode-shell-dev` ID.

Records are emitted through `console.info`. Host log routing has not been verified for this plugin; do not assume a particular destination. OpenCode's [troubleshooting guide](https://opencode.ai/v2/docs/troubleshooting#read-logs) documents its server logs. Check your host's behavior before relying on capture, and review logs before sharing them.

## Shell behavior

- Use only trusted mise projects: resolving their environment may run scripts before shell permission approval. Mise can add or override variables here, but cannot unset inherited ones (`env.VAR = false`).
- RTK rewrites supported commands; OpenCode checks permissions against the **rewritten command**, which may need separate approval. RTK's allow decision never grants host permission; a deny result stops execution.
- Complex PowerShell commands and unsupported shells are left unchanged.
- RTK supports custom filters in a project's `.rtk/filters.toml` or the user's `~/.config/rtk/filters.toml`. Trust the relevant global and local configuration with `rtk trust`; configuration edits require trusting it again.

## Versions

Find published versions on [npm](https://www.npmjs.com/package/@rozsazoltan/opencode-shell) and changes in [GitHub Releases](https://github.com/rozsazoltan/opencode-shell/releases). Versions follow SemVer.

## Releases

Trigger a release from the **Actions** tab: open the **Release** workflow, choose **Run workflow** on `master`, and select `patch`, `minor`, or `major`. The workflow bumps `package.json` and `package-lock.json` with SemVer, commits them as `chore(release): vX.Y.Z`, pushes the commit and the annotated `vX.Y.Z` tag to `master`, and automatically starts the staging run. npm approval stays manual: approve the staged version at [npm staged packages](https://www.npmjs.com/settings/rozsazoltan/staged-packages). If you decide not to publish a staged version, delete its GitHub Release manually; there is no automatic deletion workflow.

A release is a two-run chain only because npm provenance binds the attestation to the run's commit: the run that stages the package must check out the exact tagged commit, so it cannot also be the run that creates the version commit. The first (prepare) run bumps, commits, tags, and dispatches the second (stage) run, and never stages or publishes; the stage run never bumps, commits, or tags. A run is a prepare run when its `version` input is empty and a stage run when it is set.

The stage run fails closed unless the checked-out commit matches the `vX.Y.Z` tag: it requires a clean tree with `HEAD` equal to the workflow SHA, `origin/master`, and the tag commit, plus a consistent manifest and lockfile. It validates the registry and stages the version with `npm stage publish --provenance --access public --tag latest`. Successful staging creates the GitHub Release immediately, **before npm approval**. Retries never overwrite tags or existing GitHub Releases; the release is created only when it is missing. A reserved npm version is not proof of successful staging, so retrying before approval may fail with a version reservation error, which is not ignored. Once the public npm registry lists the version, the workflow can repair a missing GitHub Release without staging again, or finish without changes when both already exist. If `master` has advanced past the tagged commit, or staging status is uncertain, stop for manual recovery rather than staging different source or bypassing registry errors.

## Contributing

Use Node 24 and npm to install dependencies and run the existing checks:

```sh
npm ci
npm run typecheck
npm test
npm pack --dry-run
```

For local development, this repository's `.opencode/opencode.json` disables the installed `opencode-shell` plugin and loads `src/dev`, which registers the same shell augmentation under the distinct `opencode-shell-dev` ID. The production plugin ID and global configuration remain unchanged.

To test from another project, set `"plugins": ["-opencode-shell", "/absolute/path/opencode-shell/src/dev"]` in its `opencode.jsonc`. In a trusted mise project, add `OPENCODE_SHELL_SMOKE = "one"` under `[env]` and ask the agent to run `printenv OPENCODE_SHELL_SMOKE` with the native shell tool (PowerShell: `$env:OPENCODE_SHELL_SMOKE`). With RTK installed, run `git log -30` the same way, then use `/opencode-shell-diagnostics` to inspect the last hook's rewrite outcome. Compare `rtk gain` before and after execution to check tracking separately.

## License and acknowledgements

AGPL-3.0-or-later: this work is licensed under the GNU Affero General Public License, version 3 or any later version. See [LICENSE](LICENSE).

Thanks to [rtk-ai/rtk](https://github.com/rtk-ai/rtk) for RTK, [jdx/mise](https://github.com/jdx/mise), and [VincentHardouin/opencode-snip](https://github.com/VincentHardouin/opencode-snip) for the original plugin inspiration. [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) contains the original plugin's MIT notice.

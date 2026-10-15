# opencode-shell

Minimal OpenCode V2 plugin that automatically applies [mise](https://github.com/jdx/mise) project environments to native shell execution and optionally filters supported commands with [snip](https://github.com/edouard-claude/snip).

## Install

Install [mise](https://github.com/jdx/mise) and/or [snip](https://github.com/edouard-claude/snip) separately, then add the plugin to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@rozsazoltan/opencode-shell"]
}
```

Mise and snip work independently: without mise the existing environment is kept; without snip commands are not wrapped. Snip is found on the server's PATH or in the server user's `~/bin`.

## What to know

- Use only trusted mise projects: resolving their environment may run scripts before shell permission approval. Mise can add or override variables here, but cannot unset inherited ones (`env.VAR = false`).
- Snip wraps supported commands; OpenCode checks permissions against the **wrapped command**, which may need separate approval. The plugin never grants permissions.
- Complex PowerShell commands and unsupported shells are left unchanged.

## Versions

Find published versions on [npm](https://www.npmjs.com/package/@rozsazoltan/opencode-shell) and changes in [GitHub Releases](https://github.com/rozsazoltan/opencode-shell/releases). Versions follow SemVer.

## Contributing

Use Node 24 and npm to install dependencies and run the existing checks:

```sh
npm ci
npm run typecheck
npm test
npm pack --dry-run
```

For a local OpenCode check, set `"plugins": ["/absolute/path/opencode-shell/src"]` in a test project's `opencode.jsonc`. In a trusted mise project, add `OPENCODE_SHELL_SMOKE = "one"` under `[env]` and ask the agent to run `printenv OPENCODE_SHELL_SMOKE` with the native shell tool (PowerShell: `$env:OPENCODE_SHELL_SMOKE`). With snip installed, run `git log -30` the same way and check for a `snip run --` wrapper and filtered output.

## License and acknowledgements

AGPL-3.0-or-later: this work is licensed under the GNU Affero General Public License, version 3 or any later version. See [LICENSE](LICENSE).

Thanks to [VincentHardouin/opencode-snip](https://github.com/VincentHardouin/opencode-snip), [jdx/mise](https://github.com/jdx/mise), and [edouard-claude/snip](https://github.com/edouard-claude/snip).

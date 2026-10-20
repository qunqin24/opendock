# opencode-shell

Use your [mise](https://github.com/jdx/mise) tools in OpenCode, including Desktop. If [RTK](https://github.com/rtk-ai/rtk) is installed, it also shortens supported command output.

## Install

Install [mise](https://mise.jdx.dev/installing-mise.html). To use RTK too, run:

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

## How it works

1. Before a supported shell command, the plugin loads the mise environment for that command's working directory.
2. If RTK is available in that environment, it rewrites supported commands to reduce output.
3. OpenCode checks permissions before running the rewritten command.

You do not need to activate mise in a terminal first. Missing mise or RTK is fine: the plugin keeps the existing environment or command. It does not install tools, source shell profiles, or change the server's global environment.

Mise must be on the OpenCode server's PATH or at `~/.local/bin/mise` (Unix) / `~\.local\bin\mise.exe` (Windows). Restart the OpenCode service after changing its PATH.

- Set `RTK_DISABLED=1` to turn off rewriting.
- Complex PowerShell commands and unsupported shells stay unchanged.
- Custom RTK filters require `rtk trust`, again after each edit.

## Tools and installation approval

The plugin tells the agent which selected mise tools are installed. The list refreshes on demand after 60 seconds and is supplied again after context compaction. Restarting the service clears it. It describes the plugin's project location, not every session's working directory, and does not guarantee command names or aliases.

Recognized tool installations and installer downloads require approval. Existing permission denies stay in place. The agent is also told to ask first and prefer mise for approved installs. Detection can miss scripts or unusual commands; it is **not a security sandbox**.

**Use trusted projects only.** Loading a trusted mise configuration can run its scripts before shell permission approval, even during diagnostics. Automatic tool installation is disabled.

## Commands

- `/opencode-shell-info` — show the loaded plugin and OpenCode versions.
- `/opencode-shell-diagnostics` — check mise and RTK, show the report, and explain the result briefly.
- `/opencode-shell-inventory` — show the cached tool list and the last list supplied to the agent, without refreshing it.
- `/opencode-shell-check git status` — preview RTK rewriting without running the command. Uses the plugin's working directory and reports the chosen shell. Trusted mise hooks may run; the preview does not grant shell approval.

These commands ask the agent to call the matching tool, so they use an LLM call and normal tool permissions. Diagnostics show environment loading and command rewriting, **not proof of command execution or RTK gain tracking**. The last hook and inventory reports are shared across the plugin instance, not session-specific.

Logging is off by default. To enable debug logs:

```json
{
  "plugins": [{ "package": "@rozsazoltan/opencode-shell", "options": { "debug": true } }]
}
```

Debug logs exclude commands, paths, environment values, and raw errors. Their destination depends on the OpenCode host.

## Releases

Published versions: [npm](https://www.npmjs.com/package/@rozsazoltan/opencode-shell). Changes: [GitHub Releases](https://github.com/rozsazoltan/opencode-shell/releases).

## Contributing

Use Node 24 and npm to install dependencies and run the existing checks:

```sh
npm ci
npm run typecheck
npm test
npm pack --dry-run
```

This repository loads `src/dev` as `opencode-shell-dev` and disables the installed plugin. To use it from another project, set `"plugins": ["-opencode-shell", "/absolute/path/opencode-shell/src/dev"]` in that project's `opencode.jsonc`.

## License and acknowledgements

AGPL-3.0-or-later: this work is licensed under the GNU Affero General Public License, version 3 or any later version. See [LICENSE](LICENSE).

Thanks to [rtk-ai/rtk](https://github.com/rtk-ai/rtk) for RTK, [jdx/mise](https://github.com/jdx/mise), and [VincentHardouin/opencode-snip](https://github.com/VincentHardouin/opencode-snip) for the original plugin inspiration. [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) contains the original plugin's MIT notice.

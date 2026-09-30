# OpenCode TokenScope for v2

TokenScope analyzes token usage, cache activity, context overhead, and cost for OpenCode sessions. This fork uses the native OpenCode v2 plugin API. It was built and exercised with OpenCode **2.0.18** and `@opencode/plugin` **2.0.18**.

The upstream package `@ramtinj95/opencode-tokenscope` targets OpenCode v1. Use this fork's package with OpenCode v2.

## Install globally

Install the plugin with OpenCode v2:

```sh
opencode plugin add @cheesecodestudio/opencode-tokenscope-v2
opencode plugin list
```

OpenCode adds the package to your global configuration and installs it. The package registers both the `tokenscope` tool and `/tokenscope` command; no separate npm global install, `npx` invocation, or command-file copy is needed. OpenCode can reload configuration automatically; if the command does not appear in an already open session, restart OpenCode.

To update or remove the package later:

```sh
opencode plugin update @cheesecodestudio/opencode-tokenscope-v2
opencode plugin remove @cheesecodestudio/opencode-tokenscope-v2
```

If you previously loaded this checkout with a local `plugins` entry, remove that entry before adding the npm package. You can also remove the old copied `~/.config/opencode/commands/tokenscope.md`; the package now registers the command itself.

## Build from source

Prerequisites: OpenCode v2 and Node.js. Bun is needed only for the test suite. From a cloned/downloaded copy of this repository, choose one dependency installation method:

**pnpm (recommended):**

```sh
cd plugin
pnpm install
pnpm run build
```

The pnpm workflow was verified with pnpm 12.6.0. The workspace declines the optional `msgpackr-extract` native build, so no `pnpm approve-builds` step is needed.

**npm:**

```sh
cd plugin
npm install --ignore-scripts
npm run build
```

`--ignore-scripts` skips dependency lifecycle scripts, including the optional native `msgpackr-extract` build. The explicit `npm run build` still runs the plugin's TypeScript build. If your `npm` command prints pnpm-specific output, your shell is routing `npm` through pnpm; use the pnpm commands instead.

**npx, without a global pnpm installation:**

```sh
cd plugin
npx --yes pnpm@12 install
npx --yes pnpm@12 run build
```

This uses npx to run pnpm temporarily. It builds the checkout; it does not register the plugin in OpenCode. The package has no standalone `npx` executable.

After building, add the **plugin directory** to the `plugins` array in your OpenCode v2 config, either in the project or the user config. Keep any other entries. Use an absolute file URL to your checkout:

```jsonc
{
  "plugins": ["file:///absolute/path/to/opencode-tokenscope-v2/plugin"]
}
```

On Windows, use forward slashes and a drive letter, for example `file:///D:/Projects/opencode-tokenscope-v2/plugin`. The directory contains `index.js`, which loads the compiled plugin. Rebuild after source changes. This local installation also registers `/tokenscope` automatically.

Restart OpenCode. From a workspace that loads the config, run `opencode plugin list` and confirm `tokenscope` has a `local` source pointing to this checkout. `opencode plugin check` checks package plugins; it can say “No package plugins found” for a working local directory plugin.

The old v1 `plugin/install.sh` was retired because it installed the incompatible upstream package. Installing the npm package with `npm install -g` or `pnpm add -g` alone does not add it to OpenCode's global plugin configuration; use `opencode plugin add` for that step.

## Use it

Run this in the OpenCode chat whose usage you want to inspect:

```text
/tokenscope
```

The command calls the `tokenscope` tool in the invoking session and reads the exact private report path returned by the tool. The tool can also be called directly:

| Input | Default | Meaning |
| --- | --- | --- |
| `sessionID` | invoking session | Analyze another session by its exact ID. |
| `limitMessages` | `3` | Number of entries shown per category, integer 1 through 10. |
| `includeSubagents` | `true` | Recursively include discovered child sessions. Set `false` to omit them. |

For another session, ask OpenCode to call `tokenscope` with `{"sessionID":"ses_..."}`. The slash command accepts the same request in natural language, for example `/tokenscope analyze session ses_... with includeSubagents false`.

Each invocation writes a unique report in a private directory under the operating system's temporary directory. It does not write a report into your project. If analysis fails, the tool writes a short failure report when possible and keeps the OpenCode session usable.

## Understand the numbers

- **Recorded usage and cost** come from OpenCode's persisted assistant message telemetry. The report shows fresh input, cache reads, cache writes, output, reasoning, completed provider steps, and OpenCode-recorded cost where available. The provider step invoking TokenScope cannot be included until it finishes. For a new session, run the command again after another completed response to see its recorded usage.
- **Retained content** is locally tokenized text from the session context. It is an estimate and differs from provider billing. OpenCode v2's session context can omit compacted or reverted history.
- **Explanatory estimates** cover tool definitions, skills, context, cache savings, and public API-rate cost. Live OpenCode model prices are preferred; bundled `models.json` data and a visibly warned fallback are used when live pricing is unavailable. OpenCode-recorded cost is not necessarily a provider invoice.

The report warns when the session aggregate disagrees with message-derived telemetry or when a model lacks a specific tokenizer. Tokenizers for some models may download from Hugging Face; no session content is uploaded by TokenScope. See the [report reference](docs/report-reference.md) for the accounting details and [v2 migration notes](docs/opencode-v2-migration.md) for the API mapping.

## Configuration

Optional settings live in `~/.config/opencode/tokenscope-config.json`, or `$XDG_CONFIG_HOME/opencode/tokenscope-config.json`. See [plugin/tokenscope-config.json](plugin/tokenscope-config.json) for defaults. The bundled file is used when no user file exists. Set `enableSubagentAnalysis` to `false` to disable child-session analysis globally; the tool's `includeSubagents: false` disables it for one invocation.

## Development

From `plugin/`, run:

```sh
pnpm install
pnpm run typecheck
pnpm run build
pnpm run test:dist
pnpm test
```

`pnpm test` runs Bun tests. The package's ESM export points at `dist/tokenscope.js`; `index.js` is the local directory entrypoint OpenCode loads. Build output, `node_modules`, local reports, and machine-specific config are excluded from Git.

## Publish a release (maintainers)

The npm package lives in `plugin/`. Before each release, update its `version`, review the changes, and push the matching source to this repository. npm does not allow publishing the same package version twice. The account publishing must have access to the `@cheesecodestudio` scope and have [two-factor authentication enabled](https://docs.npmjs.com/configuring-two-factor-authentication/) for an interactive release.

```sh
cd plugin
npm login
npm whoami
npm run typecheck
npm run build
npm pack --dry-run
npm publish --access public
npm view @cheesecodestudio/opencode-tokenscope-v2 version
```

Inspect the `npm pack --dry-run` file list before publishing: it must contain `dist/tokenscope.js`, its library files, `models.json`, `tokenscope-config.json`, `README.md`, and `LICENSE`. `prepublishOnly` rebuilds the package during `npm publish`. A public scoped package needs `--access public`. After publishing, verify the install command above in an OpenCode v2 profile that does not load this checkout locally.

## Troubleshooting

- If `opencode plugin list` does not show `tokenscope`, check the npm package name or, for a source build, the `plugins` key, the absolute **directory** URL, `plugin/index.js`, and `plugin/dist/tokenscope.js`; then restart OpenCode. Run the list command after OpenCode has loaded the workspace.
- If `/tokenscope` is missing, confirm the plugin appears in `opencode plugin list`, remove any old copied command file that shadows it, and restart OpenCode.
- If the report shows no completed provider steps, run it again after the first response has completed. A warning explains missing or mismatched telemetry.
- If tokenization falls back to approximate counts, check the model warning and tokenizer download access. Recorded provider usage remains distinct from those estimates.
- If installation reports `ERR_PNPM_IGNORED_BUILDS`, check `plugin/pnpm-workspace.yaml`: it records `msgpackr-extract: false`, matching the choice to decline that optional native build. Re-run `pnpm install`; no `pnpm approve-builds` step is needed. The JavaScript fallback remains available.
- A report-writing failure is returned inline. Check permission to the operating system's temporary directory.

## Credits / Upstream

OpenCode TokenScope was originally created by [ramtinJ95](https://github.com/ramtinJ95/opencode-tokenscope). This repository is a fork that ports TokenScope to the OpenCode v2 plugin API. The original author is not responsible for maintaining or endorsing this fork. The original project and this fork are distributed under the MIT License; see [LICENSE](LICENSE).

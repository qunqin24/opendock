# OpenCode Lookout

[![CI](https://github.com/sodejm/opencode-lookout/actions/workflows/ci.yml/badge.svg)](https://github.com/sodejm/opencode-lookout/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/opencode-lookout.svg)](https://www.npmjs.com/package/opencode-lookout)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Inspect agents, skills, plugins, commands, providers, and models in
OpenCode's terminal interface. The extension appends a compact section to the
existing sidebar. It does not replace Context or MCP status.
Use OpenCode's native MCP section or `/mcps` for MCP inventory and controls.

Lookout is an independent community extension, not an official OpenCode product.
It uses the public OpenCode **2.2.5** API contract. Use Node.js **26.4.0+** for a full development install;
the offline CLI retains **Node.js 22+** support with production dependencies.
The repository is public under the MIT license. npm publication is a separate,
manually approved release operation. See the support profiles below before using
another CLI version.

Resource controls require the current V2 policy API (OpenCode 2.2.3+). Older or
unidentified hosts show a read-only inventory. Release tests require verified
read-only behavior on 2.2.1–2.2.2 and full controls on newer supported V2 hosts.

## Install

### npm package (v0.1.3)

Install the published package to a dedicated, stable prefix, not into another
application's dependency tree:

```sh
mkdir -p "$HOME/.local/share/opencode-lookout"
npm install --prefix "$HOME/.local/share/opencode-lookout" --save-exact --omit=dev --ignore-scripts opencode-lookout@0.1.3
"$HOME/.local/share/opencode-lookout/node_modules/.bin/lookout" load
"$HOME/.local/share/opencode-lookout/node_modules/.bin/lookout" status
```

Use that same executable for `unload` and `restore --yes`, even when OpenCode
cannot start. The package does not need development dependencies or install
scripts. OpenCode supplies its SDK and Solid/OpenTUI runtime; these are optional
peers, not dependencies installed for the offline CLI. The TUI is precompiled
because OpenTUI does not transform JSX in `node_modules`.

Do not use `npx lookout` or an ephemeral npm-exec install for lifecycle commands:
the owned load entry points to the executable's installed package directory.
Keep that directory until you have restored restrictions and unloaded Lookout.
Before switching from a checkout, use the old checkout's `restore --yes` and
`unload`, then use the new executable's `load`. No personal installation is
migrated automatically.

Direct `opencode plugin add opencode-lookout@...` entries are not owned by the
offline lifecycle CLI. Do not combine them with the marked path entry. To switch,
remove the exact unmarked entry through OpenCode first (and check project configs
for duplicate loads). This release validates the stable-prefix installation,
not recovery from OpenCode's registry cache. See [recovery](#load-or-unload).

### Source checkout

Clone outside OpenCode's automatically discovered `plugins/` directory:

```sh
git clone https://github.com/sodejm/opencode-lookout.git
cd opencode-lookout
npm ci --ignore-scripts
make check
node bin/lookout.mjs load
```

Create your global OpenCode configuration through OpenCode first if it does not
exist. Lookout requires exactly one `opencode.json` or `opencode.jsonc` there;
it will not create a new config or choose between two files. Keep the checkout
at its installed path, because the load entry refers to that directory.

**Breaking rename:** this revision uses `opencode-lookout` as the plugin/RPC ID,
`/lookout` as the command, and `lookout:` ownership markers. There are no legacy
aliases. Before replacing an older installation, use its own recovery CLI to
restore its restrictions and unload it. Do not run both copies. Reinstall only
after the remote release is complete; pins and collapsed sections start fresh.
The new CLI does not claim or remove old ownership blocks.

## Load or unload

Run these commands **from this package's directory**, outside OpenCode:

```sh
node bin/lookout.mjs load
node bin/lookout.mjs status
node bin/lookout.mjs unload
```

The commands work without the extension, server, or TUI running. They change one
marked entry in your global `opencode.jsonc` or `opencode.json`. They refuse to
choose between those files if both exist. They respect `XDG_CONFIG_HOME`.

OpenCode watches configuration changes. Use `/reload` if the UI has not updated.
`status` reports the configuration on disk, **not** whether the extension loaded.
Check `opencode plugin list` and open `/lookout` to verify both parts.

Unloading keeps resource restrictions in place. Removing a UI must not silently
restore tool access. To remove restrictions created by this extension:

```sh
node bin/lookout.mjs restore --yes
```

This affects all projects using the server. It removes only marked Lookout
entries. Existing permissions, policies, credentials, and plugin entries remain.

## Browse the catalog

Run `/lookout`, or choose **Open Lookout** in the command palette.
Use `/lookout skill` to start with one category. Category names are `agent`,
`skill`, `plugin`, `command`, `provider`, and `model`.

The catalog uses OpenCode's native searchable dialogs:

| Action                                             | Control                  |
| -------------------------------------------------- | ------------------------ |
| Search names, IDs, descriptions, and model details | Type in the search field |
| Change category                                    | Ctrl+F                   |
| Filter by state                                    | Ctrl+S                   |
| Refresh the inventory                              | Ctrl+R                   |
| Inspect an item or change it                       | Enter                    |
| Return or close                                    | Escape                   |

Selecting an item opens its action menu. **Show details** opens a read-only
inspector; Escape closes it back to the prompt. Run `/lookout` again to
browse another item.

Sidebar headings expand or collapse on click. Each expanded category shows up to
three entries. Select an item and choose **Pin to sidebar** to choose which entries
appear. Pins and collapsed sections are terminal presentation preferences; they
do not enable or disable resources. Keyboard-only users can access every resource
and action through `/lookout`, even when the terminal hides the sidebar.

Status dots use the native sidebar's semantic theme colors: green for available
or active entries, yellow for pending, stale, unknown, or still-listed restrictions,
grey for disabled or inactive entries, and red for failures. The selected agent
also has an arrow. Green reflects catalog availability, not verified provider
authentication, quota, or successful execution. Open an item's details for its
text status.

Plugin rows include a description from their own files. For local plugin
directories, Lookout reads the `description` string in that directory's
`package.json`. For single-file plugins, it reads a leading JSDoc tag:

```js
/** @description Explain what this plugin does. */
export default { id: "example.plugin", setup() {} };
```

If metadata is missing, unreadable, or unsupported, the row says
`missing description`. Lookout does not execute plugin code, search parent
packages, fetch registry metadata, or keep a hardcoded description list. Packaged
or built-in plugins whose catalog entry has no local source path use the fallback.
Descriptions are truncated in the sidebar; open **Show details** to read more.

## What the controls mean

Resource changes require a preview and **Apply Globally** confirmation. They affect
every project using that server, not just the current conversation. Wait for other
work to finish before changing resources it may use.

| Resource                                                   | Supported control                                |
| ---------------------------------------------------------- | ------------------------------------------------ |
| Skills from configured local sources                       | Add an exact `skill.use` denial                  |
| Local plugins inside your OpenCode configuration directory | Add an exact `-plugin-id` entry                  |
| Agents                                                     | Inspect; use `/agents` to select                 |
| Commands, providers, models                                | Inspect; use native OpenCode or Console controls |
| Built-in, managed, unknown-source plugins                  | Read-only                                        |
| Lookout itself                                             | Use the external `unload` command                |

**Enable** removes this extension's denial. It never adds an `allow`, removes an
external restriction, or overrides managed policy. A missing resource stays in
the catalog as a disabled row when Lookout owns its restriction, so you can
restore it after a reload or restart.

Lookout MCP restrictions are preserved, not silently removed when the inventory
is hidden. Use the external `restore --yes` command to remove all Lookout
restrictions, including MCP entries. The MCP RPC contract remains available for
recovery; it is not exposed in the browser.

**Restricted; still listed** means the config entry exists but the live catalog
still includes the resource. Do not interpret that state as successful blocking.
Higher-priority policy, reload timing, or plugin ordering may explain the result.
Refresh and use the native controls to verify access. Disabling a skill does not
remove instructions already loaded into an existing conversation.

## Troubleshoot

1. Run `node bin/lookout.mjs status` to inspect the load entry and owned
   restriction count. No credentials are needed.
2. Run `node bin/lookout.mjs unload` to remove both extension parts from
   configuration. The package lives outside automatic plugin discovery.
3. Use `/reload`. If only the terminal is unusable, open a terminal without its UI:

   ```sh
    OPENCODE_CLI_CONFIG_CONTENT='{"plugins":["*","-opencode-lookout"]}' opencode
   ```

   This suppresses only the TUI part for that process. Use `unload` for the server
   part. It does not bypass any policy or remove resource restrictions.

4. Fix the failure, run `make check`, and use `load` to re-enable the extension.

If an apply request loses its response during configuration reload, refresh before
retrying: the write might already have succeeded. If a `.lookout-lock` file remains
after a crash, first ensure no Lookout command is running. Inspect the lock
beside your global config, then remove that lock manually and retry. Never delete
the global configuration to clear a lock.

Do not edit text inside `lookout:begin` / `lookout:end` ownership markers. The controller
rejects modified blocks rather than risk deleting your edits. Unload still works
without calling the server. Preserve the file and repair the marked block manually
if normal restore cannot parse it.

## Development

```sh
npm ci --ignore-scripts
make check
npm run test:integration
npm run test:tui
LOOKOUT_TUI=1 LOOKOUT_NARROW=1 LOOKOUT_THEME=tokyonight npm run test:integration
```

The integration checks require the `opencode` executable. Terminal checks also
require `/usr/bin/expect`. They use a temporary HOME and deny provider and tool
use. Set `LOOKOUT_KEEP_FIXTURE=1` to retain a failed fixture for local inspection; do not
share its credential files or raw terminal transcript.

See [Architecture](docs/ARCHITECTURE.md) for module boundaries and configuration
ownership, [Threat model](docs/THREAT_MODEL.md) for safety limits, and
[Validation](docs/VALIDATION.md) for evidence and remaining manual checks.

## Project information

- [Contributing](CONTRIBUTING.md): setup, tests, and review expectations.
- [Security](SECURITY.md): supported versions and private vulnerability reports.
- [Support](SUPPORT.md): troubleshooting and useful bug reports.
- [Code of conduct](CODE_OF_CONDUCT.md) and [governance](GOVERNANCE.md).
- [Changelog](CHANGELOG.md) and [MIT license](LICENSE).
- [Repository metadata and release policy](docs/RELEASING.md).

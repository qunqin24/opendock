# opencode-letmework

[![npm](https://img.shields.io/npm/v/@catronomix/opencode-letmework?cacheSeconds=3600)](https://www.npmjs.com/package/@catronomix/opencode-letmework)
[![license](https://img.shields.io/npm/l/@catronomix/opencode-letmework?cacheSeconds=3600)](LICENSE)
[![node](https://img.shields.io/node/v/@catronomix/opencode-letmework?cacheSeconds=3600)](https://nodejs.org)

An OpenCode plugin that makes work folders boring: when an action only touches a
project's **sibling work folder** (`../<project>-wt`, plus a few folders you
list), the permission prompt answers itself after a short delay instead of
blocking the agent.

The delay is the point. The prompt is published normally, stays visible for
`waitseconds`, and is only auto-approved if nobody answered it by then — so a
user who is watching can still reject the action.

> **This is a limited YOLO mode.** It answers permission prompts without you
> looking, and by default it *saves* those answers so the same folder stops
> prompting. It is only as safe as the folders you allow: the defaults are
> deliberately narrow (git repositories, sibling work folder only), but adding
> `C:\` or `/` to `extra-folders` is effectively turning permissions off.
> Nobody reviews an auto-approved edit. Read the config comments before you
> widen anything.

## Installing does nothing until you configure it

The plugin ships **no active config on purpose**. Without a config file it stays
completely inert — every prompt waits for you as usual — and the first time it
sees a permission prompt it drops a one-time note into the session saying so,
with the exact command to turn it on:

```
letmework is installed but idle - nothing is being auto-approved.
  reason: C:\Users\you\.config\opencode\letmework.yaml not found
  config: C:\Users\you\.config\opencode\letmework.yaml (not found)

To turn it on, copy the example config and edit it:
  Copy-Item "C:\...\opencode-letmework\config.example.yaml" "C:\Users\you\.config\opencode\letmework.yaml"
...
```

The example lives at the **package root**, never inside `dist/`, so the hint
stays correct for a built install.

Once a config is loaded and the plugin actually answers a prompt, it shows a
similar one-time note in that session: what it approved, which rule allowed it,
where the config lives, and how to make it quieter. That note is the onboarding
— no dialogs, no wizards, no first-run state machine.

Config is looked up in this order, first hit wins:

1. the `config` plugin option (see below),
2. `config.yaml` inside the plugin's own folder (a clone or dev checkout),
3. `config.yaml` in the package root, when the plugin runs from a built `dist`
   folder,
4. `~/.config/opencode/letmework.yaml` (`$XDG_CONFIG_HOME` respected) — the
   right place for an npm install, which never ships a config.

## What it checks

A permission request is auto-approved only when **all** checks pass:

1. **The session folder is a git repository.** Detected by walking up from the
   session directory for a `.git` entry (file or folder, so worktrees count).
2. **Every target lives in an allowed folder:**
   - the sibling work folder `../<session folder><suffix>` and anything below it
     (`c:\GITHUB\myProject` → `c:\GITHUB\myProject-wt`), or
   - anything below a folder in `extra-folders`, or
   - anything **strictly below** a folder in `create-and-use` — those folders may
     not be touched directly, but the agent may create subfolders and work there.
3. **The action is eligible.** Only actions listed in `actions` qualify, so
   command text (`shell`) never matches a path rule.
4. **Resources are path-shaped.** Globs are judged on their literal prefix
   (`C:\temp\**\*.ts` is fine, `C:\GITHUB\proj-*\x` is not), and a resource that
   climbs out with `..` is never approved.

Anything else — no git repo, a different sibling, the project folder itself, an
unlisted action — behaves exactly as before: the prompt waits for you.

## Config

`config.yaml` next to the plugin, or the user-level path above (see
`config.example.yaml`, which is heavily commented):

```yaml
waitseconds: 5
suffix: -wt

extra-folders: []
#  - /tmp

create-and-use: []
#  - /tmp/opencode

actions:
  - read
  - edit
  - write
  - external_directory

decision: always
notice: once
```

- `waitseconds` — grace period before auto-approval (0 approves immediately,
  capped at 600).
- `suffix` — appended to the session folder's name to build the work folder.
- `extra-folders` — folders and everything below them; absolute or relative to
  the session folder. Empty by default.
- `create-and-use` — folders whose subfolders are allowed while the folder itself
  is not. Empty by default.
- `actions` — permission actions eligible for auto-approval. Defaults to `read`,
  `edit`, `write`, `external_directory`. Narrow it (e.g. `read` only) to stay in
  the loop for edits.
- `decision` — how the auto-approval is recorded: `always` (default) saves the
  approval so the same target stops prompting, `once` answers only that single
  request and the next one prompts again (with the same grace period).
- `notice` — the in-session onboarding note: `once` (default), `always`, or
  `off`.

Point the plugin at another config file with a plugin option:

```jsonc
{
  "plugins": [{ "package": "./plugins/opencode-letmework", "options": { "config": "C:/path/config.yaml" } }]
}
```

## Install

Add the package to your global config (`~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "plugins": ["@catronomix/opencode-letmework"]
}
```

or let the CLI write it:

```powershell
opencode plugin add @catronomix/opencode-letmework
```

It installs **inactive**. Start a session with an agent that asks for permission,
and the notice from the previous section prints the exact copy command for your
machine — the packaged `config.example.yaml` sits inside the plugin install
directory, which differs between an npm install and a clone, so the notice
resolves it for you. The result is:

```
~/.config/opencode/letmework.yaml      (%USERPROFILE%\.config\opencode\letmework.yaml)
```

Edit that file and the change applies on the next prompt — no restart.

From a clone instead:

```powershell
git clone https://github.com/catronomix/opencode-letmework C:\path\opencode-letmework
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.config\opencode\plugins\opencode-letmework" -Target C:\path\opencode-letmework
Copy-Item C:\path\opencode-letmework\config.example.yaml C:\path\opencode-letmework\config.yaml
```

Plugins in `~/.config/opencode/plugins/` load automatically. For a single
project, symlink into `<project>\.opencode\plugins\` instead.

## How to turn it off

- Delete or rename the config file — the plugin goes idle immediately (config is
  re-read on change) and says why on the next prompt.
- Or remove the plugin entry from your OpenCode config.
- Already-saved approvals are recorded by OpenCode, not by this plugin. Check
  `opencode`'s permission settings if an old folder still does not prompt.

## Notes

- Each request is answered with `always` by default, so the work folder stops
  prompting after the first approval; a rejection by the user is respected
  because the reply is skipped once the request is no longer pending.
- The plugin logs each decision to the server log (`letmework: ...`), so
  `~/.local/share/opencode/log/opencode.log` shows why something was or was not
  auto-approved. That log is also where the idle/config messages go.
- Path comparisons are case-insensitive on Windows and case-sensitive elsewhere.

## Development

Contributor steps only. What you install from npm, or add with
`opencode plugin add`, is the prebuilt `dist/` bundle: no build step, no
lifecycle scripts, no dev toolchain.

The published package ships with **no runtime dependencies**: the single SDK
helper it used (`Plugin.define`, an identity function) lives in `define.ts` as a
shim, imported type-only so the package still type-checks against the SDK
version pinned in `devDependencies`.

```powershell
git clone https://github.com/catronomix/opencode-letmework
cd opencode-letmework
npm install
npm install-scripts approve esbuild   # tsup needs esbuild's platform binary
npm test                              # node --test logic.test.ts plugin.test.ts define.test.ts
npm run typecheck
npm run build                         # writes dist/, which is what the plugin loads
```

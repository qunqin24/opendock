# @op1/opencode-subagent-model

An [OpenCode](https://opencode.ai) TUI plugin. When you open a subagent (child)
session, it shows which agent and model that session runs, directly above the
composer:

```
vera-engineer-readonly openai/gpt-5.6-sol#max
```

Root sessions are left untouched. OpenCode's built-in task cards show the
subagent's type and description but not its model; this plugin fills that gap.

## Install

Install the npm package:

```sh
opencode plugin add @op1/opencode-subagent-model@0.1.3
```

This adds the package to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
	"$schema": "https://opencode.ai/config.json",
	"plugins": ["@op1/opencode-subagent-model@0.1.3"]
}
```

Restart the TUI. Open any subagent session to see its agent and model.

## How it works

The plugin claims the `session.composer.top` slot. For the session being
viewed, it reads `parentID`, `agent`, and `model` from the synced session data.
If the session has a parent, it renders `agent providerID/modelID#variant` in
the muted theme color. Sessions without a parent render nothing.

## Compatibility

This release targets OpenCode `2.0.3` and pins `@opencode/plugin` to that version.
Run the typecheck when updating OpenCode dependencies.

## Develop

```sh
npm ci
npm run verify:static
```

The static check typechecks the source, compiles the plugin, creates a tarball,
and checks that every export contains valid JavaScript. Artifacts go under
`.artifacts/`. It requires Node.js and Bun and does not connect to OpenCode.

The package ships compiled `dist/index.js` and `dist/tui.js`. The build uses
OpenTUI's Solid transform so installation does not depend on the host compiling
TSX inside `node_modules`.

## Verify in OpenCode

With the npm package installed, run:

```sh
npm run verify:live
```

The live check requires Python 3, a running OpenCode service, and an existing
child session. It checks the active package version, opens a TUI, and verifies
the displayed agent/model label. It does not send a prompt. To choose a session:

```sh
npm run verify:live -- --session ses_example
```

Before publishing, use the packed plugin directory printed by `verify:static`
as the plugin entry in your global config, then run:

```sh
npm run verify:live -- --packed
```

After publishing, replace that local entry with the npm package and rerun
`npm run verify:live`. The terminal capture is saved to `.artifacts/verify-live.txt`.

## Release

1. Run `npm run verify:static` and the packed live check.
2. Publish the resulting `.artifacts/*.tgz` with `npm publish <tarball> --access public`.
3. Install the published version and run `npm run verify:live`.

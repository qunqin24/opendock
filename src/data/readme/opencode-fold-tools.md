# opencode-fold-tools

[简体中文](README.zh-CN.md)

Compact, expandable tool output for the OpenCode TUI. Each tool call keeps its own input summary in conversation order. Click the summary to reveal its output underneath; only the arrow changes on the input line.

![Read and Shell outputs expanding and collapsing in OpenCode](https://raw.githubusercontent.com/ningzimu/opencode-fold-tools/main/assets/demo.gif)

The expanded output has a theme-colored background and a left border. Collapsing it removes the output panel and its background. Consecutive reads and searches are not grouped.

## Features

- Click a tool summary to expand or collapse its output. Long text output scrolls inside its panel.
- Keep native colored diffs and line numbers for Edit, Write, and Apply Patch where available.
- Press **Ctrl+O** to expand or collapse all matched tool rows.
- Open **Ctrl+P → 所有工具详情** (All tool details) to inspect tool records, including running calls that have no matching inline row. This fallback shows both input and output.
- Keep an **打开子任务 →** (Open subtask) link for Task calls with a child session.

Command labels and status messages are currently in Chinese. Tool names and output retain their original text.

## Compatibility

Tested with **OpenCode 1.18.27** in **Otty**. The plugin uses OpenCode's internal render tree; other versions and terminals may behave differently. It does not patch the OpenCode executable.

Do not enable this plugin alongside `opencode-fold-diffs` or another plugin that rewrites the same tool rows. Remove the old plugin entry from your TUI configuration before installation.

## Install

Install the npm package globally through OpenCode:

```sh
opencode plugin opencode-fold-tools -g
```

Restart OpenCode to load the plugin. This method does not require a separate Node.js installation or a Git checkout.

## Update

```sh
opencode plugin opencode-fold-tools@latest -g --force
```

Restart OpenCode after updating.

## Install from source

For a local checkout, you need **Node.js 22 or later**, **Git**, and OpenCode. Use either the npm package or a source checkout, not both.

```sh
git clone https://github.com/ningzimu/opencode-fold-tools.git
cd opencode-fold-tools
npm ci --ignore-scripts
npm run install:plugin
```

The installer adds this checkout's `index.js` as an absolute file URL to your global `tui.json` or `tui.jsonc`, preserving other settings. Keep the checkout in place: OpenCode loads the plugin from it. Restart OpenCode after installation.

For a specific configuration file:

```sh
npm run install:plugin -- --config /path/to/tui.jsonc
```

To update a source installation, run these commands inside your existing checkout, then restart OpenCode:

```sh
git pull --ff-only
npm ci --ignore-scripts
npm run install:plugin
```

If you installed into a custom configuration, pass the same `-- --config /path/to/tui.jsonc` argument again.

## Verify and troubleshoot

To run the automated checks from a source checkout (Node.js 22 or later):

```sh
npm test
```

After restarting OpenCode, open a session containing tool calls. Confirm that **Ctrl+P** lists **所有工具详情**, then click a Read or Shell summary. Its output should appear below, on a background, while the summary stays unchanged except for its arrow. Click again to hide the panel, and try **Ctrl+O** for all matched rows.

If keyboard toggling works but clicking does not, clear any text selection and check that the terminal forwards mouse events. In Otty, enable **Settings → Advanced → All Settings → Allow Mouse Capture**.

If a row cannot be matched to OpenCode's current layout, use **所有工具详情** as a fallback. The plugin can show only the output OpenCode retains; it cannot recover compacted or truncated history. Automated tests do not establish compatibility with every OpenCode version or terminal.

## Uninstall

For an npm installation, remove the `opencode-fold-tools` entry (including any version suffix) from the `plugin` array in your global `tui.json` or `tui.jsonc`, then restart OpenCode.

For a source installation, run this from the checkout:

```sh
npm run uninstall:plugin
```

For a custom configuration, append `-- --config /path/to/tui.jsonc`. Uninstall removes only this plugin's configuration entry. Restart OpenCode, then delete the checkout if you no longer need it.

## License and credits

[MIT](LICENSE). Inspired by [opencode-fold-diffs](https://github.com/tannerbruhn/opencode-fold-diffs) by Tanner Bruhn.

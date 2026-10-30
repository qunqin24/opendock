# create-opencode-desktop-plugin

Scaffold an [OpenCode Desktop](https://opencode.ai) GUI plugin, built on the experimental
[GUI plugin SDK](https://opencode.ai/v2/docs/build/plugins/gui) (`@opencode/plugin/gui`).

```sh
bun create opencode-desktop-plugin my-plugin
```

`npm create opencode-desktop-plugin` and `npx create-opencode-desktop-plugin` also work.

## What you get

A plugin package whose `./gui-experimental` export is a prebuilt CommonJS bundle, built with the SDK's
`gui()` Vite preset. It includes:

- **Window setup** (`src/gui/window.tsx`): a side panel, two commands (one with a `/` slash entry), a launcher in
  the side panel's **+** menu, a titlebar pill, a settings page backed by a `Store.global`, injected CSS, and i18n.
- **Server part** (`src/index.ts`, `src/rpc.ts`, optional): a server plugin that registers an RPC, which the
  panel calls through `ctx.client.rpc(...)`.
- **Main process** (`src/gui/main.ts`, `src/gui/contract.ts`, optional): an `Ipc` the panel calls through
  `ctx.main(...)`, and a native **Help** menu item.

It also comes with `vite build --watch` for development and a `tsc` typecheck.

## Options

```
bun create opencode-desktop-plugin [directory] [options]

  --name <name>     npm package name (default: from the directory)
  --id <id>         plugin id used by the server part, commands, and tokens (default: from the name)
  --title <title>   display name in the app (default: from the id)
  --description <d> package description
  --no-server       skip the server part and its RPC
  --no-main         skip the Electron main-process part
  --no-install      do not run "bun install" and the first build
  --force           write into a non-empty directory
  -y, --yes         accept defaults without prompting
```

Without a server part, the host uses the package name as the plugin id.

## After scaffolding

```sh
cd my-plugin
bun run dev
```

Add the plugin directory to the **global** `~/.config/opencode/opencode.jsonc` (the desktop app does not read
`cli.json`), then restart OpenCode Desktop once. After that, each rebuild reloads the plugin.

```jsonc
{ "plugins": ["/absolute/path/to/my-plugin"] }
```

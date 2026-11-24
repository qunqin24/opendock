# opencode-palace

[![tests](https://github.com/palacememory/opencode-palace/actions/workflows/test.yml/badge.svg)](https://github.com/palacememory/opencode-palace/actions/workflows/test.yml) [![Star palace-rs](https://img.shields.io/github/stars/AncientiCe/palace-rs?style=social&label=Star%20palace-rs)](https://github.com/AncientiCe/palace-rs)

> **Palace core lives at [AncientiCe/palace-rs](https://github.com/AncientiCe/palace-rs).** This plugin is a thin adapter; all the retrieval work happens in the `palace` binary. If it is useful to you, please [star palace-rs on GitHub](https://github.com/AncientiCe/palace-rs). Stars are how other developers find it. Website: [palacememory.com](https://palacememory.com).

Local, verbatim memory for [OpenCode](https://opencode.ai), backed by [Palace](https://github.com/AncientiCe/palace-rs). Your agent gets relevant past decisions, fixes and conventions injected automatically: when a session starts, on every prompt, and after it reads or greps files. Everything stays in one SQLite file on your machine.

Works with OpenCode V2 and OpenCode V1 (1.18.29 or newer) from the same package.

Not associated in any way with the popular mempalace python.

## Install

1. Install Palace and register its MCP server with OpenCode:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/AncientiCe/palace-rs/main/scripts/install.sh | sh
   palace install --client opencode
   palace init ~/my-project --yes --auto-mine   # optional: mine a project
   ```

   `palace install --client opencode` writes the `palace` MCP server to `~/.config/opencode/opencode.json` and an agent rule. The MCP server is what gives the agent `palace_search`, `palace_remember` and the other tools.

2. Add the plugin from npm:

   ```bash
   npm i opencode-palace
   ```

   OpenCode V2 can also install it with `opencode plugin add opencode-palace@latest`. In OpenCode V1, add `"plugin": ["opencode-palace"]` to `opencode.json`.

   To load a local clone instead:

   ```bash
   git clone https://github.com/palacememory/opencode-palace ~/.config/opencode/opencode-palace
   ```

   Then point `opencode.json` at the folder, using its absolute path (replace `/home/you`). OpenCode V2:

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": ["/home/you/.config/opencode/opencode-palace"]
   }
   ```

   In OpenCode V1, use the `plugin` key instead: `"plugin": ["/home/you/.config/opencode/opencode-palace"]`.

Do you need this at all? `palace install --client opencode` also writes a plugin, to `~/.config/opencode/plugins/palace.js`. Palace 0.20.9 and newer generate one that works in V1 and V2 (0.20.8 and earlier wrote a V1-only file that V2 refuses to load). Use one or the other, not both. This package is for people who prefer to manage plugins in `opencode.json`, pin a version, or set options; it also finds `palace` on your PATH, so it survives binary moves.

## What it does

| When | Palace hook | Effect |
|---|---|---|
| First model request of a session | `palace hook session-start` | Adds the Palace memory protocol and warm-start context to the system prompt |
| Each prompt you send | `palace hook user-prompt-submit` | Adds cited drawers relevant to the prompt to the next model request |
| After `read`, `grep`, `glob` or `bash` | `palace hook post-tool-use` | Adds memories related to what the agent just looked at |
| Session goes idle (once) | `palace hook stop` | Sends one nudge to save decisions worth keeping |

Every hook fails open: if Palace is missing, slow (8 second limit) or errors, OpenCode runs exactly as it would without the plugin.

## Options

```jsonc
{
  "plugins": [
    { "package": "/home/you/.config/opencode/opencode-palace", "options": { "palaceBin": "/opt/palace/bin/palace", "saveNudge": false } }
  ]
}
```

| Option | Default | Meaning |
|---|---|---|
| `palaceBin` | `$PALACE_BIN`, else `palace` on PATH | Path to the binary |
| `saveNudge` | `true` | Set `false` to skip the one-time save prompt when a session goes idle |

## Verify

```bash
palace doctor
opencode run "what do you remember about this project?"
palace gain --since 1d     # Prompt recall counts what the hooks injected
```

## Tests

```bash
palace init test/fixture --yes --auto-mine
PALACE_BIN=$(which palace) PALACE_TEST_CWD=test/fixture npm test
```

CI downloads the latest `palace` release from [palace-rs releases](https://github.com/AncientiCe/palace-rs/releases), mines `test/fixture` into a throwaway HOME, and runs the tests on every push.

The tests drive both the V2 `setup(ctx)` path and the V1 `server()` path against a real `palace` binary, and check that a missing binary fails open.

## License

MIT, the same license as Palace core ([AncientiCe/palace-rs](https://github.com/AncientiCe/palace-rs)).

Bugs in this plugin: [open an issue here](https://github.com/palacememory/opencode-palace/issues). Bugs in retrieval or the `palace` binary: [palace-rs issues](https://github.com/AncientiCe/palace-rs/issues).

If your agent remembered something useful today, please [star palace-rs](https://github.com/AncientiCe/palace-rs).

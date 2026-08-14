<h1 align="center">opencode-package-managers-hook</h1>

<p align="center">
  OpenCode plugin that rewrites package manager commands to your preferred tools — <code>uv</code>/<code>pipx</code> over <code>pip</code>, <code>pnpm</code> over <code>npm</code>, <code>rbenv</code> over bare <code>gem</code>, and more.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-package-managers-hook"><img alt="npm version" src="https://img.shields.io/npm/v/opencode-package-managers-hook.svg"></a>
  <a href="https://www.npmjs.com/package/opencode-package-managers-hook"><img alt="npm downloads" src="https://img.shields.io/npm/dm/opencode-package-managers-hook.svg"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/npm/l/opencode-package-managers-hook.svg"></a>
  <img alt="made with vibes" src="https://img.shields.io/badge/made_with-vibes-ff69b4">
</p>

---

Stop [OpenCode](https://github.com/anomalyco/opencode) from running `pip install --break-system-packages` or any other bare package manager you'd rather not use. Every ecosystem is independently configurable with three modes: **rewrite** (silently transform), **block** (throw an error with guidance), or **off** (leave it alone).

## Supported ecosystems

| Ecosystem | Banned commands | Default rewrite target |
| --- | --- | --- |
| **Python** | `pip`, `pip3`, `python -m pip`, `virtualenv`, `python -m venv`, bare `python` | `uv pip`, `pipx install` (global), `uv venv`, `uv run python` |
| **Node** | `npm`, `npx`, `yarn` | `pnpm`, `pnpm dlx` |
| **Ruby** | bare `gem`, bare `bundle` | `rbenv exec gem`, `rbenv exec bundle` |

The plugin probes your `$PATH` at startup — if a preferred tool (e.g. `uv`, `pnpm`, `rbenv`) isn't installed, that ecosystem's rewriter is silently disabled.

## Install

```bash
opencode plugin opencode-package-managers-hook -g
```

Or manually:

```bash
npm install -g opencode-package-managers-hook
```

Then add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-package-managers-hook"]
}
```

## Configuration

Pass options via the tuple form in your `opencode.json`:

```json
{
  "plugin": [
    ["opencode-package-managers-hook", {
      "python": {
        "mode": "rewrite",
        "install": "uv pip install",
        "globalInstall": "pipx install",
        "venv": "uv venv",
        "run": "uv run python",
        "stripBreakSystemPackages": true,
        "poetryMode": "off"
      },
      "node": {
        "mode": "rewrite",
        "target": "pnpm",
        "exec": "pnpm dlx",
        "rewriteYarn": true
      },
      "ruby": {
        "mode": "block",
        "rbenvExec": true
      },
      "verbose": false
    }]
  ]
}
```

All fields are optional — the defaults shown above apply when omitted.

### Per-ecosystem options

#### Python

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `"rewrite"` \| `"block"` \| `"off"` | `"rewrite"` | Action when pip/pip3 is used |
| `install` | `string` | `"uv pip install"` | Replacement for `pip install` |
| `globalInstall` | `string` | `"pipx install"` | Replacement for `pip install --user` and `pipx install` |
| `venv` | `string` | `"uv venv"` | Replacement for `python -m venv` / `virtualenv` |
| `run` | `string` | `"uv run python"` | Replacement for bare `python <script>` |
| `stripBreakSystemPackages` | `boolean` | `true` | Remove `--break-system-packages` from any surviving command |
| `poetryMode` | `"rewrite"` \| `"block"` \| `"off"` | `"off"` | Whether to also rewrite `poetry` commands to `uv` equivalents |

#### Node

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `"rewrite"` \| `"block"` \| `"off"` | `"rewrite"` | Action when npm/npx is used |
| `target` | `string` | `"pnpm"` | Tool to rewrite npm commands to |
| `exec` | `string` | `"pnpm dlx"` | Tool to rewrite npx to |
| `rewriteYarn` | `boolean` | `true` | Also rewrite yarn to target |

#### Ruby

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `"rewrite"` \| `"block"` \| `"off"` | `"block"` | Action when bare gem/bundle is used |
| `rbenvExec` | `boolean` | `true` | Prepend `rbenv exec` to gem/bundle |

### Disabling an ecosystem

Set any ecosystem to `false` to disable it entirely:

```json
{
  "plugin": [
    ["opencode-package-managers-hook", {
      "ruby": false
    }]
  ]
}
```

### Blocking instead of rewriting

Use `"block"` mode to hard-fail with a helpful error message instead of silently rewriting:

```json
{
  "plugin": [
    ["opencode-package-managers-hook", {
      "python": { "mode": "block" },
      "node": { "mode": "block" }
    }]
  ]
}
```

## How it works

1. On startup, the plugin checks which preferred tools (`uv`, `pipx`, `pnpm`, `rbenv`) exist on your `$PATH`.
2. It builds a chain of rewriters for each enabled ecosystem whose tools are present.
3. On every `bash` tool invocation, the `tool.execute.before` hook runs the command through the rewriter chain.
4. Commands already using preferred tools (`uv`, `pnpm`, `bun`, `rbenv`, etc.) are skipped.
5. In `"rewrite"` mode, the command is silently transformed. In `"block"` mode, an error is thrown with guidance on what to use instead.

## Rewrite examples

| Original | Rewritten to |
| --- | --- |
| `pip install requests` | `uv pip install requests` |
| `pip3 install --user awscli` | `pipx install awscli` |
| `pip install --break-system-packages foo` | `uv pip install foo` |
| `python -m pip install flask` | `uv pip install flask` |
| `python -m venv .venv` | `uv venv .venv` |
| `virtualenv env` | `uv venv env` |
| `python script.py` | `uv run python script.py` |
| `poetry install` | `uv sync` (when `poetryMode: "rewrite"`) |
| `poetry add flask` | `uv add flask` (when `poetryMode: "rewrite"`) |
| `npm install express` | `pnpm install express` |
| `npx create-react-app my-app` | `pnpm dlx create-react-app my-app` |
| `yarn add lodash` | `pnpm add lodash` |
| `gem install rails` | `rbenv exec gem install rails` (rewrite) or blocked |
| `bundle install` | `rbenv exec bundle install` (rewrite) or blocked |

## Development

```bash
bun install
bun run typecheck
bun run build
```

## Releasing

```bash
npm version patch && git push --follow-tags
```

The [publish workflow](./.github/workflows/publish.yml) handles npm (Trusted Publishing + provenance) and the GitHub Release.

## License

[MIT](./LICENSE)

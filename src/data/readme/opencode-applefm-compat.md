# OpenCode + Apple Foundation Model (on-device)

[![npm](https://img.shields.io/npm/v/opencode-applefm-compat.svg)](https://www.npmjs.com/package/opencode-applefm-compat)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A distributable setup for using the **Foundation Model built into macOS 27** inside [OpenCode](https://opencode.ai/) as an OpenAI-compatible provider, with **working tool calling**.

## Verified status

Tested on 2026-11-18 with:

| Component | Version |
| --- | --- |
| macOS | 27.2.1 (build 26B131), Apple Silicon |
| Model | `system` = **AFM 3 Core Advanced** (on-device, multimodal) |
| `fm` | `/usr/bin/fm`, license accepted |
| OpenCode | v2.3.0 |

Tool calling in `fm serve` was broken on 27.0.x builds (no `tool_calls` emitted). **It is restored on 27.2.1**, so this repository uses `fm serve` directly, with no Python bridge. If you deploy to a Mac running 27.0.x, use `./install.sh --no-tools` or upgrade macOS.

## How it works

```
OpenCode  --"context" hook-->  applefm-compat plugin  --HTTP /v1/chat/completions-->  fm serve  --> AFM 3 Core Advanced
                                      |                                                   |
                                      +-- AFM-safe tool schemas                            +-- OpenCode executes the tools
```

- `fm serve` listens only on `127.0.0.1:1976` (configurable with `FM_PORT`).
- No API key, no account, no per-token cost; it works offline after the initial model download.
- A LaunchAgent keeps the service running.
- The OpenCode configuration uses the **V2** syntax (`providers` + `package`/`settings`), not the old `provider`/`npm`/`options`.

### Why a plugin is needed

The tool schemas sent by OpenCode are not compatible with AFM: they contain the JSON Schema keyword `pattern` (in the `subagent` tool) and descriptions long enough to exceed the 8192-token limit. The `applefm-compat` plugin, registered only for the `applefm` provider, rewrites the outgoing request:

- removes the `pattern` keyword without touching properties actually named “pattern” in `glob`/`grep`;
- shortens tool descriptions to their first sentence;
- does not change configuration, transcript history, or other providers.

It adds no npm dependency: OpenCode loads the `.ts` file directly from the configuration directory.

### Why automatic checkpoints are disabled

With only 8192 tokens, OpenCode compacts very early and injects a summary back into the context. The on-device model interprets it as a “Next Move” and tends to re-run the same tool in a loop. The installer therefore sets `"compaction": {"auto": false}` in the global configuration: replies become immediate and tools run once. If you also use large-context providers and want checkpoints, reinstall with `--keep-compaction`. Note that this setting is global, not specific to `applefm`.

## Requirements

- macOS 27+, Apple Silicon.
- Apple Intelligence enabled and the model downloaded.
- CLI license accepted once per machine: `sudo fm license`.
- `python3`, `curl`, `lsof` (included by default with Xcode Command Line Tools).
- OpenCode v2.

## Installation

```bash
git clone https://github.com/Giuffre/opencode-apple-fm.git
cd opencode-apple-fm
chmod +x install.sh uninstall.sh
./install.sh
```

Options:

```bash
FM_PORT=1977 ./install.sh          # different port
./install.sh --no-tools            # disable tool calling (macOS 27.0.x)
./install.sh --keep-compaction     # keep OpenCode's automatic checkpoints
```

The script:

1. checks macOS / Apple Silicon / `fm` / license / model / free port (it recognizes its own `fm serve` on reinstall);
2. backs up `~/.config/opencode/opencode.jsonc` and updates it non-destructively (provider, agent, and `compaction.auto`);
3. removes the old V1 `fm` provider if present;
4. installs the plugin into `~/.config/opencode/plugins/applefm-compat/`;
5. installs `~/Library/LaunchAgents/ai.opencode.applefm.plist` and starts the service;
6. runs an end-to-end smoke test with a tool call and its result.

## Usage

Inside OpenCode:

```text
/models        -> applefm/system
/agent         -> applefm (optional)
```

Or for a single run:

```bash
opencode run --model applefm/system "Explain what a Swift closure is in two lines"
```

For tests that use tools in non-interactive mode, add `--auto`, which approves permissions that are not explicitly denied:

```bash
opencode run --auto --model applefm/system \
  "Use the glob tool with pattern 'README.md' to check that the file exists"
```

To make it the default for a single project, create `opencode.json` in the project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "applefm/system"
}
```

OpenCode reloads configuration automatically.

## Manual verification

```bash
curl -s http://127.0.0.1:1976/health
curl -s http://127.0.0.1:1976/v1/models
python3 scripts/smoke-test.py 1976

# Test through OpenCode (slower, includes a tool call)
chmod +x scripts/smoke-test-opencode.sh
./scripts/smoke-test-opencode.sh
```

## Known limitations

- **8192-token context**, of which about 8132 are usable for prompt + reply. It is not a replacement for a 200K coding model.
- Automatic compaction is disabled: very long sessions will eventually exceed 8K. In that case, run `/compact` manually or restart the session.
- Images only work as inline `data:image/...;base64,...`; `fm serve` does not download remote URLs.
- `max_tokens` is accepted but ignored by the server; `stop`, `n`, and `reasoning_effort` return 400.
- `pcc` appears in `/v1/models` but cannot be used from non-Terminal processes; the configured provider exposes only `system`.
- `fm serve` **does not authenticate**: never expose it outside localhost (do not use `--host 0.0.0.0`).
- `fm serve` logs are TTY-gated and may be empty when redirected.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `fm` says “YOU HAVE NOT AGREED...” | Run `sudo fm license` |
| `✗ system` in `fm models` | Enable Apple Intelligence and let the model download |
| `Model unavailable: applefm/system` | Check `/models`; the port must be free and `/health` must respond |
| No `tool_calls` | 27.0.x build: upgrade to 27.2+ or reinstall with `--no-tools` |
| `A generation guide with an unsupported pattern was used` | The plugin is not loaded: check `~/.config/opencode/plugins/applefm-compat/index.ts` and restart OpenCode |
| `Provided N tokens, but the maximum allowed is 8192` | The plugin is not loaded, or the prompt is too long; shorten the context |
| `opencode run` hangs on a tool | Add `--auto` to approve permissions; if the model keeps repeating the same tool, check that `compaction.auto` is `false` |
| Port already in use | `lsof -nP -iTCP:1976 -sTCP:LISTEN`; use `FM_PORT` |
| Service does not start | `launchctl print gui/$(id -u)/ai.opencode.applefm`; check `~/.local/share/opencode-apple-fm/` |

## Uninstallation

```bash
./uninstall.sh
```

Removes the LaunchAgent, the plist, the plugin, and the `providers.applefm` / `agents.applefm` keys from the global configuration, preserving other settings.

## Files

```text
install.sh                                  # idempotent installer
uninstall.sh                                # removal
plugins/applefm-compat/index.ts             # OpenCode plugin (AFM compatibility)
plugins/applefm-compat/package.json         # npm manifest for the plugin
plugins/applefm-compat/README.md            # package documentation
LICENSE                                     # MIT
CONTRIBUTING.md                             # conventional commits and release process
.releaserc.json                             # semantic-release configuration
.github/workflows/release.yml               # automated versioning and publishing
.github/workflows/commitlint.yml            # commit message validation
scripts/smoke-test.py                       # /health, /models, tool round-trip
scripts/smoke-test-opencode.sh              # end-to-end test through OpenCode
config/opencode.snippet.jsonc               # reference OpenCode V2 configuration
launchd/ai.opencode.applefm.plist.template  # LaunchAgent
```

## Distribution and license

This project is open source under the **MIT** license.

- Repository: <https://github.com/Giuffre/opencode-apple-fm>
- npm package for the plugin: `opencode-applefm-compat`

Full setup from source:

```bash
git clone https://github.com/Giuffre/opencode-apple-fm.git
cd opencode-apple-fm
./install.sh
```

Plugin only, if the `applefm` provider is already configured:

```bash
opencode plugin add opencode-applefm-compat
```

Releases are automated: merge conventional commits into `main` and semantic-release determines the next version, publishes npm, and creates a GitHub release. See [CONTRIBUTING.md](CONTRIBUTING.md) for the commit rules and the one-time `NPM_TOKEN` / Trusted Publishing setup.

The V2 plugin API is beta: the package pins `@opencode/plugin` to the verified version (`2.3.0`). Rerun the tests whenever you change the OpenCode version.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for conventional commit rules, release behavior, and publishing setup.

- [Issues](https://github.com/Giuffre/opencode-apple-fm/issues) — bugs and feature requests
- [Discussions](https://github.com/Giuffre/opencode-apple-fm/discussions) — questions and ideas
- [Security](SECURITY.md) — private vulnerability reports

## References

- [Foundation Models framework](https://developer.apple.com/documentation/foundationmodels)
- [Foundation Models SDK for Python](https://apple.github.io/python-apple-fm-sdk/) (not needed here)
- [OpenCode providers](https://opencode.ai/docs/providers/)
- [OpenCode models / local](https://opencode.ai/docs/models/#local)

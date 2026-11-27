<h1 align="center">
  <a href="https://openkodo.dev"><img src="resources/build/icon.png" alt="OpenKodo" width="64" valign="middle" /></a> OpenKodo Code
</h1>

<p align="center">
  <b>The OpenKodo subscription, inside an agent IDE.</b><br />
  An open-source fork of <a href="https://github.com/OpenKodo/openkodo">OpenKodo</a> (MIT), adapted so a new account can sign in, pick a model and start coding without configuring a CLI by hand.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-08C?style=flat" alt="License: MIT" />
  <img src="https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square" alt="Supported platforms" />
</p>

## What this is

OpenKodo Code is the desktop client for [OpenKodo](https://openkodo.dev): one subscription, one API key, and every supported model in one place. It is built on OpenKodo's agent IDE — parallel agents in isolated worktrees, a real editor and diff view, terminals, chat or raw CLI, and remote/mobile companions.

This repository is the fork. It is not a finished product: the OpenKodo engine is intact, and the OpenKodo-specific onboarding (browser sign-in → key provisioning → model presets) is the work in progress.

## Use OpenKodo with it today

The quickest path today is OpenCode plus the OpenKodo plugin, which validates the key and shows the live plan windows:

```bash
pnpm add openkodo
```

Then paste an OpenKodo key (`ok_live_…`) from **Console → API keys**. The plugin reads the plan, the 5-hour / 7-day / monthly windows and the live model catalog from `https://api.openkodo.dev`.

Codex can also point straight at the gateway:

```toml
model = "deepseek-v4-pro-0813"
model_provider = "openkodo"

[model_providers.openkodo]
name = "OpenKodo"
base_url = "https://api.openkodo.dev/v1"
env_key = "OPENKODO_API_KEY"
wire_api = "responses"
```

Anthropic-compatible clients use `https://api.openkodo.dev` with the same key.

> Accounts without a plan can only call `deepseek-v4.1-flash-1017` and `deepseek-v4.1-flash-economy`. Go and Pro unlock the full catalog.

## Roadmap

- Browser sign-in inside the app, with the key stored in the OS keychain
- A first-run model preset per plan, and a quota strip (5h / 7d / monthly)
- Branded builds for macOS, Windows and Linux with auto-update
- One-click migration from an existing OpenKodo install

## Development

```bash
pnpm install
pnpm dev
```

Build and packaging follow OpenKodo's scripts (`pnpm build`, `pnpm run build:mac`, and so on).

## License and attribution

MIT. This project is a fork of [OpenKodo](https://github.com/OpenKodo/openkodo), copyright Lovecast Inc., and keeps the original license. See [ATTRIBUTION.md](./ATTRIBUTION.md). "OpenKodo" and the OpenKodo marks belong to their owners; OpenKodo Code is an independent fork and is not endorsed by the OpenKodo project.

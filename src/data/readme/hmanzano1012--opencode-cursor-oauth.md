# opencode-cursor-oauth

Personal fork maintained by [HManzano1012](https://github.com/HManzano1012) — [HManzano1012/opencode-cursor](https://github.com/HManzano1012/opencode-cursor).

## Fork lineage

> [!NOTE]
> **Maintainer:** [HManzano1012](https://github.com/HManzano1012) — [HManzano1012/opencode-cursor](https://github.com/HManzano1012/opencode-cursor).
>
> **Fork lineage:** [ephraimduncan/opencode-cursor](https://github.com/ephraimduncan/opencode-cursor) → [PoolPirate/opencode-cursor](https://github.com/PoolPirate/opencode-cursor) (npm: `@playwo/opencode-cursor-oauth`) → this repository (npm: `@hmanzano1012/opencode-cursor-oauth`).
>
> This is an independent fork. It is not endorsed by the original authors, PoolPirate, or Cursor.

## Changes in this fork

- Fixes Cursor model list after OAuth: real models appear instead of only the `cursor-login` placeholder (`Sign in with Cursor`).
- Unified `activateCursorProvider()`; `auth.loader` updates the provider and returns models; `provider.models` discovers via OAuth when cache is empty; `config()` hydrates models from stored OAuth credentials.
- `loadStoredCursorCredentials()` reads OpenCode auth from `~/.local/share/opencode/`.
- Placeholder `cursor-login`, discovery cache, and helpers in `provider/models.ts`.
- OpenCode `>=1.14.18`, `@opencode-ai/plugin` ^1.16.2; regression tests for loader, `provider.models`, and `config` with saved auth.
- Technical notes: [docs/plans/2026-06-08-cursor-provider-compatibility.md](docs/plans/2026-06-08-cursor-provider-compatibility.md), [docs/architecture/how-it-works.md](docs/architecture/how-it-works.md).

## What it does

This is an [OpenCode](https://opencode.ai) plugin that lets you use **Cursor cloud models** (Claude, GPT, Gemini, and whatever your Cursor account exposes) from inside OpenCode.

- **OAuth login** to Cursor in the browser
- **Model discovery** — loads the models available to your Cursor account
- **Local OpenAI-compatible proxy** — translates OpenCode’s requests to Cursor’s gRPC API
- **Token refresh** — refreshes access tokens so sessions keep working

There are **no extra runtime requirements** beyond what OpenCode already needs: you do not install Node, Python, or Docker separately for this plugin. Enable it in OpenCode’s config and complete login in the UI.

This package targets OpenCode `1.14.18+` (tested through `1.16.x`) and ships a dedicated server plugin entrypoint (`exports["./server"]`).

## Install

Install the plugin package with OpenCode:

```bash
opencode plugin @hmanzano1012/opencode-cursor-oauth
```

Or add the package to your OpenCode configuration manually (for example `opencode.json`):

```json
{
  "plugin": ["@hmanzano1012/opencode-cursor-oauth"]
}
```

You need **OpenCode 1.14.18+** and a **Cursor account** with API/model access. Add the package to `opencode.json` under `"plugin"`.

## Connect auth and use it

1. Start OpenCode with the plugin enabled.
2. Open **Settings → Providers → Cursor** (wording may vary slightly by OpenCode version).
3. Choose **Login** (or equivalent) and complete **OAuth** in the browser when prompted.
4. After login, pick a Cursor-backed model from the model list and use OpenCode as usual.

If something fails, check that you are signed into the correct Cursor account and that your plan includes the models you expect.

## Stability and issues

This integration can be **buggy** or break when Cursor or OpenCode change their APIs or UI.

> [!TIP]
> If you hit problems, missing models, or confusing errors, please **[open an issue](https://github.com/HManzano1012/opencode-cursor/issues)** on this repository with steps to reproduce and logs or screenshots when possible.

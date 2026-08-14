# opencode-openai-codex-pat

An OpenCode plugin that uses an OpenAI Codex `personal_access_token` (`at-...`) through a separate provider named `openai-codex-personal`.

It does not replace OpenCode's built-in `openai` OAuth provider.

> [!WARNING]
> This is an unofficial compatibility plugin. It uses the ChatGPT Codex backend behavior implemented by the open-source Codex CLI, not a documented public OpenAI API contract. The backend, token format, model availability, and entitlement rules may change. Review OpenAI's applicable terms and policies before using or distributing it.

## What it does

- Validates a PAT against OpenAI's Codex `whoami` endpoint.
- Adds `Authorization`, `ChatGPT-Account-ID`, and the FedRAMP header when applicable.
- Sets the provider base URL directly to the ChatGPT Codex backend; requests do not pass through `api.openai.com`.
- Keeps OpenCode's normal OpenAI OAuth configuration untouched.
- Fetches the account-aware model catalog from the authenticated Codex `/models` backend before using any cache.
- Falls back to the plugin's last successful remote snapshot and then Codex CLI's cache only when the backend is unavailable.
- Does not ship a hard-coded model list.
- Never logs the token.

## Install

Add the npm package to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-openai-codex-pat"]
}
```

OpenCode installs npm plugins with Bun on startup.

## 中文快速开始

在 `~/.config/opencode/opencode.json` 中加入：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-openai-codex-pat"]
}
```

先让 Codex CLI 保存个人访问令牌，再让插件导入：

```powershell
$env:CODEX_ACCESS_TOKEN | codex login --with-access-token

opencode auth login `
  --provider openai-codex-personal `
  --method "Import personal access token from Codex CLI"
```

令牌最终保存在 OpenCode 标准凭证文件 `~/.local/share/opencode/auth.json`。插件不会覆盖内置的 `openai` OAuth 供应商。

## Login

### Import an existing Codex CLI login

First authenticate Codex CLI:

```powershell
$env:CODEX_ACCESS_TOKEN | codex login --with-access-token
```

Then import the credential through OpenCode:

```powershell
opencode auth login `
  --provider openai-codex-personal `
  --method "Import personal access token from Codex CLI"
```

You can also use `/connect` and select **OpenAI Codex Personal Access Token**.

### Paste a PAT directly

Run `opencode auth login`, select `openai-codex-personal`, and choose **Paste Codex personal access token (at-...)**. OpenCode masks the password input. OpenCode initially persists direct password input with its generic `api` credential shape; after validation, the plugin automatically migrates it to its non-refreshing subscription/PAT authorization record.

OpenCode's current plugin API does not expose the password value to the provider `config` hook during the same `/connect` process. After the first direct paste, restart OpenCode once so model discovery can use the newly persisted credential. Subsequent starts refresh the catalog from the backend normally.

OpenCode stores the credential in its standard auth store, normally `~/.local/share/opencode/auth.json`.

## Use

```powershell
opencode run --model openai-codex-personal/gpt-5.6-sol "Reply with OK"
```

Model availability depends on the account and current Codex rollout. At startup the plugin requests:

```text
GET https://chatgpt.com/backend-api/codex/models?client_version=<version>
```

The request carries the PAT and `ChatGPT-Account-ID`. Only models returned with `visibility: "list"` and `supported_in_api: true` are registered in OpenCode. The response is the source of truth.

The model picker uses the backend's advertised reasoning levels. For example, GPT-5.6 Luna exposes Low through Max, while GPT-5.6 Terra and Sol additionally expose Ultra. The backend-provided default is selected unless you choose another variant.

Pricing is read from OpenCode's `models.dev` catalog cache (`~/.cache/opencode/models.json`), using the exact `openai/<model-id>` rate card. If that cache is not present, the plugin requests `https://models.dev/api.json`. Input, output, cached-input read, and cached-input write rates are passed to OpenCode, which applies its normal usage calculation.

Discovery fallback order is:

1. Authenticated Codex backend response.
2. The plugin's last successful response snapshot when its PAT fingerprint matches the active credential.
3. Codex CLI's `~/.codex/models_cache.json` when Codex CLI currently holds the same PAT.
4. An empty catalog; there is no hard-coded model fallback.

`client_version` is pinned to `0.144.4` and is not configurable.

## Security notes

- Treat `at-...` exactly like a password.
- Do not paste it into issues, logs, screenshots, shell history, or chat messages.
- The import flow copies the PAT from Codex CLI's auth store into OpenCode's auth store.
- PATs do not have a refresh-token flow. Re-run both login commands after rotation or expiry.

## How it works

Codex CLI distinguishes PATs by the `at-` prefix, hydrates account metadata with `GET /api/accounts/v1/user-auth-credential/whoami`, and sends the PAT plus `ChatGPT-Account-ID` to the Codex backend. This plugin reproduces that request contract in an OpenCode auth loader.

The provider's base URL is `https://chatgpt.com/backend-api/codex`, so `@ai-sdk/openai` constructs the final `/responses` URL directly. The fetch wrapper does not rewrite requests from `api.openai.com`; it only replaces the authorization headers, adds account metadata, removes the unsupported `max_output_tokens` field, and refuses to attach a PAT to any unexpected origin.

The provider uses a separate ID because OpenCode resolves one auth hook per provider ID. Reusing `openai` would override the built-in OpenAI auth-method menu.

## Development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm pack --dry-run
```

See `RELEASING.md` for the npm publishing checklist.

## Compatibility

- Tested with OpenCode 1.17.20.
- Built against `@opencode-ai/plugin` 1.17.18 types.
- Requires a runtime with standard Fetch and Node.js filesystem APIs; OpenCode's Bun runtime provides both.

## References

- [OpenCode plugin documentation](https://opencode.ai/docs/plugins/)
- [OpenCode built-in Codex auth implementation](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/plugin/openai/codex.ts)
- [Codex PAT implementation](https://github.com/openai/codex/blob/main/codex-rs/login/src/auth/personal_access_token.rs)
- [Codex bearer auth headers](https://github.com/openai/codex/blob/main/codex-rs/model-provider/src/bearer_auth_provider.rs)

## License

MIT

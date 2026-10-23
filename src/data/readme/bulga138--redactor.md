# REDACTOR

**Keeps credentials out of your model's context.** An [OpenCode](https://opencode.ai) V2 plugin.

Every tool result — file reads, shell output, web fetches, MCP payloads — is scanned for
credential-shaped strings and the secret is replaced with `[REDACTED:type]` _before_ the model
sees it. The model still gets the surrounding context, never the key.

```diff
- export const key = "sk-proj-abc123…"
+ export const key = "[REDACTED:sk_key]"
```

## Why

A secret that reaches the model is a secret that reaches the provider, the session log, every
compaction summary, and every future turn. Re-reading the file does not help — the model already
has the value. REDACTOR removes it at the source.

## Install

```jsonc
// opencode.json
{
  "plugins": ["@bulga138/redactor"],
}
```

Requires OpenCode 2.x (the V2 plugin API).

## How it works

1. `ctx.tool.hook("execute.after")` — rewrites the tool result in place: the secret never reaches
   the model, and OpenCode persists the already-redacted result.
2. `ctx.session.hook("context")` — safety net for results stored before the plugin loaded or
   produced by tools that bypass the hook. Only tool results are touched; your prompts and the
   model's own text are left alone.

Tool **inputs** are never rewritten — changing them would make the model believe it ran a
different command than it actually ran.

## What it catches

| Family          | Examples                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cloud           | `AKIA…`/`ASIA…`, `aws_secret_access_key=…`, Azure `AccountKey=…`, DigitalOcean `dop_v1_…`, Vercel `vcp_…`, Netlify `nfp_…`, Fly.io `fm2_…`, HashiCorp Vault `hvs.`/`hvb.`, Terraform `…atlasv1.`, Doppler `dp.pt.`, Pulumi `pul-`, Databricks `dapi…`, age keys                                                                                                          |
| Model providers | `sk-…`, `sk-proj-…`, `sk-or-v1-…` (OpenRouter), `AIza…` (Gemini), `GOCSPX-…`, Groq `gsk_…`, xAI `xai-…`, Perplexity `pplx-…`, Replicate `r8_…`, Google OAuth `ya29.`, DeepSeek/Mistral/Cohere (via generic assignment)                                                                                                                                                   |
| VCS             | `ghp_`/`gho_`/`ghs_`/`ghr_`/`github_pat_…`, `glpat-…`, Docker Hub `dckr_pat_…`, CircleCI `CCIPAT_…`/`CCIPRJ_…`                                                                                                                                                                                                                                                           |
| SaaS            | Slack `xox…`/`xapp-`, Stripe `sk_live_…`/`whsec_…`, npm `npm_…`, HuggingFace `hf_…`, Twilio, Telegram, Sentry DSN, Discord webhooks, Grafana `glsa_…`/`glc_…`, Notion `ntn_…`, Airtable `pat…`, Postman `PMAK-…`, Atlassian `ATATT3…`, Mailchimp `…-us12`, SendGrid `SG.…`, Shopify `shpat_…`, Square `sq0atp-…`/`EAAA…`, Braintree, Facebook `EAA…`, Twitter/X `A{22}…` |
| Registries      | PyPI `pypi-AgEI…`, RubyGems `rubygems_…`                                                                                                                                                                                                                                                                                                                                 |
| Transport       | `Authorization: Bearer …`, `postgres://user:pass@…`, `https://user:pass@…`                                                                                                                                                                                                                                                                                               |
| Generic         | `api_key=…`, `"client_secret": "…"`, `FOO_TOKEN=…`, PEM private key blocks, JWTs                                                                                                                                                                                                                                                                                         |

Matches are replaced with `[REDACTED:{type}]`, so the model can still see that _a_ credential was
there and which kind it was. Assignment-style matches with a short value (e.g. `DB_PASSWORD=ab12`)
are also caught when the key name itself says "secret"/"token"/"password"/….

When a command references a secret-named variable (`echo $API_KEY`, `process.env.TOKEN`, …) the
tool output is treated as the secret itself: short outputs are fully replaced with
`[REDACTED:env_var_leak]`, longer ones keep their text but carry the note below. Tool inputs are
still never rewritten. Commands that _search_ for a secret name (`grep "API_KEY" src/`) are not
destroyed — their output is scanned line by line and any assignment value is redacted, plus a
guidance note is appended.

Reading a secret-bearing file counts as a leak, not just its content. When a command reads a file
whose name matches `secretPaths` (`.env`, `.env.*`, `*.pem`, `*.key`, `credentials`, `.npmrc`, …)
the whole tool output is replaced with `[REDACTED:secret_file:.env]` and the note below — so
`base64 .env` or `cat .env` cannot smuggle the values past the pattern matcher. Names in
`allowPaths` (`.env.example`, `.env.template`, `example.env`, …) stay readable, and commands that
merely _search_ for those names (`rg ".env" src/`) are not destroyed. Switch the whole thing off
with `redactSecretFiles: false`.

Matches are also followed by a short note telling the model not to print the value and to verify it
is non-null before use.

**Precision over recall:** obvious placeholders (`your-api-key-here`, `sk-EXAMPLE…`, `changeme`,
`xxx`) are left untouched, and generic assignment matching needs a long enough value to fire.

## Configuration

Env vars (highest priority):

| Var                            | Default | Description                                                               |
| ------------------------------ | ------- | ------------------------------------------------------------------------- |
| `REDACTOR_ENABLED`             | `true`  | Master switch.                                                            |
| `REDACTOR_SKIP_TOOLS`          | –       | Comma-separated tool names whose output is not touched (e.g. `read`).     |
| `REDACTOR_ALLOW`               | –       | Comma-separated literal values that survive redaction (your test keys).   |
| `REDACTOR_LOG`                 | `false` | Log every redaction to the OpenCode server log.                           |
| `REDACTOR_REDACT_SECRET_FILES` | `true`  | Replace the whole output when a command reads a secret-looking file.      |
| `REDACTOR_SECRET_PATHS`        | –       | Extra file-name patterns to treat as secret (added to the built-in list). |
| `REDACTOR_ALLOW_PATHS`         | –       | File-name patterns that stay readable even when they match (templates).   |

Config file at `~/.config/redactor/config.json` (or `.redactor/config.json` in the project, which
wins):

```json
{
  "enabled": true,
  "skipTools": ["read"],
  "allow": ["test_key_123"],
  "log": false,
  "redactSecretFiles": true,
  "secretPaths": [".env", "*.pem"],
  "allowPaths": [".env.example"]
}
```

Or inline in `opencode.json` (OpenCode 2.x) — the same keys:

```jsonc
{
  "plugins": [{ "package": "@bulga138/redactor", "options": { "redactSecretFiles": false } }],
}
```

Precedence: env vars > project file > plugin options > global file > defaults. `secretPaths` and
`allowPaths` are additive — every layer contributes patterns.

## Limitations

- A secret already in the model's context stays there (start a new session to drop it).
- Tool inputs are not rewritten (see above).
- A secret split across two tool calls is not detected — this is not a DLP product.
- `git show HEAD:.env` and `git diff` output is not covered by the secret-file trigger (a git command is not a file read).

## Sources

Pattern coverage was informed by the MIT-licensed community sets
[odomojuli/regextokens](https://github.com/odomojuli/regextokens) and
[Rkcr7/GitSentry](https://github.com/Rkcr7/GitSentry). The regexes here are written by us, not
copied. [mazen160/secrets-patterns-db](https://github.com/mazen160/secrets-patterns-db) (CC-BY-SA-4.0)
was consulted for reference only — none of its data is embedded in this plugin, because embedding
it would force the plugin itself to be ShareAlike.

## License

MIT

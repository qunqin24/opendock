<h1><img src="https://raw.githubusercontent.com/expiracy/autocode/3cc6181ca9e7f02c8511a71dc1a1c054272c5d91/docs/assets/logo.svg" alt="AutoCode" width="460"></h1>

Model-based shell command approval for **OpenCode 2**. AutoCode reviews pending approval requests using your coding model or a separate reviewer.

- **Automatic reviews:** approve, ask you, or deny each eligible command.
- **Native settings:** choose models and limits with `/autocode config`.
- **Visible decisions:** inspect recent verdicts, reasons, models, and timings with `/autocode log`.
- **Your restrictions apply:** resolved permission denies and OpenCode hard policies stay enforced.

![AutoCode settings popup inside the full OpenCode application](https://raw.githubusercontent.com/expiracy/autocode/3cc6181ca9e7f02c8511a71dc1a1c054272c5d91/docs/assets/settings.png)

*Native settings in OpenCode 2.0.28, captured with an isolated test profile. [Capture details](https://github.com/expiracy/autocode/blob/3cc6181ca9e7f02c8511a71dc1a1c054272c5d91/docs/assets/README.md).*

## Install

Add this entry to `plugins` in your global `~/.config/opencode/opencode.jsonc` or `opencode.json`, then restart OpenCode:

```jsonc
{
  "plugins": [
    { "package": "opencode-autocode@0.1.0", "options": {} }
  ]
}
```

- OpenCode installs the package; keep **one** global AutoCode registration.
- This example pins **0.1.0**. `@latest` follows the default release; `@next` follows prereleases. Check [npm versions](https://www.npmjs.com/package/opencode-autocode?activeTab=versions).
- Tested with **OpenCode 2.0.28** on Linux and macOS. Requires the v2 plugin API; development uses Node.js **22.18+**.

AutoCode reviews only shell requests that OpenCode resolves to **`ask`**. Existing `allow` rules skip review. If you need an `ask` rule, follow the [permission configuration guide](https://github.com/expiracy/autocode/blob/main/docs/configuration.md#enable-reviews): rule order matters, so preserve your existing denies.

Open `/autocode config`, choose your reviewer, and save. Try:

> Run exactly this shell command: `printf autocode-check`. Then report its output.

An approved command runs automatically. An `ask` verdict or review failure leaves the normal approval prompt with an `autocode:` explanation.

## Commands

| Command | Purpose |
| --- | --- |
| `/autocode config` | Enable reviews; choose model, variant, timeout, and context budget. |
| `/autocode log` | Search, inspect, refresh, or clear this project's latest 100 reviews. |
| `/autocode status` | View effective settings, including project overrides. |
| `/autocode help` or `/autocode` | Show command help. |

All four also appear in the command palette and work while automatic reviews are disabled. They make no model calls. Settings and diagnostic failures show native error notifications, with details and retry actions in the relevant dialog.

![AutoCode review popup over the OpenCode conversation](https://raw.githubusercontent.com/expiracy/autocode/3cc6181ca9e7f02c8511a71dc1a1c054272c5d91/docs/assets/review-log.png)

*Demonstration review using an isolated test provider. A logged verdict records the review; it does not prove command execution.*

## Defaults and boundaries

| Setting | Default |
| --- | --- |
| Approval model | Inherit the proposing assistant's model and variant. |
| Review timeout | 30 seconds. |
| Context budget | 64,000 serialized JSON characters. |
| Enabled | Yes. |

- One tool-free model call per eligible request; provider latency and charges apply.
- Reviews include the full command, working directory, and conversation. A separate provider receives that context.
- Missing evidence, oversized context, invalid responses, timeouts, and provider errors fall back to manual approval. Context is never truncated to obtain approval.
- Model judgments can be wrong. Set firm restrictions in OpenCode permissions and policies; each approval covers only one request.
- The durable project log excludes raw command/conversation/provider-error fields. Reasons may quote context; review them before sharing.

## Guides and support

- [Configuration, permission rules, models, and settings](https://github.com/expiracy/autocode/blob/main/docs/configuration.md)
- [Local installation, troubleshooting, updates, and removal](https://github.com/expiracy/autocode/blob/main/docs/troubleshooting.md)
- [Contributing](https://github.com/expiracy/autocode/blob/main/CONTRIBUTING.md) · [Release checklist](https://github.com/expiracy/autocode/blob/main/RELEASING.md) · [Changelog](https://github.com/expiracy/autocode/blob/main/CHANGELOG.md)
- [Report an issue](https://github.com/expiracy/autocode/issues) with versions and sanitized diagnostics.

CI tests one recorded tarball through installation and native host integrations. Manual delivery defaults to rehearsal; npm publication requires human approval. GitHub release packages use version tags and reviewable drafts. Licensed under [MIT](https://github.com/expiracy/autocode/blob/main/LICENSE).

[![Support on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/expiracy)

# AutoCode

Model-based shell command approval for OpenCode 2. AutoCode reviews commands that would otherwise need your approval, using your coding model or a separate reviewer you choose. Existing permission denials and hard policies stay enforced.

![AutoCode config dialog with inherited reviewer model, timeout, and context controls](https://raw.githubusercontent.com/expiracy/autocode/18f67fb23dda26c5665400b4cb6bb54f0f3d707a/docs/assets/settings.png)

*The native config dialog in OpenCode 2.0.28, shown with AutoCode's defaults.*

- **Choose your reviewer.** Inherit the coding model and variant, or select a separate connected model for approvals.
- **Configure it in OpenCode.** Use `/autocode config` to change the reviewer, timeout, context budget, or enabled state.
- **Inspect each review.** Use `/autocode log` to see recent decisions, reasons, models, and timings for the current project.

**Beta release channel:** [`opencode-autocode@next`](https://www.npmjs.com/package/opencode-autocode). The install example follows this channel. To pin a particular release, replace `next` with an exact version from [npm's version list](https://www.npmjs.com/package/opencode-autocode?activeTab=versions).

Tested with **OpenCode 2.0.28** and its v2 plugin API on Linux and macOS. OpenCode v1 is not supported. Local development requires Node.js 22.18 or newer; CI covers Node.js 22.18 and 24.

## Install

### From npm

Merge this registration into your global `~/.config/opencode/opencode.jsonc` or `opencode.json`. OpenCode installs the package from the `plugins` entry; a separate `npm install -g` is unnecessary.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-autocode@next",
      "options": {}
    }
  ]
}
```

Use your configured OpenCode config directory if it differs from the default. Keep one global AutoCode registration so its settings dialog can find it.

### Use a local checkout

For local development or to try a specific source revision, build with **Node.js 22.18 or newer** and npm:

```sh
git clone https://github.com/expiracy/autocode.git
cd autocode
npm ci
npm run build
```

Use the same global configuration above, but replace `package` with the absolute path to your checkout:

```json
{
  "package": "/absolute/path/autocode",
  "options": {}
}
```

### Enable reviews and try it

AutoCode only reviews the `shell` requests OpenCode resolves to `ask`. If your current rules already ask for shell approval, keep them. To make other shell requests eligible, merge an `ask` rule into your existing `permissions` array:

```jsonc
"permissions": [
  { "action": "shell", "resource": "*", "effect": "ask" }
  // Keep your more specific allow/deny rules after this broad rule.
]
```

**Preserve your existing restrictions.** OpenCode uses the last matching permission rule, so appending a broad `ask` rule after a specific `deny` can change OpenCode's resolved decision. See [permission rules](https://opencode.ai/v2/docs/permissions/) and the [complete configuration example](examples/opencode.jsonc).

Restart OpenCode, enter `/autocode config`, and choose **Save settings** after any changes. You can also open **AutoCode config** from the command palette. The dialog lets you enable reviews, choose an approval model and its variant, adjust the timeout and context budget, and view the review log.

Try this harmless prompt in a new conversation:

> Run exactly this shell command: `printf autocode-check`. Then report its output.

With a working reviewer, the command should run automatically if the model approves it. A model can still ask for manual review; the permission prompt includes an `autocode:` explanation when AutoCode handles the request.

## Commands and review log

| Command | Opens |
| --- | --- |
| `/autocode config` | The global settings editor. |
| `/autocode log` | Recent AutoCode reviews for the current project. |
| `/autocode status` | The effective project settings, including overrides. |
| `/autocode help` or `/autocode` | Command help. |

These commands also appear in the command palette and remain available while
automatic approval is disabled. `/autocode settings` is no longer an alias;
use `/autocode config` to edit settings. None of these commands calls a model.

The review log keeps the latest **100** reviews in OpenCode's durable plugin
storage, scoped to the current project location. It survives restarts and settings
reloads. Search verdicts, reasons, models, or sessions; select an entry for its
timestamp, reviewer model and variant, duration, reason, and session ID. **Refresh**
loads newer entries, and **Clear review log** removes this project's history after
confirmation. The settings editor also has a **View review log** action.

![AutoCode review details showing a verdict, reviewer model, reason, and timing](https://raw.githubusercontent.com/expiracy/autocode/18f67fb23dda26c5665400b4cb6bb54f0f3d707a/docs/assets/review-log.png)

*Demonstration review in OpenCode 2.0.28 using an isolated test provider. [Capture details](https://github.com/expiracy/autocode/blob/18f67fb23dda26c5665400b4cb6bb54f0f3d707a/docs/assets/README.md).*

Entries record AutoCode's reviewer verdict or manual fallback. They do not prove
that a command ran: OpenCode can still reject a reviewer-approved command through
a hard policy. Requests already allowed or denied by OpenCode, non-shell requests,
and requests made while AutoCode is disabled do not create review entries. The
log starts recording after this version is loaded; it does not import old history.

The log has no raw command, conversation, or provider-error payload fields.
Reasons are limited to 1000 characters and may quote supplied context, so
review them before sharing diagnostics. Logging failures do not delay or change
permission decisions.

## How approval works

For each eligible request, AutoCode obtains the full originating shell command, working directory, and conversation context from OpenCode. It asks the reviewer to return one decision:

| Decision | Result |
| --- | --- |
| `allow` | Approve this pending request. |
| `ask` | Leave OpenCode's normal approval prompt for you. |
| `deny` | Reject this pending request. |

Each review applies to one request. AutoCode never saves an “Allow always” rule. Existing `allow` decisions skip review. Non-shell permissions follow OpenCode's normal behavior.

### Hard rejections stay enforced

Commands whose resolved OpenCode permission is `deny` stay blocked without calling the reviewer. This also covers compound commands containing a denied resource and conflicts with a saved “Allow always” approval. AutoCode leaves a denial from an earlier permission hook unchanged.

OpenCode's hard [tool policies](https://opencode.ai/v2/docs/policies/) also remain enforced. A policy can reject a command after the reviewer returns `allow`, so a model call may occur before a policy rejection. These guarantees follow OpenCode's normal configuration precedence; AutoCode does not maintain a separate deny list or change permission rules and policies. See the [native permission hook](https://opencode.ai/v2/docs/build/plugins/#permissions).

### Manual review on missing evidence or failure

AutoCode leaves the normal approval prompt when it lacks user intent or the full command, cannot resolve a model, receives an invalid reviewer response, encounters a provider error, or exceeds the deadline. It never approves from parsed permission resources alone: those resources can omit parts of a compound shell command.

All serialized review data must fit `maxContextChars`. AutoCode does not truncate the conversation or command to obtain approval. If the budget is exceeded, compact the session or increase the budget. Compaction may remove evidence of authorization, so the reviewer may still ask.

Model judgments can be wrong. Express firm restrictions with OpenCode permission rules or policies.

## Choose a reviewer

Omit `options.model`, or set it to `"inherit"`, to use the model and variant of the assistant that proposed the command. If that metadata is unavailable, AutoCode falls back to the session model, then OpenCode's default model.

Use **AutoCode settings → Approval model** to select another connected model. This does not change the coding model. For JSON configuration, replace the registration's `options` with:

```json
{
  "model": "provider/model"
}
```

The first slash separates the provider ID from the model ID. For example, `"openrouter/vendor/model"` selects provider `openrouter` and model `vendor/model`. To choose a reasoning variant, use the object form:

```json
{
  "model": {
    "providerID": "provider",
    "id": "model",
    "variant": "high"
  }
}
```

Replace these placeholders with a connected, enabled model. `variant` is optional and must be supported by that model; the settings dialog lists available variants.

### Cost and context privacy

AutoCode uses OpenCode's existing provider connections. Each eligible request makes at most one tool-free review call, with the provider's normal latency, limits, and charges. The review includes the command, working directory, and session conversation returned by OpenCode. Choosing another provider sends that context to the selected provider. Review this choice before using AutoCode with sensitive conversations.

## Settings reference

| Option | Default | Accepted values |
| --- | --- | --- |
| `enabled` | `true` | Boolean. `false` leaves approvals to OpenCode. |
| `model` | Inherit | Omit, use `"inherit"`, use `"provider/model"`, or use `{ "providerID": "…", "id": "…", "variant": "…" }` with optional `variant`. |
| `timeoutMs` | `30000` | Integer from `1` to `300000`; deadline for the complete review, in milliseconds. |
| `maxContextChars` | `64000` | Integer from `1000` to `1000000`; maximum serialized review data size, in JSON characters. |

Unknown options, misspelled model fields, empty identifiers, and invalid values fail plugin setup with a configuration error.

The settings dialog edits the existing plugin `options` in your **global** OpenCode configuration. Saving preserves unrelated configuration and comments, and creates a backup under `.autocode/settings-backups/` beside that file. Concurrent edits are detected; reopen settings if the file changed while you were editing. Symlinked profiles must be edited at the original file.

OpenCode reloads saved options for subsequent reviews. Project-specific plugin options still override global defaults, so a global change may not change behavior in a project with an override. Options also remain editable directly as JSON. Closing an edited settings draft offers to discard it or keep editing.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `/autocode config` or the palette entry is missing | Use OpenCode v2, confirm the global plugin registration loaded, and restart OpenCode including the terminal client. For a local checkout, run `npm ci` and `npm run build` first. |
| Commands run without a reviewer | Check that AutoCode is enabled and that OpenCode resolves the request to `ask`. Existing `allow` rules skip AutoCode. |
| Commands remain blocked | Check permission denies and hard tool policies. AutoCode cannot override them. A reviewer may also deliberately return `deny`. |
| The normal prompt remains | Read its `autocode:` explanation. Check the selected provider connection, model and variant, timeout, context budget, and availability of the full command and user context. |
| The OpenCode free model rejects a review | Some free models reject isolated review requests even when they work as the coding model. Choose a separate connected reviewer in **Approval model**; keep your coding model selected. |
| Saving says multiple registrations exist | Keep one global AutoCode registration, including across `opencode.json` and `opencode.jsonc`. Remove an old local-path registration when switching to the npm package. |
| Saved settings seem ineffective in one project | Check that project's plugin options for an override. Confirm you are editing the config directory used by the running OpenCode instance. |
| The log is empty | Only reviews made by this AutoCode version appear. Existing allow/deny decisions and requests while disabled skip review. Use **Refresh** after a new review and check that you are in the same project. |
| A log entry says `allow`, but the command was blocked | The entry is AutoCode's verdict. OpenCode's hard policies can reject the command afterward. |

If the problem persists, [open an issue](https://github.com/expiracy/autocode/issues) with your OpenCode and AutoCode versions, installation method, sanitized plugin options, and the relevant error. Remove credentials and private conversation content before sharing.

## Update or uninstall

The npm example uses the `next` beta channel. For a fixed version, replace the registration's `package` with an exact specifier such as `opencode-autocode@0.1.0-beta.1`. Review the [changelog](CHANGELOG.md) before upgrading, and restart OpenCode after changing its registration. While using a local checkout, pull the desired revision, run `npm ci` and `npm run build`, then restart OpenCode.

To pause automatic reviews, disable AutoCode in settings. To uninstall, clear any review history you want removed through `/autocode log`, remove its entry from the global `plugins` array and any project registrations, then restart OpenCode. Keep your permission rules and policies as needed for normal OpenCode approvals. Optional settings backups and OpenCode's plugin storage remain after removing a registration.

## Development and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for checks, isolated integration tests, and opt-in real provider validation. See [RELEASING.md](RELEASING.md) for the release checklist. This repository is licensed under [MIT](LICENSE).

Pull requests and `main` run typechecking, tests, workflow linting, and one package
build. CI records the source commit, version, licence, release channel, and
checksums, then tests that exact tarball through fresh-cache installation and
OpenCode integrations. The aggregate **CI required** check gates merges.

The manual **Release** workflow defaults to rehearsal. Only an explicit `stage`
request from `main` can deliver the tested artifact to npm through stage-only
OIDC trusted publishing. Final publication requires a maintainer to inspect and
approve the staged package at npm with 2FA. See the release checklist for the
required repository environment and npm trust setup; a passing rehearsal does
not establish that npm trust has been configured.

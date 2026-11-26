<h1 align="center">OpenCode Predictions</h1>

<p align="center">
  <strong>Your next prompt, one Tab away.</strong><br />
  AI-powered next-prompt suggestions for OpenCode Desktop and the interactive CLI.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-predictions"><img src="https://img.shields.io/npm/v/opencode-predictions?style=flat-square&amp;color=b9efcb&amp;labelColor=27352d" alt="npm version" /></a>
  <a href="https://github.com/fcoouto/opencode-predictions/actions/workflows/check.yml"><img src="https://github.com/fcoouto/opencode-predictions/actions/workflows/check.yml/badge.svg" alt="Build and test status" /></a>
  <a href="#compatibility"><img src="https://img.shields.io/badge/OpenCode-V2-b9efcb?style=flat-square&amp;labelColor=27352d" alt="Requires OpenCode V2" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-b9efcb?style=flat-square&amp;labelColor=27352d" alt="MIT license" /></a>
  <a href="#support-development"><img src="https://img.shields.io/badge/Tip%20jar-b9efcb?style=flat-square&amp;logo=githubsponsors&amp;logoColor=27352d" alt="Tip jar" /></a>
</p>

<p align="center">
  <a href="#get-started">Get started</a> &middot;
  <a href="#controls">Controls</a> &middot;
  <a href="#troubleshooting">Troubleshooting</a> &middot;
  <a href="#predictions-setup">Settings</a> &middot;
  <a href="#cost-and-privacy">Cost &amp; privacy</a>
</p>

<a id="keep-the-next-step-in-sight"></a>

<p align="center">
  <img src="https://raw.githubusercontent.com/fcoouto/opencode-predictions/main/assets/predictions-desktop.gif" width="768" alt="OpenCode Desktop suggests “Run the targeted tests.” Tab accepts the suggestion, and the user adds “first, then show failures” without sending it." />
</p>

<p align="center">
  In this scripted demo, OpenCode suggests <strong>“Run the targeted tests.”</strong>
  <kbd>Tab</kbd> adds it to the draft for editing. <kbd>Enter</kbd> sends the draft.
</p>

<a id="how-to-install"></a>

## Get started

**Requires OpenCode V2.** Check [compatibility](#compatibility) if your server
runs on Windows.

<a id="1-add-the-plugin"></a>

### 1. Install the plugin

Run this in your terminal:

```sh
opencode plugin add opencode-predictions
```

OpenCode downloads the plugin from [npm](https://www.npmjs.com/package/opencode-predictions)
and configures it for both Desktop and the interactive CLI.

Using a remote server? Install the same plugin version on the client and server.

[Manual setup and updates](#install-options)

### 2. Choose a prediction model

> [!IMPORTANT]
> Once you save a model, predictions run after replies by default. Each provider
> tried receives recent chat text, and each attempt can use quota or incur charges.
> See [cost and privacy](#cost-and-privacy).

#### Desktop

1. Open **Settings → Predictions**.
2. Select **Add a model**, choose an enabled model, then confirm with **Add model**.
3. Select **Save changes**.

#### Interactive CLI

1. Open **Predictions Setup** from the command palette.
2. Open **Models → Add a model** and choose an enabled model. If asked, choose
   **Default reasoning**.
3. Press <kbd>Esc</kbd> to return to **Predictions Setup**, then select **Save changes**.

If **Predictions Setup** is missing after install, run `/reload` in OpenCode.
If the model you want is missing, see [No models appear or match](#no-models-appear-or-match).

### 3. Try it

Send a prompt and wait for the reply to finish. If a suggestion appears, press
<kbd>Tab</kbd> to add it to your draft, or keep typing to ignore it.

If no suggestion appears, see [Troubleshooting](#troubleshooting).

### Install options

<details>
<summary><strong>Install manually if you can't run the command</strong></summary>

Open your global `opencode.json` or `opencode.jsonc` (usually in
`~/.config/opencode/` on macOS and Linux). Add `"opencode-predictions"` to the
top-level `plugins` array. If the array is missing, add the one below.
Keep any existing settings and plugins.

If you have no config file, create `opencode.jsonc` with the full example:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "opencode-predictions"
  ]
}
```

</details>

<details>
<summary><strong>Update, pin a release, or follow the development branch</strong></summary>

The standard install does not update automatically. To update it, run
`opencode plugin update opencode-predictions`.

Replace `opencode-predictions` in the install command or `plugins` array with
`opencode-predictions@0.4.4` to pin that release, or
`github:fcoouto/opencode-predictions#main` to follow the development branch.

</details>

## Controls

### Keyboard shortcuts

- **Accept for editing:** <kbd>Tab</kbd> adds the visible suggestion to your
  draft. It never sends it. On Desktop, Tab inserts the full text even if the
  preview ends in an ellipsis.

- **Ask for a suggestion:** With the empty prompt box focused, press
  <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>
  (macOS: <kbd>Option</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>).
  This never inserts or sends text.

Ask again to try another available model. With **Escalation Mode** set to **Off**,
asking again starts a fresh request instead.

### Command palette

- **Predict next prompt:** Ask without the shortcut. Use this if your terminal
  doesn't pass the keys through.
- **Predictions Setup:** [Change models and behavior](#predictions-setup).
- **Prediction status and preview:** Check matched models, errors, or the
  current suggestion.

### Predict only when asked

In **Predictions Setup → Behavior**, leave **Enable Predictions** on, turn
**Predict After Replies** off, then save.

<details>
<summary><strong>When suggestions hide, return, or stay unavailable</strong></summary>

Typing hides the suggestion without discarding it. Escape keeps its normal host
behavior. Tab keeps its native behavior when no valid suggestion
is visible. Suggestions do not appear in shell mode, during IME composition, in
menus/dialogs, or while permission/form input is pending.

Clear the draft to bring back the suggestion for the same reply if it is
still available.

Switching chats hides a suggestion without discarding it. Returning to the same
completed response and configuration restores it without another model call.
Suggestions stay in memory, not on disk. Reloading or restarting the plugin
clears them.

Avoid using another plugin that also consumes Tab for ghost text in the same prompt.

**Older chats.** The shortcut and command-palette action
use the latest completed turn with usable conversation text, even when historical
completion markers are missing. They still require an idle chat and empty, eligible
input; an unfinished or interrupted latest turn cannot reuse an older answer.

**Usable context.** A completed assistant reply with visible text is sufficient even when a continuation
or compaction leaves no new user message. If assistant-only continuations fill the
recent-turn window, the latest eligible human request is retained separately,
including grouped steering messages but not that older turn's assistant replies.

Under the 32,768-byte prompt limit, older optional turns are dropped first; retained
human text and the latest response use marked excerpts when needed.
This preserves context but does not guarantee the model uses the correct speaker perspective.

Synthetic instructions, tool output, reasoning and compaction summaries remain excluded.
Predictions never borrow text across a successful compaction boundary or reuse an
older answer when the latest response is unfinished or has no usable visible text.

**When no context is usable.** The prompt says **Prediction unavailable
for this response. Continue typing your next prompt.**

</details>

## Troubleshooting

### No suggestion appeared

Wait for the reply to finish and clear the prompt box. Check that
**Enable Predictions** is on, then run **Predict next prompt**.

If the model had no suggestion, keep typing or try another model when offered.

### No models appear or match

[Connect the provider](https://opencode.ai/docs/providers#setup) on the selected
server, then choose an enabled model in **Predictions Setup**.

If nothing matches, try **Default reasoning** for a selected model. For a
pattern, check its match count and try removing `#variant`.

### Save is disabled

If nothing changed, there is nothing to save. Fix any errors shown in Setup. If
it says **Read-only**, follow the [Save recovery steps](#is-save-available-for-you).

### Still stuck?

Open **Prediction status and preview**. Reopen it to refresh. **Last failure**
can refer to an earlier request. See [failure notifications](#failure-notifications)
for more detail.

## Predictions Setup

Open **Predictions Setup** from the command palette in Desktop or CLI.
Desktop also has **Settings → Predictions**. The optional
[standing context file](#global-standing-context) is set on the server, not here.

### What you can change

- **Behavior:** Turn predictions on or off, choose when they run, and set
  [how to try another model](#progress-and-alternative-predictions).

- **Models:** Choose a model and optionally [add a backup](#model-groups).

- **Advanced:** Change the timeout, how much recent chat to use, or debug notices.
  [GitHub PR context](#linked-github-pr-context) is off by default. Before enabling
  it, check what it can share from private PRs.

<details>
<summary><strong>See Predictions Setup on Desktop</strong></summary>

<p align="center">
  <img src="docs/images/predictions-setup.png" width="900" alt="The Predictions page in OpenCode Desktop settings: Behavior switches, an explanation of the fallback order, and the first fallback group." />
</p>

<p align="center"><sub>OpenCode Desktop → Settings → Predictions. Example models are fictional.</sub></p>

</details>

### Review, then save

Select **Save changes** to apply your draft across projects on the selected
server.

**Save from one place at a time.** Simultaneous saves can overwrite each other,
even when you edit different settings.

**Discard changes** restores the last saved settings. To start over, choose
**Reset to defaults**, then **Save changes**. Reset leaves the server's standing
context file setting intact.

Setup, match previews, and saving do not call a prediction model, look up GitHub
credentials, or fetch PRs.

<a id="is-save-available-for-you"></a>

### If Save is unavailable

If Setup shows **Read-only**, follow the reason it gives. The server may block
changes because of file access, a damaged preferences file, or admin settings.
If someone else runs the server, ask them to check. If you manage the server,
see [file repair and recovery](#limits-and-recovery).

**Saved, not active** means the server wrote the file but couldn't confirm it
was using the new settings. If you see this message or lose the connection
during Save, reopen Setup and check the saved values before trying again.

### Where settings are stored

**Predictions Setup** saves to `predictions.json` on the selected server.
It does not edit `opencode.json(c)`, other plugins, or credentials.

<details>
<summary><strong>Server file paths and formats</strong></summary>

| Server environment | Preferences file |
| --- | --- |
| macOS / Linux default | `~/.config/opencode/predictions.json` |
| Absolute `XDG_CONFIG_HOME`, on any platform | `$XDG_CONFIG_HOME/opencode/predictions.json` |
| Windows path convention (see [server limits](#compatibility)) | `%APPDATA%/opencode/predictions.json` |

An explicitly empty/relative `XDG_CONFIG_HOME`, or missing/nonabsolute Windows `APPDATA`, is refused. A trusted configuration-directory symlink is resolved on the server; symlinked active files, hard links, unsafe ownership/write permissions, and unsupported ACLs are refused.

`predictions.json` is the only prediction settings source. Missing fields use
built-in defaults; explicit `false` stays false. `contextFile` can only be set by
editing the file on the server, not through Desktop or CLI settings.

The strict JSON format is:

```json
{
  "version": 1,
  "settings": {
    "automatic": false,
    "models": null
  }
}
```

Omitting `models` or setting it to `null` leaves no prediction models configured. Numeric `null` is invalid, not a request for defaults. The file must be valid UTF-8, at most 65,536 bytes, without comments, trailing commas, or duplicate keys. Unknown members survive saves but do not affect predictions.

</details>

### Limits and recovery

<details>
<summary><strong>Repair a file, recover a backup, or manage remote access</strong></summary>

- **Invalid file:** An unreadable file, malformed JSON, or an unsupported file
  version disables predictions until repaired. Back up the file before editing
  it. If the file opens in Setup but a field is invalid, fix the field or reset
  to defaults. A valid file can stay active even if it is not writable.
- **Lost changes:** Before replacing an existing file, Save writes
  `predictions.json.backup` next to it. Compare it with `predictions.json`.
  Restore only the values you need. Nothing restores automatically, and the
  backup may not contain changes lost during simultaneous saves.
- **Managed server:** If system or managed configuration is present or cannot
  be checked, the plugin does not load or save user prediction preferences.
- **Remote access:** The plugin adds no authentication of its own. Any caller
  the server admits can access preferences, even without signing in if the
  server allows that. Protect the server with OpenCode's access controls.

</details>

<details>
<summary><strong>Move settings from older plugin options</strong></summary>

The plugin ignores old `options` in `opencode.json(c)` and does not import them.
Set those values again in **Predictions Setup**. If you set a `contextFile`, use
the [standing context instructions](#global-standing-context). Remove the old
`options` key but keep the plugin entry. Existing `predictions.json` settings
still apply. If you use a remote server, update both the client and the server
before saving from Setup.

</details>

## Cost and privacy

- **What you may pay:** Each attempt uses its provider's quota or incurs
  charges, including fallback attempts. A model name containing “free” does not
  guarantee free or unlimited use. Cancelling or timing out may not stop
  provider billing. Two clients on the same chat can make separate requests.

- **What gets sent:** Every provider tried receives recent user and assistant
  text, plus an earlier user request when needed.
  If enabled, [a standing context file](#global-standing-context) or
  [linked GitHub PR details](#linked-github-pr-context) can also be sent,
  including private PR descriptions.

- **What stays out:** Unsent drafts, other chats, tool output, reasoning,
  attachments, conversation instructions, and synthetic messages. If OpenCode
  compacts a chat into a summary, the plugin skips that summary and the messages
  from before it. The plugin does not scan project files or learn preferences
  from your chats.

- **What the plugin stores:** It keeps conversation context and suggestions in
  memory. It adds no conversation archive or telemetry. OpenCode and model
  providers have their own retention policies.

<details>
<summary><strong>Context limits and local files</strong></summary>

Long conversation text may be shortened with marked excerpts. The standing
context file is never silently cut off. OpenCode stores plugin code in its
package cache (`~/.cache/opencode/npm/` by default, or under `XDG_CACHE_HOME`).
Settings stay in `predictions.json` on the server. The optional model-pilot tool
writes a JSON report only when run, under `.test-artifacts/` or to `--output`.

</details>

## Settings

Use [Predictions Setup](#predictions-setup) for everyday changes. Set a
[standing context file](#global-standing-context) directly in `predictions.json`.

<details>
<summary><strong>JSON fields and defaults</strong></summary>

These fields live under `settings` in `predictions.json`.

| Setting | Default | Meaning |
| --- | --- | --- |
| `models` | unset | Required. Selector text for one ranking group, or an ordered array of selector groups. |
| `timeoutMs` | `30000` | Maximum wait per model attempt, in milliseconds. |
| `contextTurns` | `3` | Recent interactions to consider, from `1` to `5`. The latest eligible human request is also retained when absent from that window. |
| `contextFile` | unset | Optional absolute or `~/` path to one shared UTF-8 text/Markdown file on the OpenCode server. Maximum `8192` bytes. |
| `includeGithubPRContext` | `false` | Opt in to sending bounded metadata from linked public and accessible private GitHub PRs to prediction models. |
| `automatic` | `true` | Predict after a completed response. Set `false` for manual requests only. |
| `escalation` | `"manual"` | Choose whether to try another model [on request, automatically, or not at all](#progress-and-alternative-predictions). |
| `enabled` | `true` | Enable predictions. |
| `debug` | `false` | Show safe per-model failures, fallback progress, and queue decisions. |

</details>

### Global standing context

**Do not include secrets. Every attempted model receives this file, including
fallback and paid models.**

1. If `predictions.json` does not exist, save your model in **Predictions Setup**
   first.

2. Create a text or Markdown file on the OpenCode server. For example:

   ```markdown
   For inventory reports, prefer XLSX.
   Keep suggested prompts concise.
   Do not suggest publishing or deployment unless I explicitly request it.
   ```

3. Add `contextFile` under `settings` in `predictions.json`. Keep your other
   settings. Use an absolute path or `~/` for the server user's home:

   ```json
   "contextFile": "~/.config/opencode/predictions.md"
   ```

The file applies across projects. Use UTF-8 text, up to **8192 bytes**. To stop
sharing it in new predictions, remove `contextFile` from `settings`.

<details>
<summary><strong>File rules and when edits take effect</strong></summary>

The plugin does not discover project files, read `AGENTS.md`, or merge global
and project context. Project-relative paths and URLs are rejected. If you use
`XDG_CONFIG_HOME`, point to your chosen file explicitly.

The path must point to a regular file with no binary control characters.
Empty or whitespace-only files add nothing.
Unreadable, oversized, or invalid files stop that prediction with an actionable
notice; the plugin never silently ignores or truncates a configured file.
**Prediction status and preview** shows the configured path and last outcome,
not file contents or raw filesystem errors.

Each prediction cycle reads one snapshot and includes it in every model attempt,
including error fallback and alternative predictions. Edits apply to new cycles
after another completed response or a plugin reload. Existing cached suggestions
and their alternatives keep the original snapshot. Use `/reload` to apply edits
to the same completed response; file edits alone do not trigger a reload.
With `escalation: "off"`, an explicit refresh starts a new cycle.

Standing guidance informs relevant preferences and constraints, but current
explicit user instructions take precedence. It does not authorize more work or
override the rules for when to return a suggestion. Model compliance is
best-effort. The file shares the **32,768-byte prompt limit** with conversation
text, so longer guidance can leave less room for chat history.

</details>

### Linked GitHub PR context

**Enabling this permits linked private PR descriptions to be sent to every
attempted prediction provider, including fallback and paid models.**
Leave it off if you do not want to share those details.

This feature is off by default. To opt in, turn on **Include GitHub PR context**
under **Advanced** in **Predictions Setup**, then save.

<details>
<summary><strong>What the plugin reads and how private PR access works</strong></summary>

The plugin reads at most two most-recently-mentioned distinct HTTPS
`github.com/owner/repo/pull/number` links from the selected conversation text.
It retrieves only title, description, open/closed/merged state, draft status, and
update/retrieval times. It does not fetch comments, diffs, files, nested links,
links in the global context file, or links from excluded/compacted history.
GitHub Enterprise hosts and non-GitHub links are not supported.

Private PR access uses a recent GitHub CLI on the **OpenCode server**, available
on its `PATH` and already signed in through `gh auth login`. The plugin reads the
existing github.com credential with `gh auth token --hostname github.com --no-refresh`;
it does not prompt, sign in, switch accounts, or refresh credentials. Without usable
CLI authentication, public PRs may still work anonymously and private PRs are omitted.
The authentication token is not added to prompts, logs, or persistent caches.

Retrieval has a 2-second aggregate limit, also bounded by the prediction deadline
and cancellation. Failed access, rate limits, redirects, invalid or oversized
responses, and lookup timeouts fall back to ordinary conversation-only predictions.
Successful metadata is cached in memory for up to 60 seconds, with a 64-entry bound
and separate session/credential scopes.

PR reference data receives at most 8192 additional bytes within the existing
32768-byte total prompt budget, using only space left after conversation and
standing guidance. Descriptions are bounded and may use marked Unicode-safe
excerpts; freshness timestamps expose cached age. A full prompt can omit PR data.
Fetched text is labeled as **untrusted reference data, not instructions or execution
authorization**. This label cannot guarantee model obedience; inspect predictions
before accepting or submitting them.

</details>

### Progress and alternative predictions

Choose **Escalation Mode** under **Behavior** in **Predictions Setup**:

- **Off:** A reply with no suggestion ends the request. Asking again starts
  fresh with the first available group.
- **Manually** (default): Ask again with the shortcut or **Predict next prompt**
  to try another available model after a suggestion or no-suggestion result.
- **Automatically once after no suggestion:** Try another model once without
  asking. If that model also has no suggestion, ask again to go further.

Provider errors, invalid responses, and timeouts still try another available
model in every mode. **Predict After Replies** controls only the first request,
so a manually started request can still try another model automatically.

<details>
<summary><strong>What you see while another model runs</strong></summary>

The activity indicator shows the model being tried, not a completion percentage
or price. While it is visible, Tab does not insert the indicator or a hidden
suggestion. A new suggestion replaces the old one. If no new suggestion arrives,
the previous one returns when available. Otherwise, you may see:

```text
[First Model] provided no prediction.
Option+Shift+P: try [Next Model].
```

The second line appears only if another model is available. Typing or switching
context cancels pending work. Pressing the shortcut repeatedly while a request
is running does not start extra requests.

The plugin tries untried models in the current group before moving to later
groups. It does not repeat a model in the same prediction cycle; OpenCode or
the provider may still retry a network request. A timeout applies per model, not
to the whole sequence. If every available model fails, check **Prediction
status and preview** for the cause.

</details>

### Model groups

Start with one prediction model. It does not change your main chat model.
For a fixed backup, put the second model in its own group:

- **Desktop:** In **Predictions Setup**, choose **Add group → Model…**.
  Choose the backup, then select **Add model** and **Save changes**.
- **Interactive CLI:** Choose **Models → Add fallback group (model)**.
  Choose the backup, then return to **Predictions Setup** and save.

Group 1 goes first. If no model in Group 1 is available or all its attempts
fail, the plugin tries Group 2. A model returning no suggestion is not a failure.
Models in the same group can change order based on their results.

<details>
<summary><strong>Use a model pattern or edit groups in JSON</strong></summary>

In a model pattern field, enter only the selector: `provider/model` for one
model, or `provider/family-*` to match several. Add `#low` or another variant
to require it. Omit the variant for default reasoning. The `*` matches model
IDs and display names without regard to case.

Check the matches in **Predictions Setup** before saving a broad pattern. It can
match paid models, and the name alone does not tell you the price.

For manual editing, put `models` under `settings` in `predictions.json`, as
shown here. Replace the example IDs with your own and keep your other settings:

```json
{
  "version": 1,
  "settings": {
    "models": ["provider/preferred-model", "provider/backup-model"]
  }
}
```

A string defines one group. Each item in the outer array defines a separate
group. To put multiple selectors in the same group, put them in an inner array
or separate them with commas inside one string. Group order stays fixed.
Overlapping matches belong to the earliest group. Only enabled models that
support the requested variant can be tried.

</details>

### Failure notifications

For **Predictions need a model** or **Prediction settings are invalid**,
open **Predictions Setup**. For other errors, open **Prediction status and
preview** and follow the recovery hint. On Desktop, use the button in the
notice. CLI notices name the command to open.

<details>
<summary><strong>Understand notices, status details, and debug output</strong></summary>

With debug off, the plugin reports an unchanged background problem once per
server and location, not after every reply. A manual **Predict next prompt**
request can explain the outcome again. Successful fallback and cancellation
do not show error notices. If a model is paused, the notice says when you
can try again; it does not schedule another request.

In **Prediction status and preview**, select **Technical details** for host
and plugin versions, timing, and feedback capabilities. This dialog is a
snapshot, not a log.

To see individual attempts, enable **Debug notices** under **Advanced**:

```text
[opencode-predictions] Predictions failed with [<model_display_name>], moving on with [<next_model>]...
Reason: HTTP 429: Free usage limit reached.
Queue: Paused for 60 minutes.
```

Failure notices do not include raw provider errors, credentials, or chat text.
The plugin does not write debug log files.

</details>

### Ranking queue

<details>
<summary><strong>How ranking, cooldowns, and provider restrictions affect model selection</strong></summary>

Each group has its own ranking queue. A valid response, including “no suggestion,”
moves its candidate first **within that group**. A failure moves it last within its
group. Untried candidates keep their relative order. Only your configured models
and reasoning variants can be used.

- **Access, payment, or unavailable model** (`401`/`402`/`403`/`404` or equivalent
  structured errors): blocked until the server-side plugin instance is recreated.
- **Explicit budget exhaustion** (daily/monthly budgets, depleted credits, or a
  reached free-usage limit): paused for **one hour**.
- **Temporary or unknown failure** (ordinary `429`, `5xx`, timeout, network error,
  or invalid output): paused for **60 seconds**. “Quota” or “limit” alone does not
  imply an exhausted daily budget.

For retryable failures, a valid provider `retryAfterMs` replaces the default pause,
with a 60-second minimum and no cap that would shorten longer provider delays.
Access, availability, budget, and rate-limit skips cover that model's reasoning
variants across all groups; other failures affect only the candidate that failed.

Cooldown expiry makes a candidate eligible at its learned position; it does not
schedule a call. If none are eligible, no generation occurs. Check **Prediction
status and preview** for current order, safe skip reasons, and retry timestamps.
Already-skipped models do not produce individual failure popups. The whole-queue
issue is deduplicated until it changes or recovers; manual requests still explain it.

Queue state stays in memory and is shared across sessions using the same server/location
plugin instance. Recreating that instance clears it; reloading only the Desktop UI
does not necessarily do so. Models that leave the available catalog lose their queue
history. If a catalog change moves a candidate into a different owning group, it
starts untried there while retaining any active cooldown or block. Cancellation
and stale requests do not change rankings.

</details>

## How suggestions are chosen

<details>
<summary><strong>The default directive</strong></summary>

The default directive asks for one concise next step toward your current goal,
rather than guessing your exact next words. It prioritizes explicitly unfinished
work or delivery gaps without inventing facts or bundling optional tasks.
When a recommendation or single scoped approval request clearly continues your
task, it favors a short contextual reply instead of repeating the proposal.

</details>

## Compatibility

- **Supported clients:** OpenCode V2 Desktop and interactive CLI. OpenCode V1,
  Mini, browser-only clients, and noninteractive predictions are not supported.
  The published plugin is prebuilt.
- **Tested on macOS:** Preferences on Desktop `2.3.0` and CLI/server `2.2.6`,
  including shared-service and standalone setups. Prediction behavior was
  also tested on Desktop `2.2.7`. These are tested versions, not minimums.
  See the [qualification record](docs/research/2026-11-18-predictions-preferences-qualification.md).
- **Server limits:** The plugin requires Unix file ownership checks to load
  or save preferences. A native Windows server cannot do that. This
  restriction is on the server, not the client. Linux file and permission
  behavior has not been tested on a native host.
- **Node.js:** The npm package declares Node.js `>=22`. Contributors use
  Node.js `26` to run the tests.

OpenCode changes can affect the private editor integration and experimental
Desktop API.

## Support development

OpenCode Predictions is free and always will be. If it’s saved you a few keystrokes,
you can [leave a one-time tip](https://buy.stripe.com/fZu14pdh29pH4uScpifYY00) to help me maintain it.

## License

[MIT](LICENSE)

---

[Get started](#get-started) &middot;
[Report a bug](https://github.com/fcoouto/opencode-predictions/issues) &middot;
[OpenCode documentation](https://opencode.ai/docs/)

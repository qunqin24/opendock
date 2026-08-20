# opencode-okf

An [OpenCode](https://opencode.ai/) plugin for creating, maintaining, upgrading, and validating [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) bundles.

The authoring commands make OpenCode inspect repository evidence before it writes knowledge. The bundled validator checks the actual format, so conformance does not depend on the model remembering every rule.

## Features

- `/okf-init` inspects a repository and creates an evidence-backed OKF bundle.
- `/okf-update [session|diff]` fetches the current spec, updates concepts and indexes from full repo (no arg), git diff, or the current session, and recommends an explicit upgrade for older bundles.
- `/okf-upgrade` fetches the authoritative current spec and migrates the entire bundle to it.
- `/okf-validate` reports v0.2 conformance errors and metadata quality warnings, with opt-in fixes.
- `/okf-compact [all]` prunes logs, or the whole bundle (concepts, indexes, logs) with `all`.
- `okf_spec`, `okf_inspect`, `okf_init`, `okf_validate`, `okf_capture`, and `okf_diff` give agents deterministic spec, OKF, and git-diff tools.
- A command hook supplies the exact UTC timestamp to OKF workflows.
- A debounced file-event hook warns when edits make the bundle nonconformant.
- Configurable capture moments: toast nudges or automatic `/okf-update session` when the session goes idle, and OKF preservation context before compaction.
- A system-prompt hook injects OKF authoring guidance when the conversation mentions OKF.
- Existing commands and producer-defined OKF frontmatter are preserved.

## Install

### With OCX (recommended)

[OCX](https://ocx.kdco.dev) manages OpenCode profiles and plugins.

Install OCX:

```sh
curl -fsSL https://ocx.kdco.dev/install.sh | sh
```

Initialize global OCX config (once):

```sh
ocx init --global
```

Add the plugin to your global config:

```sh
ocx add npm:opencode-okf -g
```

Or to a named profile:

```sh
ocx add npm:opencode-okf -p default
```

Launch OpenCode through OCX:

```sh
ocx oc
# or with a profile:
ocx oc -p default
```

Quit and restart OpenCode after changing plugin configuration.

### Manual

Add the published plugin to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-okf"]
}
```

Quit and restart OpenCode after changing plugin configuration. OpenCode installs npm plugins with Bun at startup.

The package root only exports the plugin so it remains compatible with OpenCode's legacy plugin loader. Reusable helpers and constants are available from the `opencode-okf/lib` subpath:

```ts
import OKFPlugin from "opencode-okf"
import { OKF_SPEC_URL, fetchOKFSpec, validateBundle } from "opencode-okf/lib"
```

For local development, build this package and reference its compiled entry point with an absolute file URL:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/opencode-okf/dist/index.js"]
}
```

## Usage

Create a bundle using repository-wide evidence:

```text
/okf-init focus on revenue, subscriptions, and customer lifecycle knowledge
```

Update an existing bundle (hard source mode on the first arg):

```text
/okf-update
/okf-update review schema migrations and dashboard changes
/okf-update diff
/okf-update diff origin/main
/okf-update session
/okf-update session focus on architecture decisions
```

| Args | Source |
| --- | --- |
| *(none)* or free-form focus | Full repository evidence |
| `diff [ref] [focus…]` | Git changes via `okf_diff` (default HEAD) |
| `session [focus…]` | This conversation + work — concepts/indexes first, not log-only |

Upgrade an existing bundle to the latest authoritative specification:

```text
/okf-upgrade
/okf-upgrade preserve legacy citations that cannot be mapped safely
```

The upgrade command fetches the specification from `https://raw.githubusercontent.com/GoogleCloudPlatform/knowledge-catalog/refs/heads/main/okf/SPEC.md`, migrates the whole bundle, updates the root `okf_version`, and validates the result. It requires network access to `raw.githubusercontent.com`.

Validate without editing:

```text
/okf-validate
```

Compact accumulated knowledge, keeping only what remains useful:

```text
/okf-compact
/okf-compact aggressive
/okf-compact all
/okf-compact all aggressive
/okf-compact conservative keep the migration decisions, drop everything before June
```

| Args | Scope |
| --- | --- |
| *(none)* or aggressiveness/focus only | **logs** only |
| `all` *[aggressiveness] [focus…]* | **all** — concepts, indexes, and logs |

Optional aggressiveness: `conservative` | `balanced` (default) | `aggressive`.
Ask OpenCode to repair format problems after validation:

```text
/okf-validate fix conformance errors
```

The default output directory is `okf/`. The commands choose a hierarchy from the repository evidence rather than imposing a fixed SaaS template.

## Configuration

Pass plugin options with OpenCode's tuple syntax:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-okf",
      {
        "bundleDirectory": "knowledge/okf",
        "validateOnEdit": false,
        "captureEvidence": true,
        "captureOn": {
          "sessionIdle": "notify",
          "compacting": "auto",
          "compacted": "notify",
          "todoComplete": "notify"
        }
      }
    ]
  ]
}
```

| Option | Default | Description |
| --- | --- | --- |
| `bundleDirectory` | `okf` | Bundle directory relative to the worktree. Paths outside the worktree are rejected. |
| `validateOnEdit` | `true` | Debounce validation after bundle file events and show a warning only for conformance errors. |
| `captureEvidence` | `false` | Buffer recent tool activity per session and inject it into `/okf-update session` prompts so captures rest on evidence, not model memory. |
| `captureOn.sessionIdle` | `off` | `off`: nothing. `notify`: toast nudge to run `/okf-update session` when the session goes idle after user activity. `auto`: run `/okf-update session` in the session automatically. |
| `captureOn.compacting` | `off` | `off`: nothing. `notify`: toast nudge when the context is about to be compacted. `auto`: inject OKF preservation instructions into the compaction context so capture-worthy knowledge survives compaction. |
| `captureOn.compacted` | `off` | `off`: nothing. `notify`: toast nudge after the context was compacted. `auto`: run `/okf-update session` right after compaction. |
| `captureOn.todoComplete` | `off` | `off`: nothing. `notify`: toast nudge when the session's todo list flips to all completed/cancelled. `auto`: run `/okf-update session` at that point. |

Capture moments act at most once per stretch of user activity, only when the bundle directory exists, and never in subagent sessions. An automatic capture does not retrigger itself. `compacted` is the exception: compaction is a discrete knowledge-loss event, so it fires every time. Buffered evidence is drained into the next `/okf-update session` run and cleared when the session is deleted.

## Validation

The validator follows OKF v0.2 conformance and field-shape rules while tolerating v0.1 metadata with migration warnings:

- Every non-reserved Markdown file must have parseable YAML frontmatter with a non-empty string `type`.
- v0.2 `sources`, `usage_window`, `generated`, `verified`, `status`, and `stale_after` shapes are checked as non-blocking warnings.
- `Attested Computation` documents require `runtime`; `parameters`, `executor`, and `attester` shapes are checked.
- Legacy `timestamp` remains accepted but produces a migration warning in place of `generated`.
- `index.md` files must provide progressive-disclosure headings and linked entries. Only the root index may have frontmatter, where it declares `okf_version`.
- `log.md` files must contain newest-first `## YYYY-MM-DD` groups with list entries.
- Documents must decode as UTF-8.

Missing recommended metadata, malformed optional fields, empty bodies, and broken internal links are warnings. They do not fail validation because OKF consumers must tolerate those conditions.

## Development

```sh
bun install
bun run check
bun test
bun run build
```

## Publishing

Pushing a version tag publishes to npm via [trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC, no stored token):

```sh
# bump "version" in package.json first, then:
git tag v0.7.1
git push origin v0.7.1
```

The workflow fails if the tag does not match the `version` field in `package.json`.

## References

- [OpenCode plugin documentation](https://opencode.ai/docs/plugins/)
- [Open Knowledge Format v0.1 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [Introducing the Open Knowledge Format](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing/)

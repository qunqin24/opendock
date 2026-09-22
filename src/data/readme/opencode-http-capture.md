# opencode-http-capture

> See what OpenCode sends and what the model returns, without a proxy.

This OpenCode plugin is disabled by default. Choose `block` to capture and block model requests, saving redacted JSON to temporary files, or `record` / `all` to forward real traffic while recording requests and responses. Use it to study prompts, message structure, tool definitions, and generation parameters.

[简体中文](README.zh-cn.md) · [Specification](SPEC.md) · [Changelog](CHANGELOG.md)

## What you can inspect

This is not a chat-history export. It inspects HTTP exchanges passing through `globalThis.fetch` inside OpenCode:

| Question | Mode | Result |
| --- | --- | --- |
| What prompt, message history, tool definitions and parameters are sent to the model? | `block` | Save a redacted request without forwarding the recognized model request; no real model answer |
| What did the provider actually return? | `record` | Forward the request and keep streaming the answer while saving request and response status, headers and supported bodies |
| What other fetch requests occur? | `all` | Include other traffic handled by the current fetch wrapper, not every network request in the process |

Supported request bodies within the size limit can include `messages`, `input`, `contents`, `tools` and other protocol-specific fields. Text deltas, tool-call fragments, finish reasons and usage are retained when the provider returns them, not synthesized or filled in. **Recording does not merge SSE deltas into a final answer or provide request replay.**

## Install

Requirements: OpenCode v1 with external plugin support.

### npm (recommended)

[`0.1.1`](https://www.npmjs.com/package/opencode-http-capture/v/0.1.1) is the first npm release. Local checkout installation remains available below.

**Step 1: Configure the plugin.** Add the package to the `plugin` array in project-level `opencode.json` or global `~/.config/opencode/opencode.json`. Choose one scope and keep your existing provider and plugin configuration; do not replace your entire configuration with this minimal example:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-http-capture@0.1.1"]
}
```

**Step 2: Restart OpenCode.** It automatically installs the configured package from npm; the initial installation needs registry access. No `npm install -g`, `install.sh`, or retained checkout is required. This is a plugin, not a standalone CLI: do not launch it with `npx opencode-http-capture`.

**Step 3: Opt in to a mode.** Installation alone does not enable capture. Start by inspecting requests without calling the model:

```bash
OPENCODE_CAPTURE=block opencode
```

For real answers, use `OPENCODE_CAPTURE=record opencode`; this calls the provider, incurs costs and may execute tools, as described below. Start `opencode` without the variable for normal use; the disabled plugin leaves fetch unchanged.

The npm package contains ESM JavaScript with no third-party runtime dependencies. Building and testing with Node.js requires Node.js 24+; users do not need to build the plugin, which runs in OpenCode's Bun runtime.

**Upgrade or roll back:** The example pins a version for reproducibility. Replace `@0.1.1` with a published target version and restart OpenCode; roll back by selecting an older version that remains available. Query published versions with `npm view opencode-http-capture versions --json`. For installation E404 errors, check the package name, version and publication status. Changing capture modes does not fix authentication or connectivity errors.

When migrating from a local installation, run `bash uninstall.sh` from the old checkout before adding the npm entry. Do not keep both installation methods enabled. The plugin remains disabled unless `OPENCODE_CAPTURE` is set to an enabled mode.

### Local checkout

```bash
git clone git@github.com:hymsk/opencode-http-capture.git
cd opencode-http-capture
bash install.sh
```

The installer creates a symlink in `~/.config/opencode/plugins/`. Keep this checkout in place and restart OpenCode after installation. Use `OPENCODE_CONFIG_DIR` with the installer to select a different configuration directory.

## Usage

Select a mode with a single environment variable:

| `OPENCODE_CAPTURE` | Behavior |
| --- | --- |
| unset, empty, `false`, `0` | Disabled; fetch is unchanged |
| `block` | Capture and block model requests; forward other requests |
| `record` | Forward real traffic; record model requests and responses only |
| `all` | Forward real traffic; record all requests and responses handled by this fetch wrapper |

Values are exact and case-sensitive; whitespace is not trimmed. Any other nonempty value (except legacy `1` / `true`, below) throws an explicit configuration error before installation instead of silently disabling capture or selecting another mode. This rejects plugin initialization, not a process-wide network firewall; do not ignore plugin-load errors.

Start OpenCode with model requests blocked:

```bash
OPENCODE_CAPTURE=block opencode
```

To inspect an existing Session without appending to it, use a fork:

```bash
OPENCODE_CAPTURE=block opencode run --session ses_xxx --fork "Continue"
```

## Record real requests and responses

```bash
OPENCODE_CAPTURE=record opencode

# All requests passing through this fetch wrapper, not just model requests
OPENCODE_CAPTURE=all opencode
```

**Both `record` and `all` call real providers, incur costs, and may execute tools.** `--fork` protects the original Session, not external systems or files from tool effects. Without an opt-in, the plugin remains disabled.

The recording directory is printed to stderr on startup. Each request has an `<ID>.json` file. Responses remain streaming; captured response bodies are saved after consumption finishes **without redaction**. Request headers/body and response metadata (including headers) retain credential redaction. Check `state` and request/response `bodyState`; pending/streaming artifacts are incomplete. Recording failures do not block traffic.

### From startup to inspecting results

The following command calls your configured provider normally. Accept the potential cost and tool side effects first. Keep captures outside your repository and never add real recordings to Git:

```bash
mkdir -p "$HOME/opencode-captures"
OPENCODE_CAPTURE=record OPENCODE_CAPTURE_DIR="$HOME/opencode-captures" opencode
```

Startup prints a message like this; each installation creates a different directory:

```text
[opencode-http-capture] Recording to /home/user/opencode-captures/opencode-http-capture-AbCdEf
```

Send a message normally, wait for the reply to finish, then inspect the file in another terminal. **One conversation may make several HTTP requests, producing `1.json`, `2.json`, and so on. IDs count requests for this installation; they are not Session IDs.** Recording still displays the model's answer, unlike block mode, which can replace it with a capture path.

```bash
# Replace this with the directory printed at startup
CAPTURE_DIR='/home/user/opencode-captures/opencode-http-capture-AbCdEf'

# Check whether request and response bodies were saved completely
jq '{id, state, requestBodyState: .request.bodyState, status: .response.status, responseBodyState: .response.bodyState}' "$CAPTURE_DIR/1.json"

# Inspect the request body; credentials are redacted in the saved copy
jq '.request.body' "$CAPTURE_DIR/1.json"

# JSON response: display the parsed object
jq '.response.body' "$CAPTURE_DIR/1.json"

# SSE / text response: decode the JSON string into readable text
jq -r '.response.body // empty' "$CAPTURE_DIR/1.json"
```

This **fictional example omits some metadata**. The SSE `response.body` contains event-stream text, not an assembled `Hello` answer:

```json
{
  "id": 1,
  "mode": "record",
  "blocked": false,
  "state": "complete",
  "request": {
    "method": "POST",
    "url": "[URL_REDACTED]",
    "headers": { "authorization": "[REDACTED]" },
    "bodyState": "complete",
    "body": { "model": "example-model", "messages": [{ "role": "user", "content": "Hi" }], "stream": true }
  },
  "response": {
    "status": 200,
    "headers": { "content-type": "text/event-stream" },
    "bodyState": "complete",
    "body": "data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\ndata: [DONE]\n\n"
  }
}
```

### Check completeness

| Result | Meaning |
| --- | --- |
| `state=complete` and `response.bodyState=complete` | The response stream was consumed and its supported body saved; empty text is also complete |
| `pending` / `streaming` | Not finished, or not fully consumed before exit; this is not per-token live disk logging |
| `bodyState=omitted-limit` | The body exceeded its limit and was omitted entirely, without a saved prefix |
| `bodyState=omitted-incomplete` | The stream failed or was cancelled, so its body was omitted |
| Other `omitted-*` / `empty` | Unsupported, unavailable or unparseable content, or no response body; see the specification |

`state=complete` alone does not guarantee a saved body or a successful HTTP status. Check `response.status` and `bodyState`; network errors may have no response metadata. Recording adds memory, CPU and disk overhead and is not guaranteed to be latency-free.

### Scope, limits and sensitive data

The default body limit is 1 MiB per request/response, configurable via the positive integer `OPENCODE_CAPTURE_MAX_BYTES`. Complete JSON responses are parsed and saved without redaction. SSE (`text/event-stream`) and other `text/*` responses are saved as UTF-8 text, preserving event framing, whitespace and content without protocol reconstruction. Decoding happens after buffering, so chunk boundaries do not affect recorded text; invalid UTF-8 uses replacement characters. Response bytes delivered to the caller remain unchanged. Binary and unrecognized/missing content types are omitted (`omitted-unsupported`); malformed JSON is omitted (`omitted-unparseable`). Oversized or interrupted bodies are omitted entirely (`omitted-limit` / `omitted-incomplete`), never saved as partial prefixes. `bodyState=complete` means the supported body was saved (including empty text); `empty` means no response body stream. Only JSON strings supplied as `init.body` are recorded as request bodies; existing Request bodies and upload streams are not consumed. Use all scope for metadata on unknown endpoints with these bodies.

Request snapshots accept ordinary data-property options and safely re-readable Headers, string records, or string-pair arrays. One-shot iterators, getters, Proxies and other unsafe-to-inspect inputs bypass recording entirely, even in all scope. Locked, used or unwrappable responses pass through unchanged with recording marked unavailable. Instance `clone()` preserves response metadata using native stream tee/cancellation. The recorder retains a bounded byte buffer, not per-chunk objects; growth, text/JSON processing and caller-created clone queues still use additional memory. Common private-key fields and PEM private keys are redacted in requests and response metadata only; arbitrary secrets there are not guaranteed to be detected.

All scope does not cover WebSockets, subprocesses, or networking that bypasses fetch. This is not a process-wide packet capture or a byte-for-byte archive. **Response bodies deliberately preserve all content, including any API keys, tokens, URLs, personal data or other secrets returned by the provider. Users assume responsibility for this sensitive-data risk and for secure storage, access and deletion.** Requests may still contain sensitive prompts, code and tool results despite credential redaction. Do not publish captures. There is no automatic rotation or cleanup; monitor disk usage during long recording sessions.

## Get results (block mode)

For Chat Completions, the assistant response is the absolute capture file path:

```text
/tmp/opencode-http-capture-AbCdEf/1.json
```

Inspect or save the request body with `jq`:

```bash
jq '.request.body' /tmp/opencode-http-capture-AbCdEf/1.json
jq '.request.body' /tmp/opencode-http-capture-AbCdEf/1.json > request.json
```

To choose a capture parent directory, create it first:

```bash
mkdir -p /tmp/my-captures
OPENCODE_CAPTURE=block OPENCODE_CAPTURE_DIR=/tmp/my-captures opencode
```

`OPENCODE_CAPTURE_DIR` is optional for every enabled mode; the default parent is the system temporary directory. `OPENCODE_CAPTURE_MAX_BYTES` is optional for recording (`record` / `all`), not used by `block`.

## Legacy compatibility

Only `OPENCODE_CAPTURE=1` or `true` reads `OPENCODE_CAPTURE_MODE` (`block` by default, or `record`) and `OPENCODE_CAPTURE_SCOPE` (`model` by default, or `all`, recording only). Thus the old `OPENCODE_CAPTURE=1 OPENCODE_CAPTURE_MODE=record` command still records rather than blocks; adding `OPENCODE_CAPTURE_SCOPE=all` still records all fetch traffic. Invalid legacy MODE, or invalid SCOPE when recording, throws a configuration error.

New `block` / `record` / `all` values ignore MODE and SCOPE entirely, even conflicting or invalid values. Disabled values also ignore them. Directory and recording size settings remain optional. Installation is deduplicated per process; restart OpenCode to switch modes or disable an already installed wrapper.

## Disable capture

Exit and restart OpenCode without `OPENCODE_CAPTURE`, or set it to an empty string, `false` or `0`. Normal use is unaffected.

## Uninstall

For npm installation, remove `opencode-http-capture@0.1.1` (or the version you configured) from the `plugin` array. For local installation, run from the original checkout:

```bash
bash uninstall.sh
```

Restart OpenCode afterwards. Capture files are retained for you to inspect and remove.

## Development and release

Use Node.js 24+ and npm. There are no third-party build or test dependencies, so `npm install` is not required:

```bash
npm test
git diff --check
npm pack --dry-run
```

`npm run build` strips erasable TypeScript types with Node's built-in `stripTypeScriptTypes` API and rewrites local imports to emit `dist/*.js`; it is not a type checker. `npm test` rebuilds, runs behavior tests against the JavaScript output, and installs a real tarball offline in a temporary directory to test package-name loading with mocked fetch. No real provider is called. The package test disables install scripts; consumers likewise need no build step.

See [RELEASING.md](RELEASING.md) for maintainer checks and the separately authorized publishing step. Built files and tarballs are not committed.

With OpenCode installed, run `npm run test:host` to load the JavaScript entry from a real tarball using a temporary HOME, isolated configuration and Session storage. A loopback-only fictional provider exercises `block`, `record` and `all`. No real provider credentials or existing Sessions are inherited; the host may download SDK dependencies, so this check is not necessarily offline. Set `OPENCODE_BIN` to select the OpenCode executable.

## License

[AGPL-3.0-or-later](LICENSE).

# opencode-muse

An [OpenCode](https://opencode.ai) plugin that lets OpenCode (and therefore
[OpenChamber](https://openchamber.dev/)) use a Muse Code subscription with
auth and inference staying entirely inside the official Muse Code CLI
(`muse serve`, via `@muse-code/sdk`).

No subscription credential is ever extracted, cached, or injected into
OpenCode.

## Installation

Add the published package to your project-level `opencode.jsonc` (or
`opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-muse@0.3.0"],
}
```

OpenCode downloads and manages the public package, so users do not need to run
`npm install` or create an npm account. Sign in with `muse login` (see below),
restart OpenCode or OpenChamber if it was already running, and choose a Muse
model.

**Compatibility fallback:** Current OpenCode V2 documentation supports package
entries in `plugins`, but our earlier probes did not observe config-array
loading on OpenCode 2.1.3; the embedded OpenCode 2.0.32 flow was verified with a
project-local plugin file. If your OpenCode version ignores the package entry,
install the package locally and add this file under `.opencode/plugins/`:

```sh
npm install opencode-muse
mkdir -p .opencode/plugins
cat > .opencode/plugins/opencode-muse.js <<'EOF'
export { default } from "opencode-muse";
EOF
```

The locally packed package passed provider discovery and a text-turn smoke
test. Muse models and a text turn were also confirmed in OpenChamber after
restarting it. Verified Muse CLI versions are 1.4.12 and 1.4.13 (the SDK
stays 1.4.12; a newer CLI fingerprint starts with a recorded warning
instead of failing). See
[#21](https://github.com/pgquiles/opencode-muse/issues/21).

## Authentication

Sign in through the official Muse Code CLI before using the provider:

```sh
muse login
```

OpenChamber's current provider UI does not expose OpenCode plugin `command`
authentication methods, so this plugin does not promise a sign-in button. It
uses the Muse CLI's existing account/configuration through `muse serve`; it
never reads Muse credential files, exports tokens, or changes subscription
mode. If the CLI has no usable model catalog, the provider remains a disabled
setup placeholder rather than advertising a model that will fail on use.

## Features

- Use Muse Code models from OpenCode or OpenChamber after adding the package to
  your OpenCode plugin configuration.
- Keep Muse sign-in and inference inside the official Muse CLI; the plugin
  never copies or stores your subscription credentials.
- Continue text conversations in a mapped Muse session, including resuming
  supported sessions and replaying available session updates after reconnects.
- Attach supported images (PNG, JPEG, GIF, WebP) and videos (MP4, MOV) to a
  Muse turn.
- Pick a reasoning effort per model through OpenCode's own controls: an
  untouched model runs its catalog default (which rotates over time), Ctrl+T
  cycles the concrete variants (`minimal` … `max`, model-dependent, one way
  until the model is reselected), and the TUI `/effort` command ("Switch model
  variant", verified end to end) or a `#variant` model suffix
  (`opencode run --model muse/…#high`) selects one explicitly. Unknown variants
  fail the turn instead of guessing. See
  [#28](https://github.com/pgquiles/opencode-muse/issues/28).
- Let Muse run its own agent and tools, while the plugin prevents overlapping
  writes to the same workspace.

## Current limitations

- **Approvals and questions:** OpenCode/OpenChamber cannot yet show Muse's exact
  approval choices or all structured questions. If Muse asks for one, the
  plugin stops safely rather than guessing or approving on your behalf. See
  [#6](https://github.com/pgquiles/opencode-muse/issues/6) and
  [#22](https://github.com/pgquiles/opencode-muse/issues/22).
- **Files and response formats:** The bridge accepts text, PNG/JPEG/GIF/WebP
  images, and MP4/MOV video. Audio and PDF attachments are not supported.
  Strict JSON output and some OpenCode generation settings (such as
  temperature and token limits) are not supported; requests that require a
  specific OpenCode tool are rejected. Muse's separate CLI transcription and
  JSON-output commands are not exposed as OpenCode features.
- **Tools and agent instructions:** Muse runs its own agent and tools; OpenCode
  tools are not executed for a Muse turn. Recognized custom-agent instructions
  may be forwarded, but Muse otherwise follows its own workspace rules.
- **Rewind and session names:** Rewind/fork is unavailable on the currently
  tested Linux Muse runtime, and custom session names may not work. Start a new
  session after rewinding or editing the OpenCode conversation. Rewinding does
  not undo files Muse changed. See
  [#20](https://github.com/pgquiles/opencode-muse/issues/20).
- **Recovery after missed events:** Basic session resume and cursor replay have
  been tested, but recovery from a real Muse event gap has only been tested
  with a simulated gap. See
  [#23](https://github.com/pgquiles/opencode-muse/issues/23).
- **Muse CLI compatibility:** The plugin is pinned to SDK 1.4.12 and speaks
  envelope schema version 1. A newer CLI fingerprint starts with a recorded
  warning instead of failing closed; a missing/malformed fingerprint or an
  unsupported envelope version still fails closed. See
  [#21](https://github.com/pgquiles/opencode-muse/issues/21).
- **Billing and simultaneous work:** Pay-as-you-go catalog and text turns pass
  on Muse 1.4.13 (see the compatibility matrix). The plugin also allows only
  one active writer per workspace, so a new turn may be reported as busy
  while another is still finishing.

## Troubleshooting

- **"Muse Spark 1.3 Contributor" never connects after a model switch:** that
  entry is a retired OpenCode-gateway model (`opencode/muse-spark-1.3-contributor-free`),
  not this plugin's model. It no longer resolves anywhere, so OpenCode keeps
  retrying and the session appears stuck on "connecting". Pick the model under
  provider **Muse Code** — `muse/muse-profile-tbh-model-muse-spark-1.3` —
  instead of any historical "contributor-free" entry in recent-model lists. See
  [#26](https://github.com/pgquiles/opencode-muse/issues/26).

## Credits and references

- [opencode-claude](https://github.com/openchamber/opencode-claude) — a
  reference for OpenCode v2 plugin setup, model/session hooks, bridge
  lifecycle, and the local-proxy fallback. This plugin uses Muse-native tools;
  auth and inference stay in the Muse CLI.
- [muse-code-sdk](https://github.com/meta-models/muse-code-sdk) — official
  Muse Code SDK and the Muse Session Protocol used by this plugin.
- [Paseo's Muse Code integration](https://paseo.sh/docs/muse-code) — a
  protocol-level reference implementation.

## Related projects

- [opencode-muse-auth](https://github.com/TheStreamCode/opencode-muse-auth) is another credential-extraction/direct-API approach; see its [issue #12](https://github.com/TheStreamCode/opencode-muse-auth/issues/12) for its discussion of subscription-term concerns.
- [opencode-muse-code](https://github.com/swalker326/opencode-muse-code) is an unofficial direct-API alternative. It reads the Muse CLI login, requests an API key from Meta, and sends model requests to Meta's API from OpenCode instead of routing inference through `muse serve` and MSP. Its subscription eligibility is separate from this plugin's CLI-mediated approach and has not been established by this project.
- [Official Muse Code documentation](https://dev.meta.ai/docs/quickstart#agent-setup) describes using Muse models in OpenCode through the Meta API.

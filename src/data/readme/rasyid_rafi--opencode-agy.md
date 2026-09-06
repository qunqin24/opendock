# opencode-agy

An OpenCode provider plugin for Google's official Antigravity ACP server.

```text
OpenCode → loopback Anthropic Messages proxy → ACP JSON-RPC client →
agy_acp_server.par
```

## Requirements

- OpenCode;
- Bun;
- Google's `agy_acp_server.par` and the accompanying `localharness_external`;
- an authenticated ACP server session.

The official server is listed in the [ACP Registry](https://github.com/agentclientprotocol/registry/tree/main/antigravity-acp).

## Install

Download the ACP server archive for your platform. Keep these files together:

```text
agy_acp_server.par
localharness_external
```

Set the server path, or put it on `PATH`:

```sh
export OPENCODE_AGY_ACP_PATH=/absolute/path/to/agy_acp_server.par
```

On Linux the registry argument `--uid=` is supplied automatically. Custom
arguments can be provided as JSON:

```sh
export OPENCODE_AGY_ACP_ARGS='["--uid="]'
```

Register the plugin in `~/.config/opencode/opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@rasyid_rafi/opencode-agy"]
}
```

Restart OpenCode after changing plugin configuration.

## Authentication

The ACP server advertises these methods:

- `oauth-personal`;
- `oauth-business`;
- `gemini-api-key`;
- `agent-platform`.

Use the provider authentication action in OpenCode, or set a method for the
next ACP worker:

```sh
export OPENCODE_AGY_ACP_AUTH_METHOD=oauth-personal
```

The plugin reuses the official CLI's existing OAuth login when it finds
`~/.gemini/antigravity-cli/antigravity-oauth-token` (or the equivalent path
under `GEMINI_HOME`). It seeds the ACP server's local credential file so the
first OpenCode request does not start a second browser login. Credentials stay
on the local machine and are not sent through the OpenCode proxy.

## Configuration

| Variable | Purpose |
|---|---|
| `OPENCODE_AGY_ACP_PATH` | ACP server executable path |
| `OPENCODE_AGY_ACP_ARGS` | JSON array of ACP server arguments |
| `OPENCODE_AGY_ACP_AUTH_METHOD` | ACP authentication method |
| `OPENCODE_AGY_ACP_PERMISSION=allow-always\|allow-once\|deny` | Automatic ACP permission response; default `allow-always` |
| `OPENCODE_AGY_MODE=plan\|accept-edits` | ACP session mode when advertised |
| `OPENCODE_AGY_PROXY_PORT` | Loopback proxy port; default ephemeral |
| `OPENCODE_AGY_DATA_DIR` | Session metadata and request replay directory |
| `OPENCODE_AGY_DEBUG=1` | Metadata-only debug logging |
| `OPENCODE_AGY_MAX_REQUEST_BYTES` | Maximum request size |
| `OPENCODE_AGY_TURN_STALL_MS` | Idle timeout after the last ACP session update |
| `OPENCODE_AGY_PRINT_TIMEOUT_MS` | Setup/request timeout, not a streamed-turn limit |
| `OPENCODE_AGY_IDLE_WORKER_MS` | Idle session cleanup interval |
| `OPENCODE_AGY_MAX_SESSIONS` | Maximum concurrent ACP sessions |

Active turns do not have a default wall-clock limit. They time out only after
`OPENCODE_AGY_TURN_STALL_MS` has elapsed since the last ACP `session/update`.
`OPENCODE_AGY_PRINT_TIMEOUT_MS` covers setup RPCs and does not cut off an
actively streaming turn.

Code that creates an ACP worker may set `onActivity?: () => void` in
`AcpWorkerOptions`. The callback runs for each accepted ACP `session/update`
during an active turn. It is a heartbeat signal, not a completion callback.
Active turns use this idle timeout behavior rather than a wall-clock deadline,
so a stream can run as long as it keeps sending updates.

## Supported input

ACP text, image, and audio blocks are supported. Images and audio may be sent
as base64 data URLs or local files inside the configured workspace. Remote URLs,
PDFs, and video are rejected.

The provider reports native ACP image/audio input capability. Antigravity tool
activity is streamed as reasoning/status content because OpenCode's ordinary
provider tool loop is separate from the ACP agent tool loop.

Filesystem requests are restricted to the configured workspace. Terminal
requests use sanitized environment variables and are controlled by the ACP
permission policy. The adapter is not an operating-system sandbox.

## Sessions and retries

The adapter forwards OpenCode message IDs and records requests before sending
prompts to ACP. A repeated completed request replays the saved response. A
request that failed or was interrupted after submission is rejected on retry;
send a new message to continue. Clients without message IDs use a hash of the
conversation and current prompt.

Session turns and metadata updates use local process locks. Another OpenCode
process cannot run a turn in the same session while one is active.

`OPENCODE_AGY_DATA_DIR` defaults to `$XDG_DATA_HOME/opencode-agy`, or
`~/.local/share/opencode-agy`. It contains `sessions.json` and request receipts
under `requests/`. Completed receipts include response events, including text,
reasoning, and tool activity, up to 2 MB per request. Larger responses retain a
completion marker and reject retries instead of executing again. Directories
use mode `0700` and files use `0600` on POSIX filesystems. Request receipts remain
after idle session metadata is pruned. Deleting them removes retry protection
for those requests.

## Local endpoints

- `GET /health`;
- `GET /v1/models`;
- `GET /v1/usage`;
- `POST /v1/messages`.

Requests require the loopback marker `x-api-key: opencode-agy-local`.

## Tests

```sh
npm run check
```

The live test requires an authenticated official ACP server:

```sh
OPENCODE_AGY_ACP_LIVE=1 \
OPENCODE_AGY_ACP_PATH=/absolute/path/to/agy_acp_server.par \
OPENCODE_AGY_ACP_AUTH_METHOD=oauth-personal \
npm run test:live
```

Review Google's current [terms](https://antigravity.google/terms) before using
subscription authentication through a third-party host.

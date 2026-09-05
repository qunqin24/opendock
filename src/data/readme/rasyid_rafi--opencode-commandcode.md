# opencode-commandcode

An OpenCode provider adapter that runs the installed Command Code CLI instead of calling Command Code's private generation API.

```text
OpenCode → local Anthropic Messages proxy → cmdc -p --output-format json < prompt
                                             ├─ Command Code model
                                             └─ Command Code's own tools
```

This adapter starts the official CLI, reads its headless JSON stream, and translates the stream back to OpenCode's provider format. It does not call Command Code's private generation API directly.

The npm package is `@rasyid_rafi/opencode-commandcode`. The unscoped `opencode-commandcode` package belongs to a different publisher.

## Requirements

- OpenCode 1.18 or newer;
- Node.js 22 or newer for the Command Code CLI;
- Command Code installed and authenticated on the same machine.

Install and authenticate the CLI with the official commands:

```bash
npm i -g command-code@latest
cmdc login
cmdc --version
```

Command Code documents `cmd` on macOS, Linux, and WSL, `cmdc` on native Windows, and `command-code` everywhere. Set `OPENCODE_COMMANDCODE_CLI` if the executable is not `cmdc` on your system.

## Install

Add the package to OpenCode's config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@rasyid_rafi/opencode-commandcode"]
}
```

For a checkout of this repository, use the absolute entrypoint instead:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/opencode-commandcode/opencode-commandcode.js"]
}
```

The plugin adds a `commandcode` provider and populates its models by running:

```bash
cmdc --list-models --no-auto-update
```

It then enriches those IDs with the provider-agnostic metadata from [Models.dev](https://models.dev/models.json) and the current Command Code pricing records from the [Pricing & Limits docs](https://commandcode.ai/docs/resources/pricing-limits). Context limits, output limits, modalities, reasoning/tool capability flags, release dates, and model costs are therefore kept separate from the CLI's display text. Command Code's published serving limit wins when it differs from the generic model record.

Start OpenCode and select a model such as:

```bash
opencode run --model commandcode/deepseek/deepseek-v4-flash "Explain this project"
```

The plugin uses a loopback Anthropic Messages proxy only because OpenCode providers speak HTTP. The proxy is bound to `127.0.0.1` and accepts one fixed, non-secret marker key. Your Command Code credential remains in the CLI's own local auth store.

## Configuration

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `OPENCODE_COMMANDCODE_CLI` | `cmdc` | CLI executable or absolute path |
| `OPENCODE_COMMANDCODE_YOLO` | `1` | Pass `--yolo` so Command Code can edit files and run commands |
| `OPENCODE_COMMANDCODE_MAX_TURNS` | `100` | Headless turn limit |
| `OPENCODE_COMMANDCODE_PROXY_PORT` | ephemeral | Fixed loopback proxy port |
| `OPENCODE_COMMANDCODE_MAX_REQUEST_BYTES` | `8388608` | Maximum provider request size |
| `OPENCODE_COMMANDCODE_DATA_DIR` | `~/.local/share/opencode-commandcode` | Persisted session mappings, retry records, and locks |
| `OPENCODE_COMMANDCODE_DEBUG` | unset | Log adapter info messages to stderr when set to `1` |

`--yolo` matters. Command Code headless mode blocks file writes and shell commands by default. This adapter enables it by default to preserve the point of using the Command Code harness from OpenCode. Set `OPENCODE_COMMANDCODE_YOLO=0` to disable the adapter's permission bypass.

OpenCode Plan mode passes `--plan` and never passes `--yolo`. Build mode explicitly passes `--permission-mode standard`, with `--yolo` according to the setting above, so a resumed Plan conversation can move into implementation. Command Code supports Plan mode in headless runs, but its interactive question and plan-approval tools are normally withheld. Enabling `ask_user_question` in headless mode automatically selects the first option; it does not wait for OpenCode. The adapter instructs the model to ask questions and present plans as ordinary response text. Reply in OpenCode to continue the same session, and switch to Build when ready to implement. Do not enable headless interactive tools through `CMD_TOOLS_ALL_ENABLE` or `CMD_TOOLS_ASK_USER_QUESTION_ENABLE` for this workflow.

Prompts are piped through stdin, including large prompts and attachments. No command shell is used. On Windows, the adapter resolves the installed npm package entrypoint and runs `node.exe`; custom installations can set `OPENCODE_COMMANDCODE_CLI` to an absolute `.js`/`.mjs` entrypoint or native `.exe`.

## What is bridged

- Command Code's live `--list-models` catalog;
- streamed text and reasoning events from `--output-format json`;
- Command Code's own read, edit, shell, and other built-in tools;
- Command Code headless sessions, resumed with `--resume` for each OpenCode session;
- persisted request records that prevent a provider retry from repeating workspace actions;
- title requests through a short-lived `--no-session` run;
- internal usage accounting in the local proxy, exposed only through its diagnostic `/v1/usage` route;
- the already-authenticated CLI session, without an API key entry in OpenCode.

OpenCode tool schemas are intentionally not sent to the model. Command Code owns the tool loop, just as the Antigravity ACP adapter lets the ACP server own its tool loop. The adapter uses the Anthropic Messages stream format so text, thinking, and each running-tool activity remain separate ordered content blocks instead of being flattened into one OpenAI `reasoning_content` block. It waits for the first meaningful CLI event before opening the assistant stream, which prevents OpenCode's empty-message Thinking placeholder from jumping above the first text block. OpenCode sees tool activity as reasoning/status text rather than receiving native tool calls to execute itself.

Usage is deliberately **not included in provider responses**, including the final streaming chunk. OpenCode consequently sees zero token usage and does not run its own context compaction logic. Command Code receives and tracks the real usage internally and performs its own context management. The adapter's local `/v1/usage` endpoint is for diagnostics only and is not used as provider response metadata.

For consumers of `streamCommandCode`, `RunCliOptions.onActivity` is an optional heartbeat callback. The adapter calls it once for each mapped text, reasoning, tool-activity, finish, or error event. Blank lines and non-JSON CLI output do not count as activity. The adapter does not impose a fixed wall-clock timeout on an active CLI stream, so consumers can use this heartbeat to track progress and apply their own stale-stream policy.

Images and remote attachments are not passed directly to the CLI. Text document attachments accept Anthropic `source.data`, plain text sources, and base64 data URLs. Unsupported binary documents, remote document sources, and malformed data produce an explicit error instead of being silently omitted. If visual input is needed, put the image in the workspace and ask Command Code to inspect the local file.

Session mappings and the latest completed response are stored in the adapter data directory with private filesystem permissions where supported. A retry of the latest completed request returns its cached events. Requests that started but did not complete, and older requests without cached events, cannot be automatically replayed; send a new message to continue. A missing legacy session name can start a fresh session, but authentication and transport errors never trigger that fallback.

A directory lock prevents two processes from using one CLI session concurrently. After a process crash, the error names the lock directory. Inspect its `owner.json` and confirm the owner has stopped before removing that lock. This deliberately avoids guessing whether an active process is stale.

CLI model discovery remains usable when optional Models.dev or pricing metadata is unavailable. Metadata fetches time out after 10 seconds; catalog CLI commands after 15 seconds. System instructions are preserved in full within the provider request limit. Older conversation history is bounded with an explicit truncation marker.

## Development

```bash
npm install
npm test
npm run build
```

Run the authenticated live smoke test with:

```bash
npm run test:live
```

The live test uses the installed CLI and writes only to a temporary workspace. To test the HTTP adapter, Plan questions, resume into Build, and Plan write restrictions:

```bash
npm run build
bun test/live-adapter.mjs
```

## Documentation used

- [Command Code quickstart](https://commandcode.ai/docs/quickstart)
- [CLI reference](https://commandcode.ai/docs/reference/cli)
- [Headless mode](https://commandcode.ai/docs/headless)
- [Agent Skills](https://commandcode.ai/docs/skills)
- [Provider API](https://commandcode.ai/docs/provider)

The headless mode documentation defines `-p`, `--output-format json`, `--resume`, `--no-session`, `--yolo`, `--model`, `--effort`, and the NDJSON result shape used here.

## License

MIT

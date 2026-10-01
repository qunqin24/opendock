# opencode-v2-kiro-auth

> **Use at your own risk.** This is an unofficial tool and is not affiliated with Kiro, Amazon,
> or AWS. Using a Kiro subscription outside its official client may violate the provider's Terms
> of Service and **could get your account suspended or banned**. It is meant for personal, local
> use only. You assume all risk.

An [opencode](https://opencode.ai) 2.x plugin that adds Kiro as the `kiro` model provider. Sign
in with AWS Builder ID or IAM Identity Center, then use Kiro's Claude, GPT, and other models (for
example `--model kiro/claude-opus-5.5`) with effort levels and Kiro-backed web search.

The plugin registers its own AWS SSO OIDC client for the device flow, and opencode keeps the
credentials in its own store. The plugin never reads kiro-cli's files, so you don't need
kiro-cli installed.

This package supports opencode 2.x only. On opencode 1.x, use
[`@hongyilyu/opencode-kiro-auth`](https://www.npmjs.com/package/@hongyilyu/opencode-kiro-auth).

## Requirements

- opencode 2.x, meaning `@opencode/cli` 2.0.4 or later (tested on 2.0.20). `opencode --version`
  prints `opencode v2.…`.
- A Kiro subscription you can reach through AWS Builder ID or IAM Identity Center.

## Install

Add the plugin to `plugins` in `~/.config/opencode/opencode.json`.
[`opencode.example.jsonc`](opencode.example.jsonc) is a commented version of this file.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-v2-kiro-auth"],
  "websearch": { "provider": "kiro" }
}
```

The `plugins` entry can take any of these forms:

- npm: `"opencode-v2-kiro-auth"`, or `@<version>` to pin one.
- GitHub: `"github:hongyilyu/opencode-v2-kiro-auth"`.
- Local checkout: `"file:///ABSOLUTE/PATH/TO/opencode-v2-kiro-auth"`. A plain absolute path also
  works.

`opencode plugin add opencode-v2-kiro-auth` installs the npm package and adds it to
your global config for you.

You don't need a `providers` block. The plugin registers `kiro` with its three models
(`claude-fable-5.1`, `claude-opus-5.5`, `gpt-5.6-sol`), their limits, and effort variants. The
provider shows up in the model picker once you sign in. If you add a `providers.kiro` override,
opencode lists the provider right away, and its requests fail until you sign in.

## Sign in

```sh
opencode auth login kiro
```

Choose **AWS Builder ID** or **IAM Identity Center**. Identity Center also asks for your start
URL and region. Open the URL opencode shows, check the code, and approve. `/connect` in the TUI
does the same.

To sign in without prompts:

```sh
opencode auth login kiro --method oauth --answer authMethod=builder-id
opencode auth login kiro --method oauth --answer authMethod=idc \
  --answer startUrl=https://mycompany.awsapps.com/start --answer region=us-east-1
```

`opencode auth list` shows what is connected, and `opencode auth logout kiro` signs out.

A fresh opencode 2.x install starts with no credentials, so sign in once. When opencode 2.x
upgrades an existing 1.x install in place, it imports your `kiro` sign-in from `auth.json`, and
the plugin keeps refreshing it.

Credentials are secrets. Don't share or commit opencode's credential store or the output of
`opencode auth export`.

## Models and effort

The built-in catalog is defined in [`src/catalog.ts`](src/catalog.ts). Once you sign in,
`opencode models` lists the `kiro` models. The plugin ships three models, each with a 1M-token
context window and 128K output:

| Model | Effort levels |
| --- | --- |
| `claude-fable-5.1`, `claude-opus-5.5` | `low`, `medium`, `high`, `xhigh`, `max` |
| `gpt-5.6-sol` | `none`, `low`, `medium`, `high`, `xhigh`, `max` |

Kiro decides which models your account can use; if you have kiro-cli, `kiro-cli chat
--list-models` prints your list. To use another Kiro model, add it under
[Config overrides](#config-overrides); its id must match Kiro's `ListAvailableModels` exactly.

To set effort, pick a variant in the TUI's variant picker or add it to the model id:
`opencode run "hello" --model kiro/claude-opus-5.5#high`. The plugin sends the level to Kiro in
`additionalModelRequestFields`:

- Claude models get `output_config.effort`. This also turns on adaptive thinking with the
  reasoning text omitted, so thinking blocks arrive as signatures that replay on later turns.
- GPT models get `reasoning.effort`.

If you pick no level, or a level the model doesn't declare, the plugin sends neither field.

Kiro reports no token counts, so the plugin estimates them. Input tokens are Kiro's
context-usage percentage times the model's context limit. Output tokens are the streamed
characters divided by four.

## Web search

The plugin adds `kiro` as a backend for opencode's built-in `websearch` tool. Select it with
`"websearch": { "provider": "kiro" }`, or pick it when opencode asks the first time a model
searches. Searches go to Kiro's server-side web search, the same one kiro-cli uses, through the
CodeWhisperer `InvokeMCP` operation, using your `opencode auth login kiro` sign-in. Kiro rejects
queries longer than 200 characters, so the plugin truncates them. It drops results that have no
URL.

## Config overrides

The catalog is only a default. `providers.kiro.models` in your config overrides or extends it,
and your config wins:

```jsonc
"providers": {
  "kiro": {
    "models": {
      "claude-opus-5.5-200k": {
        "modelID": "claude-opus-5.5",
        "name": "Claude Opus 5.5 (200K)",
        "limit": { "context": 200000, "output": 64000 }
      },
      "claude-sonnet-5": {
        "name": "Claude Sonnet 5",
        "limit": { "context": 1000000, "output": 64000 },
        "variants": [{ "id": "low" }, { "id": "high" }]
      },
      "gpt-5.6-sol": { "disabled": true }
    }
  }
}
```

- An entry with `modelID` is an alias. Kiro receives the `modelID`. The alias inherits the
  target's limits and variants; limits you set replace the inherited ones, but `variants` you list
  are added to the inherited list, and you can't remove an inherited variant.
- `variants` is a list of `{ "id": … }`. The plugin forwards the selected id as an effort level
  only for `claude-*` ids (`output_config.effort` with adaptive thinking) and `gpt-*` ids
  (`reasoning.effort`); on any other id it ignores variants. A `claude-*` or `gpt-*` model you add
  only in config and give no `variants` gets opencode's default Anthropic effort levels. List the
  levels Kiro accepts for that model instead, or use `"variants": []` for none.
  On a catalog model, opencode adds the `variants` you list to the built-in ones. It doesn't
  replace them.
- The context limit also scales the input-token estimate, so a wrong limit skews usage.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `KIRO_KEEP_IMAGE_TURNS` | `2` | How many recent image-bearing turns keep their images in requests. `0` strips all images. |
| `KIRO_RATE_LIMIT_RETRY_SECONDS` | Unset | Positive integer the plugin puts in `retry-after` on every 429 it returns, whether Kiro sent an HTTP 429 or throttled inside the stream. Without it, the upstream `Retry-After` and opencode's own backoff apply. |
| `KIRO_DEBUG` | Unset | `1` or `true` writes correlated request and event-stream diagnostics to stderr. The logs hold shapes and byte counts, never prompt text, tool output, or credentials. |

The opencode server process reads these variables, not the CLI. A `--standalone` run starts a
private server that inherits your shell's environment. The background service keeps its own
environment, and `opencode service --help` shows how to configure it.

## Troubleshooting

- **Diagnostics.** Rerun the failing prompt with debugging on and capture stderr:
  `KIRO_DEBUG=1 opencode run --standalone --print-logs --model kiro/claude-opus-5.5 "hello" 2> kiro.log`.
  The plugin's lines start with `[kiro-debug]`. Each attempt logs under one trace UUID, which
  the plugin also sends as the request's `amz-sdk-invocation-id`. The `response.received` event
  carries Kiro's request id, so you can match the two.
- **`UnexpectedStatus: 500` during `opencode auth login kiro`.** opencode 2.x reports any failure
  to start a device flow as this bare status, for example when AWS doesn't recognize the
  Identity Center start URL. Add `--standalone --print-logs` to see the real message in the
  server log. The login form rejects a malformed start URL or region before contacting AWS.
- **`Kiro is not signed in for kiro`.** Run `opencode auth login kiro`. A fresh opencode 2.x
  install starts empty.
- **`Kiro credential format is unsupported`, `…is corrupt`, `…is incomplete`, or `Kiro OAuth
  client registration expired`.** The plugin can't refresh the stored device-flow sign-in. Run
  `opencode auth login kiro` again.
- **`Prompt is too long: Kiro rejected the request…`.** Kiro caps the total size of a request,
  history and images together, and answers an oversized one with a 400
  `CONTENT_LENGTH_EXCEEDS_THRESHOLD`. opencode resends the full history every turn, so
  image-heavy sessions can hit the cap even at modest token counts. The plugin keeps images,
  top-level or inside tool results, only on the most recent `KIRO_KEEP_IMAGE_TURNS`
  image-bearing turns and replaces older ones with an `[image omitted]` marker. It reports a
  request that still overflows as a context overflow, which opencode answers by compacting the
  session. If that doesn't help, start a new session or lower `KIRO_KEEP_IMAGE_TURNS`.
- **A 400 saying `additionalModelRequestFields` isn't supported.** The plugin sent effort to a
  model that doesn't accept it. This usually comes from `variants` on a `claude-*` or `gpt-*`
  model you added in config. See [Config overrides](#config-overrides).
- **`Kiro blocked this response…`.** Kiro's content filter refused the turn. Before any output
  it's a 400 that opencode doesn't retry. After output starts, the turn ends with
  `stop_reason: refusal`. Retrying the unchanged conversation won't help.
- **Throttling and timeouts.** Before any output, the plugin turns Kiro throttling into a 429, a
  timeout into a 504, and an empty or corrupt stream into a 502. opencode retries all three with
  its own backoff and honours `Retry-After`. A failure after output starts ends the stream with
  an error, and opencode decides what happens next.

## Development

```sh
bun install
bun test            # offline unit and pipeline tests
bun run typecheck   # tsc --noEmit
bun run check       # live end-to-end check against your real Kiro account
```

`bun run check [model]` runs against your real account, with the model defaulting to
`claude-opus-5.5`. It needs an opencode 2.x binary, found as `opencode2`, as `opencode` if that
reports v2.x, or at the path in `OPENCODE2_BIN`. It uses your real opencode config and
credentials, adds this checkout to `plugins`, and then runs these steps with `--standalone`:

1. `opencode auth list`
2. one chat through `kiro/<model>`
3. one built-in `websearch` call, routed to the `kiro` backend

Sign in with `opencode auth login kiro` first. If your config already loads the plugin from npm or
GitHub, remove that entry for the check. opencode keeps the first plugin with a given id and
drops the checkout as a duplicate, so the check would run the installed copy instead. The check
never prints tokens.

Where things live:

- `server.ts` is the entry opencode loads. Its default export is the plugin.
- `src/plugin.ts` is the host adapter. It registers the `kiro` provider over `src/catalog.ts`,
  its device-flow sign-in, and the web search backend. Its `http.request` and `http.response` hooks
  rewrite the Anthropic exchange into Kiro's. An error thrown while preparing a request (not
  signed in, a malformed body) fails the turn, and opencode doesn't retry it.
- `src/auth.ts` handles AWS SSO OIDC client registration, device authorization, and token
  refresh.
- `src/session.ts` and `src/profile.ts` build per-request Kiro sessions and look up profile
  ARNs.
- `src/request.ts` maps the Anthropic Messages request opencode builds into Kiro's CodeWhisperer
  `GenerateAssistantResponse` payload, covering text, tool calls, and images.
- `src/client.ts` renders Kiro's wire format. It renders chat requests for opencode to send and
  sends InvokeMCP and the profile lookups itself.
- `src/response.ts` is the single seam for every upstream response, with `src/eventstream.ts`,
  `src/events.ts`, and `src/sse.ts` behind it. It redacts non-2xx error bodies (keeping their
  status), maps Kiro's content-length 400 to an Anthropic "Prompt is too long" error, applies
  the `retry-after` policy, and turns the AWS event stream into an Anthropic SSE stream.
- `src/mcp.ts` calls Kiro's InvokeMCP `web_search`.

[CONTEXT.md](CONTEXT.md) defines the domain vocabulary and records the design decisions.

## License

MIT, see [LICENSE](LICENSE).

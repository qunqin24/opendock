# @nimble-way/opencode

Nimble web search for [OpenCode](https://opencode.ai), as an OpenCode plugin.

The plugin adds [Nimble](https://nimbleway.com) as a provider for OpenCode's built-in `websearch` tool. When the model
searches the web, OpenCode sends the query to Nimble's Search API and gets back ranked results with the page text the
model needs to answer.

## Requirements

- OpenCode 2.2.5 or later (OpenCode V2 plugins).
- A Nimble API key from your [Nimble](https://nimbleway.com) account.

## Install

```bash
opencode plugin add @nimble-way/opencode
```

Or add it to `plugins` in your `opencode.json(c)`:

```jsonc title="opencode.jsonc"
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@nimble-way/opencode"],
}
```

## Set your Nimble API key

Run `/connect` in OpenCode, choose **Nimble** and enter your key. OpenCode stores it with your other credentials.

Or set `NIMBLE_API_KEY` on the server that runs OpenCode. `opencode` connects to a shared background server that
keeps the environment it started with, so a variable you export later doesn't reach it. Add the key to the server's
managed environment instead:

```bash
opencode service set env NIMBLE_API_KEY your-key
```

This stops a running service, and the next OpenCode command starts it with the key. For a one-off private server, pass
the key when starting standalone mode instead:

```bash
NIMBLE_API_KEY=your-key opencode --standalone
```

A key saved with `/connect` takes precedence over `NIMBLE_API_KEY`.

Nimble shows up as a web search provider only while a key is available, so OpenCode never picks Nimble for a search
it can't run. Connect a key with `/connect` and Nimble appears without a restart; remove it and Nimble leaves the list.

## Use Nimble for web search

The first web search asks you to allow web search and pick a provider. To always use Nimble, set it in
`opencode.json(c)`:

```jsonc title="opencode.jsonc"
{
  "$schema": "https://opencode.ai/config.json",
  "websearch": {
    "provider": "nimble",
  },
}
```

With `"provider": "random"`, Nimble is one of the providers OpenCode picks from. If Nimble returns HTTP 429, OpenCode
retries the search with another provider.

## What it sends

Each search is one request to `https://sdk.nimbleway.com/v2/search` with:

- the query, `search_depth: "standard"` and `max_results: 8`
- your key in the `Authorization: Bearer` header
- an `X-Client-Source: opencode` header, so Nimble can tell the request came from OpenCode
- OpenCode's usual `User-Agent`
- `traceparent` and `b3` trace headers, which effect's HTTP client adds to every request, as it does for OpenCode's
  built-in providers

Nimble returns the page text for each result in its `description` field, which the plugin passes to the model as the
result's content. A search that takes longer than 25 seconds fails, like OpenCode's built-in providers.

The plugin never logs or echoes your key.

## Cost

Each web search is one Nimble Search request at standard depth, which costs $5.00 per 1,000 searches (half a cent per
search) on Nimble's [published pricing](https://docs.nimbleway.com/nimble-sdk/admin/pricing). Only successful requests
are billed. Your plan may differ, so check your Nimble account for the rate that applies to you.

## Troubleshooting

- **Nimble isn't in the provider list.** Check that a key is connected: `/connect` should show Nimble as connected.
  A `NIMBLE_API_KEY` you export after the background service started doesn't reach it. Set it with
  `opencode service set env NIMBLE_API_KEY your-key` instead.
- **"Web search authentication failed (HTTP 401)".** Nimble rejected the key. Connect a valid key with `/connect`.

## Disable

Remove `@nimble-way/opencode` from `plugins`, or add `"-nimble"` after it (or in a higher-precedence config) to disable
it without uninstalling.

## Development

```bash
pnpm install
pnpm run typecheck
pnpm test
```

The tests run offline against a fake `fetch` and a fake OpenCode host. They need no key and don't contact Nimble.

To try a local checkout in OpenCode, build it (`pnpm run build`) and add the checkout's absolute path to `plugins`.

## License

MIT. See [LICENSE](LICENSE).

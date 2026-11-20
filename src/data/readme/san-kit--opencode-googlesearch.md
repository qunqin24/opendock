# @san-kit/opencode-googlesearch

A Google Search tool for OpenCode V2 backed by the
[DataForSEO](https://dataforseo.com/) SERP API. It returns live Google results
with final destination URLs, optional AI Overview content, and a target-domain
annotation, and it reports the exact DataForSEO cost of each search.

Install it, run `/connect`, choose **DataForSEO**, enter your API login, and
provide your API password when prompted. OpenCode stores the credential in its
credential store; the plugin does not write it to disk.

## Requirements

- OpenCode V2 **2.2.7 or newer**.
- A DataForSEO account with API access.
- Your DataForSEO **API login** and **API password** from the DataForSEO
  dashboard. These are the API credentials, not necessarily your dashboard
  login.

## Install

```sh
opencode plugin add @san-kit/opencode-googlesearch
```

Or add it to `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@san-kit/opencode-googlesearch"],
}
```

### Install scope

`opencode plugin add ...` installs the plugin **globally**, so it is available
in every project. To scope it to one project, add the package to that project's
`opencode.json(c)` under `plugins` instead. To disable a globally installed
plugin in one project, use the `-` prefix with its package ID; see the
[OpenCode plugins guide](https://opencode.ai/docs/plugins).

### Where files live

| What                | Path                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| Global config       | `~/.config/opencode/opencode.jsonc`                                       |
| Project config      | `<project>/opencode.jsonc` or `<project>/.opencode/opencode.jsonc`        |
| Package plugin code | `~/.cache/opencode/npm/<package-key>/<generation>/node_modules/<package>` |
| Credentials         | `~/.local/share/opencode/opencode.db`                                     |
| Plugin history      | `~/.local/share/opencode/plugin-data/googlesearch`                        |

Credentials are global to the machine. A connection created in one project is
active in other projects. Use `historyPath` or `GOOGLESEARCH_HISTORY_PATH` to
choose a different history directory, or disable history with `history: false` /
`GOOGLESEARCH_HISTORY=0`.

## Connect credentials

Open a session and run:

```text
/connect
```

Search for **DataForSEO**, choose **DataForSEO login & API password**, enter
your API login in the form, and provide your API password as the connection
key. OpenCode stores the credential in its credential store.

If the integration does not appear yet, open a session first. Plugins register
their integrations when the location loads. If it still does not appear, reload
the session or run `opencode reload`.

### Environment fallback

For CI or scripted runs, set:

```sh
export DATAFORSEO_LOGIN="your-api-login"
export DATAFORSEO_PASSWORD="your-api-password"
```

Environment variables take precedence over the stored connection. This is
useful for ephemeral runners where you do not want to create a connection.

## Usage

The model calls the `googlesearch` tool automatically when it needs current
information. You can also ask for it explicitly:

```text
Search Google for the latest OpenCode V2 plugin release notes.
```

The tool accepts:

| Argument   | Type             | Description                                                                                       |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| `queries`  | `string[]`       | 1–5 Google queries. Required.                                                                     |
| `depth`    | number or string | Results per query: 10 up to `maxDepth` in steps of 10. Default 10.                                |
| `location` | string or number | Country name (`"Germany"`), ISO code (`"DE"`), or DataForSEO code (`"2276"`). Country-level only. |
| `language` | string           | Interface language name (`"German"`) or code (`"de"`).                                            |
| `target`   | string           | Domain to watch in the results, e.g. `"opencode.ai"`. Does not restrict the search.               |

Example arguments:

```json
{
  "queries": ["opencode v2 plugins", "opencode plugin api"],
  "depth": 10,
  "location": "Germany",
  "language": "German",
  "target": "opencode.ai"
}
```

The result is a JSON object with:

- `today`: the server's local date when the search ran.
- `searches`: one entry per query, including `status`, resolved location,
  language, depth and feature flags, `organic` results, optional `ai_overview`,
  optional `target` annotation, `results_count`, `duration_ms`, `cost_usd`, and
  `fetched_at`.
- `totals`: requested and executed query counts, total results, total cost, and
  total duration.
- `notes`: deduplication, operator detection, retry information, unresolved
  redirects, or history warnings.

### Final destination URLs

Google often returns intermediate `google.com/goto?url=...` redirect links
instead of the real result URLs. The `url` value is an opaque token, so it
cannot be decoded locally. By default the plugin sets DataForSEO's
`resolve_goto_urls` parameter to `true`, so `url` and `domain` point to the
final destination. This also makes the `target` annotation reliable.

Resolution adds latency. DataForSEO's API docs say up to 40 seconds and its
announcement says at least 40 seconds; a live depth-10 query measured about
56 seconds. DataForSEO caps total turnaround at 260 seconds, so the plugin uses
a 300-second timeout while the feature is enabled. Disable it when latency
matters more than clean URLs:

```jsonc
{
  "plugins": [
    {
      "package": "@san-kit/opencode-googlesearch",
      "options": { "resolveGotoUrls": false },
    },
  ],
}
```

Or set `GOOGLESEARCH_RESOLVE_GOTO_URLS=0`. With resolution disabled, result
URLs may remain `google.com/goto` links, and the `target` annotation can miss
results because it matches on the final hostname. See the
[DataForSEO update](https://dataforseo.com/update/get-final-destination-urls-with-serp-api)
for the API details.

### AI Overviews

By default DataForSEO only returns AI Overview items that are already cached;
a live test received one with the option off. Set `aiOverview: true` (or
`GOOGLESEARCH_AI_OVERVIEW=1`) to load AI Overviews that Google renders
asynchronously. DataForSEO charges an extra $0.002 when an overview is present
and refunds it when the element is absent.

## Cost

DataForSEO bills per SERP request:

- `depth: 10` is one SERP; higher depths are billed in 10-result increments.
- Google operators such as `site:`, `filetype:`, and `intitle:` cause
  DataForSEO to multiply the whole task price by 5. The tool reports detected
  operators in `notes`.
- `resolve_goto_urls` has no documented separate surcharge, but it adds
  substantial latency: DataForSEO documents up to 40 seconds, its announcement
  says at least 40, and a depth-10 test measured about 56 seconds.
- `aiOverview: true` adds $0.002 per task when an AI Overview is available.
  DataForSEO refunds the surcharge when the overview is absent.
- Failed tasks are billed at $0 by DataForSEO. The plugin retries transient
  failures (HTTP 5xx and DataForSEO task status `40101` or `40103`) once after
  5 seconds. Timeouts are not retried.
- The reported `cost_usd` comes from DataForSEO's response.

The tool is deliberately not free and not a replacement for a general web
crawler. Use it only when fresh SERP data is needed.

## History and cost log

By default the plugin writes a local history to:

```text
$XDG_DATA_HOME/opencode/plugin-data/googlesearch
```

or, when `XDG_DATA_HOME` is unset:

```text
~/.local/share/opencode/plugin-data/googlesearch
```

Files:

- `YYYY-MM-DD.jsonl`: one record per search, including the normalized result,
  timing, and the request parameters. Raw DataForSEO responses are stored only
  when `historyRaw` is enabled.
- `cost-log.json`: cumulative search count and cost. Per-search entries follow
  the retention window and are capped at the latest 10,000; the totals remain
  cumulative.

The history directory is created with `0700` permissions and files are written
with `0600`. An existing default directory is tightened to `0700`; an existing
custom `historyPath` directory keeps its permissions. Daily files and cost-log
entries older than 30 days are deleted. Change the retention window with
`historyRetentionDays` or `GOOGLESEARCH_HISTORY_RETENTION_DAYS`; `0` keeps them
forever.

Disable history with:

```sh
export GOOGLESEARCH_HISTORY=0
```

or with a plugin option:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@san-kit/opencode-googlesearch",
      "options": { "history": false },
    },
  ],
}
```

Use a custom directory with `GOOGLESEARCH_HISTORY_PATH` or the `historyPath`
plugin option. It must be an absolute path; relative paths are ignored and a
warning is returned in `notes`.

## Plugin options

| Option                 | Type    | Description                                                                                                        |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `history`              | boolean | Set `false` to disable the local history. Default `true`.                                                          |
| `historyPath`          | string  | Override the history directory. Must be absolute; relative paths are ignored.                                      |
| `historyRaw`           | boolean | Store raw DataForSEO responses in history. Default `false`.                                                        |
| `historyRetentionDays` | number  | Delete history and cost-log entries older than this many days. Default `30`; `0` keeps them forever.               |
| `resolveGotoUrls`      | boolean | Resolve Google `goto` redirects to final destination URLs. Default `true`. Adds roughly 40–60 seconds per request. |
| `aiOverview`           | boolean | Request AI Overviews even when Google loads them asynchronously. Default `false`. Adds $0.002 when present.        |
| `maxDepth`             | number  | Maximum allowed `depth`. Default `100`. Rounded down to a multiple of 10 and clamped to 10–100.                    |

Environment variables take precedence over plugin options: `GOOGLESEARCH_HISTORY`,
`GOOGLESEARCH_HISTORY_PATH`, `GOOGLESEARCH_HISTORY_RAW`,
`GOOGLESEARCH_HISTORY_RETENTION_DAYS`, `GOOGLESEARCH_RESOLVE_GOTO_URLS`,
`GOOGLESEARCH_AI_OVERVIEW`, and `GOOGLESEARCH_MAX_DEPTH`.

Example:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@san-kit/opencode-googlesearch",
      "options": {
        "history": true,
        "historyPath": "/Users/me/opencode-logs/googlesearch",
        "historyRaw": false,
        "historyRetentionDays": 30,
        "maxDepth": 50,
      },
    },
  ],
}
```

## Permissions

Each call checks the `googlesearch` permission action before any billed
request. The resources are the deduplicated query strings. The action is
allowed by the default `*` rule, so add an explicit rule to require approval or
block it:

```jsonc
{
  "permissions": [
    { "action": "googlesearch", "resource": "*", "effect": "ask" },
  ],
}
```

Use `effect: "deny"` to block searches; a `"resource": "*"` deny also hides the
tool from the model. Choosing **Allow always** saves a `googlesearch: *` rule
for the project. `maxDepth` caps the maximum billed depth independently of
permissions.

## Troubleshooting

**`googlesearch is not connected`**

Run `/connect`, choose **DataForSEO**, enter your API login, and provide your
API password. Or set `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` and restart
the server.

**HTTP 401 / credentials rejected**

The API login or password is wrong. Reconnect with `/connect` or fix the
environment variables. The tool does not retry a 401.

**HTTP 402 / out of credits (status `40200` or `40210`)**

Top up your DataForSEO account at <https://app.dataforseo.com/>. The tool does
not retry until the account is funded.

**Location or language not recognized**

Use a country name, ISO country code, or DataForSEO numeric code. Cities and
regions are not supported. The reference data is bundled with the package.

**Searches take 40 seconds or longer**

Goto URL resolution is enabled by default. DataForSEO's docs say up to
40 seconds, its announcement says at least 40, and a depth-10 test measured
about 56 seconds. Set `resolveGotoUrls: false` or
`GOOGLESEARCH_RESOLVE_GOTO_URLS=0` to skip it. Results are faster, but some
URLs may be `google.com/goto` redirects.

**`historyPath` was ignored**

The plugin only accepts absolute history paths, because a relative path would
resolve against the server's working directory, often the repository. Use an
absolute path or the default directory.

**History files are missing or old files remain**

Check `historyRetentionDays` (default 30). Set it to `0` to keep files
indefinitely. Raw DataForSEO responses are not stored unless `historyRaw` is
enabled.

**Result URLs point to `google.com/goto`**

Resolution is either disabled or DataForSEO could not resolve that redirect.
When resolution is enabled, the tool reports unresolved links in `notes`.

**No results**

Refine the query. The tool returns `status: "no_results"` rather than an
error, including when DataForSEO reports task status `40102`.

**History could not be saved**

Check that the history directory is writable. The search still succeeds; the
warning appears in `notes`.

## How it works

1. The plugin registers a `dataforseo` integration with OpenCode.
2. The user runs `/connect`, enters the DataForSEO API login, and provides the
   API password as the connection key. OpenCode stores the credential in its
   credential store. Connections created with the older external method still
   work.
3. On a tool call, the plugin reads the active credential and calls the
   DataForSEO live SERP endpoint with final-URL resolution enabled by default.
4. The response is normalized, optional local history is written, and the
   result is returned as JSON.
5. If no credential is available, the tool returns a short error telling the
   user to run `/connect`. It does not make a billed request.

## Privacy

Search queries and result URLs are sent to DataForSEO. The local history keeps
queries and normalized results on your machine for 30 days by default, with
`0700` directory and `0600` file permissions. Raw responses are stored only
when `historyRaw` is enabled. Disable history if you do not want that data
retained. The plugin does not send credentials anywhere except DataForSEO's API
endpoint.

## License

MIT

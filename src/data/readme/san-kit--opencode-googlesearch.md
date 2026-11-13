# @san-kit/opencode-googlesearch

A Google Search tool for OpenCode V2 backed by the
[DataForSEO](https://dataforseo.com/) SERP API. It returns live Google results,
optional AI Overview content, and a target-domain annotation, and it reports
the exact DataForSEO cost of each search.

Install it, run `/connect`, choose **DataForSEO**, and enter your API login and
password. OpenCode stores the credential securely; the plugin does not write it
to disk.

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
`opencode.json(c)` under `plugins` instead. A project can also disable a
globally installed plugin with `"-opencode-googlesearch"` (the plugin ID) in its
`plugins` array.

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

Search for **DataForSEO**, choose **DataForSEO login & password**, and fill in
the form. OpenCode stores the credential in its credential store.

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
| `depth`    | number or string | Results per query: 10–100 in steps of 10. Default 10.                                             |
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

- `searches`: one entry per query, including `status`, resolved location and
  language, `organic` results, optional `ai_overview`, optional `target`
  annotation, `results_count`, `cost_usd`, and `fetched_at`.
- `totals`: requested and executed query counts, total results, total cost.
- `notes`: deduplication, operator detection, retry information, or history
  warnings.

## Cost

DataForSEO bills per SERP request:

- `depth: 10` is one SERP; higher depths are billed in 10-result increments.
- Google operators such as `site:`, `filetype:`, and `intitle:` are billed at
  5× the base SERP price. The tool reports detected operators in `notes`.
- Failed tasks are billed at $0 by DataForSEO. The plugin retries transient
  failures (HTTP 5xx and DataForSEO status `40101`) once after 5 seconds.
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

- `YYYY-MM-DD.jsonl`: one record per search, including the normalized result
  and the raw DataForSEO response.
- `cost-log.json`: cumulative search count and cost.

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
plugin option. A relative `historyPath` resolves from the current project
directory.

## Plugin options

| Option        | Type    | Description                                                                                                       |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `history`     | boolean | Set `false` to disable the local history. Default `true`.                                                         |
| `historyPath` | string  | Override the history directory. Absolute paths are used as-is; relative paths resolve from the project directory. |

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
      },
    },
  ],
}
```

## Troubleshooting

**`googlesearch is not connected`**

Run `/connect`, choose **DataForSEO**, and enter your login and password. Or
set `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` and restart the server.

**HTTP 401 / credentials rejected**

The API login or password is wrong. Reconnect with `/connect` or fix the
environment variables. The tool does not retry a 401.

**HTTP 402 / out of credits**

Top up your DataForSEO account at <https://app.dataforseo.com/>. The tool does
not retry until the account is funded.

**Location or language not recognized**

Use a country name, ISO country code, or DataForSEO numeric code. Cities and
regions are not supported. The reference data is bundled with the package.

**No results**

Refine the query. The tool returns `status: "no_results"` rather than an
error.

**History could not be saved**

Check that the history directory is writable. The search still succeeds; the
warning appears in `notes`.

## How it works

1. The plugin registers a `dataforseo` integration with OpenCode.
2. The user runs `/connect` and enters the DataForSEO login and password.
   OpenCode stores the credential in its credential store.
3. On a tool call, the plugin reads the active credential and calls the
   DataForSEO live SERP endpoint.
4. The response is normalized, optional local history is written, and the
   result is returned as JSON.
5. If no credential is available, the tool returns a short error telling the
   user to run `/connect`. It does not make a billed request.

## Privacy

Search queries and result URLs are sent to DataForSEO. The local history keeps
queries, results, and raw responses on your machine. Disable history if you do
not want that data retained. The plugin does not send credentials anywhere
except DataForSEO's API endpoint.

## License

MIT

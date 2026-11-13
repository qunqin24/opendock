# @san-kit/opencode-webfetchmd

A web-page reader for OpenCode V2. It fetches a URL through the
[Zyte](https://www.zyte.com/) Extract API, extracts the main content, and
returns clean Markdown plus the page title, description, and JSON-LD structured
data.

Install it, run `/connect`, choose **Zyte**, and enter your API key. OpenCode
stores the credential securely; the plugin does not write it to disk.

## Requirements

- OpenCode V2 **2.2.7 or newer**.
- A Zyte account and API key.

## Install

```sh
opencode plugin add @san-kit/opencode-webfetchmd
```

Or add it to `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@san-kit/opencode-webfetchmd"],
}
```

### Install scope

`opencode plugin add ...` installs the plugin **globally**, so it is available
in every project. To scope it to one project, add the package to that project's
`opencode.json(c)` under `plugins` instead. A project can also disable a
globally installed plugin with `"-opencode-webfetchmd"` (the plugin ID) in its
`plugins` array.

### Where files live

| What                | Path                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| Global config       | `~/.config/opencode/opencode.jsonc`                                       |
| Project config      | `<project>/opencode.jsonc` or `<project>/.opencode/opencode.jsonc`        |
| Package plugin code | `~/.cache/opencode/npm/<package-key>/<generation>/node_modules/<package>` |
| Credentials         | `~/.local/share/opencode/opencode.db`                                     |
| Plugin history      | `~/.local/share/opencode/plugin-data/webfetchmd`                          |

Credentials are global to the machine. A connection created in one project is
active in other projects. Use `historyPath` or `WEBFETCHMD_HISTORY_PATH` to
choose a different history directory, or disable history with `history: false` /
`WEBFETCHMD_HISTORY=0`.

## Connect credentials

Open a session and run:

```text
/connect
```

Search for **Zyte**, choose **Zyte API key**, and paste your key. OpenCode stores
the credential in its credential store.

If the integration does not appear yet, open a session first. Plugins register
their integrations when the location loads. If it still does not appear, reload
the session or run `opencode reload`.

### Environment fallback

For CI or scripted runs:

```sh
export ZYTE_API_KEY="your-zyte-api-key"
```

The environment variable takes precedence over the stored connection.

## Usage

The model calls the `webfetchmd` tool automatically when it needs to read a web
page. You can also ask for it explicitly:

```text
Read https://opencode.ai/docs/build/plugins/ and summarize the plugin API.
```

The tool accepts:

| Argument | Type   | Description                                                                                                                                  |
| -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`    | string | Absolute `http(s)` URL. Required.                                                                                                            |
| `goal`   | string | Optional description of what you are looking for. When the page is truncated, the plugin tries to keep a relevant excerpt from further down. |

Example arguments:

```json
{
  "url": "https://opencode.ai/docs/build/plugins/",
  "goal": "how integrations and credentials work"
}
```

The result is a JSON object with:

- `url` and optional `final_url` after redirects.
- `status`: `ok`, `error_page`, or `blocked`.
- `http_status`.
- `meta`: `title` and `description` when available.
- `schema`: pruned JSON-LD blocks.
- `markdown`: the extracted content.
- `notes`: redirects, truncation, blocked/interstitial warnings, or history
  warnings.

## Cost

Zyte bills per extraction request. The plugin:

- never retries automatically;
- returns a clear `blocked` or `error_page` status instead of retrying a
  captcha or an error page;
- reports the HTTP status and a short note so the model does not re-fetch a
  billed URL.

If a page is larger than 60,000 characters, the Markdown is truncated. With
history enabled, the full Markdown is archived locally and a note says so. Do
not re-fetch a truncated page just to get the rest.

## History

By default the plugin writes a local history to:

```text
$XDG_DATA_HOME/opencode/plugin-data/webfetchmd
```

or, when `XDG_DATA_HOME` is unset:

```text
~/.local/share/opencode/plugin-data/webfetchmd
```

Files:

- `YYYY-MM-DD.jsonl`: one record per fetch, including the normalized content
  and the full Markdown.
- `fetch-log.json`: cumulative fetch counts and statuses.

Disable history with:

```sh
export WEBFETCHMD_HISTORY=0
```

or with a plugin option:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@san-kit/opencode-webfetchmd",
      "options": { "history": false },
    },
  ],
}
```

Use a custom directory with `WEBFETCHMD_HISTORY_PATH` or the `historyPath`
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
      "package": "@san-kit/opencode-webfetchmd",
      "options": {
        "history": true,
        "historyPath": "/Users/me/opencode-logs/webfetchmd",
      },
    },
  ],
}
```

## Troubleshooting

**`webfetchmd is not connected`**

Run `/connect`, choose **Zyte**, and paste your API key. Or set `ZYTE_API_KEY`
and restart the server.

**HTTP 401 / API key rejected**

The key is wrong or revoked. Reconnect with `/connect` or fix `ZYTE_API_KEY`.
The tool does not retry a 401.

**HTTP 402 / out of credits**

Top up your Zyte account at <https://hub.zyte.com/>. The tool does not retry.

**`status: "blocked"`**

The site served a captcha, bot check, or error interstitial. Do not retry the
same URL; the tool tells the model to stop and report it.

**`status: "error_page"`**

The target returned an HTTP error. The Markdown is the error page itself. Do
not retry.

**Output truncated**

The page exceeded 60,000 characters. With history enabled, the full Markdown is
in the local history log. Do not re-fetch the URL just for the remainder.

**History could not be saved**

Check that the history directory is writable. The fetch still succeeds; the
warning appears in `notes`.

## How it works

1. The plugin registers a `zyte` integration with OpenCode.
2. The user runs `/connect` and enters the Zyte API key. OpenCode stores the
   credential in its credential store.
3. On a tool call, the plugin reads the active credential and calls Zyte's
   Extract API.
4. The page is converted to Markdown, JSON-LD is pruned, optional local history
   is written, and the result is returned as JSON.
5. If no credential is available, the tool returns a short error telling the
   user to run `/connect`. It does not make a billed request.

## Privacy

Fetched URLs and page content are sent to Zyte. The local history keeps URLs,
page metadata, and the full Markdown on your machine. Disable history if you do
not want that data retained. The plugin does not send credentials anywhere
except Zyte's API endpoint.

## License

MIT

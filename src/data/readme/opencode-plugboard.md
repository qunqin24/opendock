# opencode-plugboard

[![npm](https://img.shields.io/npm/v/opencode-plugboard)](https://www.npmjs.com/package/opencode-plugboard)
[![license](https://img.shields.io/npm/l/opencode-plugboard)](https://github.com/jjjermiah/opencode-plugboard/blob/main/LICENSE)
[![CI](https://github.com/jjjermiah/opencode-plugboard/actions/workflows/ci.yml/badge.svg)](https://github.com/jjjermiah/opencode-plugboard/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/jjjermiah/opencode-plugboard/badge)](https://scorecard.dev/viewer/?uri=github.com/jjjermiah/opencode-plugboard)
<!-- OpenSSF Best Practices: register at https://www.bestpractices.dev first (answers in docs/best-practices.md). Then replace <id> with the project id and uncomment the next line:
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/<id>/badge)](https://www.bestpractices.dev/projects/<id>)
-->

Plugboard is an OpenCode V2 plugin. It serves OpenAI, Anthropic and Gemini compatible HTTP APIs from your OpenCode server, so any app that speaks one of them can use the provider logins and models you already have in OpenCode. Each app gets its own key. OpenCode never runs your tools.

Full documentation: **https://jjjermiah.github.io/opencode-plugboard**

## Install

Add it to your global OpenCode config, `~/.config/opencode/opencode.jsonc`. Keep the version pinned and change it on purpose, after reading the [changelog](https://github.com/jjjermiah/opencode-plugboard/blob/main/CHANGELOG.md).

```jsonc
{
  "plugins": [
    {
      "package": "opencode-plugboard@0.48.0",
      "options": {
        "keys": { "my-app": "{env:PLUGBOARD_KEY_MY_APP}" },
        "models": ["opencode-go/glm-5.3-flash"],
        "aliases": { "fast": "opencode-go/glm-5.3-flash" }
      }
    }
  ]
}
```

Set the key in the environment OpenCode starts from, restart OpenCode, then touch the server once. OpenCode loads no plugin until a client connects.

```sh
export PLUGBOARD_KEY_MY_APP=choose-a-long-random-string
opencode api get /api/agent
```

## First request

The listener is on `127.0.0.1:4010`. This prints `pong`:

```sh
curl -s http://127.0.0.1:4010/v1/chat/completions \
  -H "Authorization: Bearer $PLUGBOARD_KEY_MY_APP" \
  -H "Content-Type: application/json" \
  -d '{"model": "fast", "messages": [{"role": "user", "content": "reply with exactly: pong"}]}' \
  | jq -r '.choices[0].message.content'
```

Any OpenAI SDK works the same way. Set the base URL to `http://127.0.0.1:4010/v1` and the API key to your plugboard key.

## What it serves

| API | Endpoint |
| --- | --- |
| OpenAI Chat Completions | `POST /v1/chat/completions` |
| OpenAI Responses | `POST /v1/responses` |
| Anthropic Messages | `POST /v1/messages`, `POST /v1/messages/count_tokens` |
| Gemini | `POST /v1beta/models/{model}:generateContent`, `:streamGenerateContent`, `:countTokens` |
| Legacy completions | `POST /v1/completions` |
| Models | `GET /v1/models`, `GET /v1/models/{id}` |

## What you can do with it

- [Give each app its own key and rules](https://jjjermiah.github.io/opencode-plugboard/guides/apps-and-keys), so traffic, history and usage stay separate.
- [Expose only the models you choose](https://jjjermiah.github.io/opencode-plugboard/guides/models-and-aliases), under short aliases with fallback chains.
- [Cap concurrency, rate and spend](https://jjjermiah.github.io/opencode-plugboard/guides/limits-budgets-and-caching), and cache repeated answers.
- [Use tools, structured output and images](https://jjjermiah.github.io/opencode-plugboard/guides/tools-output-and-images) through the usual SDK calls.
- [Read history, usage and metrics](https://jjjermiah.github.io/opencode-plugboard/guides/history-usage-and-monitoring) per app, in a dashboard or in OpenCode's TUI.
- [Serve other machines](https://jjjermiah.github.io/opencode-plugboard/guides/serving-other-machines) safely, and keep an always-on server awake.

More: [connect your app](https://jjjermiah.github.io/opencode-plugboard/connect), [client setup pages](https://jjjermiah.github.io/opencode-plugboard/clients/), [configuration reference](https://jjjermiah.github.io/opencode-plugboard/configuration), [known gaps](https://jjjermiah.github.io/opencode-plugboard/apis#known-gaps).

Plugboard is early (0.x). A minor release can change an option or a default.

## Project

- [Security policy](https://github.com/jjjermiah/opencode-plugboard/blob/main/SECURITY.md) and the [security notes](https://jjjermiah.github.io/opencode-plugboard/security).
- [Contributing](https://github.com/jjjermiah/opencode-plugboard/blob/main/CONTRIBUTING.md).
- [Changelog](https://github.com/jjjermiah/opencode-plugboard/blob/main/CHANGELOG.md).

## License

MIT. See [LICENSE](https://github.com/jjjermiah/opencode-plugboard/blob/main/LICENSE).

Not affiliated with or endorsed by OpenAI, Anthropic, Google, GitHub or Microsoft. Product names are trademarks of their owners.

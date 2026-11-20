# Magpie Gemini Decision Plugin

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md)

Version **0.3.0** lets Magpie use `gemini-decision-1` for decisions over text, images, audio, video, and PDF, including intent classification for routing groups. It supports the official Google Gemini Decisions API and compatible relays with Bearer authentication.

Provider ID: `gemini-decision-adapter`. Full model ID: `gemini-decision-adapter/gemini-decision-1`.

This is a decision model for predicates, choices, and scores. Set it as a group's `classifier`; use regular chat models as the group's members.

## Protocol and local endpoints

Magpie converts OpenAI-style `/v1/decisions` requests (`input` and a `questions` array) into System One requests (`state` and a `questions` object). The plugin sends those requests to the configured upstream `/decisions` endpoint.

| Magpie 0.1.4587 endpoint | Text | Images / audio / video / PDF |
| --- | --- | --- |
| `/v1/systemone` | Supported | Supported through top-level `images` / `media` |
| `/v1/decisions` | Supported | Rejected by the host conversion layer |
| `/v1beta/decisions` | Not registered | Not registered |

`GET /` returns the API list in its JSON `apis` field. `GET /apis` returns 404. For example: `curl -s http://127.0.0.1:3425/`.

| System One input | Conversion and response handling |
| --- | --- |
| String `state` | Passed unchanged as input text |
| Object or array `state` | Serialized in full as JSON, including history and context; not reduced to `message` |
| Top-level `images` | Image data URLs / HTTPS URLs become image blocks, in order |
| Top-level `media` | Text, image, audio, video, and document blocks preserve content, URI, MIME type, and order |
| `noul` | Preserves affirmative probability; does not substitute `confidence` |
| `choice` | Preserves choices and probabilities; null descriptions become empty strings |
| `score` | Preserves criterion order, `legend`, and probabilities |
| Token usage | Maps upstream `total_input_tokens` / `total_output_tokens` to `input_tokens` / `output_tokens`; zero output tokens are valid |

OpenAI `predicate` maps to `noul`; the other question types are `choice` and `score`. Magpie handles array conversion and answer order. The plugin rejects missing answers, invalid probabilities or usage, non-JSON responses, upstream errors, and blocked input with explicit errors.

## Installation and login

Use a Magpie version supporting provider plugins and System One; the tested version is **0.1.4587**. The plugin has no additional npm dependencies; unit tests require Node.js 20+.

Install from npm by its full package name. The macOS app CLI may not be on `PATH`:

```sh
MAGPIE_BIN=/Applications/magpie.app/Contents/MacOS/magpie
PLUGIN_SPEC=magpie-gemini-decision-plugin@latest
"$MAGPIE_BIN" plugin add "$PLUGIN_SPEC"
"$MAGPIE_BIN" plugin login gemini-decision-adapter
"$MAGPIE_BIN" plugin list --json
```

Enter the upstream API key at the login prompt. Magpie manages credentials: do not put keys in source code, command arguments, or plugin options, and do not manually edit `plugin-auth.json`.

With the plugin enabled, open **Plugins → Installed → Options** to edit `endpoint` and `authMode`. Version 0.3.0 supplies the Google defaults as an editable template. Save to apply your changes. For a relay, configure its endpoint and authentication mode before sending requests.

For local development, set `PLUGIN_SPEC="$PWD"` in the source directory and use the same installation command. Keep that directory in place. A local path and an npm package are separate plugin entries; configure the new entry when switching between them. If the discovery page has not listed the package yet, installation by the full npm name still works.

## Upstream configuration

The default configuration uses Google directly:

```json
{
  "endpoint": "https://generativelanguage.googleapis.com/v1beta/decisions",
  "authMode": "google"
}
```

`google` sends `x-goog-api-key`; `bearer` sends `Authorization: Bearer …`. The endpoint must be a complete HTTPS `/decisions` URL without user information, query parameters, or a fragment.

For a compatible relay, replace the example address:

```sh
"$MAGPIE_BIN" plugin options "$PLUGIN_SPEC" \
  '{"endpoint":"https://relay.example.com/v1beta/decisions","authMode":"bearer"}'
```

To restore the Google defaults:

```sh
"$MAGPIE_BIN" plugin options "$PLUGIN_SPEC" off
```

After switching services, run `plugin login gemini-decision-adapter` with that service's key. Keys are generally not interchangeable. Each request uses Magpie's currently selected account. The plugin preserves cancellation, adds no retries, follows no redirects, and forwards no caller cookies or credentials. Upstream HTTP errors retain status and retry information, without exposing raw error bodies that might contain credentials.

## Decision requests

Send this JSON to the local Magpie `/v1/systemone` endpoint:

```json
{
  "model": "gemini-decision-adapter/gemini-decision-1",
  "state": {"order": "A100", "status": "cancelled", "refund": "received"},
  "questions": {
    "cancelled": {"type": "noul", "instructions": "Has the order been cancelled?"},
    "status": {
      "type": "choice",
      "instructions": "Choose the order status.",
      "criteria": {"pending": "Pending", "cancelled": "Cancelled", "other": null}
    },
    "refund": {
      "type": "score",
      "instructions": "Rate refund progress.",
      "criteria": ["Not started", "Processing", "Received"]
    }
  }
}
```

For OpenAI `/v1/decisions`, use `input`, a `questions` array, and the types `predicate`, `choice`, and `score`. See [complete request examples](docs/examples.md) for every question type and media format.

## Media input

Use the top-level `media` array. Each attachment must have exactly one source: `data` containing Base64 file bytes, or `uri` containing a public or signed HTTPS URL, including HTTPS URIs returned by Google Files API. Local file paths are not accepted; the plugin neither reads nor uploads files.

| Content | `type` | Common `mime_type` values |
| --- | --- | --- |
| Image | `image` | `image/png`, `image/jpeg`, `image/webp` |
| Audio | `audio` | `audio/wav`, `audio/mpeg`, `audio/ogg` |
| Video | `video` | `video/mp4`, `video/webm`, `video/mov` |
| PDF | `document` | `application/pdf` |

For example, classify an order from a recording:

```json
{
  "model": "gemini-decision-adapter/gemini-decision-1",
  "state": "",
  "media": [
    {"type": "audio", "mime_type": "audio/wav", "data": "BASE64_WAV_CONTENT"}
  ],
  "questions": {
    "cancelled": {"type": "noul", "instructions": "Has the order in the recording been cancelled?"}
  }
}
```

Replace `data` with `"uri": "https://relay.example.com/media/recording.wav"` to reference remote audio. Only images and video accept optional `resolution`, such as `"low"`. You can mix media types and `{"type":"text","text":"Additional context"}` blocks in one request.

The standard `images` field also works: `"images": ["data:image/png;base64,BASE64_IMAGE_CONTENT"]`. Upstream order is full `state` text, then `images`, then `media`. An empty string state adds no text block. Business objects and arrays remain JSON text; only top-level `images` / `media` become media inputs.

Magpie 0.1.4587 limits the **complete JSON request body to 16 MiB**. Base64 adds about one third: keep total raw attachments below approximately 12 MiB and leave room for JSON. Larger inputs can use HTTPS URIs accessible to the upstream. This host limit is separate from Google's file limits.

`usage.input_tokens` / `output_tokens` feed Magpie's metering. The plugin also preserves `input_tokens_by_modality` when supplied. Video and PDF usage may appear under image/audio/text rather than separate video/pdf categories.

## Routing classifier

Configure an existing chat group:

```sh
"$MAGPIE_BIN" group rule classifier YOUR_GROUP_ID gemini-decision-adapter/gemini-decision-1
"$MAGPIE_BIN" group rule add YOUR_GROUP_ID use=YOUR_PROVIDER/chat-small \
  'intent=explaining a concept or answering a question without writing or changing code'
"$MAGPIE_BIN" group rule add YOUR_GROUP_ID use=YOUR_PROVIDER/chat-large \
  'intent=writing or fixing unit tests'
```

Replace `YOUR_GROUP_ID`, `YOUR_PROVIDER`, and model names with your actual group and available chat models. Check classification source, matching rule, actual model, and attempt result in `/v1/magpie/route?session=…`, plus `kind=routing` entries in `/v1/magpie/usage/requests`. A matching rule alone does not establish that the final model succeeded.

## Validation and limits

```sh
npm test
export MAGPIE_CHAT_TARGETS='["YOUR_PROVIDER/chat-small","YOUR_PROVIDER/chat-large"]'
python3 scripts/validate_live.py
python3 scripts/validate_media.py --output artifacts/media-run-001
```

Replace both chat targets with actual logged-in models. `MAGPIE_CHAT_TARGETS` is required by `validate_live.py` and must be a JSON array of two model IDs. The script calls local Magpie and real models, creates a uniquely named temporary routing group, checks two intents sequentially, and deletes only its own group. Log in to the plugin and both chat targets first. Authentication headers are not saved.

The `validate_media.py --output` path **must be a new directory**; use a different path for each run. The script uses synthetic fixtures in `test/fixtures/media/`: two contrasting samples per media type, one `images` sample, and one four-modality sample. It asserts actual answers and usage. Regenerate fixtures with `python3 scripts/generate_media_fixtures.py`; this development script requires Pillow, ffmpeg, and macOS `say`, which are not plugin runtime dependencies.

The gateway defaults to `http://127.0.0.1:3425`. Override it with `MAGPIE_URL` and the CLI with `MAGPIE_BIN`. Optional `MAGPIE_API_KEY` authenticates to the local gateway and is separate from the upstream key stored through plugin login.

Historical verification recorded **56 passing unit tests** and **10 live media cases / 31 passing answers**. Unit tests use fictitious credentials and mock upstream responses. Live media verification used Base64 through a compatible relay. HTTPS URI conversion has unit coverage, but remote URIs have not been tested live for every media type. Direct Google access and live account switching were not tested. See the public, sanitized [verification record](VERIFICATION.md); these are integration checks, not a classification accuracy benchmark.

No pricing is configured, so displayed costs do not represent an actual bill; verification covers token counts only. No local `/v1beta/decisions` alias is added.

## Files and references

- `index.mjs`: plugin factory, provider, model, and login interface.
- `adapter.mjs`: protocol, authentication, response validation, and error handling.
- `media.mjs`: media blocks, MIME, Base64, and HTTPS URI validation.
- `test/adapter.test.mjs`, `test/media.test.mjs`: unit tests.
- `scripts/validate_live.py`, `scripts/validate_media.py`: live integration checks.
- [Examples for all question types and media](docs/examples.md).
- [Sanitized verification record](VERIFICATION.md).
- [Google Decisions API](https://aistudio.google.com/docs/decisions-api#input)
- [Magpie issue #6969](https://github.com/yetone/magpie/issues/6969)
- [Magpie provider plugins (v0.1.4587)](https://github.com/yetone/magpie/blob/v0.1.4587/docs/subsystems/provider-plugins.md)
- [Magpie Gemini / System One conversion](https://github.com/yetone/magpie/blob/v0.1.4587/internal/provider/decide_wire.go)

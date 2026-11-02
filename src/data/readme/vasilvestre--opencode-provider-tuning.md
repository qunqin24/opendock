# opencode-provider-tuning

Three small hooks that make OpenCode v2 cheaper and more patient with rate limits.

Every hook is independent and off unless you turn it on. A hook that throws does nothing, so a bug in this plugin never breaks a session.

## Install

```sh
opencode plugin add @vasilvestre/opencode-provider-tuning
```

Or add it to `opencode.jsonc` with options:

```jsonc
{
  "plugins": [
    ["@vasilvestre/opencode-provider-tuning", { "titles": "local", "auxMaxTokens": 2048 }]
  ]
}
```

Requires OpenCode 2. The plugin has no dependency.

## `retry`: wait longer on a rate limit

The core retries a rate limit with its own backoff: 10 attempts, growing from 2 seconds to 10 seconds. A quota window often takes longer than that to reopen.

This hook makes the wait longer, and it grows with the attempt:

```text
delay = min(maxDelayMs, baseMs * 2 ** (attempt - 1))
```

| Option | Default | Meaning |
| --- | --- | --- |
| `baseMs` | `15000` | the wait before the first retry, in milliseconds |
| `maxDelayMs` | `120000` | the longest wait, in milliseconds |

The hook never starts a retry. It only lengthens one the core already decided to make, so an error that is not transient is never retried.

A rate limit is any error with `status: 429`, a `RateLimit` reason tag, or a message containing `429` or `rate limit`.

## `model.request`: cheaper auxiliary calls

OpenCode calls the model for more than your prompt: a title, a compaction summary, a generated reply. Those calls do not need the full output budget.

When a request is not the main conversation and has no `maxTokens`, the hook sets it:

| Option | Default | Meaning |
| --- | --- | --- |
| `auxMaxTokens` | `4096` | the output budget for a title, compaction, or generate call |

The hook never raises an existing value, and it never touches a primary request.

## `title`: no model call for a title

By default OpenCode asks the model for a session title. That is one extra request per session.

Set `titles` to `local` and the plugin derives the title from your first message instead:

| Option | Default | Values |
| --- | --- | --- |
| `titles` | `"model"` | `"model"` keeps the model call, `"local"` derives the title |

The rules:

- It reads the first user message.
- It drops leading slash commands and file attachments.
- It collapses whitespace, cuts at 60 characters on a word boundary, and drops a trailing period.
- When nothing is left, it leaves the title to the model.

```text
/review [Image 1] Add retries to the uploader
  -> Add retries to the uploader
```

## Known limits

- The retry hook only lengthens an existing retry. It cannot make the core retry an error the core decided to drop.
- The 10-attempt cap is the core's. A longer wait per attempt does not add attempts.
- A local title is worse than a model title. It cannot summarise, it only trims. That is why it is off by default.
- The `maxTokens` cap applies to the request, not to the model. A model that ignores the field returns what it returns.

## Test

```sh
npm test
```

19 tests cover the three hooks, the option defaults, and a broken event for each handler.

## License

MIT.

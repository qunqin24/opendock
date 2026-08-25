# opencode-localise-timestamps

Rewrites UTC timestamps in [OpenCode](https://opencode.ai) replies so they read in your local timezone.

When an assistant message says *"merged by you at 03:45 UTC"*, you shouldn't have to do clock arithmetic. This plugin scans every assistant reply as it completes and converts the UTC times it finds:

| The model writes | You see |
| --- | --- |
| `2026-08-24T03:45Z` | `2026-08-24T13:45:00+10:00` |
| `2026-08-24T03:45:12.500Z` | `2026-08-24T13:45:12+10:00` |
| `03:45 UTC` | `03:45 UTC (13:45 local)` |
| `03:45:12 GMT` | `03:45:12 GMT (13:45:12 local)` |
| `2026-08-24 03:45 UTC` | `2026-08-24 03:45 UTC (13:45 local)` — or `(2026-08-23 23:45 local)` when the local date differs |

ISO instants are replaced outright with the equivalent offset form; prose forms keep their original text and gain a parenthesised annotation, so nothing is lost.

<img width="679" height="460" alt="image" src="https://github.com/user-attachments/assets/ceb364ca-08a0-435b-b1ab-74727e9b0f4f" />]

## Requirements

OpenCode ≥ 1.18 (plugin API). No configuration required — the target zone defaults to your machine's local timezone, resolved per-timestamp so DST is handled correctly.

## Install

Add to `~/.config/opencode/opencode.json`:

```jsonc
{
  "plugin": ["opencode-localise-timestamps"]
}
```

Restart OpenCode. The plugin auto-installs from npm on startup.

### Options

Pass a config object as the second element of the plugin entry:

```jsonc
{
  "plugin": [
    ["opencode-localise-timestamps", { "timeZone": "Australia/Sydney", "skipCode": true }]
  ]
}
```

| Option | Default | Effect |
| --- | --- | --- |
| `timeZone` | system local zone | Any [IANA zone name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones), e.g. `"America/New_York"`. Useful when OpenCode runs on a server in a different zone than you. |
| `skipCode` | `true` | Leaves timestamps inside fenced code blocks and inline code spans untouched. Set `false` to convert those too. |

Unrecognised or mistyped values fall back to the default rather than erroring.

## Behavior

- **What's converted** — ISO-Z instants (`…T03:45Z`, with or without seconds/fractional seconds), prose datetimes (`2026-08-24 03:45 UTC`), and bare times (`03:45 UTC`, `03:45:12 GMT`, any casing).
- **What's left alone** — offsets like `09:00 UTC-5` or `09:00 UTC+10` (already zone-qualified, not a bare instant); non-UTC zone names (`09:00 AEST`); and, by default, anything inside a fenced code block or inline code span, since a timestamp there is usually a literal value (a curl arg, a JSON field) rather than prose.
- **Dateless times** — `03:45 UTC` carries no date, so it's anchored to today's UTC date before converting. Crossing midnight in the target zone adds the local date to the annotation, e.g. `23:45 UTC (2026-08-25 09:45 local)`.
- **Impossible values** — `25:30 UTC`, `09:60 UTC`, and `2026-02-30T00:00Z` pass through untouched. `2028-02-29T00:00Z` converts fine (2028 is a leap year); `2026-02-29T00:00Z` does not (2026 isn't).
- **No-op on an already-UTC reader** — if `timeZone` resolves to `UTC`, nothing is added or rewritten: ISO instants stay `…Z` instead of a redundant `+00:00`, and prose forms get no `(… local)` annotation, since it would just restate the time already on the line.
- **Model context** — parenthetical annotations are stripped again before messages re-enter model history (`experimental.chat.messages.transform`), so the model never sees doubled timestamps on the next turn. ISO replacements stay: they're standard timestamps describing the same instant, not plugin-added text.
- **Scope** — assistant text parts only. Tool output panels and your own messages are untouched.
- **Idempotent** — running the plugin twice over the same text (e.g. across a compaction/replay) never stacks annotations or re-converts an already-converted ISO instant.
- **Failure mode** — every hook is guarded with try/catch; a formatting error (or a garbage `timeZone` string) degrades to leaving the text as-is rather than breaking the stream.

### Edge cases

<details>
<summary>Full list, with the exact input/output</summary>

| Input | With `timeZone: "Australia/Sydney"` |
| --- | --- |
| `` `03:45 UTC` `` (inline code) | unchanged — code spans are skipped by default |
| ` ```\n03:45 UTC\n``` ` (fenced block) | unchanged — same reason, whole block skipped |
| `09:00 UTC-5` | unchanged — already carries an explicit offset |
| `25:30 UTC` | unchanged — not a real time |
| `2026-02-30T00:00Z` | unchanged — not a real date |
| `2026-02-29T00:00Z` | unchanged — 2026 isn't a leap year |
| `2028-02-29T00:00Z` | `2028-02-29T11:00:00+11:00` — 2028 is, and Sydney is on AEDT (+11) in February |
| `23:45 UTC` (now = `2026-08-24T00:00:00Z`) | `23:45 UTC (2026-08-25 09:45 local)` — local date rolls forward |
| `2026-08-24T03:45Z` with `timeZone: "UTC"` | unchanged — already correct, rewriting to `+00:00` would be noise |
| `2026-08-24T03:45Z` run twice | same output both times — idempotent |

</details>

## Development

```sh
bun install
bun run typecheck
bun test
```

To try a local checkout, point `opencode.json` at the file instead of the npm spec:

```jsonc
{
  "plugin": ["/absolute/path/to/opencode-localise-timestamps/src/index.ts"]
}
```

## Releasing

Two equivalent paths — both run checks, build `dist/`, and publish to npm:

- **Actions UI**: *Actions → Release → Run workflow* (on `main`), pick **breaking / minor / bugfix**. The workflow opens a short-lived `release/vX.Y.Z` PR (satisfying protected-main rules like CodeQL), waits for it to merge, and tags the merged commit.
- **Tag push**: bump `package.json` via a PR, then `git tag v0.1.0 && git push origin v0.1.0`.

Either path then builds `dist/`, publishes to npm, and creates a GitHub Release on the new tag with notes auto-generated from the merged PRs since the last release.

Publishing uses npm trusted publishing (OIDC): the package declares this repo and `release.yml` as its trusted publisher, so releases need no stored npm token. For fully hands-off releases, also add a `RELEASE_PAT` secret (a PAT with repo contents + pull-request write): the release PR is then authored by you, so its checks skip GitHub's "workflow awaiting approval" gate that applies to bot-authored PRs. Without it, each release PR needs one manual "Approve and run" click.

## License

[MIT](./LICENSE)

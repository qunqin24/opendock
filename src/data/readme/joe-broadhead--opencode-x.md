# X for OpenCode

Search and read X (formerly Twitter), and change your own account only when you ask: posts, profiles, timelines,
mentions, bookmarks, news, trends, lists and long-form Articles, through X's official MCP server. Unofficial; not affiliated with X Corp.

## Requirements

- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1. Another 2.4 release inside the range runs too, marked untested; outside
  it the plugin does not start unless you set `allowUntestedHost`.

  ```text
  2.4.1   tested
  2.4.2   inside the range, untested
  2.5.0   outside the range, refused
  ```

- An X account and an X **developer account** at [console.x.com](https://console.x.com).
- An X **app** with OAuth 2.0 user authentication, the scopes below, and the callback
  `http://127.0.0.1:8766/callback`. X has no dynamic client registration, so a sign-in always goes through some
  developer's X app; the plugin ships **no client ID**.
- The app in **Pay-per-use** and the **Production** environment, with credits and a spending limit. Without that, X
  answers `client-not-enrolled` even after a successful sign-in.
- **X bills every tool call** to the X developer account that owns the app. Current rates, from
  [X's pricing page](https://docs.x.com/x-api/getting-started/pricing) on 5 November 2026, are about $0.005 per post
  read, $0.010 per user read, $0.001 per read of your own posts, mentions or bookmarks when the account owns the app,
  $0.005 per bookmark change, and $0.015 per post created ($0.200 with a URL). X sets the prices and can change them.

```text
tweet.read users.read follows.read like.read block.read list.read list.write
space.read broadcast.read calls.read bookmark.read bookmark.write tweet.write media.write offline.access
```

One scope note: dropping `offline.access` means no refresh token, so the sign-in then needs the person again about two
hours later.

## Install

Install from a release: `opencode plugin add github:we-the-rebel-alliance/x-plugin#v<version>`. The first release on
plugin-contract is v0.0.0 (phase 4b).

```sh
opencode plugin add github:we-the-rebel-alliance/x-plugin#v<version>
```

Run `opencode reload`, or restart OpenCode. A Git install runs no build: the release commit carries the built
`dist/`. The plugin registers X's MCP server as `x`, adds default permission rules, the `/x-status` command, the `/x`
status view and two skills.

## Sign in

One account now; several accounts arrive with the plugin contract.

1. Create the app in **User authentication settings** at console.x.com, add the callback and scopes above, and copy its
   **Client ID** (and **Client secret** for a confidential Web App).
2. Run `/connect` and choose **X app**. Paste the client ID, and the secret in the optional field. In a terminal,
   `opencode auth login x-app` does the same. A team app's client ID can come from managed config instead.
3. Run `/connect` and choose **X**, then press `o` or Enter. Sign in and approve the scopes. In a terminal,
   `opencode mcp auth x` opens the link automatically.

The client secret may be `{env:X_CLIENT_SECRET}` in `opencode.json`, which reads the variable when OpenCode runs as a
service or the desktop app; keep the literal out of config. A saved value that is an empty string is refused. No bearer token is pasted into OpenCode:
OpenCode stores the token and refreshes it.

`/x-status` shows the state and one next step. Status makes no X call, so it costs nothing. If the host reports a sign-in
failure for X with a reason, status and `probe` say `AUTH_REQUIRED`: sign in again through `/connect` and X. To sign out, run
`opencode mcp logout x`.

## Who signs up for what

- **Your own app (the default).** You create one X app, keep its client ID and, for a confidential app, its secret,
  and save them in `/connect` → **X app**. Every call bills your own X developer account.
- **A team app.** An admin creates one public X app (a Native App: a client ID, no secret) and puts the client ID in
  the organization's managed config. Members sign in with `/connect` → X. Every call bills the team's developer
  account.
- **No app at all.** The plugin ships **no client ID**, so installing it never signs anyone in and never bills an
  account by surprise. Status says `not configured`.

## Access

`access` decides what runs. The plugin inserts the matching block after each agent's base allow rule; the last
matching rule still wins, so a later rule of yours can tighten it.

| `access` | Reads | Everything else |
| --- | --- | --- |
| `all` (default) | run | run without a prompt |
| `ask-changes` | run | ask; a decline never reaches X |
| `read-only` | run | are denied |

The default block for `all`:

```json
[{ "action": "x_*", "resource": "*", "effect": "allow" }]
```

With `all`, nothing asks: a change runs unattended on the user's real X account. Every change is a tool the user asked
for; the `x-write` skill says what to say before one. `x_create_posts` is public. With `access: all` (the default) it
runs without a prompt; with `ask-changes` the prompt is the user's yes; with `read-only` it is refused. DMs, calls,
follows, blocks, mutes, list membership, moderators and live video run only when the user asks.

## Use

Ask, for example: "What are people saying about <topic> on X this week?", "What has @<account> posted about
<topic>?", "My mentions today", "What did I bookmark about <topic>?", "Post this: …", "Draft an Article from these
notes", "How much credit is left?".

| Command | What it does |
| --- | --- |
| `/x-status` | Posts the status report into the session: connection, account, access, app, callback, scopes, tools, agents without the rules, OpenCode and the next step. |
| `/x`, or "X: Status" in the command palette | Opens the same report; `r` refreshes it, `Esc` closes it. |

Two skills carry the rules:

- `x` teaches search, how to state a cost from X's rates, timelines, mentions, bookmarks, personal data and untrusted content.
- `x-write` teaches whom each change reaches, the public-post warning, Articles, and how `access` decides.

### Cost lines

X bills every call. The plugin registers no per-request tool or context hook, so it adds no cost line to a model-path
result.
Its own `x_events_list` and `probe` results carry `cost.units` (the posts, authors and users X returned), and a
script's result carries the tools RPC's cost line. When a model states a cost, the `x` skill tells it to compute the
figure from X's rates and what the call returned, and never to present it as an estimate.

### Sources and scripts

X's mentions, bookmarks and home timeline are the three sources declared in `package.json` (`x.mentions`,
`x.bookmarks`, `x.timeline`), so collectors read them the same way. `x_events_list` lists one feed, or every enabled
feed, since a cursor, oldest first; one call makes at most `events.maxCalls` billed reads and says `more` when it stops.
`probe` says who is signed in. Leaving a feed out of `events.feeds` turns its source off. A script calls the same
tools through `x.posts.tools`; see [Scripting](https://github.com/we-the-rebel-alliance/x-plugin/blob/master/docs/scripting.md).

## Troubleshooting

| What you see | What it means |
| --- | --- |
| `AUTH_REQUIRED` | The host reported a sign-in failure for X, with a reason. Sign in again: `/connect`, X. |
| Connection: sign-in required soon after signing in | The two-hour token expired and no refresh token was issued. Check `offline.access` was requested and granted. |
| `client-not-enrolled` | The app is not in Pay-per-use → Production. Move it, then try again. |
| `403` on a write | The app lacks the scope. Add it in User authentication settings, then sign in again. |
| `429` | X's rate limit is used up. Wait for the reset X returns, and make fewer calls. |
| Posting asks first | `access` is `ask-changes`, or a rule of yours asks. Change `access` or the rule if you want it to run. |
| How much credit is left | `get_usage_credits` answers it: the payer's balance in USD. |
| Answers cost more than expected | Every call is billed per resource returned; the rates above apply. X's Developer Console has the real bill. |
| `HOST_UNTESTED` | OpenCode is outside `>=2.4.1 <2.5.0`. Use a tested host, or set `"allowUntestedHost": true`. |
| `OPTIONS_INVALID` | An option is unknown or wrong. The message names it; fix `opencode.json`. |
| `CLIENT_ID_MISSING` / `CLIENT_ID_INVALID` | No usable X app client ID. Save it again in `/connect` → X app. |
| `INPUT_INVALID` / `SOURCE_UNKNOWN` / `SOURCE_DISABLED` | A bad event input or feed name, or a feed not in `events.feeds`. |
| `ACCOUNT_UNKNOWN` / `ACCOUNT_MISMATCH` | The handle named is not the signed-in one. Use the handle the message names. |
| `CURSOR_INVALID` | The cursor is not this source's or account's. Start again without one. |
| `UPSTREAM_ERROR` / `UPSTREAM_UNREADABLE` | X refused a read, or answered in an unknown shape. Run `/x-status`, then retry. |
| `TOOL_UNAVAILABLE` | OpenCode does not list a read the plugin needs. Wait, then run `/x-status`. |
| `STATUS_UNAVAILABLE` | The status could not be read. Restart OpenCode and run `/x-status` again. |
| `SKILLS_INVALID` / `SERVER_NOT_REGISTERED` / `RULES_NOT_ADDED` | Setup trouble; status names it. Reinstall or restart OpenCode. |
| `X_BUDGET_EXCEEDED` / `X_PRICE_UNKNOWN` | A script budget refuses the call. Raise or remove the budget, or use a priced method. |

Every error reads `CODE: What happened. Next step: What to do.` The full table is in
[Configuration](https://github.com/we-the-rebel-alliance/x-plugin/blob/master/docs/configuration.md#errors).

## Uninstall

Sign out first: after the plugin is removed, `mcp logout x` finds no server.

```sh
opencode mcp logout x
opencode auth list
opencode plugin remove github:we-the-rebel-alliance/x-plugin#v<version>
```

## Links

- [Configuration](https://github.com/we-the-rebel-alliance/x-plugin/blob/master/docs/configuration.md)
- [Architecture](https://github.com/we-the-rebel-alliance/x-plugin/blob/master/docs/architecture.md)
- [Scripting](https://github.com/we-the-rebel-alliance/x-plugin/blob/master/docs/scripting.md)
- [Changelog](https://github.com/we-the-rebel-alliance/x-plugin/blob/master/CHANGELOG.md)
- [Issues](https://github.com/we-the-rebel-alliance/x-plugin/issues)

MIT. X is a trademark of X Corp.; this unofficial plugin is not endorsed by them.

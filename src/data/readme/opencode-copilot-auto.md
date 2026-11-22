# opencode-copilot-auto

[![npm](https://img.shields.io/npm/v/opencode-copilot-auto)](https://www.npmjs.com/package/opencode-copilot-auto)

Makes **GitHub Copilot Free** work in [OpenCode](https://opencode.ai) 2.x.

## The problem

With a Copilot Free account connected, OpenCode's model picker shows the Copilot
models for a moment and then empties. Picking one by name fails with
`The requested model is not supported.`

Copilot Free only serves requests that go through Copilot's **Auto** mode: the
client asks Copilot which model to use, then sends the request to that model with
a short-lived session token. OpenCode only does this for plans whose models carry
an Auto discount, which Free doesn't have.

## What the plugin does

It turns on only when OpenCode can't serve your account by itself: GitHub marks
none of your models as pickable and none has an Auto discount. That's Copilot
Free today; the check doesn't rely on plan names. It then:

- shows the chat models GitHub allows your account in the model picker, each
  labelled **· via Auto**, because Auto decides which model answers whatever you
  pick, and
- routes requests for those models through Auto: it asks Copilot which model to
  use, switches the request to it, and adds Auto's session token. Auto keeps its
  pick for the session until the token is about to expire, or until the session
  is compacted.

On any other account it does nothing, so OpenCode's own Copilot support is
untouched. A reconnect or disconnect is noticed within 30 seconds. It doesn't impersonate another client: requests use your OpenCode
Copilot login and identify themselves as `opencode-copilot-auto`.

## Install

1. Connect GitHub Copilot in OpenCode as usual.
2. Add the plugin to `opencode.json`:

   ```json
   { "plugins": ["opencode-copilot-auto"] }
   ```

   or copy `index.js` to `~/.config/opencode/plugins/copilot-auto.js`.
3. Restart OpenCode and pick any GitHub Copilot model marked **· via Auto**.

The model that actually answered is shown under each reply.

Your latest message (up to 2,000 characters) is sent to Copilot's `/auto`
endpoint so Copilot can choose a model, as Copilot's own clients do.

## Settings

| `OPENCODE_COPILOT_AUTO` | Effect |
|---|---|
| unset or `auto` | Route through Auto only when OpenCode can't serve the account (Copilot Free) |
| `always` | Route through Auto on every plan |
| `off` | Do nothing |

## Limits

- Copilot Free has a small monthly chat allowance, and an agent sends one
  request per tool step, so long tasks use it up quickly.
- Session titles aren't routed (they would spend the allowance). Set a
  `small_model` from another provider for titles.
- It relies on OpenCode's plugin API (`integration.connection`, `model.transform`,
  `session.hook`) and on Copilot's `/auto` endpoint, neither of which is a
  documented stable API. Tested with OpenCode 2.3.2 on 2026-11-18. On older
  OpenCode versions that lack the API it does nothing.
- It sends the Copilot API versions OpenCode 2.3 sends (`X-GitHub-Api-Version`
  `2026-08-01`, and `2025-04-01` for the account check). When GitHub retires
  those, requests fail with an HTTP error until the plugin is updated.

## Development

```bash
npm test
```

The tests use a fake OpenCode host and a fake Copilot API; they make no network
requests.

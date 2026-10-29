# BulkPublish for OpenCode

Write, schedule and publish social media posts from OpenCode Desktop.

- **Connect** your BulkPublish account with an API key.
- **Compose** a caption with a live character count for every network you pick
  (X, Bluesky, Threads, Mastodon, LinkedIn, Instagram and more), so one network
  can't reject the whole post.
- **Attach** an image or a video from your computer.
- **Publish now, schedule, or save as a draft.** Scheduled times are your local time.
- **See recent posts** with their status on each network, and **retry** failed ones.

Channels that need reconnecting, or that need an image or a video you haven't
attached, are left out of the post and you're told which and why.

> OpenCode's desktop plugin support is experimental, so this plugin needs a
> recent OpenCode Desktop (2.2 or later) and may need updating as it changes.

## Install

Add the plugin to your global OpenCode config, `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-bulkpublish"]
}
```

Then restart OpenCode Desktop.

## Use

1. Create an API key on the **Developer** page in BulkPublish (app.bulkpublish.com/developer).
2. In OpenCode, open **Settings > BulkPublish** and choose **Connect API key**,
   or run **BulkPublish: Connect API key** from the command palette.
3. Type `/bulkpublish` in the prompt box, or run **BulkPublish: Compose a social
   post**. Inside a session it opens as a side panel tab (also in the side
   panel's **+** menu); elsewhere it opens as a window.
4. Tick the channels, write the caption, optionally attach a file, then
   **Publish now**, **Schedule** (after picking a time) or **Save draft**.

The key is kept on this computer, encrypted with your system keychain where
available. **Sign out** removes it.

## Options

| Option | Default | What it does |
|---|---|---|
| `apiBase` | `https://app.bulkpublish.com` | The BulkPublish address to talk to: a `bulkpublish.com` address, or `localhost` for testing. Anything else is ignored. Your key is only sent to the address it was connected on, so changing this signs you out. |

```json
{ "plugins": [{ "package": "opencode-bulkpublish", "options": { "apiBase": "https://app.bulkpublish.com" } }] }
```

## Support

Questions and bugs: <https://www.bulkpublish.com> or the chat on the site.

## License

MIT

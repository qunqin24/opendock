# opencode-wide-chat

An OpenCode Desktop plugin that expands the chat to the full window width, beyond the 1000px of the built-in **Wide** setting.

![Before: with the built-in Wide setting the chat stops at 1000px. After: with opencode-wide-chat it uses the full window width.](https://raw.githubusercontent.com/LorenzoServolini/opencode-wide-chat/main/docs/before-after.png)

Useful on large screens: when the chat area is narrower than about 1000px, **Wide** already fills it and the plugin changes nothing.

## Install

```sh
opencode plugin add opencode-wide-chat
```

Or add it to your `opencode.json` yourself:

```json
{
  "plugins": ["opencode-wide-chat"]
}
```

Then open **Settings → Preferences → Timeline** and set **Timeline width** to **Wide**.

## How it works

The plugin changes only the **Wide** option: the chat uses all the available width, with a small margin on each side. **Focused** and **Comfortable** keep their usual width, so you can switch between a narrow and a full-width chat from the same setting.

## Compatibility

Tested with OpenCode Desktop 2.2.7. The web app is not affected, because it does not load GUI plugins.

The plugin relies on the experimental GUI plugin API and on an internal CSS variable, so a future OpenCode release may stop it from working.

## Uninstall

```sh
opencode plugin remove opencode-wide-chat
```

## License

[MIT](LICENSE)

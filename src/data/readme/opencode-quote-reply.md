# opencode-quote-reply

Quoting part of an OpenCode 2 transcript means copying the text, pasting it into the prompt, and prefixing every line with `>` by hand.

This plugin adds a keyboard shortcut that inserts the selected transcript text into the prompt as a Markdown quote.

## Installation

Requires **OpenCode 2's CLI**. Add the package to your `cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-quote-reply"]
}
```

Select text in a session transcript with the mouse, then press **Ctrl+Q**. The selection is inserted at the prompt cursor with each line prefixed by `> `, followed by a blank line for your reply. The command is also available from the command palette as **Quote selection into prompt**.

## Configuration

Set `options.keybind` to use a different shortcut. It must be a non-empty shortcut string supported by OpenCode, such as `ctrl+shift+q` or `<leader>q`. OpenCode binds `<leader>q` to exit by default, so remap `app.exit` under `keybinds` if you choose it.

```json
{
  "plugins": [
    {
      "package": "opencode-quote-reply",
      "options": {
        "keybind": "ctrl+shift+q"
      }
    }
  ]
}
```

## Limitations

OpenCode's plugin API doesn't expose the prompt input, so the plugin locates it through OpenTUI's renderable tree. An OpenCode update that changes the prompt's internals can stop it from finding the prompt; the plugin then shows an error instead of inserting text.

The quote contains the text as rendered in the transcript, so concealed Markdown syntax isn't included.

## License

[MIT](LICENSE)

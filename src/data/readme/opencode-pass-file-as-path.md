# opencode-pass-file-as-path

An OpenCode V2 server plugin that keeps selected file attachments as literal `@path` text. Attachments matching the configured extensions are removed during prompt admission, so the model receives the path instead of the file contents. Defaults to `.prefab`.

```sh
opencode plugin add opencode-pass-file-as-path
```

```json
{
  "plugins": [
    {
      "package": "opencode-pass-file-as-path",
      "options": { "extensions": ["prefab", "unity"] }
    }
  ]
}
```

MIT

# opencode-sidebar-plugins

Two small sidebar plugins for [OpenCode](https://opencode.ai) 2.x.

| Plugin | Install | What it shows |
| --- | --- | --- |
| [`usage-bars`](usage-bars) | `opencode plugin add opencode-sidebar-usage` | Rate-limit usage bars for Claude, Codex and GitHub Copilot, with reset times. Each provider can be switched off. |
| [`cache-hit`](cache-hit) | `opencode plugin add opencode-sidebar-cache` | A replacement "Context" section: context tokens and % of the model limit, cost, total input/output tokens and prompt-cache hit rate. Hides the built-in Context section so it isn't shown twice. |

Restart OpenCode after installing. See each plugin's README for requirements and options.

## Notes

- Built and tested against OpenCode `2.1.x`. The plugin API is new and may change.
- The Copilot usage lookup in `usage-bars` uses an undocumented GitHub endpoint
  (`/copilot_internal/user`), the same one used by
  [opencode-quota](https://github.com/slkiser/opencode-quota), which was the reference for that part.
  It may break without notice.

## Install from source

```sh
git clone https://github.com/DoctorZaius147/opencode-sidebar-plugins
cp -r opencode-sidebar-plugins/usage-bars opencode-sidebar-plugins/cache-hit ~/.config/opencode/plugins/
cd ~/.config/opencode/plugins/usage-bars && npm install
cd ../cache-hit && npm install
```

On Windows the plugins folder is `%USERPROFILE%\.config\opencode\plugins`.

## Publishing (maintainer)

```sh
cd usage-bars && npm publish
cd ../cache-hit && npm publish
```

## License

[MIT](LICENSE)

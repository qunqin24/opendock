# Yogurt Icon client plugins

Client adapters for the public [Yogurt Icon](https://icon.ggeric.top) service. Search icons in English or Chinese and retrieve SVG or React JSX. No Yogurt login, API key or OAuth is required for these read-only tools.

| Client | Files | Distribution |
| --- | --- | --- |
| Claude Code | [claude](claude/) | Publisher-hosted marketplace at this repository |
| Cursor | [cursor](cursor/) | Import from Disk or local plugin folder; marketplace submission is separate |
| OpenCode | [opencode](opencode/) | Local JavaScript plugin; npm publication is separate |
| VS Code | [vscode](vscode/) | VSIX; Marketplace publication is separate |

Gemini CLI has its own [distribution repository](https://github.com/prosody007/yogurt-icon-gemini).

## Claude Code

```sh
claude plugin marketplace add prosody007/yogurt-icon-plugins
claude plugin install yogurt-icon@yogurt-icon-native
```

## Scope and licensing

The MIT license applies to client adapter software, manifests, skill instructions and documentation. See [RIGHTS.md](RIGHTS.md) for exclusions. The icon catalog, returned artwork, brand logo and website server are not relicensed under MIT. Preserve notices in retrieved artwork and follow the [icon usage terms](https://icon.ggeric.top/terms/).

These files define a remote connection and usage instructions. They do not contain the icon database, account data, website server, API credentials or model subscriptions. Publishing this repository does not imply approval or listing by a client vendor.

Publisher: GUOTONG SUN. [Support](https://icon.ggeric.top/support/) · [Privacy](https://icon.ggeric.top/privacy/) · [Terms](https://icon.ggeric.top/terms/). Contact: prosody007@gmail.com.

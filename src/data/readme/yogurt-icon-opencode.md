# Yogurt Icon client plugins

**7,000+ free icons for your coding assistant.** Find icons in the [Yogurt Icon](https://icon.ggeric.top) library and get SVG or React JSX for your interface. Icon search and retrieval are free, with no Yogurt login, API key, or sign-up required.

Once enabled, your agent can select Yogurt Icon for relevant icon requests. You can also name it explicitly: "Use Yogurt Icon to find a 24px settings SVG." Automatic tool selection and any approval prompt are controlled by your coding assistant.

| Client | Files | Distribution |
| --- | --- | --- |
| Claude Code | [claude](claude/) | Publisher-hosted marketplace at this repository |
| Cursor | [cursor](cursor/) | Import from Disk or local plugin folder; marketplace submission is pending review |
| OpenCode | [opencode](opencode/) | [yogurt-icon-opencode on npm](https://www.npmjs.com/package/yogurt-icon-opencode) |
| VS Code | [vscode](vscode/) | [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=yogurt-icon.yogurt-icon) or VSIX |

Gemini CLI has its own [distribution repository](https://github.com/prosody007/yogurt-icon-gemini).

Download standalone Claude and Cursor ZIPs, the VS Code VSIX, and the OpenCode npm archive from [GitHub Releases](https://github.com/prosody007/yogurt-icon-plugins/releases). These downloads are publisher distributions; vendor directory listings have separate review processes.

## Claude Code

```sh
claude plugin marketplace add prosody007/yogurt-icon-plugins
claude plugin install yogurt-icon@yogurt-icon-native
```

## OpenCode

Add the published package to the `plugin` array in your OpenCode configuration:

```json
{
  "plugin": ["yogurt-icon-opencode@1.3.4"]
}
```

## Service usage

The adapters connect to `https://icon.ggeric.top/api/mcp?channel=plugin`. The service records aggregate tool usage; icon retrieval counts include the icon, style, and format. Anonymous requests are not a count of unique users. See the [privacy policy](https://icon.ggeric.top/privacy/) for data handling. The adapters do not bundle the icon catalog for offline use.

## Scope and licensing

The MIT license applies to client adapter software, manifests, skill instructions and documentation. See [RIGHTS.md](RIGHTS.md) for exclusions. The icon catalog, returned artwork, brand logo and website server are not relicensed under MIT. Preserve notices in retrieved artwork and follow the [icon usage terms](https://icon.ggeric.top/terms/).

These files define a remote connection and usage instructions. They do not contain the icon database, account data, website server, API credentials or model subscriptions. Publishing this repository does not imply approval or listing by a client vendor.

Publisher: GUOTONG SUN. [Support](https://icon.ggeric.top/support/) · [Privacy](https://icon.ggeric.top/privacy/) · [Terms](https://icon.ggeric.top/terms/). Contact: prosody007@gmail.com.

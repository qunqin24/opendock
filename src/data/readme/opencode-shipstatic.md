# ShipStatic for OpenCode

Deploy static websites, landing pages, and prototypes instantly from [OpenCode](https://opencode.ai). Free, no account needed.

Ask OpenCode to put your site online, and get back a real link you can share in seconds.

## Try it in seconds, no account needed

```bash
opencode plugin add opencode-shipstatic
```

Then just ask, in your own words:

- "Make a one-page site for my bakery and give me a link I can share."
- "Publish the dist folder with ShipStatic's built-in password protection."

You get back a link you can share right away, and a claim link. The site stays up for 3 days, and opening the claim link keeps it for good.

Want it private? Ask for ShipStatic's built-in password protection. Visitors have to type the password before they see anything.

## Keep your sites with a free account

Everything above works with no account. A free account keeps your sites for good, gives you a ShipStatic domain like `yourname.shipstatic.com`, and shows you everything you've published in one place. A custom domain like `www.example.com` needs a paid plan.

OpenCode connects with no account, so publishing works straight away. To publish into your account and manage your sites and domains, sign in once:

```bash
opencode mcp auth ship
```

## What this plugin runs and sends

- **It connects OpenCode to the hosted ShipStatic MCP server** at `https://mcp.shipstatic.com`, under the name `ship`. Its tools show up as `ship_deployments_upload` and so on. If you already added that server yourself, under any name, the plugin leaves your entry as it is.
- **It adds one skill, `publish-online`,** which tells OpenCode how to publish: a folder with the [ShipStatic CLI](https://github.com/shipstatic/ship), anything else through the server. If you already have that skill in a skills folder, yours is the one OpenCode uses.
- **It sends the files you publish to ShipStatic,** and nothing anywhere else.
- **It holds no key, token or sign-in.** Signing in is OpenCode's own, with `opencode mcp auth ship`.
- **The claim link is yours alone.** Whoever opens it and signs in owns the site, so don't share it.

This plugin is for OpenCode 2. It is configuration only: one server and one skill, no tools of its own. The same fifteen tools are at `https://mcp.shipstatic.com` for any MCP client.

## Also available

| Surface | Reach it |
|---------|----------|
| **[MCP](https://mcp.shipstatic.com)** | Drop `https://mcp.shipstatic.com` into any MCP client |
| **[CLI and SDK](https://github.com/shipstatic/ship)** | `npx @shipstatic/ship ./dist` |
| **[VS Code](https://marketplace.visualstudio.com/items?itemName=shipstatic.shipstatic)** | Search "ShipStatic" in the Marketplace |
| **[Plugin](https://github.com/shipstatic/plugin)** | Install it in Cursor, Claude Code, Codex or Gemini CLI |
| **[Antigravity](https://github.com/shipstatic/antigravity)** | `agy plugin install https://github.com/shipstatic/antigravity` |
| **[n8n](https://www.npmjs.com/package/n8n-nodes-shipstatic)** | Search "ShipStatic" in n8n's node panel |
| **[GitHub Action](https://github.com/shipstatic/action)** | `shipstatic/action@v3` |
| **[Agent Skill](https://www.shipstatic.com/SKILL.md)** | `npx skills add shipstatic/plugin` |

[Support](https://www.shipstatic.com/support) • [Privacy](https://www.shipstatic.com/privacy) • [Terms](https://www.shipstatic.com/terms)

## License

MIT

# OpenCode Qwen Auth Plugin

[![npm version](https://img.shields.io/npm/v/@melodyoftears/opencode-qwen-auth)](https://www.npmjs.com/package/@melodyoftears/opencode-qwen-auth)
[![npm downloads](https://img.shields.io/npm/dm/@melodyoftears/opencode-qwen-auth)](https://www.npmjs.com/package/@melodyoftears/opencode-qwen-auth)
[![GitHub stars](https://img.shields.io/github/stars/1579364808/opencode-qwen-auth)](https://github.com/1579364808/opencode-qwen-auth)

Authenticate OpenCode CLI with your qwen.ai account using OAuth Device Flow. This plugin enables you to use Qwen AI models (`coder-model` and `vision-model`) with free daily quota - no API key or credit card required.

[中文文档](./README.zh-CN.md)

## Features

- OAuth Device Flow (RFC 8628) - Secure browser-based authentication
- PKCE support (RFC 7636) - Enhanced security for public clients
- Automatic polling - Detects authorization completion without manual input
- Auto-refresh tokens - Renewed automatically before expiration
- Compatible with qwen-code - Reuses credentials from `~/.qwen/oauth_creds.json`
- Free tier - 2,000 requests per day via OAuth

## Prerequisites

- OpenCode CLI installed
- A qwen.ai account (free to create)

## Installation

### 1. Install the plugin

```bash
cd ~/.opencode && npm install @melodyoftears/opencode-qwen-auth
```

### 2. Enable the plugin

Edit `~/.opencode/opencode.jsonc`:

```json
{
  "plugin": ["@melodyoftears/opencode-qwen-auth"]
}
```

## Usage

### 1. Login

```bash
opencode auth login
```

### 2. Select Provider

Choose **"Other"** and type `qwen-code`

### 3. Authenticate

Select **"Qwen Code (qwen.ai OAuth)"**

- A browser window opens automatically for authorization
- The plugin polls and detects when you complete authorization
- No need to copy/paste codes or press Enter

## Available Models

| Model | ID | Input | Output | Context | Max Output |
|-------|----|-------|--------|---------|------------|
| Qwen Coder (Qwen 3.5 Plus) | `coder-model` | text | text | 1M tokens | 65,536 tokens |
| Qwen VL Plus (Vision) | `vision-model` | text, image | text | 128K tokens | 8,192 tokens |

### Using a specific model

```bash
opencode --provider qwen-code --model coder-model
opencode --provider qwen-code --model vision-model
```

## How It Works

1. **Device Flow**: Opens your browser to `chat.qwen.ai` for authentication
2. **Automatic Polling**: Detects authorization completion automatically
3. **Token Storage**: Saves credentials to `~/.qwen/oauth_creds.json`
4. **Auto-refresh**: Renews tokens 30 seconds before expiration

## Usage Limits

| Plan | Rate Limit | Daily Limit |
|------|------------|-------------|
| Free (OAuth) | 60 req/min | 2,000 req/day |

Limits reset at midnight UTC.

## Troubleshooting

### Token expired

The plugin automatically renews tokens. If issues persist:

```bash
# Remove old credentials
rm ~/.qwen/oauth_creds.json

# Re-authenticate
opencode auth login
```

### Provider not showing in `auth login`

The `qwen-code` provider is added via plugin. In the `opencode auth login` command:

1. Select **"Other"**
2. Type `qwen-code`

### Rate limit exceeded (429 errors)

- Wait until midnight UTC for quota reset
- Switch to another Qwen account and login again if quota is exhausted

## Development

```bash
# Clone the repository
git clone https://github.com/1579364808/opencode-qwen-auth.git
cd opencode-qwencode-auth

# Install dependencies
bun install

# Build
bun run build

# Type check
bun run typecheck
```

### Local testing

Edit `~/.opencode/package.json`:

```json
{
  "dependencies": {
    "@melodyoftears/opencode-qwen-auth": "file:///absolute/path/to/opencode-qwencode-auth"
  }
}
```

Then reinstall:

```bash
cd ~/.opencode && npm install
```

## Project Structure

```
src/
├── constants.ts        # OAuth endpoints, models config
├── types.ts            # TypeScript interfaces
├── index.ts            # Main plugin entry point
├── cli.ts              # CLI helper for manual auth
├── qwen/
│   └── oauth.ts        # OAuth Device Flow + PKCE
├── plugin/
│   ├── auth.ts         # Credentials management
│   └── utils.ts        # Helper utilities
└── errors.ts           # Error handling
```

## Related Projects

- [qwen-code](https://github.com/QwenLM/qwen-code) - Official Qwen coding CLI
- [OpenCode](https://opencode.ai) - AI-powered CLI for development

## Links

- [npm package](https://www.npmjs.com/package/@melodyoftears/opencode-qwen-auth)
- [GitHub repository](https://github.com/1579364808/opencode-qwen-auth)

## Support

If this project helps you, you can buy me a coffee:

<p align="center">
  <img src="assets/付款码.png" alt="Payment QR Code" width="300">
</p>

## License

MIT

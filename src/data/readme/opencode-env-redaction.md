# opencode-env-redaction

[![npm version](https://badge.fury.io/js/opencode-env-redaction.svg)](https://badge.fury.io/js/opencode-env-redaction)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-blue)](https://opencode.ai/docs/plugins/)

An **OpenCode plugin** that automatically redacts secrets (API keys, tokens, passwords, credentials) from tool outputs, file contents, and messages before they reach the LLM — protecting your sensitive data from accidental exposure.

## 🔒 Why This Plugin?

When using AI coding assistants, it's easy to accidentally paste or output secrets like:
- API keys (`sk-xxx`, `ghp_xxx`, `AKIAxxx`)
- Database URLs with credentials
- JWT tokens
- Stripe/GitHub/Slack tokens
- Private keys and certificates

This plugin **automatically detects and redacts** these secrets in real-time, replacing them with `<REDACTED>` before any data reaches the LLM.

## ✨ Features

- **Automatic Detection** — Recognizes 15+ secret patterns (AWS, GitHub, OpenAI, Stripe, Google, Slack, JWT, etc.)
- **Context-Aware** — Only redacts when key names suggest secrets (`API_KEY`, `SECRET`, `TOKEN`, `PASSWORD`, etc.)
- **Multiple Hooks** — Protects at every entry point:
  - User prompts
  - Tool outputs (file reads, command results)
  - Model context/messages
  - Compaction summaries
  - Generate/title calls
- **Zero Config** — Works out of the box, no configuration needed
- **Open Source** — MIT licensed, community-driven

## 📦 Installation

### Global (Recommended)
```bash
# Via OpenCode CLI
opencode plugin add opencode-env-redaction

# Or manually
mkdir -p ~/.config/opencode/plugins/
git clone https://github.com/GetWibix/opencode-env-redaction.git ~/.config/opencode/plugins/opencode-env-redaction
cd ~/.config/opencode/plugins/opencode-env-redaction
npm install
```

### Per Project
```bash
# In your project root
mkdir -p .opencode/plugins/
git clone https://github.com/GetWibix/opencode-env-redaction.git .opencode/plugins/opencode-env-redaction
```

Then add to your `opencode.jsonc`:
```jsonc
{
  "plugins": [
    "./.opencode/plugins/opencode-env-redaction"
  ]
}
```

## 🚀 Usage

Just use OpenCode normally! The plugin works automatically:

```bash
# Reading a .env file - secrets are redacted
opencode run "read the .env file"

# Command output with secrets
opencode run "echo $API_KEY"

# File contents with credentials
opencode run "cat config/database.yml"
```

**Before (without plugin):**
```
DATABASE_URL=postgres://user:password@localhost:5432/db
AWS_SECRET_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
```

**After (with plugin):**
```
DATABASE_URL=<REDACTED>
AWS_SECRET_ACCESS_KEY=<REDACTED>
```

## 🎯 Supported Secret Patterns

| Provider | Pattern Example |
|----------|-----------------|
| **AWS** | `AKIAIOSFODNN7EXAMPLE` |
| **GitHub** | `ghp_xxxxxxxxxxxxxxxx`, `github_pat_xxx` |
| **OpenAI** | `sk-xxxxxxxxxxxxxxxx`, `sk-proj-xxx` |
| **Stripe** | `sk_live_xxx`, `rk_live_xxx` |
| **Google** | `AIzaSyxxxxxxxxxxxx` |
| **Slack** | `xoxb-xxxxxxxxxx-xxxxxxxxxx` |
| **JWT** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| **Generic** | Base64 (32+ chars), Hex (32+ chars) |

## ⚙️ How It Works

The plugin registers **session hooks** at multiple interception points:

```typescript
// 1. Prompt admission - sanitizes user input
await ctx.session.hook("prompt", (event) => { ... })

// 2. Model context - sanitizes tool outputs, file contents
await ctx.session.hook("context", (event) => { ... })

// 3. Compaction - sanitizes summaries
await ctx.session.hook("compaction", (event) => { ... })

// 4. Generate calls - sanitizes transient prompts
await ctx.session.hook("generate", (event) => { ... })

// 5. Title generation - sanitizes session titles
await ctx.session.hook("title", (event) => { ... })
```

**Detection Logic:**
1. Key name must suggest secret (`SECRET`, `TOKEN`, `PASSWORD`, `API_KEY`, `JWT`, etc.)
2. Value must match known secret pattern OR be 32+ char base64/hex
3. Both conditions must be met → prevents false positives

## 🛠️ Development

```bash
# Clone and install
git clone https://github.com/GetWibix/opencode-env-redaction.git
cd opencode-env-redaction
npm install

# Link for local testing
npm link
opencode plugin add file:$(pwd)
```

### Project Structure
```
opencode-env-redaction/
├── index.js              # Main plugin entry (hooks registration)
├── package.json
├── src/
│   └── env-redactor.js   # Core redaction logic
└── README.md
```

## 🔧 Configuration (Optional)

Currently zero-config. Future versions may support:
```jsonc
// opencode.jsonc
{
  "plugins": [
    {
      "package": "opencode-env-redaction",
      "options": {
        "customPatterns": ["MY_CUSTOM_PREFIX_"],
        "excludeKeys": ["PUBLIC_KEY"],
        "redactionPlaceholder": "[HIDDEN]"
      }
    }
  ]
}
```

## 🧪 Testing

```bash
# Test with a file containing secrets
echo 'API_KEY=sk-test-1234567890' > test.env
opencode run "read test.env"
# Should output: API_KEY=<REDACTED>

# Test normal text (should NOT be redacted)
echo 'NORMAL_VAR=hello world' > test.txt
opencode run "read test.txt"
# Should output: NORMAL_VAR=hello world
```

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Adding New Secret Patterns
Edit `src/env-redactor.js` and add to `SECRET_PATTERNS`:
```javascript
const SECRET_PATTERNS = [
  // ... existing patterns
  /NEW_PROVIDER_[A-Z0-9]{20,}/,  // Your new pattern
];
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [OpenCode](https://opencode.ai/) for the excellent plugin API
- [@opencode/plugin](https://www.npmjs.com/package/@opencode/plugin) for the TypeScript SDK

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/GetWibix/opencode-env-redaction/issues)
- **Discussions**: [GitHub Discussions](https://github.com/GetWibix/opencode-env-redaction/discussions)
- **OpenCode Discord**: [Join us](https://discord.gg/opencode)
- **Email**: [contact@waxbix.com](mailto:contact@waxbix.com)
- **Website**: [waxbix.com](https://waxbix.com)

---

**Made with ❤️ for the OpenCode community**
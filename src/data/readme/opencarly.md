# OpenCarly

**Context Augmentation & Reinforcement Layer for OpenCode**

OpenCarly is an intelligent plugin for [OpenCode](https://github.com/opencode-ai/opencode) that dynamically manages your AI's context window. Instead of dumping all your rules, API guidelines, and project instructions into a single massive prompt, OpenCarly loads rules *only when they are relevant* and seamlessly trims them from the chat history when they aren't.

This saves massive amounts of tokens, dramatically reduces your API costs, and keeps your AI laser-focused on the task at hand without being distracted by irrelevant guidelines. Heavily inspired by Claude Code - CARL.

## 🚀 Features

- **Dynamic Rule Injection:** Automatically injects specific instructions based on the files currently loaded in your context (e.g., injects `React` rules only when a `.tsx` file is open).
- **Keyword Triggers:** Trigger rule injection simply by typing a keyword in your prompt (e.g., typing "*api" injects your backend API guidelines).
- **History Trimming:** Aggressively removes injected rules from previous messages in the chat history, ensuring you only pay for the context once.
- **Cost Estimation & Stats:** Run `*stats` at any time to see exactly how many tokens (and estimated dollars!) OpenCarly has saved you.

## 📦 Installation

To install OpenCarly globally, use npm:

```bash
npm install -g opencarly
```

Then, initialize OpenCarly in your project directory:

```bash
cd your-project-dir
npx opencarly init
```

This will create an `.opencarly` configuration directory in your project containing a `config.json` file and a `rules/` folder where you can place your dynamic guidelines.

## ⚙️ Configuration

Open your newly created `.opencarly/config.json` to start adding rules.

A rule consists of:
- `name`: A descriptive name for the rule.
- `files`: (Optional) An array of file globs. The rule will automatically inject if any file matching these globs is loaded in OpenCode.
- `keywords`: (Optional) An array of keywords. The rule will inject if any of these words (prefixed with a `*`, like `*sql`) are typed in your prompt.
- `content`: The path to the markdown file containing your instructions (relative to the `.opencarly/rules/` directory).

### Example Configuration

```json
{
  "rules": [
    {
      "name": "React Guidelines",
      "files": ["**/*.tsx", "**/*.jsx", "components/**/*"],
      "content": "react.md"
    },
    {
      "name": "Database Schema",
      "keywords": ["db", "sql", "database"],
      "content": "schema.md"
    }
  ]
}
```

With this setup:
- Editing a `Button.tsx` file will automatically inject the rules from `react.md`.
- Asking the AI "Please write a *sql query" will automatically inject the rules from `schema.md`.

## 📊 Viewing Token Savings

You can see how many tokens OpenCarly has saved you by using the built-in stats command inside OpenCode:

```text
user: *stats
```

OpenCarly will output a detailed report showing total tokens trimmed, prompts processed, and an estimated dollar amount saved based on your current AI model's input token pricing.

## 📝 License

MIT

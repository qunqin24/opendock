# opencode-auto-todos

[![npm version](https://img.shields.io/npm/v/opencode-auto-todos.svg)](https://www.npmjs.com/package/opencode-auto-todos)

An [OpenCode](https://opencode.ai) plugin that automatically appends custom todos to every task list. Define your standard workflow items once, and they'll be added to every `todowrite` call automatically.

## Use Cases

- **Version bump reminder** — Never forget to bump versions before merging
- **GitHub workflow** — Always create branch, commit, and open PR
- **Code review checklist** — Add standard review items to every feature
- **Deployment steps** — Ensure deploy-related tasks are always tracked

## Installation

```bash
# In your project directory
npm install --save-dev opencode-auto-todos
```

Then add to your `opencode.json`:

```json
{
  "plugin": ["opencode-auto-todos"]
}
```

## Configuration

Create an `auto-todos.json` file in your project root or inside `.opencode/`:

```json
{
  "todos": [
    {
      "content": "Version bump - update version in package.json",
      "priority": "medium",
      "match": "version bump",
      "order": "first"
    },
    {
      "content": "Create branch, commit changes, open PR",
      "priority": "medium",
      "match": "github",
      "order": 2
    }
  ],
  "always": false,
  "deduplicate": true
}
```

### Config Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `todos` | `AutoTodo[]` | **required** | List of todos to automatically add |
| `always` | `boolean` | `false` | If `true`, add todos to every `todowrite` call. If `false`, only when the list is first created (empty). |
| `deduplicate` | `boolean` | `true` | Skip adding a todo if a similar one already exists in the list. |

### AutoTodo Shape

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | `string` | **yes** | The todo text to display |
| `priority` | `"high" \| "medium" \| "low"` | no | Priority level (default: `"medium"`) |
| `match` | `string` | no | Substring to match against existing todos for deduplication. If omitted, `content` is used. |
| `order` | `"first" \| "last" \| number` | no | Position where the todo is inserted (default: `"last"`). `"first"` = beginning, `"last"` = end, `number` = 1-based index (e.g., `1` = first, `2` = second). |

## How It Works

1. The plugin hooks into OpenCode's `tool.execute.before` event for the `todowrite` tool
2. Before any todo list is written, it checks the config file
3. It appends your configured todos to the list (unless they already exist)
4. The model then sees the complete list including your standard items

## Example

With this config:

```json
{
  "todos": [
    { "content": "Read CLAUDE.md or project docs", "order": "first" },
    { "content": "Version bump", "match": "version" },
    { "content": "Create branch, commit, open PR", "match": "github" }
  ]
}
```

Every time you start a new feature, the agent's todo list will automatically include:

```
✓ [your feature-specific todos]
☐ Read CLAUDE.md or project docs
☐ Version bump
☐ Create branch, commit, open PR
```

## License

MIT

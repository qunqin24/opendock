# @shodocan/opencode-hindsight

**Shodocan OpenCode Hindsight plugin** — Agent-aware persistent memory for OpenCode AI coding assistants.

> This package is the **Shodocan** distribution of the OpenCode Hindsight plugin, published as `@shodocan/opencode-hindsight` on npm. It is **not** the vanilla Vectorize Hindsight plugin. The Hindsight server remains a separate backend that you deploy independently; this plugin is the OpenCode integration layer that connects agents to Hindsight memory.

Your agent remembers what you tell it — across sessions, across projects.

## Shodocan Changes

Compared to the vanilla `opencode-hindsight` plugin, this distribution adds:

- **Agent-aware project bank routing** — subagents and the main agent use separate project banks via `agentProjectBanks` (exact name and `*` glob patterns), so review agents and build agents keep their memories isolated.
- **Runtime bank aliases** — `runtimeProjectBanks` defines allowlisted per-tool-call bank aliases (`bankAlias`) so an agent can query other projects' banks in a single call without reconfiguration.
- **Trusted tool-context routing** — project bank precedence chain (`agentProjectBanks` match → `HINDSIGHT_PROJECT_BANK_ID` → `HINDSIGHT_BANK_ID` → `runtimeProjectBanks` alias → `projectBank` → generated bank) ensures predictable routing for every tool call.
- **Compaction memory routing** — when OpenCode context hits the compaction threshold, project memories are injected into the summary context and the session summary is saved as a memory, preserving context across compaction events.
- **Privacy-safe logging** — content wrapped in `<private>` tags is never stored in Hindsight memory; structured logging keeps plugin operations visible without leaking user data.
- **Offline / Chinese deployment notes** — the Quick Start section documents Huawei SWR mirror pull commands for `ghcr.io`-blocked regions and local model mounting for air-gapped deployments.

## Quick Start

### 1. Deploy Hindsight Server

[Hindsight](https://github.com/vectorize-io/hindsight) is the semantic memory backend required by this plugin. You need to deploy it first.

**Using Docker Compose (recommended):**
This project includes a ready-to-use Docker Compose configuration in the `deploy/` directory that's pre-configured for DeepSeek integration.

```bash
# Navigate to the deploy directory
cd deploy/

# Create .env file from the template, restrict permissions, then edit it
cp .env.example .env
chmod 600 .env
${EDITOR:-nano} .env

# Start Hindsight server
docker compose up -d
```

**Configuration Notes:**
- The Docker Compose setup uses DeepSeek's reasoning model (`deepseek-reasoner`) by default
- You need a valid DeepSeek API key from [DeepSeek Platform](https://platform.deepseek.com/)
- The DeepSeek key is a Hindsight backend LLM key (`HINDSIGHT_API_LLM_API_KEY`), not the plugin's Hindsight API auth key (`HINDSIGHT_API_KEY`)
- The configuration includes persistent volume mounting at `~/.hindsight-docker`
- Server runs on port 8888 (web interface) and 9999 (additional service)

**Using Docker (simple):**
```bash
# Pull the latest Hindsight image
docker pull ghcr.io/vectorize-io/hindsight:latest

# Run Hindsight server on port 8888 with persistent storage
docker run -d \
  --name hindsight \
  -p 8888:8888 \
  -v hindsight_data:/data \
  ghcr.io/vectorize-io/hindsight:latest
```

> **For Chinese users**: If you cannot access `ghcr.io`, use the Huawei SWR mirror:
> ```bash
> docker pull swr.cn-north-4.myhuaweicloud.com/cn/hindsight:latest
> docker run -d \
>   --name hindsight \
>   -p 8888:8888 \
>   -v hindsight_data:/data \
>   swr.cn-north-4.myhuaweicloud.com/cn/hindsight:latest
> ```

**Offline / No-network access:**

When running in an environment without internet access, Hindsight will fail to download embedding and reranker models from HuggingFace. To use pre-downloaded local models:

```yaml
# docker-compose.yml additions
environment:
  HINDSIGHT_API_EMBEDDINGS_PROVIDER: local
  HINDSIGHT_API_EMBEDDINGS_LOCAL_MODEL: /home/hindsight/models/bge-m3
  HINDSIGHT_API_RERANKER_PROVIDER: local
  HINDSIGHT_API_RERANKER_LOCAL_MODEL: /home/hindsight/models/bge-reranker-v2-m3
volumes:
  - /path/to/your/models/bge-m3:/home/hindsight/models/bge-m3
  - /path/to/your/models/bge-reranker-v2-m3:/home/hindsight/models/bge-reranker-v2-m3
```

Models can be pre-downloaded from [ModelScope](https://modelscope.cn) or [HuggingFace](https://huggingface.co) on a machine with internet, then mounted into the container. The default models are `BAAI/bge-small-en-v1.5` (embeddings, 384-dim) and `cross-encoder/ms-marco-MiniLM-L-6-v2` (reranker).

> **Note**: If changing the embedding model after the database is initialized, you must clear existing data first: stop the container, run `rm -rf ~/.hindsight-docker`, then restart.

**Alternative deployment methods:**
- **Binary release**: Download pre-built binaries from [Hindsight releases](https://github.com/vectorize-io/hindsight/releases)
- **From source**: Clone and build from [Hindsight repository](https://github.com/vectorize-io/hindsight)

**Verify deployment:**
```bash
curl http://localhost:8888/health
# Expected response: {"status":"healthy","database":"connected"}
```

### 2. Install the Plugin

#### From npm (recommended)

```bash
npm install -g @shodocan/opencode-hindsight
```

Then register the plugin in your OpenCode configuration:

```json
{
  "plugin": ["@shodocan/opencode-hindsight"]
}
```

Save the file to `~/.config/opencode/opencode.json`.

#### From source (local / file:// development)

Clone the repository and build locally:

```bash
git clone https://github.com/Shodocan/opencode-hindsight.git
cd opencode-hindsight

bun install
bun run build

# Link the plugin to OpenCode configuration using a file:// path
echo '{"plugin": ["file://'$(pwd)'"]}' > ~/.config/opencode/opencode.json
```

This will:
- Clone the plugin source code
- Install all required dependencies
- Build the plugin locally
- Register the plugin in your OpenCode configuration using a local file:// path
- Create the `/hindsight-init` command for codebase indexing

**Note**: Restart OpenCode for the changes to take effect.

### 3. Configure Connection

If your Hindsight server is not running on `localhost:8888`, configure the connection:

**Using environment variables:**
```bash
export HINDSIGHT_API_URL="http://localhost:8888"

# Optional, only needed if your Hindsight server requires API auth
export HINDSIGHT_API_KEY="your-hindsight-api-key"
```

`HINDSIGHT_BASE_URL` remains supported as a legacy fallback for `HINDSIGHT_API_URL`.

**Using configuration file:**
Create `~/.config/opencode/hindsight.jsonc`:
```jsonc
{
  "baseUrl": "http://localhost:8888",
  "apiKey": "$HINDSIGHT_API_KEY"
}
```

If the config file contains credentials or internal service names, restrict it with `chmod 600 ~/.config/opencode/hindsight.jsonc`.

### 4. Restart and Verify

Restart your OpenCode session and verify the plugin is loaded:

```bash
opencode -c  # Should show 'hindsight' in the available tools
```

**Test the plugin:**
After restarting OpenCode, ask the agent to save a test memory, or use the in-session `hindsight` tool if your OpenCode UI exposes tool calls directly. The `hindsight` tool is an OpenCode agent tool, not the `opencode-hindsight` terminal binary.

## Installation

> **Note**: For a complete step-by-step guide including Hindsight server deployment, see the [Quick Start](#quick-start) section above.

### From npm (Recommended)

Install the package and register it in your OpenCode configuration:

```bash
npm install -g @shodocan/opencode-hindsight
```

Add the plugin entry to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["@shodocan/opencode-hindsight"]
}
```

Hindsight runs locally on port 8888 by default. If you need to connect to a different server, set the base URL:

```bash
export HINDSIGHT_API_URL="http://localhost:8888"

# Optional, only for authenticated Hindsight servers
export HINDSIGHT_API_KEY="your-hindsight-api-key"
```

**Or let your agent do it** — paste this into OpenCode:

```
Install @shodocan/opencode-hindsight by following https://raw.githubusercontent.com/Shodocan/opencode-hindsight/main/README.md
```

### Local Source / File:// Development

When developing or testing the plugin locally, use a file path in your OpenCode configuration:

```json
{
  "plugin": ["file:///path/to/opencode-hindsight"]
}
```

Replace `/path/to/opencode-hindsight` with the absolute path to the plugin directory. The plugin source repository is https://github.com/Shodocan/opencode-hindsight.

### For LLM Agents

<details>
<summary>Instructions for LLM Agents (click to expand)</summary>

If you're an LLM agent helping set up `@shodocan/opencode-hindsight`, follow these steps:

#### Step 1: Install from npm or clone from source

**npm install (recommended):**
```bash
npm install -g @shodocan/opencode-hindsight
```

**Or clone and build:**
```bash
git clone https://github.com/Shodocan/opencode-hindsight.git
cd opencode-hindsight
bun install
bun run build
```

#### Step 2: Register in OpenCode configuration

**For npm install:**
```json
{
  "plugin": ["@shodocan/opencode-hindsight"]
}
```

**For local source:**
```json
{
  "plugin": ["file:///path/to/opencode-hindsight"]
}
```

Replace `/path/to/opencode-hindsight` with the absolute path of the cloned directory.

Save to `~/.config/opencode/opencode.json`.

**Note**: OpenCode uses `.json` format for `opencode.json`. The plugin path can be a local file path if developing locally.

#### Step 3: Configure Hindsight server

Hindsight runs locally on port 8888 by default. If you need to connect to a different server, set the base URL:

```bash
export HINDSIGHT_API_URL="http://localhost:8888"

# Optional, only for authenticated Hindsight servers
export HINDSIGHT_API_KEY="your-hindsight-api-key"
```

Or create `~/.config/opencode/hindsight.jsonc`:

```jsonc
{
  "baseUrl": "http://localhost:8888", // Optional, defaults to localhost:8888
  "apiKey": "$HINDSIGHT_API_KEY" // Optional; env refs are expanded when they are the full value
}
```

Both `.jsonc` and `.json` formats are supported for Hindsight configuration, but OpenCode configuration uses `.json` format only.

#### Step 4: Verify setup

Tell the user to restart OpenCode and run:

```bash
opencode -c
```

They should see `hindsight` in the tools list. If not, check:

1. Is Hindsight server running? (default: http://localhost:8888)
2. Is the plugin in `opencode.json`?
3. Check logs: `tail ~/.opencode-hindsight.log`

If the config file contains credentials or internal endpoints, set restrictive permissions: `chmod 600 ~/.config/opencode/hindsight.jsonc`.

#### Step 5: Initialize codebase memory (optional)

Run `/hindsight-init` to have the agent explore and memorize the codebase.

</details>

## Features

### Context Injection

Context injection happens automatically when the user sends the **first message** of a new session — not when OpenCode starts up. The mechanism works as follows:

1. **Detection**: The `chat.message` hook checks whether the current session/project-bank pair has already received injected context via an in-memory Set
2. **First message per session/project bank only**: If the key is not in the Set, it's added immediately (preventing double-injection on subsequent messages in the same session)
3. **Three parallel API calls** are made using the user's message as the search query:
   - `getProfile(banks.user, userMessage)` — retrieves cross-project user profile facts via semantic search
   - `searchMemories(userMessage, banks.user)` — retrieves relevant user-scoped memories via semantic search
   - `listMemories(banks.project, maxProjectMemories)` — lists the latest N project memories (no relevance filtering, all have `[100%]` similarity)
4. **Format & Inject**: Results are formatted into the `[HINDSIGHT]` context block and prepended as a synthetic `Part` to the message parts — invisible to the user, visible only to the AI model

**Timing summary:**

| Event | When |
|---|---|
| OpenCode starts | No injection |
| User sends first message | Hook fires → injection happens → message processed |
| User sends second message | Hook fires but session already marked → skip injection |

Example of what the agent sees:

```
[HINDSIGHT]

User Profile:
- Prefers concise responses
- Expert in TypeScript

Project Knowledge:
- [100%] Uses Bun, not Node.js
- [100%] Build: bun run build

Relevant Memories:
- [82%] Build fails if .env.local missing
```

The agent uses this context automatically — no manual prompting needed.

Injected memories are visible to the AI model in the session context. Do not store raw secrets in Hindsight memory; wrap sensitive text in `<private>...</private>` so the plugin strips it before storage.

### Keyword Detection

Say "remember", "save this", "don't forget" etc. and the agent auto-saves to memory.

```
You: "Remember that this project uses bun"
Agent: [saves to project memory]
```

Add custom triggers via `keywordPatterns` config.

### Codebase Indexing

Run `/hindsight-init` to explore and memorize your codebase structure, patterns, and conventions.

### Preemptive Compaction

When context hits 80% capacity:

1. Triggers OpenCode's summarization
2. Injects project memories into summary context
3. Saves session summary as a memory

This preserves conversation context across compaction events.

### Privacy

```
Secret content is <private>sk-abc123</private>
```

Content in `<private>` tags is never stored.

## Tool Usage

The `hindsight` tool is available to the agent:

| Mode      | Args                                      | Description       |
| --------- | ----------------------------------------- | ----------------- |
| `add`     | `content`, `type?`, `scope?`, `bankAlias?` | Store memory (asynchronous) |
| `search`  | `query`, `scope?`, `limit?`, `bankAlias?` | Search memories   |
| `profile` | `query?`                                  | View user profile |
| `list`    | `scope?`, `limit?`, `bankAlias?`          | List memories     |
| `forget`  | `memoryId`, `scope?`, `bankAlias?`        | Delete memory     |
| `help`    | none                                      | Show tool usage and configured aliases |

**Scopes:** `user` (cross-project), `project` (default)

**Types:** `project-config`, `architecture`, `error-solution`, `preference`, `learned-pattern`, `conversation`

**Naming note:** The OpenCode tool name is exactly `hindsight`. Always call it with a `mode` parameter, for example `hindsight(mode: "search", query: "auth flow")`. Do not call `hindsight_search`, `hindsight_recall`, `hindsight_retain`, or other split tool names.

**Bank aliases:** `bankAlias?` only works for project-scoped operations and only for aliases explicitly configured in `runtimeProjectBanks`. It is rejected for `scope: "user"`, `profile`, and `help`.

### Important Notes:
- **`add` operation is asynchronous by default** to prevent timeouts during memory processing
- **Metadata values must be strings** — non-string values are automatically converted
- **Response includes `operationId`** for tracking asynchronous operations
- **Memory processing may take 30-60 seconds** for complex content extraction

### Example Usage

```text
# Store a project-specific configuration
hindsight(mode: "add", content: "This project uses Bun for package management and TypeScript for type safety", type: "project-config", scope: "project")

# Search for relevant memories
hindsight(mode: "search", query: "package manager", scope: "project", limit: 5)

# View user profile (cross-project preferences)
hindsight(mode: "profile")
```

## Memory Scoping

| Scope   | Generated bank name                     | Persists     |
| ------- | --------------------------------------- | ------------ |
| User    | `{bankPrefix}_user_{sha256-16(git email or username)}` | All projects |
| Project | `p_{directory_basename}_{sha256-16(directory)}` | This project |

## Configuration

Create `~/.config/opencode/hindsight.jsonc` or `~/.config/opencode/hindsight.json`:

```jsonc
{
  // Hindsight server URL (default: http://localhost:8888)
  "baseUrl": "http://localhost:8888",

  // Optional: API key for authenticated Hindsight servers
  "apiKey": "$HINDSIGHT_API_KEY",

  // Min similarity for memory retrieval (0-1, default: 0.6)
  "similarityThreshold": 0.6,

  // Max memories injected per request (default: 5)
  "maxMemories": 5,

  // Max project memories listed (default: 20)
  "maxProjectMemories": 20,

  // Max profile facts injected (default: 5)
  "maxProfileItems": 5,

  // Include user profile in context (default: true)
  "injectProfile": true,

  // Prefix for bank names when userBank/projectBank not set (default: "opencode")
  "bankPrefix": "opencode",

  // Optional: Set exact user bank (overrides auto-generated bank)
  "userBank": "my-custom-user-bank",

  // Optional: Set exact project bank (overrides auto-generated bank)
  "projectBank": "my-project-bank",

  // Optional: Route specific agents/subagents to project banks by exact name or glob
  "agentProjectBanks": {
    "review-*": "proj-review",
    "tdd": "proj-tdd"
  },

  // Optional: Allowlisted per-tool-call project bank aliases
  "runtimeProjectBanks": {
    "other-repo": "proj-other-repo",
    "review": "proj-review"
  },

  // Max tokens for recall operations (default: 4096)
  "maxTokens": 4096,

  // Budget for recall operations: 'low', 'mid', or 'high' (default: 'mid')
  "budget": "mid",

  // Extra keyword patterns for memory detection (regex)
  "keywordPatterns": ["log\\s+this", "write\\s+down"],

  // Context usage ratio that triggers compaction (0-1, default: 0.8)
  "compactionThreshold": 0.8,

  // Auto-retain subagent results on session.deleted (default: enabled)
  "autoRetain": {
    "enabled": true,
    // Agent name patterns to auto-retain. Supports exact names and `*` glob
    // patterns. Empty array = all agents.
    // **Fail-closed**: If `agents` is not a string array (e.g. a number,
    // object, or boolean), auto-retain is disabled entirely (`enabled: false`).
    // This prevents misconfiguration from silently retaining all agents.
    "agents": ["review-*", "tdd-worker"]
  }
}
```

All fields optional.

### Environment Variables

The following environment variables take precedence over configuration file settings:

- `HINDSIGHT_API_URL`: Hindsight server URL (e.g., `http://localhost:8888`)
  - **Priority**: Highest URL setting — overrides `HINDSIGHT_BASE_URL`, config file, and defaults
  - **Use case**: Different servers for development/production, docker containers
- `HINDSIGHT_BASE_URL`: Legacy fallback for `HINDSIGHT_API_URL`
- `HINDSIGHT_API_KEY`: API key for authenticated Hindsight servers
  - **Priority**: Highest API key setting — overrides `HINDSIGHT_API_TENANT_API_KEY` and config `apiKey`
- `HINDSIGHT_API_TENANT_API_KEY`: Legacy tenant API key fallback

Do not confuse the plugin API key above with the Hindsight server's LLM provider key (`HINDSIGHT_API_LLM_API_KEY`) used by the Docker Compose backend.

Configuration loading order (highest to lowest priority):
1. URL: `HINDSIGHT_API_URL` → `HINDSIGHT_BASE_URL` → config `baseUrl` → `http://localhost:8888`
2. API key: `HINDSIGHT_API_KEY` → `HINDSIGHT_API_TENANT_API_KEY` → config `apiKey` → unset
3. Other settings: configuration file (`hindsight.jsonc` or `hindsight.json`) → default values

Project bank precedence (highest to lowest):

1. matching `agentProjectBanks` exact/glob entry
2. `HINDSIGHT_PROJECT_BANK_ID`
3. `HINDSIGHT_BANK_ID`
4. allowlisted `bankAlias` from `runtimeProjectBanks`
5. `projectBank`
6. generated `p_<project>_<hash>` bank

Matched agent banks are intentionally isolated from environment and `bankAlias` overrides so subagents cannot be silently rerouted into another project bank.

### Configuration Notes:
- **File format**: Both `.jsonc` (with comments) and `.json` formats are supported
- **Memory operations are asynchronous by default** to prevent timeouts (30-60 seconds processing time)
- **Metadata values must be strings** — non-string values are automatically converted:
  - Numbers and booleans: converted to string representation
  - Objects and arrays: converted to JSON strings
  - Null/undefined: converted to empty string
- **Bank names are auto-generated** using SHA-256 hashes if not explicitly specified

### Bank Selection

By default, banks are auto-generated with deterministic SHA-256 hashes (first 16 hex characters):

- **User bank**: `{prefix}_user_{sha256(git_email)}`
  - Uses git user.email if available, otherwise falls back to system username
- **Project bank**: `p_{directory_basename}_{sha256(project_directory)}`
  - Uses the absolute path of the current working directory
  - The generated project bank uses the hardcoded `p_` prefix; `bankPrefix` applies to generated user banks only

You can override this by specifying exact bank names:

```jsonc
{
  // Use a specific bank for user memories (cross-project)
  "userBank": "my-team-workspace",

  // Use a specific bank for project memories (project-specific)
  "projectBank": "my-awesome-project",
}
```

This is useful when you want to:

- **Share memories across team members** (same `userBank`)
- **Sync memories between different machines** for the same project
- **Organize memories using your own naming scheme**
- **Integrate with existing Hindsight banks** from other tools

### Bank Names from Environment Variables

Bank fields can reference environment variables when the entire configured value is a variable reference. Supported forms are `$VAR` and `${VAR}`, where variable names use shell-style identifiers matching `[A-Za-z_][A-Za-z0-9_]*`:

```jsonc
{
  "userBank": "$OPENCODE_USER_BANK",
  "projectBank": "$OPENCODE_PROJECT_BANK",
  "agentProjectBanks": {
    "review-*": "$OPENCODE_REVIEW_BANK"
  },
  "runtimeProjectBanks": {
    "reviews": "${OPENCODE_REVIEW_BANK}"
  }
}
```

Rules:

- Only full-value references are expanded; unsupported or partial env-reference syntax remains literal. `"proj-$OPENCODE_REVIEW_BANK"` remains literal.
- Missing or empty environment variables are treated as unset.
- For `agentProjectBanks` and `runtimeProjectBanks`, entries with missing or empty env refs are dropped.
- Expansion happens when the plugin loads configuration, so restart OpenCode after changing these variables.

### Agent-Aware Project Bank Routing

Subagents can use different project banks without changing OpenCode core. Configure `agentProjectBanks` with exact names or `*` glob patterns:

```jsonc
{
  "projectBank": "proj-default",
  "agentProjectBanks": {
    "review-*": "proj-review",
    "agent-a": "proj-agent-a",
    "agent-b": "proj-agent-b"
  }
}
```

With this configuration:

- the main/default agent uses `proj-default`
- `agent-a` uses `proj-agent-a`
- `agent-b` uses `proj-agent-b`
- `review-security-skeptic`, `review-bug-hunter`, and other `review-*` agents use `proj-review`

Exact agent matches take precedence over glob patterns. If no agent mapping matches, the plugin falls back to `projectBank` or the generated project bank.

### Runtime Project Bank Aliases

For one-off tool calls, configure allowlisted aliases with `runtimeProjectBanks`:

```jsonc
{
  "runtimeProjectBanks": {
    "other-repo": "proj-other-repo"
  }
}
```

Then call:

```text
hindsight(mode: "search", query: "auth flow", bankAlias: "other-repo")
```

`bankAlias` applies only to that tool call. Unknown aliases return an error. The tool does not accept arbitrary bank IDs from the model.

### API Compatibility

This plugin uses the official `@vectorize-io/hindsight-client` (v0.6.2) and is compatible with Hindsight API v1. Key compatibility notes:

- **Asynchronous operations**: Memory addition uses `async: true` by default to prevent timeouts
- **Metadata handling**: All metadata values are converted to strings to match API requirements
- **Response format**: Responses include `operationId` (not `id`) for tracking asynchronous operations
- **Timeout handling**: Operations timeout after 120 seconds to accommodate Hindsight's processing time

## Usage with Oh My OpenCode

If you're using [Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode), disable its built-in auto-compact hook to let hindsight handle context compaction:

Add to `~/.config/opencode/oh-my-opencode.json`:

```json
{
  "disabled_hooks": ["anthropic-context-window-limit-recovery"]
}
```

## Development

```bash
# Clone and setup
git clone https://github.com/Shodocan/opencode-hindsight.git
cd opencode-hindsight

# Install dependencies
bun install

# Build the plugin
bun run build

# Type checking
bun run typecheck

# Test with local configuration (file:// path)
echo '{"plugin": ["file://'$(pwd)'"]}' > ~/.config/opencode/opencode.json
```

## Troubleshooting

### Common Issues

1. **Timeout errors when adding memories**
   - **Cause**: Hindsight server processing takes 30-60 seconds for memory extraction
   - **Solution**: Plugin uses asynchronous operations (`async: true`) by default
   - **Verification**: Check if response includes `operationId` instead of `id`

2. **`hindsight` tool not available**
   - **Cause**: Plugin not loaded or configuration incorrect
   - **Solution**:
     - Verify plugin is in `~/.config/opencode/opencode.json`
     - Restart OpenCode after configuration changes
     - Check Hindsight server is running: `curl http://localhost:8888/health`
   - **Tool health check**:
     ```bash
     och run --agent operator -m opencode-route/qwen3.6-27b \
       "Call the tool named exactly hindsight with arguments mode='search', scope='project', query='manual hindsight health check', limit=1. Do not use hindsight_recall or any other tool name. Report only success or failure, without memory contents."
     ```
     Expected: a completed tool call named exactly `hindsight`. `No tool named hindsight` means the plugin did not load; `Authentication failed` means the plugin loaded but Hindsight API credentials are wrong.

3. **Metadata not saving correctly**
   - **Cause**: Hindsight API requires all metadata values to be strings
   - **Solution**: Plugin automatically converts non-string values:
     - Numbers/booleans → string representation
     - Objects/arrays → JSON strings
     - Null/undefined → empty strings

4. **Empty results from `list` command**
   - **Cause**: The `listDocuments` API may not return all memories
   - **Workaround**: Use `search` with specific queries instead
   - **Note**: This is a limitation of the current Hindsight API implementation

5. **Memory not appearing in searches**
   - **Cause**: Asynchronous processing may still be in progress
   - **Solution**: Wait 1-2 minutes for memory consolidation
   - **Verification**: Check Hindsight server logs for processing status

## Logs

```bash
# Plugin logs
tail -f ~/.opencode-hindsight.log

# Restrict the log if it contains sensitive queries, bank names, or local paths
chmod 600 ~/.opencode-hindsight.log

# Hindsight server logs (if running locally)
# Check your Hindsight server documentation for log location
```

## License

MIT

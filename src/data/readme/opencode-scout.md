# opencode-scout

Web search and git clone for opencode agents.

Scout fills two gaps in opencode's tool set: finding things on the web and pulling down external repositories. It adds two tools (`web_search` and `clone_repo`) that plug into the existing workflow alongside `webfetch`, `read`, `grep`, and `glob`.

## Tools at a Glance

**`web_search`** searches the web via Exa, TinyFish, or Gemini and returns answers with source citations. Use it when you need to find a page, not fetch one you already know about.

```
web_search("how to configure Vite for library mode")
→ Synthesized answer with source URLs
→ Sources tagged [cloneable] when they point to GitHub/GitLab repos
```

**`clone_repo`** clones any git repository to a local cache and returns the file tree, README, and a path you can explore with `read`/`grep`/`glob`. Accepts SSH URLs, HTTPS URLs, browser links with file paths, and Sourcegraph paths.

```
clone_repo("https://github.com/openai/tiktoken/blob/main/src/lib.rs")
→ Clones the repo, returns the content of src/lib.rs + parent directory tree
→ Cached — repeated calls skip the clone
```

## Where Scout Fits

OpenCode already has strong tools for fetching known URLs and exploring local files. Scout adds web search and external repo cloning.

| Capability | OpenCode built-in | Scout adds |
|---|---|---|
| Fetch a known URL | `webfetch` | — |
| Search the web | — | `web_search` |
| Read local files | `read`, `grep`, `glob` | — |
| Clone external repos | — | `clone_repo` |
| Browse interactive pages | Chrome DevTools MCP | — |
| Search internal code | lucerna/Sourcegraph | — |

The tools chain together:

1. `web_search` finds relevant pages or repos
2. `webfetch` reads specific pages from those results (or use `includeContent: true` with Exa to get full content in one call)
3. `clone_repo` pulls down repos from those results
4. `read`/`grep`/`glob` explore the cloned code locally

## Install

Add `"opencode-scout"` to the `plugin` array in your `opencode.jsonc`:

```jsonc
{
  "plugin": [
    "opencode-scout"
  ]
}
```

Restart opencode. The plugin auto-installs from npm.

## Configure

Scout reads configuration from three sources, in order of precedence:

1. **Environment variables** — for secrets (API keys). Highest priority.
2. **`opencode.jsonc` plugin options** — for per-project settings.
3. **`~/.config/opencode/web-access.json`** — for machine-wide defaults.

All sources are optional. Settings merge: a value from a higher-priority source overrides the same key from a lower-priority one.

### opencode.jsonc (recommended)

Add options as the second element of the plugin tuple:

```jsonc
{
  "plugin": [
    ["opencode-scout", {
      "provider": "auto",
      "gemini": { "model": "gemini-2.5-flash" },
      "clone": { "timeoutSeconds": 60 }
    }]
  ]
}
```

> **Note:** API keys should be set via environment variables, not in `opencode.jsonc` — the config file may be committed to git.

### Environment variables

```bash
export EXA_API_KEY="your-exa-api-key"
export TINYFISH_API_KEY="your-tinyfish-api-key"
export GEMINI_API_KEY="your-gemini-api-key"
```

### Config file (machine-wide fallback)

`~/.config/opencode/web-access.json`:

```json
{
  "exaApiKey": "your-exa-api-key",
  "tinyFishApiKey": "your-tinyfish-api-key",
  "geminiApiKey": "your-gemini-api-key",
  "provider": "auto",
  "gemini": {
    "model": "gemini-2.5-flash"
  },
  "clone": {
    "cachePath": "/Users/you/.cache/opencode/repos",
    "timeoutSeconds": 60
  }
}
```

All fields are optional.

### What works without configuration

- **No API keys at all:** `clone_repo` works. `web_search` returns an error telling you which keys to set.
- **Exa key only:** `web_search` uses Exa. Full page content via `includeContent` is available.
- **TinyFish key only:** `web_search` uses TinyFish. Returns snippets only (no full content). Search is free.
- **Gemini key only:** `web_search` uses Gemini with grounded search. No `includeContent` support (use `webfetch` on source URLs instead).
- **Multiple keys:** `web_search` in `auto` mode tries Exa → TinyFish → Gemini, falling back on failure.

## Tools

### web_search

Search the web using Exa, TinyFish, or Gemini. Returns answers with source citations.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | Search query |
| `provider` | `"auto"` \| `"exa"` \| `"tinyfish"` \| `"gemini"` | no | Search provider. Default: `auto` (tries Exa → TinyFish → Gemini) |
| `numResults` | number | no | Max results. Default: 5. Exa only. |
| `includeContent` | boolean | no | Fetch full page content from sources. Exa only. For Gemini results, use `webfetch` on source URLs. |

**Examples:**

```
// Basic search
web_search({ query: "Cloudflare Workers websocket hibernation" })

// Get full page content in one call (no follow-up webfetch needed)
web_search({ query: "deno kv documentation", includeContent: true })

// Force a specific provider
web_search({ query: "rust async runtime comparison", provider: "gemini" })
```

**Provider fallback.** In `auto` mode, Scout tries Exa first, then TinyFish, then Gemini. If a provider fails (network error, rate limit), the next one in the chain is tried. If all fail, the error message lists what was tried.

**Cloneable sources.** Search results from GitHub or GitLab URLs are tagged `[cloneable]`, signaling that `clone_repo` can pull them down.

### clone_repo

Clone a git repository and return its local path, file tree, and README.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` | string | yes | Git repository URL, browser link, or Sourcegraph path |
| `branch` | string | no | Branch to clone. Default: default branch |
| `path` | string | no | Subdirectory or file to focus on after cloning |
| `forceReclone` | boolean | no | Force re-clone even if cached |

**Supported URL formats:**

| Format | Example |
|---|---|
| HTTPS URL | `https://github.com/owner/repo` |
| SSH URL | `git@github.com:owner/repo.git` |
| GitHub file URL | `https://github.com/owner/repo/blob/main/src/index.ts` |
| GitHub tree URL | `https://github.com/owner/repo/tree/main/src` |
| GitLab file URL | `https://gitlab.example.com/org/repo/-/blob/main/file.ts` |
| GitLab nested groups | `https://gitlab.example.com/org/group/subgroup/repo` |
| Sourcegraph path | `gitlab.example.com/org/repo` |
| Sourcegraph file path | `gitlab.example.com/org/repo/-/blob/main/file.ts` |

When the URL points to a specific file, the response returns that file's content plus the parent directory tree. When it points to a directory, the response scopes the tree listing to that directory.

**Examples:**

```
// Clone a repo
clone_repo({ url: "https://github.com/openai/tiktoken" })

// Clone and focus on a specific file (extracted from the URL)
clone_repo({ url: "https://github.com/openai/tiktoken/blob/main/src/lib.rs" })

// Clone a GitLab repo with nested groups
clone_repo({ url: "https://gitlab.example.com/myorg/group/project" })

// Clone from a Sourcegraph path
clone_repo({ url: "gitlab.example.com/myorg/group/project" })

// Force fresh clone
clone_repo({ url: "https://github.com/owner/repo", forceReclone: true })
```

**Cache behavior.** Repos are cached by a hash of the clone URL at `~/.cache/opencode/repos/`. Repeated calls for the same URL reuse the existing clone. Use `forceReclone: true` to force a fresh clone.

**Clone settings.** Clones are shallow (`--depth 1 --single-branch`) to minimize disk and time. The default timeout is 60 seconds. Both are configurable.

**Self-hosted GitLab.** For GitLab instances (any `gitlab.*` hostname), the URL normalizer automatically converts HTTPS URLs to SSH format. Your local SSH key configuration handles authentication.

## Providers

### Exa

Exa returns raw search results with titles, URLs, and text snippets. With `includeContent: true`, it fetches full page content (up to 10,000 characters per result) in the same API call. No follow-up `webfetch` needed.

- Requires an API key from [exa.ai](https://exa.ai)
- Pay-per-search pricing
- Best for: finding specific pages, getting full content in one call, structured results you want to process further

### TinyFish

TinyFish returns raw search results with titles, URLs, and short snippets (~140-160 characters). Search queries are free — no credits consumed. Supports `site:` and `-site:` operators in the query string for domain-scoped searches.

- Requires an API key from [TinyFish](https://tinyfish.ai)
- Free search (no per-query cost)
- Returns 10 results per page, snippets only (no full page content)
- `numResults` and `includeContent` are not supported. Use `webfetch` on source URLs to get full page content.
- Best for: free-tier usage, quick searches when you just need URLs and snippets, domain-scoped searches with `site:` operator

### Gemini

Gemini returns a synthesized answer with inline citation markers (`[1][2]`) and a Sources list with resolved URLs. It uses Google's grounding API, so results are backed by web search but presented as a coherent narrative.

- Requires a Gemini API key from [Google AI Studio](https://aistudio.google.com)
- Free tier available (with rate limits)
- Default model: `gemini-2.5-flash` (configurable)
- `numResults` and `includeContent` are not supported. Use `webfetch` on source URLs to get full page content.
- Best for: questions that benefit from synthesized answers, when you want a direct answer rather than a list of pages

## System Prompt

Scout injects a one-line status indicator into the system prompt:

```
## Scout: web_search (Exa ✓ TinyFish ✓ Gemini ✓) | clone_repo ✓
```

This tells the agent which providers are configured and available. If no API keys are set, it shows `web_search (no providers configured)`.

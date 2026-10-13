# Antigravity + Gemini CLI OAuth Plugin for Opencode (OpenCode 2 supported)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![X (Twitter)](https://img.shields.io/badge/X-@dopesalmon-000000?style=flat&logo=x)](https://x.com/dopesalmon)

Enable Opencode to authenticate against **Antigravity** (Google's IDE) via OAuth so you can use Antigravity rate limits and access models like `gemini-3.1-pro` and `claude-opus-4-6-thinking` with your Google credentials.

> [!NOTE]
> **OpenCode 2.x support.** This fork ([PercyGFX/opencode-antigravity-auth](https://github.com/PercyGFX/opencode-antigravity-auth)) adds an OpenCode 2 entry point (`server.ts`), published on npm as [`@percygfx/opencode-antigravity-auth`](https://www.npmjs.com/package/@percygfx/opencode-antigravity-auth). OpenCode 2 ignores plugins written for 1.x. The tell-tale sign is that `opencode auth login google` only offers an API key. OpenCode 1.x keeps loading the original entry point unchanged, see [OpenCode 1.x](#opencode-1x).

## What You Get

- **Gemini 3.8 Flash, Claude Opus/Sonnet 4.6** and the rest of Antigravity's models via Google OAuth
- **Automatic model list** — the models come from Antigravity's own Recommended list, so new ones appear without a plugin update (OpenCode 2)
- **Limits in the sidebar** — each account's 5-hour and weekly quota and the account serving your model, right in the TUI (OpenCode 2)
- **Multi-account support** — add multiple Google accounts, auto-rotates when rate-limited; manage them from the TUI with `/antigravity` (OpenCode 2)
- **Dual quota system** — access both Antigravity and Gemini CLI quotas from one plugin
- **Thinking models** — extended thinking for Claude and Gemini 3 with configurable budgets
- **Sign in with any browser** — the plugin never opens a browser itself; it copies the link so you choose the browser or profile (OpenCode 2)
- **Google Search grounding** — enable web search for Gemini models (auto or always-on; the `google_search` tool is OpenCode 1.x only for now)
- **Auto-recovery** — handles session errors and tool failures automatically (thinking-block recovery on both versions; recovery of interrupted tool calls is OpenCode 1.x only)
- **Plugin compatible** — works alongside other OpenCode plugins (oh-my-opencode, dcp, etc.)

---

<details open>
<summary><b>⚠️ Terms of Service Warning — Read Before Installing</b></summary>

> [!CAUTION]
> Using this plugin (and any proxy for Antigravity) violates Google's Terms of Service. A number of users have reported their Google accounts being **banned** or **shadow-banned** (restricted access without explicit notification).
>
> **By using this plugin, you acknowledge:**
> - This is an unofficial tool not endorsed by Google
> - Your account may be suspended or permanently banned
> - You assume all risks associated with using this plugin
>

</details>

---

## Installation

These steps are for **OpenCode 2.x**. Check your version with `opencode --version`. For 1.x, see [OpenCode 1.x](#opencode-1x).

### Quick Start

```bash
opencode plugin add @percygfx/opencode-antigravity-auth
```

Then open `opencode`, run `/antigravity` → **Add account**, and sign in with Google. The models appear in the model picker under **Google Antigravity**, and the sidebar shows your 5-hour and weekly limits. The steps below explain each part.

<details open>
<summary><b>For Humans</b></summary>

**Option A: Let an LLM do it**

Paste this into any LLM agent (Claude Code, OpenCode, Cursor, etc.):

```
Install the OpenCode 2 build of the opencode-antigravity-auth plugin by following the "For LLM Agents" steps in: https://github.com/PercyGFX/opencode-antigravity-auth/blob/opencode-v2/README.md
```

**Option B: Manual setup**

1. **Install the plugin** with one command:

   ```bash
   opencode plugin add @percygfx/opencode-antigravity-auth
   ```

   OpenCode downloads the package and adds it to the `plugins` list in `~/.config/opencode/opencode.json`. There is no need for `npm install -g`: OpenCode keeps its own copy and checks for new versions by itself.

2. **Check it loaded:** `opencode plugin list` should list `opencode-antigravity-auth`. Right after the background service starts, the list can take a few seconds to fill in. If OpenCode was already running and the plugin is missing, restart it: `opencode service restart`.

   > **Upgrading from 1.x?** Remove the 1.x `opencode-antigravity-auth` entry from the `plugin` list in `opencode.json`, and remove the `provider.google.models` block that 1.x setups added. The models now come from the plugin, under the `google-antigravity` provider. The old block would only add copies under `google` that bypass the plugin.

3. **Sign in** with your Google account, using any of:
   - **TUI:** run `/antigravity` → **Add account**.
   - **TUI:** run `/connect` (or choose **Connect an integration** in the model picker) → **Google Antigravity**. Sending a prompt with nothing connected opens the same dialog.
   - **CLI:** `opencode auth login google-antigravity`

   Pick one of two sign-in methods:

   **Google account (Antigravity)**, for a browser on the same computer:
   1. The sign-in link is copied to your clipboard and also shown on screen. In the TUI, `c` copies it again and `o` opens it.
   2. Open it in any browser or profile on this computer and sign in with Google.
   3. The browser shows an **"All set!"** page and the sign-in finishes by itself. There is nothing to paste.

   **Google account (Antigravity, paste the redirect URL)**, for a browser on another machine (SSH, containers):
   1. Open the sign-in link in any browser and sign in with Google.
   2. Google redirects to `http://localhost:51121/oauth-callback?...`. That page does not load, which is expected. Copy the **full URL** from the address bar.
   3. Paste it into the prompt and press Enter. The bare `code` value also works.

   The first method switches to pasting by itself when port 51121 is busy, or in WSL and remote sessions.

   > The plugin never opens a browser. `opencode auth login` (the CLI) does open the link in your default browser when it runs in a terminal. That is OpenCode's own behaviour and a plugin cannot turn it off, so use the TUI dialog if you want to pick the browser.

   Sign in again to add more accounts. Each login is labeled with its Google email in `opencode auth list`.

4. **Use it:** pick a model under **Google Antigravity** in the model picker, or from the CLI:

   ```bash
   opencode run "Hello" --model google-antigravity/antigravity-claude-opus-4-6-thinking#max
   ```

   The sidebar shows each account's 5-hour and weekly limits. Click an account there, or run `/antigravity`, to add, disable, re-authenticate or remove accounts.

5. **Update or uninstall:**

   ```bash
   opencode plugin update                                       # update now (OpenCode also checks by itself)
   opencode plugin remove @percygfx/opencode-antigravity-auth   # uninstall
   ```

**Option C: From source** (to work on the plugin)

```bash
git clone -b opencode-v2 https://github.com/PercyGFX/opencode-antigravity-auth.git
cd opencode-antigravity-auth
npm install
```

Add the **folder** to the `plugins` list in `~/.config/opencode/opencode.json`, for example `"plugins": ["C:/Users/you/opencode-antigravity-auth"]` (forward slashes on Windows). Point at the folder, not a file: OpenCode 2 skips a path to a single `.js` file and logs `configured plugin path must be a directory`. OpenCode runs `server.ts` and `tui.tsx` directly, so there is no build step. Use either the folder or the npm package, not both.

</details>

<details>
<summary><b>For LLM Agents</b></summary>

### Step-by-Step Instructions

1. Check that OpenCode is 2.x: `opencode --version`. For 1.x, follow [OpenCode 1.x](#opencode-1x) instead.

2. Install the plugin. This also adds it to the global OpenCode configuration:

   ```bash
   opencode plugin add @percygfx/opencode-antigravity-auth
   ```

   Check with `opencode plugin list` (it can take a few seconds after the background service starts). If OpenCode was already running and the plugin is missing, run `opencode service restart`.

3. Open the OpenCode configuration file at `~/.config/opencode/opencode.json` (or `opencode.jsonc`). If its `plugin` list still has a 1.x `opencode-antigravity-auth` entry (such as `opencode-antigravity-auth@latest`), remove that entry.

   > **Note**: This path works on all platforms. On Windows, `~` resolves to your user home directory (e.g., `C:\Users\YourName`).

4. Remove any `provider.google.models` entries named `antigravity-*` or `gemini-*` left over from a 1.x setup. Do not add model definitions: the plugin registers them under the `google-antigravity` provider.

5. Ask the user to sign in, either with `opencode auth login google-antigravity` or from the TUI (`/connect` → **Google Antigravity**). Sign-in needs the user to sign in to Google in a browser, so an agent cannot finish it alone.

### Verification

```bash
opencode plugin list    # lists opencode-antigravity-auth
opencode run "Hello" --model google-antigravity/antigravity-claude-opus-4-6-thinking#max
```

</details>

<details>
<summary><b id="opencode-1x">OpenCode 1.x</b></summary>

OpenCode 1.x loads the original v1 entry point. Use the original npm package, `opencode-antigravity-auth`:

1. **Add the plugin** to `~/.config/opencode/opencode.json`:

   ```json
   {
     "plugin": ["opencode-antigravity-auth@latest"]
   }
   ```

   > Want bleeding-edge features? Use `opencode-antigravity-auth@beta` instead.

2. **Login** with your Google account:

   ```bash
   opencode auth login
   ```

3. **Add models** — choose one:
   - Run `opencode auth login` → Google → OAuth with Google (Antigravity) → select **"Configure models in opencode.json"** (auto-configures all models)
   - Or manually copy the [full configuration](#models) below

4. **Use it:**

   ```bash
   opencode run "Hello" --model=google/antigravity-claude-opus-4-6-thinking --variant=max
   ```

</details>

---

## Models

### Model Reference

**The model list comes from Antigravity itself.** On OpenCode 2 the plugin asks Antigravity for its **Recommended** models after you sign in, and again every 6 hours, then registers them under the `google-antigravity` provider. New models appear without a plugin update, and retired ones disappear. Until the first discovery (before sign-in, or offline) a built-in list is used; the last discovered list is cached in `~/.config/opencode/antigravity-models.json`. Refer to a model as `google-antigravity/<model>`. On **OpenCode 1.x** the models live under `google/<model>` and come from the [configuration block](#models) below.

Models Antigravity recommended at release (October 2026):

| Model | Variants | Notes |
|-------|----------|-------|
| `antigravity-gemini-3.8-flash` | low, medium, high | Gemini 3.8 Flash, Antigravity's default model |
| `antigravity-gemini-3.7-flash` | low, medium, high | Gemini 3.7 Flash (Antigravity: "Leaving Soon") |
| `antigravity-gemini-3.6-flash` | low, medium, high | Gemini 3.6 Flash (Antigravity: "Leaving Soon") |
| `antigravity-gemini-3.1-pro` | low, high | Gemini 3.1 Pro (Antigravity: "Leaving Soon") |
| `antigravity-claude-sonnet-4-6` | — | Claude Sonnet 4.6 |
| `antigravity-claude-opus-4-6-thinking` | low, max | Claude Opus 4.6 with extended thinking |
| `antigravity-gpt-oss-120b-medium` | — | GPT-OSS 120B (Antigravity: removed November 2, 2026) |

Antigravity notes that Claude access on free plans ends **November 2, 2026**, and that Sonnet/Opus 5.5 are available on paid Pro and Ultra plans. Whatever your accounts are offered shows up automatically.

> **What the variants do:** each Gemini tier is its own upstream model (e.g. `gemini-3.8-flash-high`), and the plugin sends the one you pick. Without a variant, Antigravity's default tier (high) is used. Claude variants set the thinking budget.

> **Routing:** Gemini models share one Antigravity quota, Claude and GPT-OSS share another. Models from Antigravity's list never fall back to the Gemini CLI quota: they don't exist there, and accounts without a Gemini CLI license would get a 403. Older Gemini model names you request directly still follow `cli_first` and the automatic fallback.

> **See what your account is offered:** `node scripts/list-models.mjs` (add `--account 2` for another account, `--all` for models outside the Recommended list).

**Using variants:**
```bash
# OpenCode 2: append the variant to the model with "#"
opencode run "Hello" --model google-antigravity/antigravity-claude-opus-4-6-thinking#max

# OpenCode 1.x
opencode run "Hello" --model=google/antigravity-claude-opus-4-6-thinking --variant=max
```

For details on variant configuration and thinking levels, see [docs/MODEL-VARIANTS.md](docs/MODEL-VARIANTS.md).

<details>
<summary><b>Full models configuration (copy-paste ready, OpenCode 1.x only)</b></summary>

> OpenCode 2 does not need this block, so do not add it there. The plugin registers these models itself, and this block would only create copies under `google` that bypass the plugin.

Add this to your `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-antigravity-auth@latest"],
  "provider": {
    "google": {
      "models": {
        "antigravity-gemini-3.8-flash": {
          "name": "Gemini 3.8 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-gemini-3.7-flash": {
          "name": "Gemini 3.7 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-gemini-3.6-flash": {
          "name": "Gemini 3.6 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-gemini-3.1-pro": {
          "name": "Gemini 3.1 Pro (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingLevel": "low" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-claude-sonnet-4-6": {
          "name": "Claude Sonnet 4.6 (Thinking) (Antigravity)",
          "limit": { "context": 250000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-opus-4-6-thinking": {
          "name": "Claude Opus 4.6 (Thinking) (Antigravity)",
          "limit": { "context": 250000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingConfig": { "thinkingBudget": 8192 } },
            "max": { "thinkingConfig": { "thinkingBudget": 32768 } }
          }
        },
        "antigravity-gpt-oss-120b-medium": {
          "name": "GPT-OSS 120B (Medium) (Antigravity)",
          "limit": { "context": 131072, "output": 32768 },
          "modalities": { "input": ["text"], "output": ["text"] }
        }
      }
    }
  }
}
```

> **Backward Compatibility:** Legacy model names with `antigravity-` prefix (e.g., `antigravity-gemini-3-flash`) still work. The plugin automatically handles model name transformation for both Antigravity and Gemini CLI APIs.

</details>

---

## Multi-Account Setup

Add multiple Google accounts for a higher combined quota. The plugin automatically rotates between accounts when one is rate-limited.

```bash
opencode auth login google-antigravity  # OpenCode 2: run again to add more accounts
opencode auth login                     # OpenCode 1.x
```

Each sign-in adds one account to `~/.config/opencode/antigravity-accounts.json`, the same file 1.x uses, so accounts added under 1.x keep working.

### Accounts and limits in the TUI (OpenCode 2)

The session sidebar has an **Antigravity · limits** section:

```
Antigravity · limits
• you@gmail.com              in use
  Gemini          5h  99%  4h 16m
                  wk  99%  6d 23h
  Claude & GPT    5h 100%  5h 00m
                  wk 100%  6d 23h
• other@gmail.com            Claude
  Gemini          5h  98%  4h 15m
  ...
  manage: /antigravity
```

- **Limits** — the same numbers as Antigravity's *Settings → Models*: for each model group (Gemini; Claude & GPT), the remaining share of the **5-hour** limit (`5h`) and the **weekly** limit (`wk`), and when each fully refreshes. The 5-hour limit spreads global capacity across all users; the weekly limit depends on your plan. The dot turns yellow at 30% and red at 10% on either window.
- **In use** — the account currently serving the selected model's group is bold and marked *in use*; the other accounts show which group they serve.
- **Manage** — click an account, or run `/antigravity` (also in the command palette as *Antigravity accounts*):
  - **Disable / Enable** — take the account out of rotation or put it back
  - **Re-authenticate** — shows the sign-in link right away (also copied to your clipboard), with that Google account preselected. Sign in and the dialog closes by itself; if the browser says the page can't be reached, paste that page's URL into the dialog instead. Only the plugin's account is updated, so no extra opencode login is created.
  - **Remove** — removes the account from the plugin (asks first)
  - **Add account** (in `/antigravity`) — the same sign-in dialog, for another Google account. Your very first account goes through `/connect` instead, which creates opencode's Antigravity login.

The limits refresh every 2 minutes and after each response. `opencode auth logout google-antigravity` signs out of opencode's Antigravity login; after removing your last account, use it to sign out completely.

**Account management options (OpenCode 1.x, via `opencode auth login`):**
- **Configure models** — Auto-configure all plugin models in opencode.json
- **Check quotas** — View remaining API quota for each account
- **Manage accounts** — Enable/disable specific accounts for rotation

For details on load balancing, dual quota pools, and account storage, see [docs/MULTI-ACCOUNT.md](docs/MULTI-ACCOUNT.md).

---

## Troubleshooting

> **Quick Reset**: Most issues can be resolved by deleting `~/.config/opencode/antigravity-accounts.json` and signing in again. On OpenCode 2, also run `opencode auth logout google-antigravity` first, then `opencode auth login google-antigravity`. On 1.x, run `opencode auth login`.

### OpenCode 2: Login Only Offers "Google API key"

**Cause:** A 1.x build of this plugin is installed. OpenCode 2 does not run 1.x plugins, so the Antigravity sign-in never registers. The `google` integration only has OpenCode's built-in API-key method.

**Solution:** Install the OpenCode 2 build (see [Installation](#installation)), then sign in under **`google-antigravity`** instead of `google`:

```bash
opencode auth login google-antigravity
```

---

### OpenCode 2: Plugin Not Loading

1. Run `opencode plugin list`. `opencode-antigravity-auth` should be listed, with `@percygfx/opencode-antigravity-auth` (or your source folder) as its source. Right after the background service starts, give it a few seconds and run it again.
2. A source checkout's entry must be the plugin **folder**. OpenCode 2 skips a path to a single `.js` file and logs `configured plugin path must be a directory`.
3. A package or folder without a default-exported v2 plugin fails with `Plugin must export a default definition with an id and an effect or setup function`. That is the 1.x package (`opencode-antigravity-auth`); install `@percygfx/opencode-antigravity-auth` instead.
4. Check the OpenCode log, `~/.local/share/opencode/log/opencode.log`: `failed to load plugin` is the server part (sign-in, models), `plugin operation failed` the TUI part (sidebar limits, `/antigravity`).
5. After editing a source checkout, restart the background service: `opencode service restart`.

---

### OpenCode 2: "Not signed in to Google Antigravity"

The `google-antigravity` models only appear after you sign in. If a request still fails with this message, the connection is missing or its token could not be refreshed. Sign in again with `opencode auth login google-antigravity`.

---

### OpenCode 2: A Model Is Missing, or a New One Doesn't Show Up

The model list follows Antigravity's **Recommended** list for your account. It is refreshed after each sign-in and every 6 hours. To see what Antigravity offers your accounts right now:

```bash
node scripts/list-models.mjs              # first enabled account
node scripts/list-models.mjs --account 2  # another account
node scripts/list-models.mjs --all        # include models outside the Recommended list
```

A model listed there but missing in OpenCode appears after the next refresh: sign in again, or restart the service with `opencode service restart` once the cached list is more than 6 hours old. Models outside the Recommended list (e.g. Gemini 3 Flash, Gemini 3.5 Flash) are not added; Antigravity has superseded them.

---

### OpenCode 2: "Not Available on Your Current Plan" / No Sonnet or Opus 5.5

Antigravity decides which models an account gets. Its notices say Claude access on free plans ends November 2, 2026, and that Sonnet/Opus 5.5 are offered on paid Pro and Ultra plans. An account can have a Google AI Pro subscription and still be enrolled in Antigravity's **free** tier; it then sees the free-tier models and limits. Sign in to the Antigravity app with that account to check what it offers. Once Antigravity offers a model to a signed-in account, it appears in OpenCode automatically.

---

### 403 "You do not have a valid license of this product"

This comes from the **Gemini CLI** quota, which many accounts cannot use. The plugin no longer retries models from Antigravity's list on the Gemini CLI quota, so you should not see it with them. If a rate-limited Antigravity model used to end in this error, update the plugin. Older Gemini model names requested directly can still fall back to Gemini CLI; set `cli_first` off and use the `antigravity-` models instead.

---

### Configuration Path (All Platforms)

OpenCode uses `~/.config/opencode/` on **all platforms** including Windows.

| File | Path |
|------|------|
| Main config | `~/.config/opencode/opencode.json` |
| Accounts | `~/.config/opencode/antigravity-accounts.json` |
| Plugin config | `~/.config/opencode/antigravity.json` |
| Debug logs | `~/.config/opencode/antigravity-logs/` |
| Discovered models (OpenCode 2) | `~/.config/opencode/antigravity-models.json` |
| OpenCode 2 server log | `~/.local/share/opencode/log/opencode.log` |

> **Windows users**: `~` resolves to your user home directory (e.g., `C:\Users\YourName`). Do NOT use `%APPDATA%`.

> **Custom path**: Set `OPENCODE_CONFIG_DIR` environment variable to use a custom location.

> **Windows migration**: If upgrading from plugin v1.3.x or earlier, the plugin will automatically find your existing config in `%APPDATA%\opencode\` and use it. New installations use `~/.config/opencode/`.

---

### Multi-Account Auth Issues

If you encounter authentication issues with multiple accounts:

1. Delete the accounts file:
   ```bash
   rm ~/.config/opencode/antigravity-accounts.json
   ```
2. Re-authenticate:
   ```bash
   # OpenCode 2
   opencode auth logout google-antigravity
   opencode auth login google-antigravity

   # OpenCode 1.x
   opencode auth login
   ```

---

### 403 Permission Denied (`rising-fact-p41fc`)

**Error:**
```
Permission 'cloudaicompanion.companions.generateChat' denied on resource 
'//cloudaicompanion.googleapis.com/projects/rising-fact-p41fc/locations/global'
```

**Cause:** Plugin falls back to a default project ID when no valid project is found. This works for Antigravity but fails for Gemini CLI models.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Gemini for Google Cloud API** (`cloudaicompanion.googleapis.com`)
4. Add `projectId` to your accounts file:
   ```json
   {
     "accounts": [
       {
         "email": "your@email.com",
         "refreshToken": "...",
         "projectId": "your-project-id"
       }
     ]
   }
   ```

> **Note**: Do this for each account in a multi-account setup.

---

### Gemini Model Not Found

**OpenCode 2:** use the `google-antigravity/` prefix, e.g. `google-antigravity/antigravity-gemini-3.8-flash`. The models are only listed once you have signed in. Check `opencode plugin list` if they never appear.

**OpenCode 1.x:** add this to your `google` provider config:

```json
{
  "provider": {
    "google": {
      "npm": "@ai-sdk/google",
      "models": { ... }
    }
  }
}
```

---

### Gemini 3 Models 400 Error ("Unknown name 'parameters'")

**Error:**
```
Invalid JSON payload received. Unknown name "parameters" at 'request.tools[0]'
```

**Causes:**
- Tool schema incompatibility with Gemini's strict protobuf validation
- MCP servers with malformed schemas
- Plugin version regression

**Solutions:**
1. **Update the plugin.** On OpenCode 2, run `opencode plugin update` (or `git pull` in a source checkout), then `opencode service restart`. On 1.x, use the latest beta:
   ```json
   { "plugin": ["opencode-antigravity-auth@beta"] }
   ```

2. **Disable MCP servers** one-by-one to find the problematic one

3. **Add npm override** (OpenCode 1.x only; OpenCode 2 always uses its own Gemini client):
   ```json
   { "provider": { "google": { "npm": "@ai-sdk/google" } } }
   ```

---

### MCP Servers Causing Errors

Some MCP servers have schemas incompatible with Antigravity's strict JSON format.

**Common symptom:**
```bash
Invalid function name must start with a letter or underscore
```

Sometimes it shows up as:
```bash
GenerateContentRequest.tools[0].function_declarations[12].name: Invalid function name must start with a letter or underscore
```

This usually means an MCP tool name starts with a number (for example, a 1mcp key like `1mcp_*`). Rename the MCP key to start with a letter (e.g., `gw`) or disable that MCP entry for Antigravity models.

**Diagnosis:**
1. Disable all MCP servers in your config
2. Enable one-by-one until error reappears
3. Report the specific MCP in a [GitHub issue](https://github.com/NoeFabris/opencode-antigravity-auth/issues)

---

### "All Accounts Rate-Limited" (But Quota Available)

**Cause:** Cascade bug in `clearExpiredRateLimits()` in hybrid mode (fixed in recent beta).

**Solutions:**
1. Update to latest beta version
2. If persists, delete accounts file and re-authenticate
3. Try switching `account_selection_strategy` to `"sticky"` in `antigravity.json`

---

### Session Recovery

If you encounter errors during a session:
1. Type `continue` to trigger the recovery mechanism
2. If blocked, use `/undo` to revert to pre-error state
3. Retry the operation

> On OpenCode 2 the plugin does not receive session events. Repairing an interrupted tool call automatically (with `auto_resume`) is therefore 1.x only. Use the manual steps above.

---

### Using with Oh-My-OpenCode

> These steps are for OpenCode 1.x. On OpenCode 2, oh-my-opencode only runs if it ships a 2.x build. If it does, refer to models as `google-antigravity/...` instead of `google/...`.

**Important:** Disable the built-in Google auth to prevent conflicts:

```json
// ~/.config/opencode/oh-my-opencode.json
{
  "google_auth": false,
  "agents": {
    "frontend-ui-ux-engineer": { "model": "google/antigravity-gemini-3.1-pro" },
    "document-writer": { "model": "google/antigravity-gemini-3.8-flash" }
  }
}
```

---

### Infinite `.tmp` Files Created

**Cause:** When account is rate-limited and plugin retries infinitely, it creates many temp files.

**Workaround:**
1. Stop OpenCode
2. Clean up: `rm ~/.config/opencode/*.tmp`
3. Add more accounts or wait for rate limit to expire

---

### OAuth Callback Issues

> **OpenCode 2:** if the browser cannot reach the "All set!" page (Safari's HTTPS-Only Mode, a busy port, Docker, WSL2 or SSH), use the **paste the redirect URL** sign-in method instead. It needs no local server. Open the link in any browser on any machine, then copy the redirected `localhost:51121` URL from the address bar and paste it back. If the browser rewrote the URL (for example to `https://localhost...`), paste it anyway, because only its `code` and `state` values are used. The sections below apply to 1.x.

<details>
<summary><b>Safari OAuth Callback Fails (macOS)</b></summary>

**Symptoms:**
- "fail to authorize" after successful Google login
- Safari shows "Safari can't open the page"

**Cause:** Safari's "HTTPS-Only Mode" blocks `http://localhost` callback.

**Solutions:**

1. **Use Chrome or Firefox** (easiest):
   Copy the OAuth URL and paste into a different browser.

2. **Disable HTTPS-Only Mode temporarily:**
   - Safari > Settings (⌘,) > Privacy
   - Uncheck "Enable HTTPS-Only Mode"
   - Run `opencode auth login`
   - Re-enable after authentication

</details>

<details>
<summary><b>Port Conflict (Address Already in Use)</b></summary>

**macOS / Linux:**
```bash
# Find process using the port
lsof -i :51121

# Kill if stale
kill -9 <PID>

# Retry
opencode auth login
```

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :51121
taskkill /PID <PID> /F
opencode auth login
```

</details>

<details>
<summary><b>Docker / WSL2 / Remote Development</b></summary>

OAuth callback requires browser to reach `localhost` on the machine running OpenCode.

**WSL2:**
- Use VS Code's port forwarding, or
- Configure Windows → WSL port forwarding

**SSH / Remote:**
```bash
ssh -L 51121:localhost:51121 user@remote
```

**Docker / Containers:**
- OAuth with localhost redirect doesn't work in containers
- Wait 30s for manual URL flow, or use SSH port forwarding

</details>

---

### Configuration Key Typo: `plugin` not `plugins`

On OpenCode 1.x the correct key is `plugin` (singular):

```json
{
  "plugin": ["opencode-antigravity-auth@beta"]
}
```

**Not** `"plugins"` (will cause "Unrecognized key" error). OpenCode 2 accepts both keys; it reads the 1.x `plugin` array as `plugins`.

---

### Migrating Accounts Between Machines

When copying `antigravity-accounts.json` to a new machine:
1. Ensure the plugin is installed: `opencode plugin add @percygfx/opencode-antigravity-auth` on OpenCode 2 (see [Installation](#installation)), or `"plugin": ["opencode-antigravity-auth@beta"]` on 1.x
2. Copy `~/.config/opencode/antigravity-accounts.json`
3. On OpenCode 2, sign in once with `opencode auth login google-antigravity`. OpenCode keeps its own connection, separate from the accounts file, and the models only appear once that connection exists.
4. If you get "API key missing" error, the refresh token may be invalid — re-authenticate

## Known Plugin Interactions
For details on load balancing, dual quota pools, and account storage, see [docs/MULTI-ACCOUNT.md](docs/MULTI-ACCOUNT.md).

---

## Plugin Compatibility

> The plugins below are OpenCode 1.x plugins. OpenCode 2 only runs plugins that ship a 2.x build, so check each one's own docs before relying on it under 2.x.

### @tarquinen/opencode-dcp

DCP creates synthetic assistant messages that lack thinking blocks. **List this plugin BEFORE DCP:**

```json
{
  "plugin": [
    "opencode-antigravity-auth@latest",
    "@tarquinen/opencode-dcp@latest"
  ]
}
```

### oh-my-opencode

Disable built-in auth and override agent models in `oh-my-opencode.json`:

```json
{
  "google_auth": false,
  "agents": {
    "frontend-ui-ux-engineer": { "model": "google/antigravity-gemini-3.1-pro" },
    "document-writer": { "model": "google/antigravity-gemini-3.8-flash" },
    "multimodal-looker": { "model": "google/antigravity-gemini-3.8-flash" }
  }
}
```

> **Tip:** When spawning parallel subagents, enable `pid_offset_enabled: true` in `antigravity.json` to distribute sessions across accounts.

### Plugins you don't need

- **gemini-auth plugins** — Not needed. This plugin handles all Google OAuth.

---

## Configuration

Create `~/.config/opencode/antigravity.json` for optional settings:

```json
{
  "$schema": "https://raw.githubusercontent.com/NoeFabris/opencode-antigravity-auth/main/assets/antigravity.schema.json"
}
```

Most users don't need to configure anything — defaults work well.

### Model Behavior

| Option | Default | What it does |
|--------|---------|--------------
| `keep_thinking` | `false` | Preserve Claude's thinking across turns. **Warning:** enabling may degrade model stability. |
| `session_recovery` | `true` | Auto-recover from tool errors (OpenCode 1.x only) |
| `cli_first` | `false` | Route Gemini models to Gemini CLI first (Claude and image models stay on Antigravity). |

### Account Rotation

| Your Setup | Recommended Config |
|------------|-------------------|
| **1 account** | `"account_selection_strategy": "sticky"` |
| **2-5 accounts** | Default (`"hybrid"`) works great |
| **5+ accounts** | `"account_selection_strategy": "round-robin"` |
| **Parallel agents** | Add `"pid_offset_enabled": true` |

### Quota Protection

| Option | Default | What it does |
|--------|---------|--------------|
| `soft_quota_threshold_percent` | `90` | Skip account when quota usage exceeds this percentage. Prevents Google from penalizing accounts that fully exhaust quota. Set to `100` to disable. |
| `quota_refresh_interval_minutes` | `15` | Background quota refresh interval. After successful API requests, refreshes quota cache if older than this interval. Set to `0` to disable. |
| `soft_quota_cache_ttl_minutes` | `"auto"` | How long quota cache is considered fresh. `"auto"` = max(2 × refresh interval, 10 minutes). Set a number (1-120) for fixed TTL. |

> **How it works**: Quota cache is refreshed automatically after API requests (when older than `quota_refresh_interval_minutes`) and manually via "Check quotas" in `opencode auth login`. The threshold check uses `soft_quota_cache_ttl_minutes` to determine cache freshness - if cache is older, the account is considered "unknown" and allowed (fail-open). When ALL accounts exceed the threshold, the plugin waits for the earliest quota reset time (like rate limit behavior). If wait time exceeds `max_rate_limit_wait_seconds`, it errors immediately.

### Rate Limit Scheduling

Control how the plugin handles rate limits:

| Option | Default | What it does |
|--------|---------|--------------|
| `scheduling_mode` | `"cache_first"` | `"cache_first"` = wait for same account (preserves prompt cache), `"balance"` = switch immediately, `"performance_first"` = round-robin |
| `max_cache_first_wait_seconds` | `60` | Max seconds to wait in cache_first mode before switching accounts |
| `failure_ttl_seconds` | `3600` | Reset failure count after this many seconds (prevents old failures from permanently penalizing accounts) |

**When to use each mode:**
- **cache_first** (default): Best for long conversations. Waits for the same account to recover, preserving your prompt cache.
- **balance**: Best for quick tasks. Switches accounts immediately when rate-limited for maximum availability.
- **performance_first**: Best for many short requests. Distributes load evenly across all accounts.

### App Behavior

| Option | Default | What it does |
|--------|---------|--------------|
| `quiet_mode` | `false` | Hide toast notifications |
| `debug` | `false` | Enable debug file logging (`~/.config/opencode/antigravity-logs/`) |
| `debug_tui` | `false` | Show debug logs in the TUI log panel (independent from `debug`) |
| `auto_update` | `true` | Auto-update plugin |

> **OpenCode 2:** the plugin cannot show toasts or write to the TUI log panel, and OpenCode updates the plugin itself (`opencode plugin update`). `quiet_mode`, `debug_tui` and `auto_update` therefore have no effect, and toast messages (such as "Using account 2/3") are not shown. To see what the plugin is doing, turn on `debug` for the debug log files. Every other option works the same on both versions.

For all options, see [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

**Environment variables:**
```bash
OPENCODE_CONFIG_DIR=/path/to/config opencode  # Custom config directory
OPENCODE_ANTIGRAVITY_DEBUG=1 opencode         # Enable debug file logging
OPENCODE_ANTIGRAVITY_DEBUG=2 opencode         # Verbose debug file logging
OPENCODE_ANTIGRAVITY_DEBUG_TUI=1 opencode     # Enable TUI log panel debug output
```

---

## Troubleshooting

See the full [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for solutions to common issues including:

- Auth problems and token refresh
- "Model not found" errors
- Session recovery
- Gemini CLI permission errors
- Safari OAuth issues
- Plugin compatibility
- Migration guides

---

## Documentation

- [Configuration](docs/CONFIGURATION.md) — All configuration options
- [Multi-Account](docs/MULTI-ACCOUNT.md) — Load balancing, dual quota pools, account storage
- [Model Variants](docs/MODEL-VARIANTS.md) — Thinking budgets and variant system
- [Troubleshooting](docs/TROUBLESHOOTING.md) — Common issues and fixes
- [Architecture](docs/ARCHITECTURE.md) — How the plugin works
- [API Spec](docs/ANTIGRAVITY_API_SPEC.md) — Antigravity API reference

---

## Support

If this plugin saves you time, consider supporting its development:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/S6S81QBOIR)

---

## Credits

- [opencode-gemini-auth](https://github.com/jenslys/opencode-gemini-auth) by [@jenslys](https://github.com/jenslys)
- [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)

## License

MIT License. See [LICENSE](LICENSE) for details.

<details>
<summary><b>Legal</b></summary>

### Intended Use

- Personal / internal development only
- Respect internal quotas and data handling policies
- Not for production services or bypassing intended limits

### Warning

By using this plugin, you acknowledge:

- **Terms of Service risk** — This approach may violate ToS of AI model providers
- **Account risk** — Providers may suspend or ban accounts
- **No guarantees** — APIs may change without notice
- **Assumption of risk** — You assume all legal, financial, and technical risks

### Disclaimer

- Not affiliated with Google. This is an independent open-source project.
- "Antigravity", "Gemini", "Google Cloud", and "Google" are trademarks of Google LLC.

</details>

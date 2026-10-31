# opencode-session-autofile

Automatically puts your [OpenChamber](https://github.com/openchamber/openchamber) sessions into sidebar folders, using a short list of rules you can read at a glance.

## What it does

### Without the plugin: OpenCode names the conversation

When you start a conversation, OpenCode generates its name automatically. Separate from the assistant's reply, it sends a short naming prompt to an AI model, using the initial conversation as context. That prompt tells the model to produce a short title. OpenCode saves the result as the session's title, and OpenChamber displays it in the sidebar.

For example, you write **“Help me fix my Docker build”**, and OpenCode might name the session **“Fix Docker build”**. Naming the session does not, by itself, put it in a topic folder such as **Tech**. Without this plugin, that folder placement is something you manage separately.

### With the plugin: the naming prompt also supplies a category

The plugin changes the instructions used for that existing title-generation request, then uses the saved title to organize the session. There are two separate steps: **the model produces a title with a category; the plugin uses rules to choose and save the folder.**

1. **You define the categories as rules** in the plugin's options. For example, a rule can name the destination folder `Tech` and describe it as “software, IT, infrastructure”. The folder name is also the tag the title ends with: `[Tech]`.
2. **The plugin replaces OpenCode's naming instructions before the model receives them.** It uses OpenCode's `title` hook—a callback that runs just before title generation—to replace that request's system prompt. The replacement prompt is built from your rules: it lists each folder name (as the tag) with its description, and tells the model to end its short title with the appropriate tag. This modifies OpenCode's existing naming request; it does not send a second classification request or change the instructions for the assistant answering your question.
3. **OpenCode generates and saves the tagged title.** For the Docker example, the model might return `Fix Docker build [Tech]`. OpenCode saves that text as the session title, just as it would save an ordinary title without the plugin. The model chooses the tag; it does not move the session into a folder.
4. **The plugin retrieves the saved session from OpenCode.** When it receives a session-created or session-renamed event, it uses the session ID to fetch the session record through OpenCode's API (`session.get`). It reads the saved `title`—not the sidebar text or your conversation transcript—and compares its ending tag with the folder names in your rules, ignoring upper/lower case. In this example, `[Tech]` matches the rule for the `Tech` folder.
5. **The plugin saves the folder assignment in OpenChamber.** Through OpenChamber's folder API, it adds the session ID to the destination folder, creating that folder if needed. This changes sidebar organization; it does not move project files or change the session's working directory. An already-open OpenChamber window may need a reload to display the saved assignment.

In short, the example changes from **message → ordinary title → you organize the session** to **message → tagged title → the plugin files the session in Tech**. You do not have to type `[Tech]` yourself.

If title generation has not finished when the first event arrives, the plugin checks again after a turn ends. A periodic sweep also checks existing sessions. These later checks read saved session information; they do not ask the model to rename every session. A title marked `[Unfiled]`, or a session with no recognized tag, is left where it is. Filing failures are logged without blocking your conversation.

### Requirements

1. **OpenCode 2.x** (`@opencode/plugin` >= 2.0.20).
2. **OpenChamber running with its web API reachable**, by default at `http://localhost:3000` (change it with the `apiBaseUrl` option).
3. **No OpenChamber UI password.** The plugin cannot authenticate; with a password set, filing fails silently.

## Quick start

1. Add the plugin to your OpenCode config, for example `~/.config/opencode/opencode.jsonc` for a user-wide installation. OpenCode 2.x uses the `plugins` key with the object form.
2. Set the rules. In OpenChamber's plugin settings page, open the installed plugin and paste this into **Options (JSON)**:

   ```json
   {
     "rules": [
       { "folder": "Tech", "description": "Software development, IT and infrastructure" },
       { "folder": "Personal", "description": "Family, health and everyday life" }
     ]
   }
   ```

   OpenChamber saves it into `opencode.jsonc` under the plugin entry's `options`; you can also write it there by hand:

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [
       {
         "package": "@jlhalej/opencode-session-autofile@0.8.0",
         "options": {
           "rules": [
             { "folder": "Tech", "description": "Software development, IT and infrastructure" },
             { "folder": "Personal", "description": "Family, health and everyday life" }
           ]
         }
       }
     ]
   }
   ```

3. Save. OpenCode reloads plugins when its config file changes, so no restart is needed. If the rules do not seem to apply, restart OpenCode.

With no rules the plugin does nothing: it leaves OpenCode's own title prompt alone and never files a session.

## The rules

Rules live only in the plugin's `options.rules`. A rule is two things: a folder and a short description of what belongs in it.

```json
{
  "rules": [
    { "folder": "Tech", "description": "Software development, IT and infrastructure" },
    { "folder": "Personal", "description": "Family, health and everyday life" }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `folder` | The OpenChamber folder to file into (created if missing), written exactly as you want it to appear. It is also the tag: a session titled `… [Tech]` goes into `Tech`. At most 40 characters, no `[` or `]`. Required. |
| `description` | Tells the title model when to pick this folder. Write it for the model: what kinds of conversations belong here. |

Other fields in a rule are ignored. A malformed entry is dropped and reported in the diagnostics file, never turned into a surprise move.

## How a new session gets filed

OpenCode names every conversation by itself: shortly after your first message it runs a small, separate "write a short title" prompt on an AI model and saves the result as the session's title. The plugin hooks into that step.

1. **You send the first message.** OpenCode creates the session with a placeholder title.
2. **The plugin replaces the title prompt.** The new prompt is built from your rules: it lists each folder name with its description and tells the model to write a title of at most 50 characters in your language, ending with exactly one of those names in brackets, or `[Unfiled]` if nothing fits. Example title: `Fix docker build [Tech]`.
3. **OpenCode saves the title.** The plugin is notified, reads the saved title, and looks at the bracketed tag at its end.
4. **The tag is matched to a folder**, ignoring upper/lower case: `[tech]` and `[Tech]` both match the rule whose folder is `Tech`, and the folder is used exactly as you wrote it in the rules. If the title has no tag, an unknown tag, or `[Unfiled]`, **nothing is moved**.
5. **The session is filed** on the OpenChamber server, under the session's own working directory (OpenChamber keeps folders per directory). If the title is not ready yet, the plugin re-checks a few times when the turn ends (3 attempts, 500 ms apart by default).
6. **Reloading the UI:** the move is stored immediately, but an already-open OpenChamber window shows it only after a reload (desktop: *OpenChamber → Reload Webview*).

The plugin only reads the title, **not the conversation**; the title model is the one that saw your first message and chose the tag.

### Behaviours worth knowing

- **Manual moves are corrected.** The rules always win. If you drag a session elsewhere, the plugin puts it back the next time it checks that session (on its next title change or turn end) or in the periodic sweep.
- **A session marked `[Unfiled]`, or whose title has no recognized tag, is left where it is**, not moved out of a folder you chose.
- **Archived sessions are skipped.**
- **Sessions with a parent (`parentID`), including subagent sessions,** follow their **root** session: the child's own title is ignored and the root's title is classified. Set `includeSubagents` to `false` to leave children alone. A fork without `parentID` is classified independently.
- **Periodic sweep:** every 5 minutes (first pass about 20 s after load) it lists all sessions from OpenChamber's `GET /api/session` and fixes any whose tag points at a different folder. Untagged sessions are never touched.

## `current_session` tool (0.7.0+)

The plugin also registers a small tool, `current_session`, that tells the model which session it is running in. It takes no input and returns `{ "ok": true, "id", "title", "directory", "isChild", "archived" }`, plus `workspaceID` and `parentID` when they exist (`parentID` only for a child session).

- The id is the one OpenCode passes to that very tool call, confirmed with `session.get`. A fork, subagent or `/btw` child gets its own id, never its parent's. If the id cannot be confirmed the tool returns `{ "ok": false, ... }` instead of guessing.
- It is always registered, even with `"enabled": false` (that switch only stops filing) and even if the rules are broken.
- The title is a snapshot: it can change when the title model or a manual rename updates it. The id never changes.
- It is a direct tool (not Code-Mode-only). Under the OpenChamber Claude integration it appears as `mcp__openchamber__current_session`.
- Callers should accept the result only when `ok` is `true` and `id` is a non-empty string, use the returned `directory`, and on `ok: false` stop and report `reason`/`guidance`. A missing tool means the plugin is not loaded; an error does not call for a restart. Never look a session up by title or "newest" to find your own id.
- Typical use: pass the id to a follow-up scheduler so a delayed prompt lands in this very conversation.

## Trying rules safely

Preview rules (a JSON file with `{ "rules": [...] }`, or the plugin's whole `options` object) against your live sessions, writing nothing (from a clone of this repo; the script is not part of the npm package):

```bash
bun scripts/dry-run.ts examples/rules.example.json http://localhost:3000
```

Or set `"dryRun": true` in the plugin options so the plugin itself only logs and records what it would do.

## Known limits

- **OpenChamber's sidebar does not re-read folders by itself.** Moves are saved on the server immediately, but an open window shows them only after a reload. This is how OpenChamber loads folders, not something a plugin can change.
- A client that was open with an old folder list and then drags a session can overwrite the plugin's moves for that folder; the next sweep puts them back.
- OpenChamber 2.x never reports write conflicts, so two simultaneous writers to the same folder can lose one write silently.
- Filing needs OpenChamber's API reachable and no UI password.

More options (`enabled`, `apiBaseUrl`, `titlePrompt`, `fallbackMaxAttempts`, `fallbackDelayMs`, `reconcileIntervalMs`, `includeSubagents`, `dryRun`) and sweep details are in [ADVANCED.md](ADVANCED.md).

## Development and publishing

```bash
bun install
bun test
bun run typecheck
bun run build
npm pack --dry-run
```

**Publishing the scoped name** is a first publish of a new package, not a rename of the existing one on the registry. First authenticate and confirm rights to `@jlhalej`: it must be your npm username or an npm organization where you have publishing rights. Your GitHub username alone grants no npm rights. Check the authenticated npm username with `npm whoami`; for an organization scope, check its membership separately with `npm org ls jlhalej`. Then publish:

```bash
npm publish --access public
```

(`publishConfig.access` is already `public`.) Do not deprecate the unscoped `opencode-session-autofile` until the scoped package is published and verified to load; deprecate it afterwards with a message pointing to the new name.

# Relay

**Relay picks the model for each message in OpenCode.** You choose models for three kinds of work, Plan, Execute and Review, once. Then you type `/relay <message>`, or turn Relay on for a chat. A small decision model reads the message, picks the kind of work and the model that fits it, switches the chat to that model, and sends your message.

<table>
  <tr>
    <td valign="top"><img src="docs/images/relay-panel.png" width="360" alt="The Relay panel: Plan and Execute, each with two models, their effort, price, intelligence index and a use-it-for line"></td>
    <td valign="top"><img src="docs/images/model-table.png" width="360" alt="Adding a model: a searchable table of the models OpenCode offers, with price, context and intelligence index, sorted by index"><br><br><img src="docs/images/recent-choices.png" width="360" alt="Recent choices: each decision with its mode, model, how sure the decider was, and what the reply took"></td>
  </tr>
</table>

<sub>The Relay panel with example settings and example Recent choices. The models, prices and index numbers are what OpenCode and Relay listed on 18 Nov 2026.</sub>

> Relay is early. It is built for OpenCode 2.3 and runs in OpenCode Desktop 2.4.1 on Windows. See [what has been tested](docs/status.md).

## Why use it

- **The right model for each message.** A strong model for planning, a cheap one for small edits, a careful one for reviews. Relay switches for you.
- **Your own words decide.** Give each model a "use it for" line, such as "small, quick edits". Or write no lines, and Relay chooses by itself: the strongest model for big or tricky work, the cheapest for small work.
- **Mix providers.** Each kind of work can use a different provider. In testing, Claude (through a Claude login) planning and reviewing with a cheap OpenCode Go model building passed all six test exercises, and Go paid 89% less than with one Go model for each kind of work ([results](docs/status.md)).
- **See what you spend.** The **Relay usage** tab shows every reply of every chat: cost, tokens, a chart by day, totals by model, and filters.
- **Your message is safe.** It is sent once and unchanged. If choosing fails, it still goes to the chat's current model. Relay never stores its text.

## Install

You need OpenCode 2.3 or newer: OpenCode Desktop or the terminal app.

1. Open OpenCode's global config file:
   - macOS and Linux: `~/.config/opencode/opencode.json`
   - Windows: `C:\Users\<you>\.config\opencode\opencode.json`

   If there is an `opencode.jsonc` there instead, use that. If neither exists, create `opencode.json` containing `{}`.
2. Add Relay to the `plugins` list. Keep any plugins that are already in it. Use the newest version, which `npm view relay-opencode version` prints. Pinning it makes updates predictable.

   ```json
   {
     "plugins": ["relay-opencode@0.2.0"]
   }
   ```

3. Quit OpenCode completely and open it again. The first start downloads Relay from npm, so it can take a minute or two.
4. Type `/` in a chat. `/relay` should be in the list.

Other ways to install, from source or as a fixed copy, are in the [guide](docs/guide.md#install-from-source).

## Install with an AI agent

Give your coding agent (OpenCode, Claude Code, Cursor or another) this repository's link and this request:

> Install the OpenCode plugin from https://github.com/AsadKhalil/relay-opencode. Follow the section "Instructions for AI agents" in its README exactly, then tell me what you did and what I need to do next.

### Instructions for AI agents

Follow these steps in order. Stop and ask the user when a step says so. Never print, copy or change API keys, tokens, passwords or login files.

1. **Check OpenCode.** Run `opencode --version`.
   - If it prints 2.3.0 or newer, go on.
   - If the command is not found, look for OpenCode Desktop. On Windows it is `%LOCALAPPDATA%\Programs\ai.opencode.desktop\OpenCode.exe`, and its command-line binary is in `%APPDATA%\ai.opencode.desktop\cli\<version>-x64\opencode-cli.exe`. On macOS it is `/Applications/OpenCode.app`. If you find it, go on.
   - If OpenCode is missing or older than 2.3.0, stop and ask the user to install or update it from https://opencode.ai.
2. **Find the newest Relay version.** Run `npm view relay-opencode version`. Call the result `<version>`. If npm is not available, or it prints nothing or something that is not a plain version like `0.2.0` (for example `0.0.0-stage`, a placeholder npm shows while a release is held for review), use `latest` as `<version>`.
3. **Find the config file.** The global config folder is `~/.config/opencode` (Windows: `%USERPROFILE%\.config\opencode`). Use `opencode.jsonc` if it exists there, else `opencode.json`. Never create a second config file next to an existing one. If neither exists, create `opencode.json` with the content `{}` and skip step 4.
4. **Back it up.** Copy the file to `opencode.json.before-relay` (or `opencode.jsonc.before-relay`) in the same folder. If that name is taken, an earlier backup holds the original, so keep it and use `.before-relay-2` (then `-3`, and so on).
5. **Add Relay.** Edit the file's text in place: never rewrite it from parsed JSON, which would drop the comments, trailing commas and formatting of a `.jsonc` file. Change only the `plugins` list:
   - If `plugins` is missing, add `"plugins": ["relay-opencode@<version>"]` as a new top-level key.
   - If an entry is exactly `"relay-opencode"` or starts with `"relay-opencode@"`, replace that one entry with `"relay-opencode@<version>"`.
   - If an entry is a folder path ending in `relay-opencode` (an install from source or a fixed copy), stop and ask the user whether to replace it.
   - Otherwise append `"relay-opencode@<version>"` and keep every other entry as it is.
   - The key is `plugins` (plural): never add a second `plugins` key or a singular `plugin` key, and do not touch any other key, such as `permissions`.
6. **Check the file.** For `.json`, it must parse: `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <path>`. For `.jsonc`, a strict JSON check fails even on a good file, so check instead that the comments are still there and the brackets balance, or use a JSONC parser. If the file is broken, restore the backup and stop.
7. **Restart OpenCode.** If you run inside OpenCode yourself, do not restart it: tell the user to quit OpenCode completely and open it again. Otherwise ask the user to restart it the same way. Do not end OpenCode's processes yourself.
8. **Verify** after the restart. The first start downloads Relay, which can take a minute or two.
   - In OpenCode's log (`~/.local/share/opencode/log/opencode.log`; Windows: `%USERPROFILE%\.local\share\opencode\log\opencode.log`) there is a `loading plugin` line naming `relay-opencode`, and no `failed to load plugin` line for it.
   - Or ask the user to type `/` in a chat: `/relay` is listed.
9. **Tell the user what to do next.** Relay's settings are made in OpenCode Desktop's Relay panel, and an agent cannot click there:
   1. Open a chat, open the command palette (**Ctrl+K** on Windows and Linux) and run **Open Relay**.
   2. Under **Plan**, **Execute** and **Review**, press **+ Add a model** and pick models.
   3. Press **+ Choose a decider** and pick a decision model.
   4. Type `/relay on` in a chat, or use the Relay pill above the chat box.

To remove Relay, delete its entry from `plugins` and restart OpenCode. Relay's saved settings stay in OpenCode's storage and come back if it is added again.

## Update

- **Installed by name from npm:** change the version in `plugins` to the new one (`npm view relay-opencode version` prints it), then quit and reopen OpenCode. With an unpinned `"relay-opencode"`, OpenCode can keep an older copy in `~/.cache/opencode/npm/`.
- **From source or as a fixed copy:** see [the guide](docs/guide.md#update).

Your settings are kept across updates.

## Set up (once, in Desktop)

1. Open a chat, press **Ctrl+K** and run **Open Relay**. The Relay panel opens beside the chat.
2. Under **Plan**, **Execute** and **Review**, press **+ Add a model** and pick models from the table. When a mode has more than one model, give each a short "use it for" line, or leave the lines empty and let Relay choose by itself.
3. Press **+ Choose a decider** and pick a decision model. OpenCode lists free ones, such as `opencode/jev-1.13-free`, when they are offered.
4. Type a sample message in the test box and press **Try** to see what Relay would pick.

The settings are shared by all your projects. The terminal app has no settings screen, so set them up in Desktop. The [guide](docs/guide.md#set-up) explains each setting.

## Use

| You type | What happens |
|---|---|
| `/relay <message>` | Relay picks the mode and the model for this one message, switches the chat, and sends it. |
| `/relay on` | Every message you send in this chat goes through Relay, without typing `/relay`. |
| `/relay off` | This chat goes back to normal. |
| **Open Relay usage** (Ctrl+K) | The Relay usage tab: cost, tokens and records of every chat. |
| `/relay-stats` | In the terminal app: the totals Relay counted of its own messages before the usage tab. |

- **The Relay pill** above the chat box in Desktop shows whether Relay is on for that chat. Click it to turn Relay on or off.
- **Plan and Review** use OpenCode's `plan` agent, which is meant for reading and planning. Only **Execute** uses `build`, which can change files.
- **When the decider is not sure** (under 60%), `/relay` uses Plan. With `/relay on`, the chat stays as it is.

## Learn more

- [Guide](docs/guide.md): each setting, the usage tab, the pill, Recent choices, other ways to install, and what to do if **Open Relay** is missing.
- [When Relay saves money](docs/saving-money.md): a switch to another model has a price, and Relay moves a chat only when it pays.
- [What leaves your machine](docs/privacy.md)
- [Prices and the intelligence index](docs/data-sources.md): where the numbers come from.
- [What has been tested, and known limits](docs/status.md)
- [Contributing and releasing](CONTRIBUTING.md) · [Change log](docs/implementation-progress.md) · [Findings on real OpenCode](docs/compatibility.md)

## License

[MIT](LICENSE)

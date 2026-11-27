# Relay

**Relay picks the model for each message in OpenCode.** You choose models for three kinds of work, Plan, Execute and Review, once. Then you type `/relay <message>`, or turn Relay on for a chat. A small decision model reads the message, picks the kind of work and the model that fits it, switches the chat to that model, and sends your message.

<table>
  <tr>
    <td valign="top"><img src="docs/images/relay-panel.png" width="360" alt="The Relay panel as a strip board: the decider, the 7-day cost strip, and Plan and Execute bays, each model a strip with its slot, price, index, context, effort and use-it-for line"></td>
    <td valign="top"><img src="docs/images/model-table.png" width="360" alt="Adding a model: a searchable rack of the models OpenCode offers, with price, intelligence index and context, sorted by index"><br><br><img src="docs/images/recent-choices.png" width="360" alt="Recent choices: one line per decision with its time, mode, model, how sure the decider was, and what the reply cost"></td>
  </tr>
</table>

<sub>The Relay panel with sample settings and sample Recent choices (26 Nov 2026). The models, prices and index numbers are shaped like what OpenCode and the public lists showed that day.</sub>

> Relay is early. It is built for OpenCode 2.3 and runs in OpenCode Desktop 2.4.1 on Windows. See [what has been tested](docs/status.md).

## Why use it

- **The right model for each message.** A strong model for planning, a cheap one for small edits, a careful one for reviews. Relay switches for you.
- **Your own words decide.** Give each model a "use it for" line, such as "small, quick edits". Or write no lines, and Relay chooses by itself: the strongest model for big or tricky work, the cheapest for small work.
- **Mix providers.** Each kind of work can use a different provider. In testing, Claude (through a Claude login) planning and reviewing with a cheap OpenCode Go model building passed all six test exercises, and Go paid 89% less than with one Go model for each kind of work ([results](docs/status.md)).
- **See what you spend.** The **Relay usage** tab shows every reply of every chat: cost, tokens, a chart by day, totals by model, and filters.
- **Your message is safe.** It is sent once and unchanged. If choosing fails, it still goes to the chat's current model. Relay never stores its text.

## Install

You need OpenCode 2.3 or newer: OpenCode Desktop or the terminal app.

1. Run:

   ```sh
   opencode plugin add relay-opencode@0.2.2
   ```

   It downloads Relay from npm and adds it to the `plugins` list of your global config, keeping the plugins already there. Use the newest version, which `npm view relay-opencode version` prints. With OpenCode Desktop only, run Desktop's own command-line binary the same way: on Windows `%APPDATA%\ai.opencode.desktop\cli\<version>-x64\opencode-cli.exe plugin add relay-opencode@0.2.2`.
2. Quit OpenCode completely and open it again.
3. Type `/` in a chat. `/relay` should be in the list.

Or add it by hand: in OpenCode's global config file (`~/.config/opencode/opencode.json`; on Windows `C:\Users\<you>\.config\opencode\opencode.json`; or `opencode.jsonc` if that is the one you have), add `"relay-opencode@0.2.2"` to the `plugins` list, keeping any plugins already in it:

```json
{
  "plugins": ["relay-opencode@0.2.2"]
}
```

Then quit OpenCode completely and open it again. Added by hand, Relay is downloaded on that first start and loaded on the next, so if `/relay` is not listed yet, wait a minute, then quit and open OpenCode once more (OpenCode 2.4.2, 26 Nov 2026). `opencode plugin add` downloads it at once, so one restart is enough there.

Other ways to install, from source or as a fixed copy, are in the [guide](docs/guide.md#install-from-source).

## Install with an AI agent

Give your coding agent (OpenCode, Claude Code, Cursor or another) this repository's link and this request:

> Install the OpenCode plugin from https://github.com/AsadKhalil/relay-opencode. Follow the section "Instructions for AI agents" in its README exactly, then tell me what you did and what I need to do next.

### Instructions for AI agents

Follow these steps in order. Stop and ask the user when a step says so. Never print, copy or change API keys, tokens, passwords or login files.

1. **Find OpenCode.** OpenCode Desktop does not put an `opencode` command on the PATH, so a missing command is no reason to stop. Check these, and note what you find:
   - The command: `opencode --version`. If it prints a version, you have a CLI for step 5. If it is not found, that is fine.
   - OpenCode Desktop: on Windows `%LOCALAPPDATA%\Programs\ai.opencode.desktop\OpenCode.exe` (in PowerShell `$env:LOCALAPPDATA`, in Git Bash `$LOCALAPPDATA`); on macOS `/Applications/OpenCode.app` or `~/Applications/OpenCode.app`.
   - Desktop's own CLI, which works like the `opencode` command: on Windows `%APPDATA%\ai.opencode.desktop\cli\<version>-x64\opencode-cli.exe` (take the folder with the highest version).
   - OpenCode's folders: `~/.config/opencode` or `~/.local/share/opencode` (on Windows under `%USERPROFILE%`). They mean OpenCode has run on this machine.

   Any one of these is enough: go on. With no CLI you add Relay by hand in step 5, which needs no CLI. If a version you found is below 2.3.0 (from `--version`, or the name of Desktop's CLI folder), stop and ask the user to update OpenCode. If you found none of them, stop and ask the user to install OpenCode 2.3 or newer from https://opencode.ai.
2. **Find the newest Relay version.** Run `npm view relay-opencode version`. Call the result `<version>`. If npm is not available, or it prints nothing or something that is not a plain version like `0.2.0` (for example `0.0.0-stage`, a placeholder npm shows while a release is held for review), use `latest` as `<version>`.
3. **Find the config file.** The global config folder is `~/.config/opencode` (Windows: `%USERPROFILE%\.config\opencode`), or `$XDG_CONFIG_HOME/opencode` when that variable is set. Use `opencode.jsonc` if it exists there, else `opencode.json`. Never create a second config file next to an existing one. If neither exists, create `opencode.json` with the content `{}` and skip step 4.
4. **Look, then back it up.** Read the `plugins` list of the config file.
   - If an entry is a folder path ending in `relay-opencode` (an install from source or a fixed copy), stop and ask the user whether to replace it, and change nothing. Never add a second Relay next to it: OpenCode would load Relay twice.
   - If an entry is exactly `relay-opencode` or starts with `relay-opencode@`, it is an older install: you replace it in step 5.

   Then copy the file to `opencode.json.before-relay` (or `opencode.jsonc.before-relay`) in the same folder. If that name is taken, an earlier backup holds the original, so keep it and use `.before-relay-2` (then `-3`, and so on).
5. **Add Relay.**
   1. **With a CLI from step 1** (the `opencode` command, or Desktop's `opencode-cli`; the working folder does not matter): if there is an older entry, run `<cli> plugin remove <that exact entry>`, because `plugin add` would add a second entry instead of replacing it. Then run `<cli> plugin add relay-opencode@<version>`. It writes the global config itself and keeps the other plugins. It worked when it exits with code 0 and prints that the plugin was "installed and added to" the file from step 3; then go to step 6.
   2. **Without a CLI, or if the command failed,** edit the file's text in place: never rewrite it from parsed JSON, which would drop the comments, trailing commas and formatting of a `.jsonc` file. Change only the `plugins` list:
      - If `plugins` is missing, add `"plugins": ["relay-opencode@<version>"]` as a new top-level key.
      - If there is an older entry, replace that one entry with `"relay-opencode@<version>"`.
      - Otherwise append `"relay-opencode@<version>"` and keep every other entry as it is.
      - The key is `plugins` (plural): never add a second `plugins` key or a singular `plugin` key, and do not touch any other key, such as `permissions`.
6. **Check the file.** For `.json`, it must parse: `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <path>`. For `.jsonc`, a strict JSON check fails even on a good file, so check instead that the comments are still there and the brackets balance, or use a JSONC parser. If the file is broken, restore the backup and stop.
7. **Restart OpenCode.** Ask the user to quit OpenCode completely and open it again; if you run inside OpenCode yourself, or are not sure, do not restart it yourself. Do not end OpenCode's processes yourself.
8. **Verify** after the restart. After `plugin add`, Relay is already downloaded. After an edit by hand, the first start only downloads it (a minute or two) and the next start loads it: if Relay is not loaded after the first restart, ask the user to quit and open OpenCode once more.
   - In OpenCode's log (`~/.local/share/opencode/log/opencode.log`; Windows: `%USERPROFILE%\.local\share\opencode\log\opencode.log`) there is a `loading plugin` line naming `relay-opencode`, and no `failed to load plugin` line for it.
   - Or ask the user to type `/` in a chat: `/relay` is listed.
9. **Tell the user what to do next.** Relay's settings are made in OpenCode Desktop's Relay panel, and an agent cannot click there:
   1. Open a chat, open the command palette (**Ctrl+K** on Windows and Linux) and run **Open Relay**.
   2. Under **Plan**, **Execute** and **Review**, press **+ Add a model** and pick models.
   3. Press **+ Choose a decider** and pick a decision model.
   4. Type `/relay on` in a chat, or use the Relay pill above the chat box.

To remove Relay, run `opencode plugin remove relay-opencode@<version>` (or delete its entry from `plugins`) and restart OpenCode. Relay's saved settings stay in OpenCode's storage and come back if it is added again.

## Update

- **Installed from npm:** remove the old version and add the new one, then quit and reopen OpenCode:

  ```sh
  opencode plugin remove relay-opencode@0.2.1
  opencode plugin add relay-opencode@0.2.2
  ```

  `plugin add` on its own adds a second entry next to the old one. By hand, change the version in the `plugins` entry instead.
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

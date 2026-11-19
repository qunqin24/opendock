# Relay

**Relay picks the model for each message in OpenCode.** You choose models for three kinds of work, Plan, Execute and Review, once. Then you type `/relay <message>`, or turn Relay on for a chat. A small decision model reads the message, picks the kind of work and the model that fits it, switches the chat to that model, and sends your message.

<table>
  <tr>
    <td valign="top"><img src="docs/images/relay-panel.png" width="360" alt="The Relay panel: Plan and Execute, each with two models, their effort, price, intelligence index and a use-it-for line"></td>
    <td valign="top"><img src="docs/images/model-table.png" width="360" alt="Adding a model: a searchable table of the models OpenCode offers, with price, context and intelligence index, sorted by index"><br><br><img src="docs/images/recent-choices.png" width="360" alt="Recent choices: each decision with its mode, model, how sure the decider was, and what the reply took"></td>
  </tr>
</table>

<sub>The Relay panel with example settings and example Recent choices. The models, prices and index numbers are what OpenCode and Relay listed on 18 Nov 2026.</sub>

> Relay is early. It is built for OpenCode 2.3.0. See [what has been tested](docs/status.md).

## Why use it

- **The right model for each message.** A strong model for planning, a cheap one for small edits, a careful one for reviews. Relay switches for you.
- **Your own words decide.** Give each model a "use it for" line, such as "small, quick edits". The decision model matches your message to those lines.
- **Checks run on your Review model.** When a model starts a helper to check work, the helper gets your Review model.
- **Your message is safe.** It is sent once and unchanged. If choosing fails, it still goes to the chat's current model. Relay never stores its text.
- **Decisions are quick.** With OpenCode's free decision model, a decision took about 0.13 seconds in testing, and OpenCode reported a cost of $0.

## Install

You need OpenCode 2.3.0, Desktop or the terminal app.

1. Open OpenCode's global config file, `~/.config/opencode/opencode.json`. On Windows it is `C:\Users\<you>\.config\opencode\opencode.json`. Create it if it does not exist.
2. Add Relay to `plugins`. Keep any plugins that are already in the list.

   ```json
   {
     "plugins": ["relay-opencode"]
   }
   ```

3. Restart OpenCode. The first start downloads Relay from npm, so it can take a minute or two.
4. Type `/` in a chat. `/relay` should be in the list.

To build Relay from source instead, see [Install from source](docs/guide.md#install-from-source).

## Set up (once, in Desktop)

1. Open a chat, press **Ctrl+K** and run **Open Relay**. The Relay panel opens beside the chat.
2. Under **Plan**, **Execute** and **Review**, press **+ Add a model** and pick models from the table. When a mode has more than one model, give each a short "use it for" line.
3. Press **+ Choose a decider** and pick a decision model. `opencode/jev-1.13-free` is free.
4. Type a sample message in the test box and press **Try** to see what Relay would pick.

The settings are shared by all your projects. The terminal app has no settings screen, so set them up in Desktop. The [guide](docs/guide.md#set-up) explains each setting.

## Use

| You type | What happens |
|---|---|
| `/relay <message>` | Relay picks the mode and the model for this one message, switches the chat, and sends it. |
| `/relay on` | Every message you send in this chat goes through Relay, without typing `/relay`. |
| `/relay off` | This chat goes back to normal. |

- **The Relay pill** above the chat box in Desktop shows whether Relay is on for that chat. Click it to turn Relay on or off.
- **Plan and Review** use OpenCode's `plan` agent, which is meant for reading and planning. Only **Execute** uses `build`, which can change files.
- **When the decider is not sure** (under 60%), `/relay` uses Plan. With `/relay on`, the chat stays as it is.

## Learn more

- [Guide](docs/guide.md): each setting, the pill, Recent choices, and what to do if **Open Relay** is missing.
- [When Relay saves money](docs/saving-money.md): a switch to another model has a price, and Relay moves a chat only when it pays.
- [What leaves your machine](docs/privacy.md)
- [Prices and the intelligence index](docs/data-sources.md): where the numbers come from.
- [What has been tested, and known limits](docs/status.md)
- [Contributing](CONTRIBUTING.md) · [Change log](docs/implementation-progress.md) · [Findings on real OpenCode](docs/compatibility.md)

## License

[MIT](LICENSE)

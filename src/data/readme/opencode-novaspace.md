# novaSpace

**Custom cards for the OpenCode sidebar, on every machine.**

[![npm](https://img.shields.io/npm/v/opencode-novaspace?color=0f766e&label=npm)](https://www.npmjs.com/package/opencode-novaspace)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/brnbtt/opencode-novaspace/blob/main/LICENSE)

novaSpace replaces OpenCode's terminal sidebar with a session header and cards
you write yourself. A card is a small JavaScript module in one folder. novaSpace
loads it, gives it a look that matches your theme, lets you arrange it, and can
sync your cards and their layout to your other machines through a private
GitHub repository.

```text
┃                                    
┃  Add --days flag with reviewer     
┃  edge-case check                   
┃                                    
┃   ⠋ working                 $2.36  
┃  claude-opus-5.5 · high            
┃                                    
┃  ━━━━━━━━━━━━━━━━━━━━──────────  36%
┃  380k of 1.05M tokens              
┃  weather-cli                main   
┃                                    

┃                                    
┃  ● Working Set              Zed ↗  
┃  weather-cli                       
┃  ~/projects                        
┃                                    
┃  on main              3 changed    
┃                                    

 @octo-dev                  ● synced
```

Every tile looks like OpenCode's own prompt box: a flat raised surface with a
thin coloured edge. The colours come from your theme, so the sidebar looks
right in light and dark themes, and each card gets its own colour from the
theme's palette without any work.

## Why novaSpace

- **A useful header.** The session's title, whether it's working or needs
  you, the model, how full the context is, what it has cost, and the folder and
  branch, without anything cut off.
- **Your own cards.** Drop a folder with an `index.js` into the cards folder
  and it appears in the sidebar. Delete the folder and the card goes away.
- **They look good with little work.** Give a card a title and use the built-in
  pieces (items, stats, chips, meters) and it matches the rest of the sidebar.
- **The same sidebar on every machine.** Sign in with the GitHub CLI and
  connect a private repository. Your cards and their arrangement follow you.
- **Arrange it your way.** Drag a card by its title to reorder it or pin it to
  the bottom. The scrollbar appears only when the cards don't fit.

## Installation

```sh
opencode plugin add opencode-novaspace
```

Then **quit and reopen OpenCode**. The sidebar is only replaced when OpenCode
starts, so reloading isn't enough. You need OpenCode 2.0.12 or later.

### Without access to npm

On a machine that can't reach the npm registry, install from a local folder:

1. Download `opencode-novaspace-<version>.tgz` from the
   [GitHub releases](https://github.com/brnbtt/opencode-novaspace/releases),
   or run `npm pack opencode-novaspace` on a machine that can reach npm.
2. Extract it. The archive contains a `package/` folder; move that folder to
   `~/.local/share/opencode-novaspace`.
3. Create a small loader in OpenCode's plugins folder,
   `~/.config/opencode/plugins/novaspace/`, with two files:

   ```json title="~/.config/opencode/plugins/novaspace/package.json"
   { "name": "novaspace-local", "private": true, "type": "module", "exports": { "./tui": "./tui.js" } }
   ```

   ```js title="~/.config/opencode/plugins/novaspace/tui.js"
   export { default } from "../../../../.local/share/opencode-novaspace/dist/tui.js"
   ```

OpenCode loads plugins from that folder automatically, on every platform and
version. Remove any `opencode-novaspace` entry from `cli.json` so novaSpace
isn't loaded twice. To update, replace the contents of
`~/.local/share/opencode-novaspace` with a newer release and restart OpenCode.

## The sidebar

- **Session header** at the top replaces OpenCode's title row. It shows the
  title, a status chip (`⠋ working`, `▲ needs you` when a permission is waiting,
  or `● idle`), the cost, the model, a context meter that turns amber at 80%
  and red at 90%, the tokens used, and the folder with its branch.
- **Your cards** fill the middle, which scrolls when they don't fit. Cards
  pinned to the bottom become pages you switch with the dots underneath.
- **The account line** at the very bottom shows your GitHub username and sync
  status. Click it to open the cards folder, set up sync, and install updates.

## Custom cards

Cards live in one folder:

```text
~/.config/opencode/novaspace/
├── cards/
│   ├── subagents/
│   │   └── index.js        → custom:subagents
│   ├── working-set/
│   │   ├── index.js        → custom:working-set
│   │   └── git.js
│   └── shared.js           (a helper; not a card)
└── layout.json             (the sidebar arrangement)
```

Every folder in `cards/` that contains an `index.js` is a card. Its ID is
`custom:` followed by the folder name, which must use lowercase letters, digits
and dashes. Other files are helpers that cards can import. Open the folder from
the account line: **Cards → Open folder**.

`index.js` default-exports the card's title and a `render` function. The
smallest good-looking card gives `chrome.Card` a title and fills it with the
built-in pieces:

```jsx title="~/.config/opencode/novaspace/cards/deploys/index.jsx (before compiling)"
export default {
  apiVersion: 1,
  title: "Deploys",
  render: ({ chrome, ctx, drag }) => (
    <chrome.Card theme={ctx.theme} drag={drag} title="Deploys" meta="3 today">
      <chrome.Item theme={ctx.theme} icon="✓" tone="success" title="api · production" detail="2m" />
      <chrome.Item theme={ctx.theme} icon="◌" tone="info" title="web · staging" detail="now" />
      <chrome.Stat theme={ctx.theme} label="Success rate" value="98%" />
    </chrome.Card>
  ),
}
```

`render` gets `ctx` (the OpenCode plugin context, including `ctx.data` and
`ctx.theme`), `sessionID`, `options`, `pin`, `drag` and `dragging`, plus
`chrome`. Pass `drag` to `Card` so the card can be moved.

| Chrome | Use |
| --- | --- |
| `Card` | The tile. With `title` (and optional `icon` and `meta`) it draws its own header. `onPress` makes it clickable; `accent` overrides its colour. |
| `CardTitle` | The header's dot and bold title, for when you build the header yourself in a `cardHeader` row. With `drag`, the title is the drag handle. |
| `Item` | A list row: a toned glyph, text that truncates, and muted detail on the right. |
| `Stat` | A label and its value on one row. |
| `Pill` | A small chip, neutral or in a tone (`accent`, `info`, `success`, `warning`, `error`). |
| `Meter` | A one-row bar for usage or progress; `value` is 0 to 1. It uses the card's colour and turns amber at 80% and red at 90% unless you pass a `tone`. |
| `Empty` | The quiet line for a card with nothing to show yet. |
| `CardAction` | A small clickable label, for header actions. |
| `cardHeader`, `metricRow` | Box layouts for a header row and a label/value row. |

Write the card with OpenTUI Solid JSX, then **compile it to JavaScript**. The
compiled file must import `@opentui/solid` and `solid-js` directly, so it uses
the same runtime as OpenCode. Compile with `babel-preset-solid` using
`{ moduleName: "@opentui/solid", generate: "universal" }`, and don't bundle
those packages into the file.

New cards load within a few seconds, without a restart. When you change a card
that's already loaded, novaSpace tells you to restart OpenCode to load the new
version. If a card can't be loaded, novaSpace skips it and shows a message. The
rest of the sidebar still works.

## Sync your cards

Sync copies the novaSpace folder (your cards and `layout.json`) between
machines through a **private** GitHub repository that you own.

1. Install and sign in to the [GitHub CLI](https://cli.github.com/) with
   `gh auth login`. The account line then shows your username.
2. Click the account line. Under **Sync**, keep the suggested
   `<you>/novaspace-cards` or edit it.
3. Choose **Create & sync** for a new repository or **Use existing**.

That's it. novaSpace runs the first sync, then syncs every minute while
OpenCode is open. On another machine, install novaSpace and connect the same
repository.

- **Layout:** card order, pins and hidden cards merge setting by setting. When
  both machines changed the same setting, the machine that syncs keeps its own.
  The bottom page you're looking at stays per machine.
- **Conflicts:** when the same card file changed on both machines, sync pauses
  and the account line shows **▲ conflict**. Click it and choose which
  version to keep. Replaced local files are backed up, and the repository's
  history keeps old versions.
- **What stays local:** files that look like they contain credentials, linked
  (symlinked) files and files over 500 KB. A card with any such file stays on
  this machine as a whole, so another machine never gets half a card. Read
  secrets from the environment at runtime instead.

> [!NOTE]
> Cards are stored unencrypted in `.novaspace/cards.json` in your repository.
> Keep the repository private.

For the details, see [How card sync works](https://github.com/brnbtt/opencode-novaspace/blob/main/docs/sync.md).

## Arrange your cards

Grab a card by its title and drag it. A line shows where it will land. Drop it at the bottom to pin it there. Several bottom cards
become pages that you switch with the dots underneath. Press **Esc** to cancel.

## Configuration

novaSpace works without any configuration. To change the initial layout or the
look, add an entry to `cli.json`:

```jsonc title="~/.config/opencode/cli.json"
{
  "plugins": [
    {
      "package": "opencode-novaspace",
      "options": {
        "cards": ["custom:working-set", "custom:subagents"],
        "pins": { "custom:subagents": "bottom" }
      }
    }
  ]
}
```

> [!IMPORTANT]
> Put novaSpace options in **`cli.json`**, not `opencode.json`. OpenCode doesn't
> pass `opencode.json` options to the sidebar. Keep `opencode-novaspace` in the
> `plugins` list of `opencode.json`, which is what `opencode plugin add` does.

| Option | Default | Description |
| --- | --- | --- |
| `cards` | `[]` | Cards to show first, in order. Cards not listed join at the end. |
| `hidden` | `[]` | Cards to hide. |
| `pins` | `{}` | Set `"top"`, `"bottom"` or `false` for each card. |
| `surfaceStrength` | `1` | How strongly tiles stand out, from `0` (flat) to `1` (the theme's raised surface). |
| `hoverStrength` | `1` | How far a tile lifts under the pointer, from `0` (no hover) to `1`. |
| `hoverDuration` | `120` | Hover animation length in milliseconds. |
| `gap` | `1` | Blank rows between cards. |

These options set the initial layout. Once you drag cards around, the saved
`layout.json` is used instead.

## Troubleshooting

- **The sidebar hasn't changed.** Quit OpenCode completely and start it again.
- **A card doesn't appear.** Check that it's a folder directly in `cards/`, that
  the folder name uses only lowercase letters, digits and dashes, and that it
  contains a compiled `index.js`.
- **My `customCards` cards disappeared after updating.** From 0.5.0, novaSpace
  loads cards only from its cards folder. Copy each card's files into
  `~/.config/opencode/novaspace/cards/<name>/` and remove `customCards` from
  `cli.json`.
- **Sync shows ‖ paused.** Sync uses the GitHub account that was signed in when
  you connected. Run `gh auth status`, then switch back or reconnect.
- **Sync shows ▲ conflict.** Click the account line and choose a version.
- **I used profile sync before 0.5.0.** novaSpace no longer syncs skills,
  instructions or settings. Your old repository and its `.novaspace/profile.json`
  are left untouched. Connect a repository again to sync cards.

Found a bug or have an idea? [Open an issue](https://github.com/brnbtt/opencode-novaspace/issues).

## Development

Interested in contributing? See
[CONTRIBUTING.md](https://github.com/brnbtt/opencode-novaspace/blob/main/CONTRIBUTING.md).

novaSpace is an independent community project. It isn't affiliated with or
endorsed by Microsoft or the OpenCode project.

## License

MIT © Bruno Bett. See [LICENSE](https://github.com/brnbtt/opencode-novaspace/blob/main/LICENSE).

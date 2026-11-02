# opencode-rive-sidebar

Live [Rive](https://rive.app) preview in an [OpenCode Desktop](https://opencode.ai) side panel.

The panel finds the Rive project of the current session, builds it with the Rive CLI, and plays it with Rive's WebGL2
runtime. Each save rebuilds it and updates the preview. Pointer listeners and state machines respond as they do in the
scene.

## Requirements

- OpenCode Desktop 2.2.5 or newer. The desktop plugin API is experimental and may change between releases.
- The [Rive CLI](https://rive.app), installed in `~/.rive/bin` or on your `PATH`.

## Install

```sh
opencode plugin add opencode-rive-sidebar
```

Or add it to your global config, `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "plugins": ["opencode-rive-sidebar"],
}
```

Install from npm rather than a Git URL. `opencode plugin add` with a Git URL fails with `git dep preparation failed`.

## Use

Open a session in a directory with a `rive.yaml`, then do one of these:

- Run **Toggle Rive preview** from the command palette.
- Type `/rive` in the composer.
- Choose **Rive preview** from the side panel's **+** menu.

The panel looks for `rive.yaml` in the session's directory, then its ancestors, then two levels below it. If it finds
none, or the wrong one, use **Choose project…**.

The options menu sets the fit, and the artboard and state machine when the file has more than one. The fit is shared by
all projects. The toolbar restarts the scene or rebuilds the project.

If a save fails to compile, the panel lists the errors and keeps the last good build on screen.

The plugin builds with `rive <project> --once`, which writes to the project's output directory (`build/` by default),
as `rive .` does.

## Scripts and shaders

The panel uses a web runtime, and web runtimes won't run unsigned scripts or shaders. Local builds are unsigned, so a
project with `.luau`, `.as`, or `.wgsl` sources shows a note with two ways forward:

- **Sign builds** rebuilds with `--publish=local`. This needs `rive login`, and it uploads the project's scripts and
  shaders to Rive's compile service on every rebuild. It stays on until you choose **Stop signing builds** or the
  project's panels close.
- **Open native preview** starts `rive <project>` in its own window, which runs unsigned scripts. It's also in the
  options menu for any project.

## Differences from `rive .`

- The panel defaults to the **Contain** fit, which suits a narrow sidebar. `rive .` defaults to **Layout**.
- It starts the artboard's first state machine, not the artboard's default one, because the web runtime doesn't expose
  which one that is. Pick another from the options menu.
- The web runtime can render differently from the native one that `rive .` uses.

## Options

```jsonc
{
  "plugins": [
    {
      "package": "opencode-rive-sidebar",
      "options": { "rive": "/path/to/rive" },
    },
  ],
}
```

- `rive` is the path to the Rive CLI, for when it's in neither `~/.rive/bin` nor the app's `PATH`.

## Develop

```sh
git clone https://github.com/jhsu/opencode-rive-sidebar.git
cd opencode-rive-sidebar
pnpm install
pnpm dev        # vite build --watch; each rebuild reloads the plugin in the app
pnpm typecheck
pnpm test
```

To load your checkout, put its path in `plugins` in your global config, for example
`"plugins": ["/path/to/opencode-rive-sidebar"]`.

Add a changeset with each change, with `pnpm changeset`. Merging to `main` opens a version PR, and merging that PR
publishes to npm. The workflow needs an `NPM_TOKEN` repository secret.

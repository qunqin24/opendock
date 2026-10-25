# opencode-tetris-battle

Multiplayer Tetris Battle for the OpenCode 2 TUI. Version 1.x targets OpenCode 1.x.

Play side-by-side terminal Tetris with live opponent boards, garbage attacks, private room codes, and quick matchmaking. The game uses a hosted Convex backend for rooms, reactive board sync, attacks, and match results.

## Install

```sh
opencode plugin add opencode-tetris-battle@latest
```

Restart OpenCode, then run:

```text
/tetris-battle
```

## Upgrade

```sh
opencode plugin update opencode-tetris-battle
```

Restart your OpenCode TUI session afterwards.

## Play

### Matchmaking

1. Open `/tetris-battle` in two OpenCode windows.
2. Press `M` in both windows.
3. Press `R` in both windows when paired.

### Private room

1. Host presses `N` to create a numeric room code.
2. Guest presses `J`, types the room code, then presses Enter.
3. Both players press `R` to ready.

## Controls

Splash:

- Any key enters the lobby.
- `Q` closes the dialog.

Lobby:

- `N` creates a private room.
- `J` enters room-code typing mode (4 numeric digits).
- `Enter` joins the typed room code.
- `M` starts matchmaking.
- `R` toggles ready.
- `Q` opens the quit confirm; press `Q` again to confirm or `Esc` to cancel.

Room (waiting / countdown):

- `R` toggles ready.
- `L` opens the leave-to-lobby confirm; press `L` again to confirm or `Esc` to cancel.
- `Q` opens the quit confirm.

Game:

- `←` / `A` moves left.
- `→` / `D` moves right.
- `↑` / `W` rotates.
- `↓` / `S` soft drops.
- `Space` hard drops.
- `C` holds.
- `P` pauses.
- `L` returns to the lobby (double-press to confirm).
- `Q` quits (double-press to confirm).

Pause:

- `P` resumes — only `P`, `L`, and `Q` do anything while paused; other keys are ignored.
- `L` opens the leave-to-lobby confirm.
- `Q` opens the quit confirm.

Match over:

- `R` rematches in the same room.
- `L` returns to the lobby.
- `Q` quits.

## Hosted backend

The plugin works out of the box with the public hosted Tetris Battle backend.

## Development

```sh
bun install
bun run typecheck
bun run test
bun run build
bunx convex dev --once --typecheck=disable
```

To load a local checkout, build it and add the checkout directory to `plugins` in `~/.config/opencode/cli.json`.

## License

MIT

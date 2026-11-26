# opencode-tmux-status

Status indicators for OpenCode sessions running within tmux. Shows whether a session is working, waiting for input, or done in the tmux window list.

## Setup

Requires OpenCode V2, tmux, and a Nerd Font with Material Design icons.

1. **Install the plugin**

   Add the package to `plugins` in `~/.config/opencode/cli.json`, keeping any existing entries:

   ```json
   {
     "plugins": ["@ardnep/opencode-tmux-status"]
   }
   ```

   OpenCode installs and loads the package. The plugin only runs inside tmux.

   For local development, clone the repo into `~/.config/opencode/plugins/tmux-status` instead. Use one method, not both.

2. **Configure the tmux status bar**

   For Catppuccin, add these lines to your tmux config before the theme loads:

   ```tmux
   set -g @opencode_unseen '#{&&:#{!=:#{@opencode_attention},},#{e|<=:#{@tab_last_visit},#{@opencode_attention}}}'
   set -g @catppuccin_window_number '#{?@opencode_status,#[push-default]#[fg=#{?#{E:@opencode_unseen},#{E:@thm_red},default}]#{@opencode_status}#[default]#[pop-default],}'
   set -g @catppuccin_window_current_number '#{?@opencode_status,#[push-default]#[fg=#{?#{E:@opencode_unseen},#{E:@thm_red},default}]#{@opencode_status}#[default]#[pop-default],}'

   # Skip these if your config already has these visit-counter hooks.
   if-shell -F '#{==:#{@tab_visit_counter},}' 'set -g @tab_visit_counter 0'
   set-hook -g session-window-changed[90] 'set -gF @tab_visit_counter "#{e|+:#{@tab_visit_counter},1}" ; set -wF @tab_last_visit "#{@tab_visit_counter}"'
   set-hook -g client-session-changed[90] 'set -gF @tab_visit_counter "#{e|+:#{@tab_visit_counter},1}" ; set -wF @tab_last_visit "#{@tab_visit_counter}"'
   ```

   This replaces the window number with the status icon. A terminal icon is shown when no status is set.

   For other themes, use the same `#{?...}` expression in the window status format. It reads the pane-level tmux option `@opencode_status`.

3. **Reload the tmux config**

   For a config at `~/.config/tmux/tmux.conf`:

   ```sh
   tmux source-file ~/.config/tmux/tmux.conf
   ```

   Use your config's path if it differs.

## Supported icons

- Working (animated hourglass)
- Waiting for input or permission (question mark)
- Retrying (circular arrow)
- Done (circle)
- Failed (cross)
- Stopped (pause)

The indicator clears when OpenCode is idle or on its home screen.

Completion, questions/permissions, failures and interruptions turn only the
glyph red (using the tmux theme's `@thm_red`, not ANSI red) when they happen in a
background tab. Visiting that tab restores its
normal theme colour (black with the usual Catppuccin setup). Switching away
doesn't turn it red again; a new attention state does. Updates in the currently
viewed tab are already acknowledged. Tab names and backgrounds are unchanged.

## Preview and tests

Run the preview from the repo folder inside tmux. It requires Node.js and doesn't start an agent:

```sh
node preview.js working
```

Other preview states: `input`, `retry`, `done`, `failed`, `stopped`, and `idle`.

Press Ctrl+C to stop the preview, then clear the icon:

```sh
tmux set-option -pu @opencode_status
```

Use the same command to clear a stale icon after a forced exit. The plugin clears it automatically on normal cleanup.

To run the tests:

```sh
npm test
```

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).

# opencode-pwd-title

opencode plugin to set the title to current directory and git branch, similar to the format that opencode uses in the footer. 

Example: `~/path/to/repo:main` (path to repo, relative to home directory, followed by git branch if in a git repo)

This plugin *tries* to set the title as often as possible to keep it up-to-date. Sometimes (like when opening opencode or immediately after switching sessions) the title will not be set by this plugin but after you send a prompt, the title will be updated. 

## Installation

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["@levibostian/opencode-pwd-title"]
}
```

# Why? 

I don't like how opencode changes the title of the tabs in my terminal, making it hard to differentiate between different tabs working on different Git workspaces. I want a plugin that restores the title back to what it would be if opencode were not running. The goal - set a simple title and enforce it as much as possible.
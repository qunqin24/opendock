# multi-devin

Several Devin accounts behind one `devin` provider, for Magpie and OpenCode.
Each account is added from a private browser window, so the Devin account
your normal browser is signed in to never gets in the way.

多个 Devin 账号共用一个 `devin` 渠道。每次添加账号都在浏览器无痕窗口里登录，
不会被日常浏览器里已登录的 Devin 账号顶替；Magpie 里不用填邮箱和密码。

## Install

```sh
magpie plugin add github:sonder-albert/multi-devin
```

Once the package is on npm and listed in Magpie's market, `magpie plugin add
multi-devin` or the Plugins tab does the same.

This plugin and `@magpie-community/opencode-devin-auth` both sign in to the
`devin` provider, and Magpie serves it from one of them. If the other one was
added later, it serves `devin` and this plugin's sign-in methods don't show
(`magpie plugin` says which one serves it). Either remove the other one or
hand the provider over:

```sh
magpie plugin rm @magpie-community/opencode-devin-auth
# or keep both
magpie plugin use multi-devin devin
```

The accounts already signed in are kept either way.

## Add an account

In Magpie, open the Devin provider and choose **Devin (browser, incognito)**.

1. A private window of your browser opens on Devin's sign-in page.
2. Sign in. The browser's saved passwords autofill as usual.
3. The window says "You're signed in" and the account appears in Magpie.
4. Close the private window, then repeat for the next account.

Close the window between accounts: private windows that are open at the same
time share one session, so a window left open still carries the previous
account.

Google Chrome, Chromium and Microsoft Edge are found on their own, in that
order. Set `MAGPIE_DEVIN_BROWSER` to another Chromium-based browser's path to
use it instead. Autofill comes from the browser's own password manager; the
macOS Passwords app is not available to Chrome.

Two more methods are there for the cases a browser can't cover:

- **Devin CLI's sign-in** takes the account `devin auth login` signed in to.
- **Devin session token** takes a pasted `devin-session-token$…`, for example
  one copied from another machine.

## How it differs from the Devin plugin already listed

`@magpie-community/opencode-devin-auth` is the listed plugin for this channel.
multi-devin uses its request translation unchanged and differs in sign-in:

| | opencode-devin-auth | multi-devin |
|---|---|---|
| Browser sign-in | your default browser, with the session it already has | a private window the plugin opens itself |
| When the browser is already signed in to Devin | that account is signed in again | the private window starts signed out, so another account can be added |
| Sign-in time limit | 10 minutes | 30 minutes |
| Session token method | no | yes |

What they share: the `devin` provider id, the model ids (`devin/swe-2` and the
rest), the endpoint, and each account's own Devin quota. Adding an account to
both does not give it more quota.

## Routing

Each sign-in is kept as its own account, labelled with its email and
organization. Magpie uses the accounts in order and moves to the next one
when the one in front is out of quota or fails with a retryable error. Keep
only accounts that are entitled to the model being routed.

For Codex:

```toml
model = "devin/swe-2"
openai_base_url = "http://127.0.0.1:3425/backend-api/codex"
```

`curl -sS http://127.0.0.1:3425/v1/magpie/trace` shows which provider and
account served each request.

## Credentials

The plugin keeps no token in its source or defaults. Magpie stores the
credentials; the plugin never sees a password.

## License

MIT. The request translation comes from
`@magpie-community/opencode-devin-auth`.

# opencode-openwebui-authentik

Server plugin for [opencode](https://opencode.ai) v2 (tested against v2.1.2). It lets opencode
use an [Open WebUI](https://openwebui.com) instance that sits behind
[authentik](https://goauthentik.io) forward auth. You log in with your authentik account, so
you don't need an Open WebUI API key.

- A provider opts in with `"openwebuiAuthentik": true` in its `settings`, whatever its name.
  You can mark several providers, one per Open WebUI instance.
- It needs no other settings. Open WebUI is the provider's `settings.baseURL`, and the
  redirect that Open WebUI sends to logged-out clients gives both the authentik address
  and the client ID of the Open WebUI proxy provider. See [Options](#options) to pin them.
- `opencode auth login` runs the authentik device-code login against a public OAuth2 client.
- The plugin exchanges that login for an authentik token of the Open WebUI proxy provider.
  The exchange runs the Open WebUI application's access policies. The plugin then signs in
  to Open WebUI to get a session token for your email.
- Each model request sends `Authorization: Bearer <authentik token>` and
  `X-Open-WebUI-Token: <Open WebUI token>`.
- The plugin keeps each managed provider's model list in sync with what Open WebUI serves
  you: right after login and every 5 minutes. Models from `/api/models` that aren't in your
  config are added; configured models that Open WebUI no longer serves are removed. Models
  you configure keep your settings (name, limits), so list a model only to override them.
- A model's effort levels (opencode variants) come from its Open WebUI model control: the
  one keyed `thinking`, or the model's only control. Each option becomes a variant, such as
  `opencode run -m home-ai/deepseek-v4.1-flash#max`, and Open WebUI applies the params the
  admin set for it. These variants replace any variants from your config or opencode's
  catalog. Models without a control keep their own variants. Non-admin users need the
  `chat.controls` and `chat.params` permissions; otherwise Open WebUI ignores the choice and
  uses the default.
- Tokens refresh automatically. If authentik rejects a request, the plugin asks authentik
  whether the token is still valid. Only a dead token marks the login as needing a new
  sign-in; a passing glitch is retried once and clears itself.

## Server setup

The plugin expects this on the authentik and Open WebUI side:

- **CLI provider**: a public OAuth2 provider for the plugin, client ID `open-webui-cli`
  unless you set `cliClientID`, with the `device_code` and `refresh_token` grants and the
  `openid email profile offline_access` scopes. Use an authorization flow with explicit consent that is not
  remembered: remembered consent lets anyone who tricks a user into opening a device link
  log in silently.
- **Open WebUI proxy provider**: the forward-auth proxy provider of the Open WebUI
  application. List the CLI provider under its JWT federation providers, so that a CLI
  access token can be swapped for a proxy token (`client_credentials` grant with a JWT
  assertion and the `ak_proxy` scope). Bind the users or groups allowed to use Open WebUI to
  this application.
- **Reverse proxy in front of Open WebUI**: it checks every request against the authentik
  outpost and passes the user's email on as Open WebUI's trusted email header
  (`WEBUI_AUTH_TRUSTED_EMAIL_HEADER`). It also turns `X-Open-WebUI-Token` into the
  `Authorization` header that Open WebUI sees. With nginx:

  ```nginx
  # only JWT-shaped Open WebUI tokens, never sk- keys
  map $http_x_open_webui_token $owui_authorization {
      "" $http_authorization;
      "~^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$" "Bearer $http_x_open_webui_token";
      default "Bearer invalid";
  }

  location / {
      auth_request /_authentik;
      auth_request_set $ak_email $upstream_http_x_authentik_email;
      proxy_set_header X-authentik-email $ak_email;
      proxy_set_header Authorization $owui_authorization;
      proxy_set_header X-Open-WebUI-Token "";
      proxy_pass http://open-webui;
  }
  ```

  Don't forward `X-Open-WebUI-Token` to the outpost in the `/_authentik` subrequest.

## Install

1. Install the plugin from npm. This adds it to `plugins` in your global opencode config:

   ```sh
   opencode plugin add opencode-openwebui-authentik
   ```

2. In `~/.config/opencode/opencode.jsonc`, mark each Open WebUI provider with
   `"openwebuiAuthentik": true` in its `settings`, and remove `settings.apiKey` from it.

   ```jsonc
   {
     "plugins": ["opencode-openwebui-authentik"],
     "providers": {
       "home-ai": {
         "package": "@opencode/ai/providers/openai-compatible",
         "settings": { "baseURL": "https://openwebui.example.com/api", "openwebuiAuthentik": true },
         "models": {}
       }
     }
   }
   ```

   The marker stays inside opencode: it isn't sent with model requests. Providers without it
   are left alone.
3. Check that it loaded: `opencode plugin list` should show `openwebui-authentik`.

To upgrade later, run `opencode plugin update opencode-openwebui-authentik`.

### Manual install

1. Clone this repo somewhere stable.
2. In `~/.config/opencode/opencode.jsonc`, add the clone's directory to `plugins` and mark
   your providers as in step 2 above. The plugin path must be the directory, not `index.js`;
   opencode ignores file paths here.

   ```jsonc
   {
     "plugins": ["/home/<you>/code/opencode-openwebui-authentik"]
   }
   ```

   Don't also copy the directory into `~/.config/opencode/plugins/`: that folder is loaded
   automatically, so opencode would find the plugin twice and report the second copy as a
   duplicate plugin ID.
3. Check that it loaded: `opencode plugin list` should show `openwebui-authentik`.
4. To upgrade, `git pull` in the clone.

## Options

All options are optional. Set them on the provider marker, as an object instead of `true`,
for that provider only:

```jsonc
"settings": {
  "baseURL": "https://openwebui.example.com/api",
  "openwebuiAuthentik": { "authentikURL": "https://authentik.example.com" }
}
```

or in the plugin entry `{ "package": "opencode-openwebui-authentik", "options": { ... } }`
for every marked provider. A marker's settings win over the plugin options.

- `authentikURL`: the authentik address. Discovered from Open WebUI's redirect when unset;
  when set, the plugin refuses a redirect anywhere else. Set it to keep a compromised Open
  WebUI host from sending you to a fake authentik login.
- `proxyClientID`: the client ID of the Open WebUI proxy provider, discovered when unset.
  With both `authentikURL` and `proxyClientID` set, the plugin skips the discovery request.
- `cliClientID`: the client ID of the CLI provider, default `open-webui-cli`.
- `modelsRefreshMinutes` (plugin options only): how often to re-sync models, default `5`.
  `0` turns the sync off and leaves the configured models alone.

Changing a provider's marker or `baseURL` takes effect without a restart.

## Log in

```sh
opencode auth login home-ai --method authentik
```

Use the provider ID of each marked provider.

Open the URL it prints. authentik shows a consent screen; approve it only if you started this
login yourself. The code is in the browser's address bar, not on the page. `opencode auth
list` should then list your email under the provider.

Never approve a device login from a link someone sent you. That gives them your Open WebUI
access.

## Log out

```sh
opencode auth logout home-ai
```

This deletes the stored credential on this machine. The authentik refresh token stays valid
until it expires or an admin revokes it in authentik.

## Errors

- `Set settings.baseURL on the <id> provider`: the provider is marked but has no valid
  `baseURL`, so the plugin can't tell where Open WebUI is.
- `No authentik login is active for <id>`: run the login command for that provider.
- `authentik rejected the Open WebUI credential`: an admin revoked your Open WebUI token, or it
  expired. Log in again.
- `authentik could not verify the Open WebUI credential`: authentik rejected the request but
  still reports the token as valid, usually because authentik was briefly unreachable. The
  plugin retries once; otherwise try again shortly.
- `Could not find the Open WebUI authentik client`: Open WebUI did not redirect to an
  authentik authorize URL, redirected to a different `authentikURL` than the one you pinned,
  or redirected from HTTPS to plain HTTP. Check the provider's `baseURL`, or pin
  `authentikURL` and `proxyClientID`.
- `Could not get an Open WebUI token from authentik`: the token exchange failed. Usually this
  means the access policies deny you, or your email is missing or duplicated. The plugin
  keeps your login and retries after 30 seconds.

## Removing access

authentik runs the access policies only when it issues an Open WebUI token. A user who loses
access keeps it until their current proxy token expires, then gets the token exchange error
above. To cut someone off immediately, deactivate them in authentik, which deletes all their
tokens. To keep the account active instead, delete their OAuth access tokens for the Open
WebUI proxy provider and their refresh tokens for the CLI provider (Directory > Users > user >
Credentials / Tokens). Revoking sessions is not enough. The outpost can take up to a minute to
notice.

## Tests

`bun test` runs the plugin against mock authentik and Open WebUI servers.

## Known limitation

If authentik rejects the token (after an admin revokes it, or when authentik is briefly
unreachable), the forward auth redirects the request to authentik. opencode follows the
redirect and still sends the `X-Open-WebUI-Token` header, so that request leaks the Open WebUI
token to authentik. The plugin then drops that token and does not send it again.

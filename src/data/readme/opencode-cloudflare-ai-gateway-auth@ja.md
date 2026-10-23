# opencode-cloudflare-ai-gateway-auth

[English](https://github.com/4sh0u0/opencode-cloudflare-ai-gateway-auth/blob/main/README.md) | [简体中文](https://github.com/4sh0u0/opencode-cloudflare-ai-gateway-auth/blob/main/README.zh-CN.md) | 日本語

[OpenCode](https://opencode.ai) 用のプロバイダープラグインです。リクエストを [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) 経由で送信し、その料金は Cloudflare の Unified Billing ではなく、ゲートウェイに保存したプロバイダーキー（BYOK）で支払います。ゲートウェイから利用できるモデルの一覧も表示します。OpenCode 1.x に対応し、[magpie](https://usemagpie.ai) でも使えます。

> 本プロジェクトは Cloudflare とは無関係であり、Cloudflare による承認や推奨を受けたものではありません。

## OpenCode 内蔵の Cloudflare AI Gateway を使わない理由

OpenCode 1.x には `cloudflare-ai-gateway` プロバイダーが内蔵されています。OpenCode 1.18.35 時点での違いは次のとおりです。

| | 内蔵プロバイダー | このプラグイン |
|---|---|---|
| ゲートウェイに保存した Google・DeepSeek・xAI のキー | 使われません。この 3 社は Cloudflare の REST API を通り、Google は Vertex AI、DeepSeek は Fireworks に回されます | 使われます。ゲートウェイ経由で各社の本来のエンドポイントに送ります |
| キーが保存されていないプロバイダー | Unified Billing で課金されることがあります | 許可しない限り失敗します（`cf-aig-no-wholesale`） |
| モデル一覧 | models.dev にあるこのプロバイダーのカタログ | ゲートウェイにキーがあるプロバイダーのみ、各社自身の一覧から |
| BYOK キーのエイリアス | 非対応 | 対応 |

プラグインを入れると `cloudflare-ai-gateway` プロバイダーはプラグインが引き継ぎ、内蔵のものは使われなくなります。

## 必要なもの

- 認証を有効にし、**Provider Keys** にプロバイダーキーを保存した（BYOK）Cloudflare AI Gateway。**Require provider credentials**（`byok_only`）を有効にすることをおすすめします。
- **Account → AI Gateway → Run** と **Account → AI Gateway → Read** の権限を持つ Cloudflare API トークン。REST モードでのみ、**Workers AI → Read** も必要です。
- OpenCode 1.18.35 以降の 1.x。OpenCode 2.x はプラグインの読み込み方が異なるため非対応です。magpie 0.1.1110 以降でも使えます（[後述](#magpie-で使う)）。

## インストール

`opencode.json`（全体の設定は `~/.config/opencode/opencode.json`。プロジェクトごとの設定でも可）にプラグインを追加します。

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-cloudflare-ai-gateway-auth"]
}
```

OpenCode は次回の起動時に npm からインストールします。ローカルのコピーも使えます：`"plugin": ["file:///path/to/folder"]`。

## サインイン

```sh
opencode auth login
```

**Cloudflare AI Gateway** を選び、次の項目を入力します。

| 項目 | 入力する内容 |
|---|---|
| Cloudflare account ID | 16 進数 32 文字。ダッシュボードのアカウントホーム（Account home）で確認できます |
| AI Gateway ID | ゲートウェイの名前（例：`my-gateway`） |
| Upstream endpoint | **Native provider endpoints**（推奨）または **Cloudflare REST API** |
| BYOK key alias | ネイティブモードのみ。`default` キーを使う場合は空欄のままにします |
| API key | 上記の Cloudflare API トークン |

- TUI の `/connect` も同じ項目を尋ねますが、入力時のチェックはしません。入力を誤るとプロバイダーがモデル一覧に表示されず、`opencode models --print-logs` に原因が出ます。サインインし直してください。
- OpenCode の Web 版とデスクトップアプリはキーしか尋ねないため、この用途には足りません。ターミナルからサインインしてください。
- OpenCode はプロバイダーごとにサインインを 1 つだけ保存します。もう一度サインインすると置き換わります（トークンのローテーション、ゲートウェイやモードの切り替えなど）。
- このプロバイダーの `baseURL` はプラグインが管理します。設定で `cloudflare-ai-gateway` に指定した `baseURL` は置き換えられます。

## モデル

モデルは `<vendor>/<model>` という名前で、選ぶときは `cloudflare-ai-gateway/<vendor>/<model>` として指定します。たとえばネイティブモードでは `cloudflare-ai-gateway/anthropic/claude-sonnet-5-5`、REST モードでは `cloudflare-ai-gateway/anthropic/claude-sonnet-5.5` です。`opencode models cloudflare-ai-gateway` で一覧できます。

| ベンダー | プレフィックス | ネイティブモードの API | REST モードの API |
|---|---|---|---|
| OpenAI | `openai/` | Responses | Responses |
| Anthropic | `anthropic/` | Messages | Messages |
| Google AI Studio | `google/` | Chat Completions | — |
| DeepSeek | `deepseek/` | Chat Completions | — |
| xAI | `xai/` | Chat Completions | — |

REST モードで使えるのは OpenAI と Anthropic だけです。REST 経由の場合、Cloudflare は Google のモデルを Vertex AI 経由で、DeepSeek を Fireworks 経由で提供し、保存された xAI キーも使いません。そのため、ゲートウェイ内のキーはこの 3 社には使われません。また、REST は Cloudflare の[モデルカタログ](https://developers.cloudflare.com/ai/models/)にある ID しか受け付けないため、REST モードではこのカタログにある OpenAI と Anthropic のモデルだけを、カタログの ID で一覧表示します。これらの ID はベンダー自身の ID と異なる場合があります。マイナーバージョンを持つ Anthropic のモデル（`claude-sonnet-5-5` など）は、カタログでは `claude-sonnet-5.5` です。ネイティブモードでは各ベンダー自身の ID を使います。

一覧に表示されるのは、ゲートウェイにキーが保存されているベンダーだけです。ネイティブモードでは、各ベンダーの一覧をゲートウェイ経由でベンダー自身から取得し、失敗した場合は [models.dev](https://models.dev) から取得します。REST モードでは、Cloudflare のカタログページから一覧を取得し、ページを読み込めない場合は models.dev にあるカタログのコピーを使います。コンテキストウィンドウ、推論レベル、料金も models.dev から取得します。

## ネイティブモードと REST モード

- **ネイティブ（Native）** は、各ベンダー自身の API を `gateway.ai.cloudflare.com/v1/<account>/<gateway>/<provider>/…` に送ります。変換は一切行わないため、prompt caching、extended thinking、Responses API がそのままベンダーに届きます。REST が必要な場合を除き、こちらを使ってください。magpie では Claude Code や Codex もこちらを使います。
- **REST** は `cf-aig-gateway-id` を付けて `api.cloudflare.com/client/v4/accounts/<account>/ai/v1/…` に送ります。キーエイリアスは使えず、Cloudflare のカタログにある OpenAI と Anthropic のモデルだけを、カタログの ID で一覧表示します（前述のとおりです）。REST は Anthropic のシステムプロンプトを 1 つの文字列としてしか受け付けないため、プラグインが各部分を連結します。そのため、システムプロンプトにはプロンプトキャッシュが効きません。

## 課金の安全性

すべてのリクエストに `cf-aig-no-wholesale: true` が付くため、キーが保存されていないベンダーへのリクエストは、Unified Billing にフォールバックせずに失敗します。ネイティブエンドポイントでは 400 になることを実環境で確認済みです。REST モードでは、キーのないゲートウェイが 402（code 7007）を返し、課金はされませんでした。ただし、この確認ではアカウントに Unified Billing のクレジットがなかっただけという可能性を排除できないため、**Require provider credentials** は有効のままにしてください。その場合、REST は 403（code 2049）を返します。フォールバックを許可するには、プラグインにオプションを渡します。

```json
{
  "plugin": [["opencode-cloudflare-ai-gateway-auth", { "allowUnifiedBilling": true }]]
}
```

## トラブルシューティング

| 症状 | 意味 |
|---|---|
| モデル一覧が空、またはプロバイダーが表示されない | `opencode models --print-logs` を実行してください。プラグインが理由（トークンの拒否、無効なサインイン情報、キーの未保存）をログに出します。OpenCode のログは `~/.local/share/opencode/log/` にも保存されます |
| `Plugin requires opencode >=1.18.35 <2` | お使いの OpenCode が 1.18.35 より古いか、2.x です |
| モデルから 400（REST モードでは 402 または 403） | ゲートウェイのあなたのエイリアスに、そのベンダーのキーがありません（ネイティブモードでは code 2044）。400 は、プラグインがリクエストを送信する前に拒否した場合にも返ります。たとえば、未知のベンダープレフィックス、`<vendor>/<model>` 形式でないモデル ID、REST モードでの Google・DeepSeek・xAI です。どれに当たるかはメッセージに示されます |
| REST モードでモデルから 404 または 500 | Cloudflare のモデルカタログにその ID のモデルがありません（例：カタログの `claude-sonnet-5.5` ではなく、ベンダー自身の `claude-sonnet-5-5` を指定した）。一覧にあるモデルを選ぶか、ネイティブモードを使ってください |
| ベンダーから 401 が返る | ベンダーが、ゲートウェイに保存されたキーを拒否しました。エラーに Cloudflare のコード 2009（ネイティブモード）または 10000（REST モード）が含まれる場合は、API トークンが拒否されています。サインインし直してください |
| モデルが見つからない | そのベンダーのキーがゲートウェイにないか、チャットモデルではありません。REST モードでは、Cloudflare のカタログにないモデルも表示されません |

## magpie で使う

このプラグインは [magpie](https://usemagpie.ai) 0.1.1110 以降でも使えます。

```sh
magpie plugin add opencode-cloudflare-ai-gateway-auth
```

アプリでは **Plugins → Discover → Unofficial**（日本語 UI では「プラグイン → 発見 → 非公式 · GitHub」）からも見つけられます。GitHub から直接インストールする場合は `magpie plugin add github:4sh0u0/opencode-cloudflare-ai-gateway-auth` を実行してください。ローカルのコピーも使えます。`magpie plugin add /path/to/folder` を実行するか、**Plugins → Add a plugin**（日本語 UI では「プラグイン → プラグインを追加」）でフォルダーを指定してください。

```sh
magpie plugin login cloudflare-ai-gateway
```

項目は上と同じです。1 回のサインインは、1 つのゲートウェイ・キーエイリアス・モードの組み合わせに対応し、`<gateway>[/<alias>] · <account ID's first 8>[ · REST]` という名前になります（`<account ID's first 8>` はアカウント ID の先頭 8 文字です）。別の組み合わせを追加するには、もう一度サインインしてください。magpie はそれらの間で自動的にフェイルオーバーします。フェイルオーバーが機能するのは同じモードのサインイン同士だけです。ネイティブと REST ではモデルの名前が異なり、REST は OpenAI と Anthropic しか扱わないため、両者を組み合わせないでください。同じゲートウェイ・エイリアス・モードでもう一度サインインすると、そのサインインが置き換わります。トークンのローテーションなどに利用できます。サインイン情報は magpie の `plugin-auth.json`（パーミッション 600）に保存されます。Cloudflare がトークンを拒否すると、magpie はそのアカウントに印を付け、再サインインを求めます。

magpie で Unified Billing へのフォールバックを許可するには：

```sh
magpie plugin options opencode-cloudflare-ai-gateway-auth '{"allowUnifiedBilling": true}'
```

## 開発

```sh
bun test
bun --env-file=.env.local scripts/probe.mjs            # live checks, needs .env.local
scripts/opencode-sandbox.sh native anthropic/<model>   # OpenCode 1.x in a throwaway HOME
scripts/sandbox.sh native anthropic/<model>            # magpie in a throwaway HOME
```

## ライセンス

MIT

# reasoning-router

[English](README.md) | [简体中文](README_CN.md) | 日本語 | [한국어](README_KO.md)

[![CI](https://github.com/robertn702/reasoning-router/actions/workflows/ci.yml/badge.svg)](https://github.com/robertn702/reasoning-router/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40reasoning-router%2Fproxy?label=%40reasoning-router%2Fproxy)](https://www.npmjs.com/package/@reasoning-router/proxy)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**品質はそのままに、推論コストを抑えます。** `reasoning-router` は、コーディングセッションの各ステップにどれだけの推論が必要かを分類器に尋ねます。これにより、推論強度（エフォート）を手動で切り替えなくても、1 つの強力なモデルで素早い編集も難しいデバッグもこなせます。OpenCode、Pi、Codex CLI、そしてローカルプロキシと通信できる任意のクライアントで動作し、分類器は自由に選べます。

![推論強度ルーティングの例: 分類器が名前変更では推論強度を下げ、競合状態のデバッグでは高い推論強度を維持します。](assets/readme.gif)

GPT-6 Astra で実施した SWE-bench Verified の評価では、固定の推論強度 `high` が解決したタスクを、Jev でルーティングした推論強度はすべて解決しました。削減量はタスクの難しさによって変わります。短い Flask の修正では、Jev は出力トークンが **52% 少なく**（推論を含む）、完了までの時間は約半分でした。より難しい Django と pytest の issue では、出力の削減は 5〜7% にとどまり、時間の変化は 10% 未満でした。これらは選んだ少数のタスクの結果なので、想定される削減量ではなく例として見てください。
[評価を見る](eval/results/router-consolidated-2026-09-25.md)。

> **ステータス: alpha。** 以下のパッケージは、各パッケージの README の説明に従って npm からインストールしてください。

## クイックスタート

使用するハーネスを選んでください。各例では TypeSafe キーを使った Jev を使用しています。他の分類器については[分類器](#classifiers)を参照してください。

**OpenCode** — `opencode.json` にプラグインを追加します
（[詳細ガイド](packages/opencode/README_JA.md)）:

```jsonc
{
  "plugins": [{ "package": "@reasoning-router/opencode", "options": {
    "classifier": { "provider": "jev", "apiKey": "{env:REASONING_ROUTER_CLASSIFIER_API_KEY}" },
    "wrap": { "openai": ["openai/gpt-6-astra"] }
  }}],
  "model": "reasoning-router/gpt-6-astra"
}
```

**Pi** — Claude モデルのみ（[詳細ガイド](packages/pi/README_JA.md)）:

```bash
export REASONING_ROUTER_CLASSIFIER_API_KEY=<typesafe-key>
pi install npm:@reasoning-router/pi
pi --model reasoning-router/claude-opus-5-5
```

**Codex CLI、または Responses/Messages クライアント** — ローカルプロキシを起動し、クライアントの接続先を `http://127.0.0.1:4320/v1` に設定します（[詳細ガイド](packages/proxy/README_JA.md)）:

```bash
REASONING_ROUTER_CLASSIFIER_API_KEY=<typesafe-key> \
REASONING_ROUTER_UPSTREAM_BASE_URL=https://api.openai.com/v1 \
REASONING_ROUTER_UPSTREAM_AUTH=bearer \
REASONING_ROUTER_UPSTREAM_API_KEY=<openai-key> \
npx @reasoning-router/proxy
```

Codex では、モデルはそのままにプロバイダーだけを差し替えるプロファイルを `~/.codex/reasoning-router.config.toml` に追加し、`codex -p reasoning-router` を実行します（Codex 0.161.0 以降）。既定のモデルを変えるには `-m gpt-6-sol` などを追加します。通常の `codex` は変わりません。推論強度は分類器が選ぶため、Codex 自身の推論強度設定は無視されます。API キーの代わりに ChatGPT サブスクリプションを使うには、プロキシを CLIProxyAPI に連結します（[ガイド](packages/proxy/README_JA.md#chatgpt-subscription-through-cliproxyapi)）:

```toml
model = "gpt-6-astra"
model_provider = "reasoning-router"

[model_providers.reasoning-router]
name = "reasoning-router"
base_url = "http://127.0.0.1:4320/v1"
wire_api = "responses"
```

分類器が遅い場合や利用できない場合でも、リクエストはフォールバックの推論強度（デフォルトは `high`）で実行されます。

## 仕組み

プライマリリクエストごとに、ルーターは次の処理を行います。

1. 直近の会話の要約（長さに上限あり）を分類器に送信し、分類器が推論強度を選びます（たとえば、リネームなら `low`、失敗しているテストなら `high`）。
2. その推論強度を、OpenAI の `configuration_update` アイテム、または Anthropic の推論強度のみのシステムメッセージとしてリクエストに追加します。以前の更新はそのまま残るため、プロンプトのプレフィックスはキャッシュ可能な状態を保ちます。
3. リクエストをモデルのエンドポイントに送信し、レスポンスをそのままストリーミングで返します。

## 何がどこに送信されるか

- **分類器へ:** 直近のユーザーおよびアシスタントのテキストの抜粋（長さに上限あり）、最大 8 件の直近のツール結果（ツール名とエラーフラグ付き）、短い失敗の要約、およびモデル ID。ホスト型ツールとコンピューター操作のペイロードは送信されません。Laya、Kev、CLM、SGLang は自分のサーバー上で動作します。
- **お使いのエンドポイントへ:** 推論強度の更新を追加した完全なリクエスト。
- **ログに記録されるもの:** メタデータのみ（ID、モデル、推論強度、レイテンシ、トークン数）で、記録先もプロキシの stdout か、有効にした判断ログのみです。プロンプト、ツールの出力、認証情報、生のエラーが記録されることはありません。

詳細は [docs/behavior.md](docs/behavior.md) を参照してください。

## なぜ必要か

同じモデルでも、低い推論強度と最大の推論強度とでは、能力も価格も別々のモデルティアと同じくらい差が出ることがあります。

コーディングセッションの簡単なステップを安価なモデルに振り分けることもできますが、モデルを切り替えるとプロンプトキャッシュが無効になります。長いセッションでは、そのコンテキストを再構築するコストが、安価なモデルで節約できる分を上回ることがあります。

会話の途中で推論強度を変更できるモデルならキャッシュが保たれるため、セッション全体を 1 つの強力なモデルで通せます。単純な編集やツール呼び出しには低い推論強度を使い、高い推論強度や最大の推論強度はアーキテクチャの検討や難しいデバッグのために温存できます。`reasoning-router` は、各ステップの推論強度を選びます。

## alpha 版の制限事項

- **動作確認済み:** Node.js 24.x、OpenCode V2 2.0.18、Pi 1.0.4、Codex CLI 0.159.0 と 0.161.0（プロキシ経由）。他のバージョンでも動作する可能性はありますが、未検証です。
- **モデル:** [対応モデル](#supported-models)に記載のものだけです。それ以外のモデルはローカルで拒否されます。Pi がルーティングするのは Claude モデルのみです。
- **分類器:** ルーターは設定された分類器に問い合わせ、その回答を適用します。ご利用のワークロードに対して分類器がどれだけ適切に推論強度を選べるかについては、何も保証しません。
- **プロキシ:** 信頼できるローカル環境での使用に限ります。詳しくは[信頼モデル](packages/proxy/README_JA.md#trust-model)を参照してください。

脆弱性は [SECURITY.md](SECURITY.md) の手順に従って報告してください。

## 目的

`reasoning-router` は、エージェントセッションの各ステップにどれだけの推論が必要かを分類器に尋ね、その推論強度を、プロンプトキャッシュを壊すことなく送信するモデルリクエストに適用します。

- **任意の分類器。** [Jev](https://typesafe.ai/) は、あるステップにどれだけの推論が必要かを分類できる複数の判断モデルの 1 つであり、今後も追加が予定されています。どの分類器を使うかは依存関係ではなく設定です。`reasoning-router` は Jev や特定の単一プロバイダーに依存してはなりません。
- **任意のハーネス。** 同じルーティングが、OpenCode、Pi、またはスタンドアロンプロキシと通信できる任意のクライアント内で動作します。

パッケージは次のとおりです。

- [`@reasoning-router/core`](packages/core/README_JA.md): ハーネスにも分類器にも依存しない、共有のルーター。
- [`@reasoning-router/opencode`](packages/opencode/README_JA.md): OpenCode V2 プラグイン。
- [`@reasoning-router/classifiers`](packages/classifiers/README_JA.md): 分類器（Jev、Cloudflare Clef、Laya、Kev、OpenAI Decisions、CLM、Microsoft-Decision-1、Liquid d1、SGLang）。`classifier.provider` で選択します。
- [`@reasoning-router/pi`](packages/pi/README_JA.md): Pi 拡張機能（現時点では Claude モデルのみ）。
- [`@reasoning-router/proxy`](packages/proxy/README_JA.md): スタンドアロンの Responses/Messages プロキシ（コマンド `reasoning-router`）。

課題の整理、パッケージ計画、未解決の論点については [docs/architecture.md](docs/architecture.md) を、ルーターのワイヤー上の挙動については [docs/behavior.md](docs/behavior.md) を参照してください。

<a id="classifiers"></a>

## 分類器

分類器は、`REASONING_ROUTER_CLASSIFIER`（プロキシと Pi）またはプラグインの `classifier.provider` オプション（OpenCode）で選びます。以下の例ではプロキシを使用しています。OpenCode プラグインでは `classifier.apiKey`、`classifier.baseUrl`、`classifier.accountId`、`classifier.model` として同じ設定を指定でき、指定がなければこれらの環境変数にフォールバックします。すべての設定については [docs/environment.md](docs/environment.md) と [`@reasoning-router/classifiers`](packages/classifiers/README_JA.md) を参照してください。

### Jev（デフォルト）

[Jev](https://typesafe.ai/) は TypeSafe が提供するホスト型の判断モデルです。TypeSafe の API キーを取得してから、次を実行します。

```bash
REASONING_ROUTER_CLASSIFIER=jev \
REASONING_ROUTER_CLASSIFIER_API_KEY=<typesafe-key> \
reasoning-router
```

代わりに Vercel AI Gateway のキーを使う場合は、
`REASONING_ROUTER_CLASSIFIER_BASE_URL=https://ai-gateway.vercel.sh/typesafe` も設定してください。

### Cloudflare Clef

[Clef](https://developers.cloudflare.com/workers-ai/models/clef/) は Cloudflare Workers AI 上で動作します。Workers AI の権限を持つ Cloudflare API トークンを作成してから、次を実行します。

```bash
REASONING_ROUTER_CLASSIFIER=clef \
REASONING_ROUTER_CLASSIFIER_API_KEY=<cloudflare-token> \
REASONING_ROUTER_CLASSIFIER_ACCOUNT_ID=<cloudflare-account-id> \
REASONING_ROUTER_CLASSIFIER_MODEL=clef \
reasoning-router
```

`REASONING_ROUTER_CLASSIFIER_MODEL` は `clef`、`clef-omni`、または `clef-flash` に設定します。この設定は必須です。

### Laya

[Laya](https://huggingface.co/convaiinnovations/laya) は、自分で動かすオープンソースの Jev 互換判断モデルです。ルーターは HTTP 経由で呼び出すだけで、モデルのインストールやロードは行いません。Laya の `laya-serve` を起動してから、ルーターの接続先をそこに向けます。

```bash
pip install "laya[serve]"
LAYA_HOST=127.0.0.1 LAYA_PRELOAD=1 laya-serve   # http://127.0.0.1:8000
REASONING_ROUTER_CLASSIFIER=laya reasoning-router
```

デフォルトのベース URL は `http://127.0.0.1:8000` です。リモートサーバーでは HTTPS を使う必要があります。`REASONING_ROUTER_CLASSIFIER_API_KEY` は、サーバー側で `LAYA_API_KEY` を設定している場合にのみ設定してください。チェックポイント（`english`、`multilingual`、`typed-decisions`）は `REASONING_ROUTER_CLASSIFIER_MODEL` で選びます。

### Kev

[Kev](https://github.com/jaredpalmer/kev) は、自分で `kev.serve` を使って動かす、オープンソースの Jev 互換判断モデルファミリーです。ルーターは HTTP 経由で呼び出すだけです。

```bash
uv run --extra serve python -m kev.serve --run jaredpalmer/kev-4b@v1.0   # http://127.0.0.1:8008
REASONING_ROUTER_CLASSIFIER=kev reasoning-router
```

固定バージョン、確認済みの HTTP コントラクト、認証、制限、まだ検証されていない事項については [docs/proposals/kev.md](docs/proposals/kev.md) を参照してください。

### OpenAI Decisions

`openai-decisions` 分類器は、ご自身の OpenAI API キーで OpenAI の Decisions API（パブリックベータ、モデルは `gpt-6-luna`）を呼び出します。

```bash
REASONING_ROUTER_CLASSIFIER=openai-decisions \
REASONING_ROUTER_CLASSIFIER_API_KEY="$OPENAI_API_KEY" \
reasoning-router
```

モックしたレスポンスに対してのみテストされており、実環境での互換性と推論強度の選択品質は未検証です。プライバシーの境界、リージョナルエンドポイント、コストについては
[packages/classifiers](packages/classifiers/README_JA.md#openai-decisions-provider-openai-decisions)
を参照してください。

### CLM

[CLM](https://github.com/Contrastive-LM/CLM) は、自分で `clm-serve` を使って動かす判断モデルです。`clm-serve` には、同じく自分で動かす別のプーリングバックエンド（Qwen3-8B の埋め込み。例: vLLM）が必要です。ルーターは `clm-serve` を HTTP 経由で呼び出すだけです。

```bash
vllm serve Qwen/Qwen3-8B --served-model-name qwen3-8b --runner pooling --max-model-len 2048 --host 127.0.0.1 --port 8090
clm-serve --host 127.0.0.1 --no-ui   # http://127.0.0.1:8700
REASONING_ROUTER_CLASSIFIER=clm reasoning-router
```

デフォルトのベース URL は `http://127.0.0.1:8700` です。`REASONING_ROUTER_CLASSIFIER_API_KEY` は、サーバー側で `CLM_API_KEY` を設定している場合にのみ設定してください。CLM ヘッドは `REASONING_ROUTER_CLASSIFIER_MODEL` で選びます（サーバーのデフォルトは `clm-latest`）。固定バージョン、プーリングバックエンド、2,048 トークンでの切り詰めについては [docs/classifiers/clm.md](docs/classifiers/clm.md) を参照してください。検証したのは API の互換性のみで、推論強度の判断品質は検証していません。

### Microsoft-Decision-1

[Microsoft-Decision-1](https://learn.microsoft.com/azure/foundry/foundry-models/how-to/use-foundry-models-microsoft-decision) は、Microsoft Foundry 上で提供される Microsoft の判断モデルです。ご自身の Foundry リソースにデプロイし、デプロイの詳細ページに表示されるリソースエンドポイント、デプロイ名、API キーを使用します。

```bash
REASONING_ROUTER_CLASSIFIER=microsoft-decision \
REASONING_ROUTER_CLASSIFIER_BASE_URL=https://<resource>.services.ai.azure.com \
REASONING_ROUTER_CLASSIFIER_MODEL=<deployment-name> \
REASONING_ROUTER_CLASSIFIER_API_KEY=<foundry-api-key> \
reasoning-router
```

3 つの設定はすべて必須です。サポートされるのは API キーのみで、Microsoft Entra ID トークンはサポートされません。モックしたレスポンスに対してのみテストされており、実環境での互換性と推論強度の選択品質は未検証です。詳細は
[packages/classifiers](packages/classifiers/README_JA.md#microsoft-decision-1-provider-microsoft-decision)
を参照してください。

### Liquid d1

[Liquid d1](https://docs.liquid.ai/lfm/models/d1) は、Liquid AI のホスト型の判断モデルです。[console.liquid.ai](https://console.liquid.ai) でキーを作成し、次のように実行します。

```bash
REASONING_ROUTER_CLASSIFIER=liquid \
REASONING_ROUTER_CLASSIFIER_API_KEY=<liquid-key> \
reasoning-router
```

代わりに Vercel AI Gateway のキーを使う場合は、`REASONING_ROUTER_CLASSIFIER_BASE_URL=https://ai-gateway.vercel.sh/typesafe` も設定します。Liquid の無料のテキスト専用モデルを使うには、`REASONING_ROUTER_CLASSIFIER_MODEL=d1:free` を設定します。モックしたレスポンスに対してのみテストされており、実環境での互換性と推論強度の選択品質は未検証です。詳細は
[packages/classifiers](packages/classifiers/README_JA.md#liquid-d1-provider-liquid)
を参照してください。

### SGLang

[SGLang](https://docs.sglang.io/docs/supported-models/decision_models) は、チャットモデル（v0.5.21 以降）や、PPLX-Decider のような判断チェックポイント（nightly ビルド）向けに System One エンドポイントを提供します。サーバーは自分で動かします。ルーターは HTTP 経由で呼び出すだけです。

```bash
python -m sglang.launch_server --model-path Qwen/Qwen3.8-27B --host 127.0.0.1 --port 30000
REASONING_ROUTER_CLASSIFIER=sglang reasoning-router
```

デフォルトのベース URL は `http://127.0.0.1:30000` です。`REASONING_ROUTER_CLASSIFIER_API_KEY` は、サーバーを `--api-key` 付きで起動している場合にのみ設定してください。固定バージョン、モデルとテンプレートの制限、およびチャットモデルの次トークンスコアと較正済みの判断チェックポイントの違いについては [docs/classifiers/sglang.md](docs/classifiers/sglang.md) を参照してください。検証したのは API の互換性のみで、推論強度の判断品質は検証していません。

<a id="supported-models"></a>

## 対応モデル

ルーターは、これら以外のモデルをローカルで拒否します。お使いのアップストリームアカウントでそのモデルを利用できるかどうかは、別の問題です。

| モデル | ID | API | 推論強度 | ベースの推論強度 | Pi |
| --- | --- | --- | --- | --- | --- |
| GPT-6 Astra | `gpt-6-astra` | Responses | low–max | medium | 非対応 |
| GPT-6 Luna | `gpt-6-luna` | Responses | none–max | medium | 非対応 |
| GPT-6 Sol | `gpt-6-sol` | Responses | none–max | medium | 非対応 |
| GPT-6.1 Sol | `gpt-6.1-sol` | Responses | low–max | medium | 非対応 |
| Claude Fable 5.1 | `claude-fable-5-1` | Messages | low–max | high | 対応 |
| Claude Mythos 5.1 | `claude-mythos-5-1` | Messages | low–max | high | 非対応 (Pi 1.0.4) |
| Claude Opus 5.5 | `claude-opus-5-5` | Messages | low–max | medium | 対応 |
| Claude Opus 5 | `claude-opus-5` | Messages | low–max | high | 対応 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Messages | low–max | medium | 対応 |

推論強度は none、low、medium、high、xhigh、max の順です。ベースの推論強度はモデルのデフォルトのリクエストレベルの推論強度で、`REASONING_ROUTER_BASE_EFFORT` で上書きできます。分類に失敗した場合、ルーターはフォールバックの推論強度を使用します。これはすべてのモデルでデフォルトが `high` で、`REASONING_ROUTER_FALLBACK_EFFORT` またはプラグインの `fallbackEffort` オプションで設定できます。[docs/behavior.md](docs/behavior.md) と [docs/classification-policy.md](docs/classification-policy.md) を参照してください。レジストリは
[`packages/core/src/models.ts`](packages/core/src/models.ts)
にあります。

## 開発

Node.js 24.x が必要です。

```bash
npm ci
npm run check   # typecheck + lint + test
```

コマンドの全一覧とリポジトリの規約については [AGENTS.md](AGENTS.md) を参照してください。

元に戻せる設計とツールの決定事項は [docs/architecture.md](docs/architecture.md#decisions) に記録されています。

## ライセンス

[MIT](LICENSE)

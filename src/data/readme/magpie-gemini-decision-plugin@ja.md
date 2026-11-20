# Magpie Gemini Decision プラグイン

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md)

バージョン **0.3.0** は、Magpie で `gemini-decision-1` を使い、テキスト、画像、音声、動画、PDF をもとに判定するためのプラグインです。ルーティンググループの意図分類にも利用できます。Google 公式の Gemini Decisions API と、Bearer 認証を使う互換中継サービスに対応しています。

プロバイダー ID：`gemini-decision-adapter`。完全なモデル ID：`gemini-decision-adapter/gemini-decision-1`。

真偽判定、選択、スコア評価を行う決定モデルです。グループの `classifier` に指定し、グループのメンバーには通常のチャットモデルを使用してください。

## プロトコルとローカルエンドポイント

Magpie は、OpenAI 形式の `/v1/decisions` リクエスト（`input` と `questions` 配列）を System One 形式（`state` と `questions` オブジェクト）に変換します。プラグインは、その内容を設定された上流の `/decisions` エンドポイントへ送信します。

| Magpie 0.1.4587 のエンドポイント | テキスト | 画像 / 音声 / 動画 / PDF |
| --- | --- | --- |
| `/v1/systemone` | 対応 | トップレベルの `images` / `media` で対応 |
| `/v1/decisions` | 対応 | ホストの変換層がメディアを拒否 |
| `/v1beta/decisions` | 未登録 | 未登録 |

API 一覧は `GET /` の JSON レスポンス内の `apis` フィールドで確認できます。`GET /apis` は 404 を返します。例：`curl -s http://127.0.0.1:3425/`。

| System One の入力 | 変換と応答の処理 |
| --- | --- |
| 文字列の `state` | そのまま入力テキストとして送信 |
| オブジェクトまたは配列の `state` | 履歴と文脈を含む全体を JSON にシリアライズ。`message` だけを抽出しない |
| トップレベルの `images` | 画像の data URL / HTTPS URL を順序どおり image blocks に変換 |
| トップレベルの `media` | text、image、audio、video、document blocks の内容、URI、MIME タイプ、順序を保持 |
| `noul` | 肯定の確率を保持し、`confidence` で代用しない |
| `choice` | 選択肢と確率を保持。null の説明は空文字列に変換 |
| `score` | 評価基準の順序、`legend`、確率を保持 |
| トークン使用量 | 上流の `total_input_tokens` / `total_output_tokens` を `input_tokens` / `output_tokens` に変換。出力 0 も有効 |

OpenAI の `predicate` は `noul` に対応し、ほかの質問タイプは `choice` と `score` です。配列の変換と回答順序は Magpie が処理します。回答の欠落、不正な確率や使用量、JSON 以外の応答、上流エラー、ブロックされた入力は、明示的なエラーとして返します。

## インストールとログイン

provider plugin と System One に対応する Magpie が必要です。検証済みバージョンは **0.1.4587** です。プラグインに追加の npm 依存関係はありません。単体テストには Node.js 20 以降が必要です。

完全なパッケージ名を指定して npm からインストールします。macOS アプリの CLI は `PATH` に含まれていない場合があります。

```sh
MAGPIE_BIN=/Applications/magpie.app/Contents/MacOS/magpie
PLUGIN_SPEC=magpie-gemini-decision-plugin@latest
"$MAGPIE_BIN" plugin add "$PLUGIN_SPEC"
"$MAGPIE_BIN" plugin login gemini-decision-adapter
"$MAGPIE_BIN" plugin list --json
```

ログイン時のプロンプトで上流サービスの API キーを入力してください。認証情報は Magpie が管理します。ソース、コマンド引数、プラグイン設定にキーを記載せず、`plugin-auth.json` も手動で編集しないでください。

プラグインを有効にして、**プラグイン → インストール済み → オプション** から `endpoint` と `authMode` を編集します。0.3.0 では Google の既定設定を編集可能なテンプレートとして表示します。保存すると変更が適用されます。中継サービスを使う場合は、リクエストを送る前に接続先と認証方式を設定してください。

ローカル開発では、ソースディレクトリで `PLUGIN_SPEC="$PWD"` を設定し、同じインストールコマンドを使ってください。そのディレクトリは保持してください。ローカルパスと npm パッケージは別のプラグイン項目なので、切り替えた後は新しい項目を設定します。発見ページにまだ表示されない場合も、完全な npm パッケージ名でインストールできます。

## 上流サービスの設定

既定では Google に直接接続します。

```json
{
  "endpoint": "https://generativelanguage.googleapis.com/v1beta/decisions",
  "authMode": "google"
}
```

`google` は `x-goog-api-key`、`bearer` は `Authorization: Bearer …` を使用します。エンドポイントには完全な HTTPS の `/decisions` URL を指定し、ユーザー情報、クエリパラメーター、フラグメントを含めないでください。

互換中継サービスを使う場合は、例のアドレスを置き換えます。

```sh
"$MAGPIE_BIN" plugin options "$PLUGIN_SPEC" \
  '{"endpoint":"https://relay.example.com/v1beta/decisions","authMode":"bearer"}'
```

Google の既定設定に戻す場合：

```sh
"$MAGPIE_BIN" plugin options "$PLUGIN_SPEC" off
```

サービスの切り替え後は、`plugin login gemini-decision-adapter` でそのサービスのキーを登録してください。通常、別サービスのキーは流用できません。リクエストごとに Magpie で現在選択されているアカウントを使います。キャンセル信号を維持し、追加の再試行やリダイレクト追従は行わず、呼び出し元の Cookie や認証情報も転送しません。上流の HTTP エラーではステータスと再試行情報を保持しますが、認証情報を含む可能性のある生のエラー本文は公開しません。

## 決定リクエスト

次の JSON をローカル Magpie の `/v1/systemone` に送信します。

```json
{
  "model": "gemini-decision-adapter/gemini-decision-1",
  "state": {"order": "A100", "status": "cancelled", "refund": "received"},
  "questions": {
    "cancelled": {"type": "noul", "instructions": "Has the order been cancelled?"},
    "status": {
      "type": "choice",
      "instructions": "Choose the order status.",
      "criteria": {"pending": "Pending", "cancelled": "Cancelled", "other": null}
    },
    "refund": {
      "type": "score",
      "instructions": "Rate refund progress.",
      "criteria": ["Not started", "Processing", "Received"]
    }
  }
}
```

OpenAI `/v1/decisions` では `input` と `questions` 配列を使い、質問タイプを `predicate`、`choice`、`score` にします。[リクエスト例](docs/examples.md)には、すべての質問タイプとメディア形式を掲載しています。

## メディア入力

トップレベルの `media` 配列を使います。添付ごとに入力元をちょうど 1 つ指定してください。`data` はファイルのバイト列を Base64 化したもの、`uri` は公開または署名付き HTTPS URL です。Google Files API が返す HTTPS URI も使用できます。ローカルファイルのパスは使用できません。プラグインはファイルの読み込みやアップロードを行いません。

| 内容 | `type` | 主な `mime_type` |
| --- | --- | --- |
| 画像 | `image` | `image/png`、`image/jpeg`、`image/webp` |
| 音声 | `audio` | `audio/wav`、`audio/mpeg`、`audio/ogg` |
| 動画 | `video` | `video/mp4`、`video/webm`、`video/mov` |
| PDF | `document` | `application/pdf` |

例えば、録音から注文のキャンセルを判定します。

```json
{
  "model": "gemini-decision-adapter/gemini-decision-1",
  "state": "",
  "media": [
    {"type": "audio", "mime_type": "audio/wav", "data": "BASE64_WAV_CONTENT"}
  ],
  "questions": {
    "cancelled": {"type": "noul", "instructions": "Has the order in the recording been cancelled?"}
  }
}
```

リモート音声を参照するには、`data` を `"uri": "https://relay.example.com/media/recording.wav"` に置き換えます。任意の `resolution`（例：`"low"`）を指定できるのは画像と動画だけです。複数のメディアや `{"type":"text","text":"Additional context"}` のテキストブロックを同じリクエストに含めることもできます。

標準の `images` フィールドも使用できます：`"images": ["data:image/png;base64,BASE64_IMAGE_CONTENT"]`。上流に送る順序は、`state` 全体のテキスト、`images`、`media` です。空文字列の state はテキストブロックを追加しません。業務データのオブジェクトや配列は JSON テキストとして扱い、メディア入力として読むのはトップレベルの `images` / `media` だけです。

Magpie 0.1.4587 では、**JSON リクエスト本文全体の上限は 16 MiB** です。Base64 にすると約 3 分の 1 増えるため、元の添付ファイルの合計を約 12 MiB 未満に抑え、JSON 用の余裕を残してください。大きな素材には、上流がアクセスできる HTTPS URI を使えます。これはホスト側の制限であり、Google のファイル上限とは別です。

`usage.input_tokens` / `output_tokens` は Magpie の使用量計測に使われます。上流が返す場合は `input_tokens_by_modality` も保持します。動画や PDF の使用量は image/audio/text に計上され、video/pdf が個別に表示されないことがあります。

## ルーティング分類器として使う

既存のチャットグループを設定します。

```sh
"$MAGPIE_BIN" group rule classifier YOUR_GROUP_ID gemini-decision-adapter/gemini-decision-1
"$MAGPIE_BIN" group rule add YOUR_GROUP_ID use=YOUR_PROVIDER/chat-small \
  'intent=explaining a concept or answering a question without writing or changing code'
"$MAGPIE_BIN" group rule add YOUR_GROUP_ID use=YOUR_PROVIDER/chat-large \
  'intent=writing or fixing unit tests'
```

`YOUR_GROUP_ID`、`YOUR_PROVIDER`、モデル名を、実際のグループと利用可能なチャットモデルに置き換えてください。検証時は `/v1/magpie/route?session=…` で分類元、一致したルール、実際のモデル、試行結果を確認し、`/v1/magpie/usage/requests` の `kind=routing` 記録も確認します。ルールへの一致だけでは、最終モデルの成功を確認できません。

## 検証と制約

```sh
npm test
export MAGPIE_CHAT_TARGETS='["YOUR_PROVIDER/chat-small","YOUR_PROVIDER/chat-large"]'
python3 scripts/validate_live.py
python3 scripts/validate_media.py --output artifacts/media-run-001
```

2 つのターゲットを、ログイン済みの実際のチャットモデルに置き換えます。`validate_live.py` には `MAGPIE_CHAT_TARGETS` が必須で、モデル ID を 2 つ含む JSON 配列を指定します。スクリプトはローカル Magpie と実際のモデルを呼び出し、一意の名前の一時ルーティンググループを作成します。2 つの意図を順に検証し、自分で作成したグループだけを削除します。プラグインと両方のチャットモデルに事前にログインしてください。認証ヘッダーは保存しません。

`validate_media.py --output` のパスには、**新しいディレクトリ**を指定してください。実行ごとに別のパスを使います。`test/fixtures/media/` の合成素材を使用し、各メディア 2 件の対照サンプル、`images` 形式 1 件、4 種類を混ぜたサンプル 1 件について、実際の回答と使用量を検証します。素材は `python3 scripts/generate_media_fixtures.py` で再生成できます。この開発用スクリプトには Pillow、ffmpeg、macOS の `say` が必要ですが、プラグインの実行には不要です。

既定のゲートウェイは `http://127.0.0.1:3425` です。`MAGPIE_URL` で接続先、`MAGPIE_BIN` で CLI を指定できます。任意の `MAGPIE_API_KEY` はローカルゲートウェイの認証用であり、プラグインのログインで保存する上流キーとは別です。

過去の検証記録では、**単体テスト 56 件が成功**し、**実サービスでのメディア 10 ケース / 回答 31 件が成功**しています。単体テストは架空の認証情報とモック上流を使用します。実サービスでのメディア検証は、互換中継サービスへの Base64 入力で実施しました。HTTPS URI の変換は単体テストで検証していますが、すべてのメディア形式のリモート URI を実サービスで試したわけではありません。Google 公式への直接接続と実環境でのアカウント切り替えも未検証です。公開用に機密情報を除いた[検証記録](VERIFICATION.md)を参照してください。これは統合検証であり、分類精度のベンチマークではありません。

料金は設定していないため、表示コストは実際の請求額を示しません。検証対象はトークン数のみです。ローカルの `/v1beta/decisions` エイリアスは追加しません。

## ファイルと参考資料

- `index.mjs`：プラグイン factory、プロバイダー、モデル、ログインのインターフェース。
- `adapter.mjs`：プロトコル、認証、応答検証、エラー処理。
- `media.mjs`：メディアブロック、MIME、Base64、HTTPS URI の検証。
- `test/adapter.test.mjs`、`test/media.test.mjs`：単体テスト。
- `scripts/validate_live.py`、`scripts/validate_media.py`：実サービスとの統合検証。
- [全質問タイプとメディアの例](docs/examples.md)。
- [機密情報を除いた公開検証記録](VERIFICATION.md)。
- [Google Decisions API](https://aistudio.google.com/docs/decisions-api#input)
- [Magpie issue #6969](https://github.com/yetone/magpie/issues/6969)
- [Magpie provider plugins (v0.1.4587)](https://github.com/yetone/magpie/blob/v0.1.4587/docs/subsystems/provider-plugins.md)
- [Magpie Gemini / System One conversion](https://github.com/yetone/magpie/blob/v0.1.4587/internal/provider/decide_wire.go)

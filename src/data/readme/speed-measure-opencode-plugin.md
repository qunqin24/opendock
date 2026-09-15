# speed-measure-opencode-plugin

OpenCode TUI のサイドバーに、現在のセッションにおける LLM 応答の Prefill（TTFT）速度と Decode 速度を表示する OpenCode プラグイン。

## 表示例

ストリーミング中:

```
Speed
Prefill: 340 ms
Decode:  ~45.2 chars/s
```

完了後:

```
Speed
Prefill: 340 ms │ 2.1k tok/s
Decode:  58.3 tok/s
```

- **Prefill**: 最初のトークンが返るまでの時間（TTFT）と、入力トークン数から算出したプレフィル速度
- **Decode**: ストリーミング中は生成済み文字数を経過時間で割った概算値（`chars/s`）がライブ更新され、完了後は API が返したトークン数に基づく確定値（`tok/s`）へ切り替わる

## インストール

### 推奨（npm 経由）

```bash
opencode plugin speed-measure-opencode-plugin -g      # グローバル設定に追加
opencode plugin speed-measure-opencode-plugin         # プロジェクト単位で追加
```

- `-g` は設定の書き込み先（グローバル `~/.config/opencode` か プロジェクト `.opencode` か）を変えるものであり、パッケージのインストール先（OpenCode 管理キャッシュ）は変わりません。

#### 更新手順

OpenCode 1.18.30 の管理キャッシュは npm spec 文字列ごとに分かれます。`@latest` のように同じ spec を使い続けると既存のキャッシュが再利用されるため、更新にはバージョンの明示が必要です。
[npm のパッケージページ](https://www.npmjs.com/package/speed-measure-opencode-plugin)で最新版の番号を確認し、次の例にある `0.1.0` ではなく、確認した最新版を指定してください。`--force` は設定内の同名プラグイン指定を、指定したバージョンに置き換えます。
導入時に選んだ scope に対応するコマンドを実行してください。

```bash
opencode plugin speed-measure-opencode-plugin@0.1.0 -g --force  # グローバル設定を更新
opencode plugin speed-measure-opencode-plugin@0.1.0 --force     # プロジェクト設定を更新
```

### 代替（ソースから）

開発者向けの手順です。

```bash
git clone https://github.com/japan4415/speed-measure-opencode-plugin.git
cd speed-measure-opencode-plugin
npm install
npm run build
```

`npm run build` により `dist/index.js` が生成される。`~/.config/opencode/tui.jsonc` にそのパスを登録する。

```jsonc
{
  "plugin": [
    "/path/to/speed-measure-opencode-plugin/dist/index.js"
  ]
}
```

`@opentui/solid` の bun-plugin は `.tsx` / `.jsx` のみを変換対象とするため、事前ビルド済みの `dist/index.js` は追加変換なしでそのまま読み込まれる。

## 設定

`~/.config/opencode/speed-measure.json` を作成すると表示をカスタマイズできる。ファイルが無い場合や不正な値の場合は既定値にフォールバックする。

| キー | 型 | 既定値 | 説明 |
|---|---|---|---|
| `showTTFT` | boolean | `true` | Prefill 行に TTFT（ms）を表示するか |
| `showAverages` | boolean | `false` | セッション全体の平均値を表示するか |
| `showCache` | boolean | `false` | キャッシュ関連の値を表示するか |
| `liveIntervalMs` | number | `150` | ストリーミング中の live 更新間隔（ミリ秒） |
| `order` | number | `150` | サイドバー内での表示順（builtin の `internal:sidebar-context` は `order=100`） |

## 開発

開発には Node.js `^20.19.0 || >=22.12.0` が必要（Vite 7 の要件）。公開済みの `dist/index.js` は OpenCode の Bun ランタイムで読み込まれるため、この開発要件は npm パッケージの `engines.node` には設定しない。

```bash
npm test        # vitest によるユニットテスト
npm run typecheck  # tsc --noEmit
npm run build    # tsup + Solid universal 変換で dist/index.js を生成
```

## 既知の制限

本パッケージは OpenCode が動的 import する TUI プラグインであり、TypeScript から直接 import する用途は想定していないため、型宣言は同梱していない。

OpenCode 1.18.30 の `tokens.input` は、既にキャッシュ読み出し分を除いた入力トークン数である。Anthropic / OpenAI / Google / Bedrock のように `cached_tokens` を報告するプロバイダでは、この値から Prefill 速度を正しく算出できる。

一方、`cached_tokens` を報告しないプロバイダでは、`tokens.input` が全プロンプトトークンになることがある。実測したローカル vLLM では次の結果となり、キャッシュによって TTFT だけが短縮されたため Prefill 速度が膨張した。

| ケース | TTFT | `prompt_tokens` | 見かけ Prefill | cold 比 |
|---|---:|---:|---:|---:|
| 完全 cold | 12,384 ms | 4,217 | 341 tok/s | 基準 |
| 完全 warm | 460 ms | 4,217 | 9,170 tok/s | 27倍 |
| 部分ヒット | 2,460 ms | 4,215 | 1,713 tok/s | 5倍 |

500,000 tok/s を超える算出値を表示しない閾値は、極端な異常値を抑えるだけの緩和策である。上記の 5〜27倍の膨張はいずれも閾値を下回って素通りするため、`cached_tokens` を報告しないプロバイダでキャッシュが効いている間、Prefill 速度は参考値であり TTFT のみが信頼できる。また、将来の高速なハードウェアや小さいモデルで正当に閾値を超えた場合も速度が省略される。

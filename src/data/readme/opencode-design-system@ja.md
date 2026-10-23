# OpenCode Design System

[![npm バージョン](https://img.shields.io/npm/v/opencode-design-system)](https://www.npmjs.com/package/opencode-design-system)
[![MIT ライセンス](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE)
[![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-6f42c1)](https://opencode.ai/v2/docs/)

**OpenCode v2 向けの協調型プラグインです。AI エージェントが実際に従える、ポータブルでフレームワークに依存しないデザインシステムの作成と進化を支援します。**

[English](https://github.com/BraveOtter/opencode-design-system/blob/master/README.md) · [Español](https://github.com/BraveOtter/opencode-design-system/blob/master/README.es.md) · [Português (Brasil)](https://github.com/BraveOtter/opencode-design-system/blob/master/README.pt-BR.md) · [Deutsch](https://github.com/BraveOtter/opencode-design-system/blob/master/README.de.md) · [Français](https://github.com/BraveOtter/opencode-design-system/blob/master/README.fr.md) · [Italiano](https://github.com/BraveOtter/opencode-design-system/blob/master/README.it.md) · [简体中文](https://github.com/BraveOtter/opencode-design-system/blob/master/README.zh-CN.md) · [日本語](https://github.com/BraveOtter/opencode-design-system/blob/master/README.ja.md)

> **免責事項：** これは独立したコミュニティプロジェクトです。OpenCode チームによって開発されたものではなく、OpenCode とは一切関係ありません。

デザインシステムは、プロジェクトの持続的なビジュアルメモリになります。セマンティックトークン、明示的な好み、デザイン上の決定、コンポーネント、パターン、画面仕様を **Markdown と JSON** で構造化して記録します。これらのソースからインタラクティブな HTML プレビューを生成しますが、第二の信頼できる情報源にはなりません。

## このプラグインを使う理由

- **アンケートではなく会話から始められます。** まだ明確でない重要なビジュアルアイデンティティの選択だけを確認し、ユーザーの好みを明示的に記録します。
- **既存のものをドキュメント化できます。** 範囲を限定した読み取り専用の分析により、既存の UI を黙って再設計することなく整理できます。
- **エージェントに関連するコンテキストを提供します。** プロンプトごとにシステム全体を渡すのではなく、UI タスクに必要なトークン、コンポーネント、パターン、ガイドラインを段階的に読み込みます。
- **システムを一貫性を保って進化させます。** デザイン上の決定、セマンティックトークンの依存関係、影響を受けるコンポーネントやパターン、ステータス、デザインシステムのバージョン変更を追跡します。
- **フレームワークへの依存を避けます。** 信頼できる形式は Markdown と JSON であり、React、Vue、Tailwind、生成されたプレビューではありません。
- **プロジェクトファイルを保護します。** 分析とチェックは読み取り専用です。作成時に既存の `design-system/` ディレクトリを置き換えず、`AGENTS.md` のプラグイン管理ブロック外の内容も保持します。

## 必要条件

- [OpenCode v2](https://opencode.ai/v2/docs/)
- Node.js **22.19 以降**

## インストール

### npm で公開されているパッケージをインストールする

OpenCode CLI でグローバルにインストールします。

```sh
opencode plugin add opencode-design-system
```

npm の特定バージョンを固定するには、`<version>` を希望するバージョンに置き換えます。

```sh
opencode plugin add opencode-design-system@<version>
```

`opencode.json` または `opencode.jsonc` に設定して、プロジェクト単位で利用することもできます。

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-design-system"]
}
```

OpenCode は起動時に設定済みのプラグインを読み込みます。プラグインが表示されない場合は、OpenCode または OpenCode サービスを再起動してください。

### GitHub から直接インストールする

デフォルトブランチの最新バージョンをインストールします。

```sh
opencode plugin add github:BraveOtter/opencode-design-system
```

GitHub のタグ付きバージョンを固定するには、`<tag>` を希望するタグに置き換えます。

```sh
opencode plugin add github:BraveOtter/opencode-design-system#<tag>
```

### ローカルのチェックアウトを使う

リポジトリをクローンし、開発用の依存関係をインストールしてビルドします。

```sh
npm install
npm run build
```

次に、OpenCode のプラグインとしてチェックアウトディレクトリを指定します（相対パスはプロジェクトに合わせて調整してください）。

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["../opencode-design-system"]
}
```

このリポジトリには、任意のローカルテスト用エントリポイント `plugins/local/index.js` も含まれています。自動では読み込まれず、npm パッケージにも含まれません。

## はじめに

ビジュアルの方向性を伝えてシステムを作成します。

```text
/design-system 落ち着いたコンパクトなワークスペース。彩度を抑えたグリーン、すっきりしたサーフェス、グラデーションなし。
```

プロジェクトにすでに UI がある場合は、まずエージェントに分析を依頼してください。見つかった内容を説明し、作成を始める前に、既存のビジュアルアイデンティティを記録するか、最初から作るかを確認します。

```text
/design-system このアプリの UI を分析し、現在のビジュアル表現をドキュメント化するのを手伝ってください。
```

プラグインに UI コードを実装させず、画面を設計するには次のように依頼します。

```text
/design-screen 検索、フィルター、招待、空の状態を備えたユーザー管理画面。
```

`/design-screen` を使わず、自然言語で画面仕様を依頼することもできます。manifest がある場合、プラグインはプロジェクトの `AGENTS.md` と関連するデザインシステムのガイドラインをエージェントに案内します。

## コマンド

| コマンド | 機能 |
| --- | --- |
| `/design-system [idea]` | システムを共同で一から作成するか、既存 UI のドキュメント化について相談します。 |
| `/design-system/update [change]` | バージョン管理されたセマンティックな変更を適用し、依存するドキュメントを特定します。 |
| `/design-system/preview` | 構造化ファイルからインタラクティブプレビューを再生成します。 |
| `/design-system/review` | プレビュー、現在の OpenCode の会話、コンテキストに応じた要素選択を備えたローカルの 2 ペイン画面を開きます。 |
| `/design-system/check` | UI スタイルとドキュメント化されたトークンのずれを、読み取り専用のヒューリスティックな方法でチェックします。 |
| `/design-screen [screen]` | アプリの UI コードを書かずに、実装可能な画面仕様を保存します。 |

プラグインは `design_system_create`、`design_system_read`、`design_system_analyze`、`design_system_update`、`design_system_preview`、`design_system_check`、`design_system_screen_spec` ツールも登録します。エージェントは必要に応じてこれらを使用できます。

## 仕組み

### 既存プロダクトに配慮したワークフロー

`design_system_analyze` ツールは、UI やスタイルの候補ソース、認識可能なフレームワーク設定、宣言された依存関係を読み取ります。CSS 変数、色、角丸、間隔、レスポンシブブレークポイント、コンポーネント候補などの手がかりをまとめます。分析には範囲制限があり、依存関係やビルドのディレクトリをスキップし、シンボリックリンクをたどらず、読み取ったファイルを変更しません。結果は手がかりであり、差異が誤りであることの証明ではありません。

エージェントは不確かな点を説明し、重要または曖昧なビジュアル上の判断を統一する前に確認します。分析は、アプリケーションコードを再設計または編集する許可ではありません。

### プロジェクトファイルの安全な取り扱い

作成時には新しい `design-system/` ディレクトリを作り、ルートの `AGENTS.md` にあるプラグイン管理ブロックだけを追加または更新します。`design-system/` にすでにファイルがある場合、置き換えずに作成を拒否します。更新ではデザインシステムの成果物を意図的に変更しますが、組み込みの分析・チェックツールがアプリケーションの UI ファイルを編集することはありません。

`AGENTS.md` の管理対象ガイドラインはポータブルです。OpenCode やその他のコーディングエージェントに、フレームワーク非依存のソースの場所と、タスクに必要な情報だけを読み込む方法を伝えます。プラグインがエージェント、コマンド、スキルをプロジェクトにコピーすることはありません。

### ポータブルな信頼できる情報源

生成されるディレクトリは通常、次のような構成です。

```text
design-system/
├── README.md
├── manifest.json
├── tokens.json
├── preferences.json
├── FOUNDATIONS.md
├── AI-GUIDELINES.md
├── DECISIONS.md
├── CHANGELOG.md
├── schema/
├── components/
├── patterns/
├── screens/
├── preview/
│   └── index.html
└── tools/
    └── generate-preview.mjs

AGENTS.md  # 管理ブロック外の既存の内容は保持されます。
```

manifest はテーマ、バージョン、ファイル、各コンポーネントやパターンが宣言するトークン参照を索引化します。システムはスキーマバージョン `1.0.0` とともに `0.1.0` から始まり、レビュー状態は `draft`、`review`、`stable` のいずれかです。

トークンはセマンティックなパスを使い、複数のテーマを定義できます。

```json
{
  "$schema": "./schema/tokens.schema.json",
  "schemaVersion": "1.0.0",
  "themes": {
    "light": {
      "color": {
        "surface": { "base": "#f6f8f7", "raised": "#ffffff" },
        "text": { "primary": "#17211f", "secondary": "#65726d" },
        "accent": { "primary": "#276f55" }
      },
      "radius": { "control": "6px", "card": "8px" },
      "spacing": { "sm": "8px", "md": "16px" }
    }
  }
}
```

語彙はタイポグラフィ、レイアウト、エレベーション、モーション、ブレークポイント、フォーカス、状態などに拡張できます。コンポーネントには目的、バリエーション、トークン、動作、アクセシビリティ、レスポンシブ対応、関連性を記述します。パターンにはフォーム、ナビゲーション、フィルター、テーブル、空の状態など、有用な構成を記録します。

### 意味のあるバージョン管理付き更新

`/design-system/update` はシステムを変更する前に manifest と関連ドキュメントを読み取ります。デフォルトではセマンティックトークンの更新をすべてのテーマの該当パスに適用します。特定のテーマだけを変更する場合は `themes.<name>.` をプレフィックスにします。更新理由を記録し、宣言済みの依存先を特定して、関連ドキュメントを更新し、プレビューを再生成します。

デザインシステムのバージョンへの影響は次のルールに従います。

- **PATCH** — 互換性のある修正やドキュメントの変更。
- **MINOR** — 新しいトークン、コンポーネント、パターンなど、互換性のある追加。
- **MAJOR** — 既存のデザイン契約を破る可能性のある変更。

これらのバージョンはプロジェクト内で生成されるデザインシステムのものであり、プラグインの npm パッケージのバージョンではありません。更新されたシステムは、レビューできるようデフォルトで `draft` に戻ります。

## 組み込みのデザイン Skill

このプラグインは、OpenCode v2 を通じて3つのデザイン Skill を内部登録します。デザインシステムの作成・更新、トークン選定、画面仕様の作成時に、ビジュアルの方向性、プロダクト UI の設計、アクセシビリティを考慮したトークン判断を連携して適用します。これらはエージェントを導くもので、プロジェクトの正規ソースであるフレームワーク非依存の Markdown/JSON を置き換えません。また、Skill の `SKILL.md` は**利用プロジェクトには書き込まれません**。

### Skill のカスタマイズ

プラグインオプション `designSkills` で、組み込み Skill 全体または個別の無効化、あるいは ID による許可リストを設定できます。オブジェクトで指定しない項目は有効のままです。`"designSkills": false` ですべてを無効化し、ID 配列を渡すとその Skill のみ有効になります。個人用 Skill は `~/.config/opencode/skills/<自分の-skill-id>/SKILL.md` に追加できます。独自 Skill で組み込み Skill を置き換える場合は、先に該当する組み込み Skill を無効化してください。組み込み Skill を変更する場合は、プラグインのローカル checkout または fork 内の `skills/<skill-directory>/SKILL.md` を編集して、その checkout を読み込みます。元のクレジットとライセンスは保持してください。詳細は [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) を参照してください。

### クレジット

- **Frontend Design** — Anthropic、原著者 Prithvi Rajasekaran と Alexander Bricken。[ソース](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design/skills/frontend-design) · Apache-2.0。
- **Interface Design** — Dammyjay93 (Damola Akinleye)。[ソース](https://github.com/Dammyjay93/interface-design) · MIT。
- **Design System Auditor** — Community-Access、著作権 © Taylor Arndt。[ソース](https://github.com/Community-Access/accessibility-agents/blob/main/skills/design-system-auditor/SKILL.md) · MIT。

## インタラクティブプレビュー

`design-system/preview/index.html` は manifest、トークン、コンポーネントやパターンの仕様から生成されます。トークンやコンポーネントのサンプル、複数テーマがある場合のテーマ切り替え、インタラクティブなサンプルを含みます。キーボードフォーカスの可視化と `prefers-reduced-motion` に対応しています。

`/design-system/review` を使うと、左側にインタラクティブプレビュー、右側に同じ OpenCode セッションを表示するローカルレビュー画面を開けます。右側のパネルから送信したメッセージはそのセッションに届き、各ターンの終了後に生成済みプレビューが更新されます。**要素を選択**を有効にすると、ドキュメント化されたコンポーネント、パターン、セマンティックトークンのサンプルを選び、検証済みの参照を最大 8 件メッセージに添付できます。参照には manifest 名、ソースパス、トークンパスを使い、DOM セレクターは使いません。古い選択が別の項目を誤って対象にしないよう、送信前に再検証します。単体の HTML も引き続き利用でき、この画面がなくても動作します。レビューサーバーは `127.0.0.1` 上のランダムなポートだけで待ち受け、プラグインのアンロード時に停止し、OpenCode の認証情報をブラウザーに公開しません。デフォルトでは、コマンドはブラウザーを自動で開く代わりに会話へリンクを投稿します。

レビューコマンドの実行時にシステムブラウザーを自動で開くには、次のプラグインオプションを設定します。

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-design-system",
      "options": { "autoOpenReview": true }
    }
  ]
}
```

OpenCode では `/design-system/preview` を実行してプレビューを再生成できます。プラグインを使わない場合は、プロジェクトのルートから次を実行します。

```sh
node design-system/tools/generate-preview.mjs
```

スタンドアロンのレンダラーに外部依存関係はありません。システムを変更するときは、生成された HTML ではなく、構造化された Markdown と JSON を編集してください。

## 開発とテスト

```sh
npm install
npm run typecheck
npm test
npm run build
```

テストでは一時プロジェクトでの統合フローを扱います。読み取り専用の分析、ユーザーファイルの作成と保持、管理対象 `AGENTS.md` の更新、画面仕様、複数テーマにまたがるトークン更新、プレビュー、認証付きローカルレビュー画面と検証済み要素参照、チェック、パスの安全性が含まれます。

## リリースの公開

GitHub Actions の `Publish to npm` ワークフローは、チェックに合格し、タグが `package.json` のバージョンと一致した状態で `vX.Y.Z` タグが push されると公開します。初回公開前に、リポジトリ `BraveOtter/opencode-design-system` とワークフロー `publish.yml` に対して npm Trusted Publishing を設定し、直接の `npm publish` アクションを許可してください。ワークフローは OIDC を使うため、npm の公開トークンを GitHub に保存する必要はありません。また、npm はこの公開リポジトリの来歴証明を自動生成します。

パッケージのバージョンを上げて、コミットとタグを push するには次を実行します。

```sh
npm version patch # minor / major も指定できます
git push --follow-tags
```

## ドキュメント

- [OpenCode v2 プラグインガイド](https://opencode.ai/v2/docs/build/plugins)
- [OpenCode プラグイン設定](https://opencode.ai/v2/docs/plugins)
- [OpenCode コマンド](https://opencode.ai/v2/docs/commands)
- [OpenCode の指示と `AGENTS.md`](https://opencode.ai/v2/docs/instructions)
- [プラグイン API リファレンス](https://opencode.ai/v2/docs/api)
- [npm パッケージ](https://www.npmjs.com/package/opencode-design-system)
- [問題を報告](https://github.com/BraveOtter/opencode-design-system/issues)

## ライセンス

このプロジェクトは [MIT ライセンス](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE)で公開されています。

# Mushroom

OpenCode向けのコーディング規則プラグイン。生成するコードを読みやすく、変更しやすく、理由が分かる状態に保つ。

Ponytailに着想を得た独立したプラグイン。Ponytailには依存せず、同時適用は想定しない。

[English README](README.md)

## 導入

```sh
opencode plugin add mushroom-mentor
```

または`opencode.json(c)`の`plugins`へ追加する。

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["mushroom-mentor"]
}
```

ローカル開発では、このディレクトリを`plugins`へ指定する。

## 使い方

| コマンド | 動作 |
| --- | --- |
| `/mushroom` | 有効化する。有効なら維持し、状態を表示する |
| `/mushroom on` | 有効化する |
| `/mushroom off` | 無効化する |
| `/mushroom status` | 状態を変更せず表示する |
| `/mushroom-review [対象]` | コードを変更せずレビューする |
| `/mushroom-help` | 簡単な案内を表示する |

`@mushroom`で規則を参照できる。`@mushroom-review`でコードを変更せずレビューを依頼できる。`@`でスキルを読み込むだけでは状態は変わらない。有効化・無効化には`/mushroom`を使う。

状態はセッション単位。新規セッションはOFFで開始する。`/mushroom`で有効化する。規則は通常のターン、ツール後の継続、圧縮へ適用する。タイトル生成には適用しない。

Ponytailが読み込まれ有効な場合、Mushroomは有効化を拒否し、先に`/ponytail off`を実行するよう案内する。Ponytailの状態は変更しない。

## 規則

規則の原本は`rules/SKILL.md`だけ。

## 開発

```sh
npm install
npm run check    # Biomeとrumdl
npm run verify   # 検査、型検査、テスト
```

[Biome](https://biomejs.dev/)と[rumdl](https://rumdl.dev/)が必要。MD013は`.rumdl.toml`で無効。

## ライセンス

MIT。`LICENSE`を参照。

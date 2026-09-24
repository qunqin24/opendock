# design-compare MCP Server

`design-compare` は、Figmaのデザインモックと実装されたWebページの表示内容を、画像処理および幾何データ比較のプログラムアルゴリズムによって検証するMCP（Model Context Protocol）サーバーです。

従来のピクセル単位の厳密な比較（Pixel Perfect）だけでなく、文字の内容やフォント描画の違いを無視した**「レイアウトや要素の配置テンプレート（骨組み）の再現性」**を検証するための各種モードを提供します。

---

## 1. 4つの検証モード (`mode`)

本ツールは、検証の目的に応じて以下の4つの比較アルゴリズム（モード）を提供します。LLM等の非決定性（結果がブレる）をもたらす生成AI処理は一切使用しません。

| モード名 (`mode`) | 検証アプローチ | 比較対象となるデータ | 主な用途 |
| :--- | :--- | :--- | :--- |
| **`layout_tree`**<br>(構造的比較) | **DOM構造 vs Figma構造** | FigmaとWebそれぞれの要素の幾何位置 (Bounding Box JSON) | 親要素に対する相対的なX, Y, Width, Height比率を算出し、要素の並び順や階層が合っているかをデータレベルで比較します。文字や色の違いを完全に無視して**「配置テンプレート（木）」**を検証します。 |
| **`perceptual`**<br>(知覚的画像VRT) | **空間の明暗配置パターン** | 画像パス / base64 で指定した Figma の画像 vs Web スクショ | 画像を粗く縮小（16x16）してグレースケール化し、Average Hash（aHash）の明暗パターンとして比較します。文字内容やフォント・色の違いを無視し、**「見た目の大まかなレイアウト配置」**が合っているかを判定します。 |
| **`strict`**<br>(厳密画素VRT) | **画素単位のビジュアル比較** | 画像パス / base64 で指定した Figma の画像 vs Web スクショ | pixelmatch アルゴリズム（Go 実装: github.com/orisano/pixelmatch）を用い、画素単位で色の違いを厳密に比較します（既定ではアンチエイリアスの境界は自動除外。`include_aa=true` で AA 境界も差分に含める）。色味や余白、線の太さなど、**微細なビジュアル差異の検知**に使用します。**両画像はピクセル寸法（縦横の画素数）が完全に一致している必要があります。** Retina 環境の DPR（device pixel ratio）差やフルページ撮影などでサイズが異なる場合は `image size mismatch` エラーになるため、同じビューポートサイズと DPR で両スクリーンショットを撮り直すか、サイズの異なる画像も比較できる `perceptual` モードを使用してください。 |
| **`layout_integrity`**<br>(レイアウト崩れ検査) | **Web DOMボックス vs CSSビューポート** | Web側の要素の幾何位置 (Bounding Box JSON) のみ（**Figma不要**） | Figmaのデスクトップ/モバイル フレームがピクセルパーフェクトでも、タブレット幅では崩れることがあります。Web DOMのBounding BoxとCSSビューポートだけを比較し、横方向のはみ出し（`viewport_overflow_x`）と親要素からの逸脱（`parent_overflow`）を検出します。既定は iPad **縦向き 768x1024** CSS px。**横向き 1024x768** は `viewport_preset=ipad_landscape`（または `viewport_width`/`viewport_height`）で検査します。縦スクロール（高さ超え）は失敗にしません。 |

### 差分画像 (`diff_image`) の見方 (`perceptual` モード)

`perceptual` モードのレスポンス `diff_image` は、aHash比較の結果を可視化した **256x256ピクセルのブロック図**（base64 data URI）です。画像全体が 16x16 = 256 個のセルに区切られ、各セル（aHashの1ビットに対応）は 16x16ピクセルの正方形ブロックとして描画されます。

- **赤いセル**: その位置の明暗パターン（画像全体の平均輝度に対して明るいか暗いか）が image A（Figma側）と image B（Web側）で不一致であることを示します。レイアウトの骨組みがズレている箇所の目安になります。
- **赤以外のセル**: 明暗パターンが一致したセルで、image A 側の同じ位置の平均輝度をグレースケールで表示しています。
- `generate_diff` を `false` に指定した場合は差分画像を生成せず、`diff_image` は空文字列で返されます。
- `diff_on_mismatch` を `true` に指定した場合、判定が `success` なら `diff_image` は空文字列、`mismatch` なら差分画像が返されます。
- `diff_image_content` を `true` に指定し、かつ `diff_image` が空でない場合、MCP 応答の `content[0]`（JSON テキスト）の後に `image/png` の image コンテンツが付きます。既定は `false` で、既存クライアントは `content[0]` だけを読めば足ります。
- 不一致セルがある場合、応答に機械可読な `diff_cells`（例: `[{"grid_x": 3, "grid_y": 4}]`）が付きます。座標は 16x16 グリッドの 0–15 で、行優先の決定論的順序です。セル `(x, y)` は画像の `[x/16, (x+1)/16) × [y/16, (y+1)/16)` に対応します（256x256 の `diff_image` では 16x16 ピクセルのブロック）。`generate_diff=false` でも返します。
- 不一致セルがある場合、応答に `diff_region`（画像 A のピクセル座標 `"x,y,w,h"`。`ignore_region` と同じ書式）も付きます。不一致セル全体の bounding box で、セル `bx` は画素 `[bx*W/16, (bx+1)*W/16)` に対応します。不一致が無いときは省略します。

### 差分画像 (`diff_image`) の見方 (`strict` モード)

`strict` モードのレスポンス `diff_image` は、pixelmatch が生成した差分画像（base64 data URI）です。pixelmatch の既定の配色で描画されます（マゼンタ等の色は使われません）。

- **赤いピクセル**: 両画像で色差が `threshold` を超えた差分ピクセル（差分カウント `diff_pixels` の対象）。
- **黄色いピクセル**: アンチエイリアス境界由来と判定され、差分カウントから自動除外されたピクセル（`include_aa=false` の既定時）。`include_aa=true` では AA 境界も差分として数え、黄色除外は行われません。
- **それ以外の領域**: 差分がなかった箇所で、image A（Figma側）の輝度をグレースケール化して白寄りに薄めた階調で表示されます。
- `generate_diff` を `false` に指定した場合は差分画像を生成せず、`diff_image` は空文字列で返されます。このとき算出対象の差分画像が存在しないため、`diff_regions` も応答に含まれません。
- `diff_on_mismatch` を `true` に指定した場合、判定が `success` なら `diff_image` は空文字列、`mismatch` なら差分画像が返されます。
- `diff_image_content` を `true` に指定し、かつ `diff_image` が空でない場合、MCP 応答の `content[0]`（JSON テキスト）の後に `image/png` の image コンテンツが付きます。既定は `false` で、既存クライアントは `content[0]` だけを読めば足ります。
- 差分ピクセルがある場合（`generate_diff` が true のとき）、応答に機械可読な `diff_regions`（例: `[{"x": 0, "y": 0, "w": 100, "h": 100, "diff_pixels": 10000}]`）が付きます。pixelmatch 差分画像の赤いピクセルを 4 近傍連結成分に分割し、bounding box と差分ピクセル数を算出します。差分ピクセル数の多い順に最大 10 件で、座標は画像のピクセル座標です。黄色いアンチエイリアス除外ピクセルは含めません。

### `layout_integrity` モードの検査内容とレスポンス

Figma 比較は「あるキャンバス幅での再現」しか見ないため、iPad 縦向き・横向きのような別幅での崩れは見逃します。`layout_integrity` は **Web の Bounding Box だけ**を見て、指定した CSS ビューポートではみ出していないかを判定します。

- **入力:** `web_layout` または `web_layout_path`（`layout_tree` と同じ WebNode JSON）。`figma_*`・画像・`threshold` / `min_match` / `pass_rate` / `max_diff_pixels` / `include_aa` / `generate_diff` / `diff_image_content` / `count_extra_web` / `max_details` は非対応です。
- **既定ビューポート:** 768×1024 CSS px（`viewport_preset` 未指定 = `ipad_portrait`）。
- **横向き:** `viewport_preset=ipad_landscape`（1024×768）。任意サイズは `viewport_width` / `viewport_height`（0 より大きい値。指定時はプリセットを上書き）。
- **`viewport_overflow_x`:** `x < 0` または `x+w > viewport_width`（1px の丸めは許容）。ビューポート高さ超えはページスクロールとして扱い、失敗にしません。
- **`parent_overflow`:** 子ボックスが親ボックスからいずれかの辺で 1px 超えてはみ出す。親が JSON に無い場合はこの検査をスキップします。
- **合否:** 崩れ 0 件 → `success` / 1 件以上 → `mismatch` / 検査対象がすべて除外 → `skipped`。Web ノードが 1 件もない、または全ノードで `w`/`h` が 0 以下（`width`/`height` 等のキー名ミス疑い）の場合も `mismatch` です。`match_rate` は返しません。
- **応答:** `status`, `mode`, `viewport_width`, `viewport_height`, `checked_nodes`, `issue_count`, `details`, `ignored_count`。崩れがあるとき `issues`（`type` / `selector` / `detail`）。`viewport_preset` を渡したときはエコーします。`unmatched_ignores` / `unmatched_ignore_regions` は該当時のみ。

横向きを検査するときは、ブラウザを **1024×768 にリサイズしたあと** の DOM 座標を渡してください。縦向きで撮った座標に横向きの幅を当てても意味がありません。

---

### 一様画像（ベタ塗り）の警告 (`warnings`)

`perceptual` モードでは、aHash が各画像自身の平均輝度で明暗を2値化するため、一様（単色のベタ塗り）画像は全セルが同一ビットになります。その結果、全面白 vs 全面黒のようなペアでも一致率100%・`success` となり、撮影失敗（真っ黒スクショ等）が無検証で合格する恐れがあります。

image A / B のいずれかが一様と検出された場合、status / match_rate は従来どおり変えず、代わりに応答へ `warnings` フィールド（例: `["degenerate aHash: image A is uniform; perceptual match may be unreliable"]`）を付けて通知します。通常の明暗パターンを持つ画像ペアではこのフィールドは含まれません。

両画像のアスペクト比（幅/高さ）の大きい方と小さい方の比が 2.0 を超える場合も、16x16 への引き伸ばしで幾何が歪むため同じ `warnings` に `aspect ratio mismatch: ...` を追加します。status / match_rate は変えません。

`ignore_region` 指定時に両画像のピクセル寸法が異なる場合も、同じ `x,y,w,h` が各画像自身の座標に当たるため `warnings` に注意を追加します（`details` の注記と同じ趣旨。範囲内なら `out_of_bounds_regions` は出ません）。

`strict` モードでも、差分ピクセル数が 0 かつマスク後の両画像が単色ベタ塗りのとき（真っ白スクショ同士、`ignore_region` による全面マスクなど）、status / match_rate は変えず `warnings` に `degenerate comparison: both images are uniform; strict match may be vacuous (blank capture failure or over-broad ignore_region)` を付けます。透過は perceptual と同じ白背景合成で判定します。通常の明暗パターンを持つ同一ペアではこの警告は付きません。

---

## 2. パラメータリファレンス (`compare_design`)

`compare_design` ツールの全パラメータを以下に示します。`mode`（必須）には `layout_tree` / `perceptual` / `strict` / `layout_integrity` のいずれかを指定します（各モードの詳細は「1. 4つの検証モード (`mode`)」を参照）。なお `strict` では比較前に両画像のピクセル寸法（縦横の画素数）が完全に一致している必要があり、異なる場合は `image size mismatch` エラーになります（同一ビューポート・DPR で撮り直すか `perceptual` モードを使用）。

**注意:** モードごとに意味やスケールが異なるパラメータ（特に `threshold`）があります。また、当該モードでは効果を持たないパラメータ（例: `layout_tree` への `min_match`、`perceptual` への `pass_rate`）を指定すると、比較を実行せずに `parameter 'X' is not supported in mode 'Y'` のツール実行エラーが返ります。パラメータと有効モードの対応表は「9. 破壊的変更」を参照してください。

### 入力データ

| パラメータ | 型 | 対象モード | 説明 |
| :--- | :--- | :--- | :--- |
| `image_path_a` | string | `perceptual` / `strict` | 参照画像 A（Figma 側）のローカルファイルパス。`image_a_base64` と排他で、どちらか一方が必須。対応フォーマット: PNG / JPEG / GIF / WebP（静止画。アニメーション WebP は非対応）。 |
| `image_path_b` | string | `perceptual` / `strict` | 比較対象画像 B（Web 側）のローカルファイルパス。`image_b_base64` と排他で、どちらか一方が必須。対応フォーマット: PNG / JPEG / GIF / WebP（静止画。アニメーション WebP は非対応）。 |
| `image_a_base64` | string | `perceptual` / `strict` | 参照画像 A の base64 エンコード文字列。`data:image/png;base64,...` 形式の data URI も受け付け（`;base64,` までのプレフィックスは自動で除去）。改行・スペース等の ASCII 空白はデコード前に除去する（MIME 76 文字折り返しなど）。`image_path_a` と排他。対応フォーマット: PNG / JPEG / GIF / WebP（静止画。アニメーション WebP は非対応）。 |
| `image_b_base64` | string | `perceptual` / `strict` | 比較対象画像 B の base64 エンコード文字列。`data:image/png;base64,...` 形式の data URI も受け付け（`;base64,` までのプレフィックスは自動で除去）。改行・スペース等の ASCII 空白はデコード前に除去する（MIME 76 文字折り返しなど）。`image_path_b` と排他。対応フォーマット: PNG / JPEG / GIF / WebP（静止画。アニメーション WebP は非対応）。 |
| `figma_layout` | string | `layout_tree` | Figma ノードリストの JSON 文字列（インライン指定）。`figma_layout_path` と排他で、どちらか一方が必須。 |
| `figma_layout_path` | string | `layout_tree` | Figma ノードリスト JSON ファイルのローカルパス。`figma_layout` と排他。 |
| `web_layout` | string | `layout_tree` / `layout_integrity` | Web DOM ノードリストの JSON 文字列（インライン指定）。`web_layout_path` と排他で、どちらか一方が必須。 |
| `web_layout_path` | string | `layout_tree` / `layout_integrity` | Web DOM ノードリスト JSON ファイルのローカルパス。`web_layout` と排他。 |

### 比較条件（閾値・除外・ビューポート）

| パラメータ | 型 | 対象モード | 範囲 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `threshold` | number | `layout_tree` | 0.0–1.0 | 0.15 | BoundingBox の幾何差分（相対座標・相対サイズの L2 距離）に対する許容差。 |
| `threshold` | number | `perceptual` | 1.0–100.0 | 98.0 | 後方互換のため `min_match`（一致率%）のエイリアスとして受け付ける。1.0 未満は strict モードの 0.0–1.0 スケールとの混同を防ぐためエラーになる。`min_match` との同時指定もエラー。**`min_match` の使用を推奨。** |
| `threshold` | number | `strict` | 0.0–1.0 | 0.1 | 色差の許容度（pixelmatch の color diff tolerance）。 |
| `min_match` | number | `perceptual` | 0.0–100.0 | 98.0 | 合格に必要な最低一致率（%）。実効値（`threshold` エイリアス解決後を含む）は応答の `min_match` として常に返される。判定は表示桁（小数第2位）に丸めた一致率に対して行う。 |
| `min_match` | number | `strict` | 0.0–100.0 | なし | 合格に必要な最低一致率（%）。未指定なら判定に使わず `max_diff_pixels` のみで判定する。指定時は `max_diff_pixels` と併用され、どちらか一方でも超過すると `mismatch`。`max_diff_pixels` を省略したまま指定すると既定 0 が判定を支配するため、status / match_rate は変えず応答へ `warnings` を付ける。判定は表示桁（小数第2位）に丸めた一致率に対して行う。 |
| `pass_rate` | number | `layout_tree` | 0.0–100.0 | 98.0 | 合格に必要な最低一致率（%）。判定は表示桁（小数第2位）に丸めた一致率に対して行う。 |
| `max_diff_pixels` | number | `strict` | 0 以上 | 0 | 許容される差分ピクセル数の上限。デフォルトの 0 は「1px でも差分があれば `mismatch`」を意味する。 |
| `include_aa` | boolean | `strict` | true / false | false | `true` の場合、アンチエイリアス境界ピクセルも差分として数える（pixelmatch の IncludeAntiAlias）。既定 `false` は現行どおり AA 境界を差分カウントから除外する。 |
| `ignore_nodes` | string | `layout_tree` / `layout_integrity` | — | 空 | 比較から除外する識別子のカンマ区切りリスト。`layout_tree` では Figma Node ID / Node Name / Web Selector、`layout_integrity` では Web Selector。末尾が `*` のエントリはプレフィックス一致（例: `.ad-*` は `.ad-banner` に一致）として扱われ、命名規則に従うグループを列挙なしで除外できる。どのノードにも一致しなかった除外エントリは `unmatched_ignores` として応答される（プレフィックスエントリは一致ノードが1つも無い場合のみ報告）。全ノードが除外されて比較ペアがなくなった場合は比較を実施せず、status は `skipped`（比較未実施）になる。 |
| `ignore_region` | string | 全モード | — | 空 | 除外する矩形領域。`x,y,w,h`（px 単位、`x,y >= 0`・`w,h > 0`）をセミコロン区切りで列挙（例: `10,20,100,50;200,300,80,60`）。各値は小数可で、格納時に整数へ丸められる。`perceptual` / `strict` では比較前に両画像を白でマスクし、パースできた領域数は応答の `ignored_regions` に常に含まれる。画像と全く交差しない領域は `out_of_bounds_regions` として応答される。`perceptual` で両画像のサイズが異なる場合、同じ `x,y,w,h` は各画像自身のピクセル座標として適用されるため別の領域をマスクし得る（範囲内なら `out_of_bounds_regions` は出ない）。`details` に注記し、`warnings` にも同じ注意を付ける。`layout_tree` / `layout_integrity` では BoundingBox の中心点が領域内にあるノードを除外し（`layout_tree` では両側から、`layout_integrity` では Web ノードを）、除外数は `ignored_count` に加算される（全件除外時は `skipped`）。どのノード中心とも重ならない領域は `unmatched_ignore_regions` として応答される。 |
| `viewport_preset` | string | `layout_integrity` | `ipad_portrait` / `ipad_landscape` | 未指定時は縦向き相当 | iPad 既定サイズ。`ipad_portrait` = 768×1024、`ipad_landscape` = 1024×768。 |
| `viewport_width` | number | `layout_integrity` | 0 より大 | 768 | CSS ピクセルのビューポート幅。指定時は `viewport_preset` の幅を上書きする。 |
| `viewport_height` | number | `layout_integrity` | 0 より大 | 1024 | CSS ピクセルのビューポート高さ。指定時は `viewport_preset` の高さを上書きする。 |
| `count_extra_web` | boolean | `layout_tree` | true / false | false | `true` の場合、どの Figma ノードにもマッチしなかった Web ノード（実装側の余分な要素）を一致率の分母に加算して一致率を下げる。 |
| `max_details` | number | `layout_tree` | 0 以上 | 0 | `details` の最大件数。0（未指定）は無制限。1 以上のとき先頭の summary 行を残したまま指定件数に切り詰め、末尾に `... and N more details omitted (max_details=M)` を付ける。 |
| `generate_diff` | boolean | `perceptual` / `strict` | true / false | true | `false` の場合は差分画像を生成せず、`diff_image` は空文字列で返される。`strict` の `diff_regions` も差分画像が無いため含まれない。 |
| `diff_on_mismatch` | boolean | `perceptual` / `strict` | true / false | false | `true` かつ判定が `success` の場合、応答の `diff_image` を空文字列にする（失敗時の分析用に差分画像は残しつつ、成功時のトークン消費を抑える）。`generate_diff=false` のときはもともと空。 |
| `diff_image_content` | boolean | `perceptual` / `strict` | true / false | false | `true` かつ `diff_image` が空でない場合、JSON テキストの後に MCP image コンテンツ（`image/png`）を付ける。既定は JSON のみ。 |

### `layout_tree` / `layout_integrity` 入力 JSON スキーマ

`figma_layout` / `figma_layout_path` の内容は **FigmaNode オブジェクトの配列**（`layout_tree` のみ）、`web_layout` / `web_layout_path` の内容は **WebNode オブジェクトの配列** の JSON です（`layout_tree` と `layout_integrity` で共通）。

**Figma 側（FigmaNode）:**

| フィールド | 型 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | string | ○ | Figma ノード ID。`parent` の参照先、および `ignore_nodes` の除外対象としても使用される。 |
| `name` | string | ○ | Figma ノード名。details 出力、および `ignore_nodes` の除外対象としても使用される。 |
| `x` / `y` / `w` / `h` | number | ○ | ノードの BoundingBox（Figma キャンバス上の絶対座標とサイズ）。 |
| `parent` | string | — | 親ノードの `id`。省略時は親なしとして扱われる。入力内のどの `id` にも一致しない場合は絶対座標比較へフォールバックし、応答に `unresolved_parent_refs` が付く。 |

**Web 側（WebNode）:**

| フィールド | 型 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `selector` | string | ○ | 要素識別子（CSS セレクタ等）。`parent` の参照先、および `ignore_nodes` の除外対象としても使用される。 |
| `x` / `y` / `w` / `h` | number | ○ | 要素の BoundingBox（ページ上の絶対座標とサイズ）。 |
| `parent` | string | — | 親要素の `selector`。省略時は親なしとして扱われる。入力内のどの `selector` にも一致しない場合は絶対座標比較へフォールバックし、応答に `unresolved_parent_refs` が付く。 |

最小例 — `figma_layout`（`figma_layout_path` で指定するファイルも同じ形式）:

```json
[
  {"id": "1", "name": "Card", "x": 0, "y": 0, "w": 400, "h": 300},
  {"id": "2", "name": "Button", "x": 100, "y": 100, "w": 200, "h": 50, "parent": "1"}
]
```

最小例 — `web_layout`（`web_layout_path` で指定するファイルも同じ形式）:

```json
[
  {"selector": "#card", "x": 0, "y": 0, "w": 400, "h": 300},
  {"selector": "#card button.primary", "x": 100, "y": 100, "w": 200, "h": 50, "parent": "#card"}
]
```

`parent` を持つノードは「親の BoundingBox に対する相対的な位置・サイズ（比率 0–1）」で比較され、レスポンシブなスケール差が吸収されます。親を持たないノード（および幅・高さが 0 の親を持つノード、解決できない `parent`）は絶対座標のまま比較され、比較ペアの片側でも絶対座標なら両側を生ピクセルにそろえます。このとき `threshold`（0.0–1.0、既定 0.15）は比率ではなく **px 差分** に対して適用されます。実比較されたペアのうち絶対座標空間で比較された件数は応答の `absolute_mode_pairs` に入り、`details` にも 1 行注記されます。`parent` が空でないのに解決できない参照は `status` を変えず `unresolved_parent_refs`（例: `Figma: '999'` / `Web: '.foo'`）として応答されます（`unmatched_ignores` と同様の誤用検出）。

`width` / `height` など `w` / `h` 以外のキー名は Unmarshal 時に無視され、幾何値がすべて 0 のノードになります。Figma または Web のいずれかで過半数のノードが幅・高さともに 0 の場合、`status` は変えず応答に `zero_geometry_warning` を付けます（`unmatched_ignores` と同様の誤用検出）。

---

## 3. レスポンスフィールド (`compare_design`)

`compare_design` の成功時レスポンス（ツール実行エラーではない JSON）のフィールドをモード別に示します。合否分岐やリトライは文字列の `match_rate`（例: `"100.00%"`）ではなく数値の `match_rate_value`（0.0–100.0）と `status` を使ってください。

### `status` の取りうる値

| 値 | 意味 | 出るモード |
| :--- | :--- | :--- |
| `success` | 合格（閾値を満たした、または崩れ 0 件） | 全モード |
| `mismatch` | 不合格（閾値未達、または崩れ 1 件以上 / 検査対象なし） | 全モード |
| `skipped` | 比較・検査を実施していない（全ノードが `ignore_nodes` / `ignore_region` で除外された等） | `layout_tree` / `layout_integrity` のみ |

`perceptual` / `strict` に `skipped` はありません。入力エラーやモード非対応パラメータは JSON 応答ではなくツール実行エラー (`IsError: true`) になります。

### 比較モード共通（`layout_tree` / `perceptual` / `strict`）

| フィールド | 型 | 説明 |
| :--- | :--- | :--- |
| `status` | string | 上記の合否。 |
| `mode` | string | 実行したモード名。 |
| `match_rate` | string | 一致率の表示用文字列（`%.2f%%`）。パースせず表示に使う。 |
| `match_rate_value` | number | 一致率（0.0–100.0）。`pass_rate` / `min_match` と直接大小比較できる。 |
| `details` | string / string[] | 人間向けの補足。`layout_tree` は文字列配列、画像モードも配列。 |

`layout_integrity` は Figma 比較ではないため `match_rate` / `match_rate_value` を返しません（`status` / `mode` / `details` は返す）。

### `layout_tree`

| フィールド | 型 | 常に返す | 説明 |
| :--- | :--- | :--- | :--- |
| `matched_nodes` | number | ○ | 一致したノード対数。 |
| `total_nodes` | number | ○ | 分母（比較ペア数。`count_extra_web=true` なら余分な Web ノードも含む）。 |
| `ignored_count` | number | ○ | `ignore_nodes` / `ignore_region` で除外したノード数。 |
| `ignored_nodes` | string[] | 非空時のみ | 除外したノードの識別子（例: `figma:1:23`, `web:#date-banner`）。件数は `ignored_count` と一致する。 |
| `effective_threshold` | number | ○ | 判定に使った BoundingBox 許容差（未指定時は既定 0.15）。 |
| `pass_rate` | number | ○ | 合格に使った最低一致率 %（未指定時は既定 98.0）。 |
| `count_extra_web` | boolean | ○ | 余分な Web ノードを一致率の分母に加算したか（未指定時は既定 `false`）。 |
| `extra_web_count` | number | ○ | どの Figma ノードにもマッチしなかった Web ノード数。 |
| `absolute_mode_pairs` | number | ○ | 実比較ペアのうち絶対座標（生 px）空間で比較された件数。この件数では `threshold` は比率ではなく px に対して適用される。 |
| `unmatched_ignores` | string[] | 非空時のみ | `ignore_nodes` のうちどのノードにも一致しなかったエントリ。 |
| `unmatched_ignore_regions` | string[] | 非空時のみ | どのノード中心とも重ならない `ignore_region`。 |
| `extra_web_nodes` | string[] | 非空時のみ | 余分な Web ノードのセレクタ。 |
| `mismatched_nodes` | object[] | 非空時のみ | tolerance 超過の不一致ペア。`figma_name` / `web_selector` / `diff` / `dx` / `dy` / `dw` / `dh`（`details` の幾何差分と同じ数値）。 |
| `zero_geometry_warning` | string | 非空時のみ | 過半数ノードの `w`/`h` が 0 のときの誤用検出。 |
| `unresolved_parent_refs` | string[] | 非空時のみ | 解決できない `parent` 参照。 |

### `perceptual`

| フィールド | 型 | 常に返す | 説明 |
| :--- | :--- | :--- | :--- |
| `min_match` | number | ○ | 判定に使った最低一致率 %（`threshold` エイリアス解決後を含む。未指定時は既定 98.0）。 |
| `diff_image` | string | ○ | 差分画像の base64 data URI。`generate_diff=false` または `diff_on_mismatch=true` かつ `success` のときは空文字列。 |
| `total_blocks` | number | ○ | aHash セル総数（常に 256）。 |
| `diff_blocks` | number | ○ | 不一致セル数。 |
| `image_size_a` / `image_size_b` | string | ○ | 各画像のピクセル寸法（例: `"800x600"`）。 |
| `ignored_regions` | number | ○ | パースできた `ignore_region` の件数。 |
| `warnings` | string[] | 非空時のみ | 一様画像・アスペクト比差、および `ignore_region` 指定時の画像サイズ差など。`status` / `match_rate` は変えない。 |
| `out_of_bounds_regions` | string[] | 非空時のみ | 画像と交差しない `ignore_region`。 |
| `diff_cells` | object[] | 非空時のみ | 不一致セルの `{grid_x, grid_y}`（16x16、0–15）。 |
| `diff_region` | string | 非空時のみ | 不一致セルの bounding box（画像 A の `"x,y,w,h"`）。 |

### `strict`

| フィールド | 型 | 常に返す | 説明 |
| :--- | :--- | :--- | :--- |
| `total_pixels` | number | ○ | 比較したピクセル総数。 |
| `diff_pixels` | number | ○ | 色差が `threshold` を超えた差分ピクセル数（既定ではアンチエイリアス除外後。`include_aa=true` なら AA 境界も含む）。 |
| `min_match` | number | 指定時のみ | 指定したときだけ判定に使い、応答へ echo する。 |
| `diff_image` | string | ○ | pixelmatch 差分画像の base64 data URI。生成しない場合は空文字列。 |
| `image_size` | string | ○ | 両画像共通のピクセル寸法。 |
| `effective_threshold` | number | ○ | 判定に使った色差許容（未指定時は既定 0.1）。 |
| `ignored_regions` | number | ○ | パースできた `ignore_region` の件数。 |
| `warnings` | string[] | 条件付き | 両画像が単色ベタ塗りで差分 0 のとき（空洞比較）、および `min_match` のみ指定し `max_diff_pixels` を省略したとき（既定 0 が判定を支配する旨）。 |
| `out_of_bounds_regions` | string[] | 非空時のみ | 画像と交差しない `ignore_region`。 |
| `diff_regions` | object[] | 非空時のみ | 赤い差分ピクセルの bounding box（`generate_diff` が true のとき）。 |

### `layout_integrity`

§1 の「応答」と同じ。`status` / `mode` / `viewport_width` / `viewport_height` / `checked_nodes` / `issue_count` / `details` / `ignored_count`。崩れがあるとき `issues`。`viewport_preset` 指定時はエコー。`unmatched_ignores` / `unmatched_ignore_regions` は該当時のみ。

---

## 4. 開発とビルド方法

### 前提条件
- Go 1.26 以上

### ビルド手順
リポジトリルートで以下のコマンドを実行し、バイナリをコンパイルします。

```bash
go build -o design-compare
```

### CLI ワンショット比較

引数付きで起動すると MCP ハンドシェイクなしで `compare_design` を1回実行し、ツールと同じ応答 JSON を stdout に出して終了します（`0` = success / `2` = mismatch / `1` = エラー）。エラー（`1`）時のエラー本文は、stdout を JSON としてパースする呼び出し側を壊さないよう stderr に出ます。引数なし起動は従来どおり stdio MCP サーバーです。

```bash
./design-compare --mode strict --image-a a.png --image-b b.png
./design-compare --mode layout_tree --figma-layout-file figma.json --web-layout-file web.json
./design-compare --help
```

主なフラグ: `--mode` / `--image-a` / `--image-b` / `--figma-layout-file` / `--web-layout-file` / `--threshold` / `--min-match` / `--pass-rate` / `--max-diff-pixels` / `--include-aa` / `--ignore-region` / `--generate-diff`

### 単体テストの実行
ブラウザの起動を必要としない超高速なメモリ内画像/ツリーデータ検証テストが実行できます。

```bash
go test -v ./...
```

---

## 5. 各種ツール（Codex / Claude）へのセットアップ手順

本サーバーは、Codexのローカルプラグインとして動作するほか、Claude DesktopやClaude Codeなどの一般的なMCPクライアントにインポートして使用することができます。

### A. Codex（Piプラグイン）としてインストールする場合
1. **`~/.codex/config.toml` にローカルマーケットプレイスを設定:**
   ```toml
   [marketplaces.design-compare-marketplace]
   source_type = "local"
   source = "/Users/username/workspace/design-compare" # リポジトリへの絶対パス
   ```
2. **Codex CLIでプラグインをインストール:**
   ```bash
   codex plugin add design-compare@design-compare-marketplace
   ```

### B. Claude Desktop に追加する場合
設定ファイル（Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`）の `mcpServers` セクションに以下の設定を追記します。

```json
{
  "mcpServers": {
    "design-compare": {
      "command": "/Users/username/workspace/design-compare/design-compare"
    }
  }
}
```

### C. Claude Code (CLI) に追加する場合
以下のコマンドを実行して、MCPサーバーとして追加します。

```bash
claude mcp add design-compare "/Users/username/workspace/design-compare/design-compare"
```

### D. Pi に追加する場合
npm からインストールすると、`compare_design` ツールと `design-compare` スキルが有効になります。初回ロード時に Go バイナリをビルドするため、利用マシンに **Go 1.26 以上** が必要です。

```bash
pi install npm:design-compare
pi update npm:design-compare   # 更新
pi remove npm:design-compare   # アンインストール
```

---

## 6. 全自動でのデザイン検証ワークフロー

有効化されると、AIエージェントは自動的に他のツール（Figma MCPやChrome-DevTools MCP）と連携して、ログイン状態などを維持したまま全自動でVRT/構造検証を実行します。

### プロンプト例:
> 「Figmaのこのデザイン（Figma URL）と、ローカルの http://localhost:3000/dashboard を比較して。テンプレート（配置）が同じかどうかを検証したい」

### AIの自律的な処理フロー:
1. **デザインデータの取得:**
   AIが `figma` MCPを使ってデザイン画像やレイアウト座標（JSON）を取得。
2. **実装データの取得:**
   AIが `chrome-devtools` MCP等を使ってWebページを自動操作（必要なら自動ログイン）し、実装された要素のスクショやDOM座標（JSON）を取得。
3. **比較の実行:**
   AIが本ツールの `compare_design` を呼び出して比較を実行。
   * 例: `compare_design(mode="layout_tree", figma_layout="...", web_layout="...", pass_rate=95.0)`
   * 加えて、ブラウザを iPad 縦向き 768×1024 と横向き 1024×768 にリサイズして DOM を取り直し、`mode="layout_integrity"`（横向きは `viewport_preset="ipad_landscape"`）で崩れを検査する。
4. **結果の分析とコード修正:**
   AIが一致率や差分を分析し、レイアウトがズレているCSSやHTMLを自動で修正・再検証します。

---

## 7. 注意・制限事項 (環境による表示の揺らぎ)

比較アルゴリズム（ハッシュ計算や幾何判定）自体はプログラムとして決定論的ですが、以下の**プラットフォーム固有のレンダリング差（非決定的な要素）**により、同じWebコードであっても実行マシンによって比較結果に微細なブレが生じる場合があります。

1. **OS/ブラウザによるフォントレンダリングの差:**
   フォントエンジン（MacのCoreText、LinuxのFreeTypeなど）の違いにより、文字のピクセル位置やアンチエイリアスの太さが微妙に変化します。
2. **ディスプレイ解像度 (DPI) の差:**
   Retinaディスプレイ環境と非Retina環境では、スクリーンショットの画素数や縮小処理時のブレンドピクセルが変化します。
3. **GPUハードウェアアクセラレーションの差:**
   ブラウザのGPUレンダリングによって、グラデーションや色の境界部分で数カラー値の微差が生じることがあります。
4. **巨大画像:** `perceptual` / `strict` はフルデコード前にヘッダ寸法を確認し、各辺 30,000px または総ピクセル 50,000,000 を超える入力は展開せずエラーにする（フルページ撮り直しミスなどによる OOM 防止）。超過時はリサイズまたは切り出しが必要。

---

## 8. セキュリティ上の注意（信頼モデル）

本サーバーはローカル実行のMCPサーバーとして設計されています。以下のパラメータで指定された
ファイルパスはそのまま解決され、**サーバープロセスの権限で**ローカルファイルシステムから
読み込まれます（ディレクトリ制限やサンドボックス化は行われません）。

- `image_path_a` / `image_path_b`（`perceptual` / `strict` モード）
- `figma_layout_path`（`layout_tree` モード）
- `web_layout_path`（`layout_tree` / `layout_integrity` モード）

そのため、信頼できない入力に由来するパスをこれらのパラメータに渡す構成（例: 不特定多数の
ユーザー入力をMCPクライアント経由で渡す、サーバーをネットワーク越しに公開する）では、
任意のローカルファイルを読み取られる可能性があります（パストラバーサル的な読み取り）。

安全に利用するための指針:

1. 本サーバーを呼び出すMCPクライアント（Claude Desktop / Claude Code / Codex など）は、
   ユーザー自身が設定した信頼できるものに限定してください。
2. 本サーバーを信頼できないネットワーク越しに公開しないでください。
3. 信頼できない入力を扱うシステムからファイルを渡す必要がある場合は、パスではなく
   内容を直接渡せる `image_a_base64` / `image_b_base64`（base64文字列）や
   `figma_layout` / `web_layout`（インラインJSON）を使用してください。

---

## 9. 破壊的変更 (Breaking Changes)

### `diff_image_path` → `diff_image` （フィールド名変更）

`perceptual` モードのレスポンスにおいて、差分画像のフィールド名を `diff_image_path` から `diff_image` に変更しました。`strict` モードと命名を統一し、いずれのモードでも base64 data URI 形式で返却するようになりました。

**影響:** 既存クライアントが `diff_image_path` を参照している場合、フィールド名の更新が必要です。

なお `generate_diff` を `false` に指定した場合は差分画像を生成せず、`diff_image` は空文字列で返されます。

### モード非対応パラメータの明示的エラー化

従来は、モードごとに効果を持たないパラメータ（例: `perceptual` / `strict` モードへの `ignore_nodes`、`layout_tree` モードへの `max_diff_pixels`、`perceptual` モードへの `pass_rate`）を指定しても警告なく無視され、呼び出し側は「除外・合格ラインが効いているつもり」のまま判定結果を受け取る状態でした。

これを防ぐため、モードごとのパラメータ許可マップによる照合を導入しました。非対応モードでパラメータを指定すると、比較を実行せずに `parameter 'X' is not supported in mode 'Y'` のツール実行エラー (`IsError: true`) を返します。

各パラメータが有効なモード:

| パラメータ | 有効なモード |
| :--- | :--- |
| `image_path_a` / `image_path_b` / `image_a_base64` / `image_b_base64` | `perceptual`, `strict` |
| `figma_layout` / `figma_layout_path` | `layout_tree` |
| `web_layout` / `web_layout_path` | `layout_tree`, `layout_integrity` |
| `ignore_nodes` | `layout_tree`, `layout_integrity` |
| `count_extra_web` / `pass_rate` / `max_details` | `layout_tree` |
| `ignore_region` | `layout_tree`, `perceptual`, `strict`, `layout_integrity` |
| `generate_diff` / `diff_on_mismatch` / `diff_image_content` / `min_match` | `perceptual`, `strict` |
| `max_diff_pixels` / `include_aa` | `strict` |
| `threshold` | `layout_tree`, `perceptual`, `strict` (`perceptual` では `min_match` の後方互換エイリアスとして 1.0–100.0 を受け付ける。`min_match` との同時指定は不可) |
| `viewport_preset` / `viewport_width` / `viewport_height` | `layout_integrity` |

**影響:** 既存クライアントがモード非対応のパラメータを渡していた場合、それらの呼び出しはエラーになります。該当パラメータを除外するか、対応するモードで指定し直してください。

### perceptual モードの `min_match` と `threshold` の同時指定

従来は `perceptual` モードで `min_match` と `threshold` を同時に渡すと、`threshold` は範囲検証もされず黙って無視され、`min_match` のみで判定されていました。呼び出し側は `threshold` が効いているつもりで結果を受け取り、誤った確信を得る状態でした（例: `threshold=0.1` は `min_match` 未指定時には strict スケールとの混同としてエラーになる値でも、同時指定では無視されていました）。

これを防ぐため、`image_path_a` と `image_a_base64` と同様に相互排他とし、同時指定時は比較を実行せずに `only one of min_match and threshold can be specified` のツール実行エラー (`IsError: true`) を返します。`threshold` 単独指定の後方互換は維持されます。

**影響:** 既存クライアントが `perceptual` モードで両方を渡していた場合、どちらか一方に揃えてください。新規呼び出しでは `min_match` を使ってください。

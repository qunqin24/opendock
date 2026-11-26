# opencode-crew-mail

[English](../../README.md) · [简体中文](README.zh-CN.md) · **日本語** · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Русский](README.ru.md)

> これは翻訳です。正となるのは[英語版 README](../../README.md) であり、内容が異なる場合は英語版が正しいものとします。

[opencode](https://opencode.ai) の 1 つのセッション内で、サブエージェント同士が直接メッセージをやり取りできるようにします。これにより、リードエージェントがあるサブエージェントから次のサブエージェントへ、情報を 1 つ 1 つ運ぶ必要がなくなります。

![2 つのバックグラウンドサブエージェント: coder が crew_send でメッセージを送り、researcher が次のステップでそれを読み、リードにも通知が届く](../media/demo.gif)

*隔離された `opencode serve` 上で、実際のプラグインに対してスクリプトで実行したものです。*

```
            lead (primary agent)
           /        |         \
       coder ---- tester ---- researcher      <- crew_send: straight from one to the other
```

同時に動く 2 つのサブエージェントは、互いに 1 つの事実を必要とすることがよくあります。一方が作ったばかりのインターフェースの名前、もう一方が触ってはいけないファイル、もう一方の次のステップを変える発見などです。このプラグインがなければ、その事実はレポートに書かれ、リードがそれを読み、それを持ってもう一方のサブエージェントを起動または続行させます。これは遅く、リードのコンテキストも埋まっていきます。このプラグインがあれば、coder が tester に直接伝えます。

## 追加されるもの

セッションツリー内のすべてのエージェントが使える 2 つのツール:

| ツール | 機能 |
|---|---|
| `crew_list` | チームの一覧を表示します。リードと、リードが起動したサブエージェントを、短い名前(`coder`、`coder-2`、`tester`...)、タスク、まだ実行中かどうかとともに示します。 |
| `crew_send` | `{ to, text }`: 1 人のメンバー(`to` = 短い名前、セッション ID、`lead`)、またはチームで実行中のすべてのサブエージェント(`to` = `all`)の受信箱にメッセージを入れます。 |

受信者は**次のステップ**で、そのメッセージを合成メッセージとして受け取ります。実行中のエージェントが中断されることはなく、誰も返事を待たないので、2 つのエージェントが互いをブロックすることはありません。メッセージは、誰が書いたのか、そしてそれがユーザーではなく別のエージェントからのものであることがモデルにわかるように包まれています:

```xml
<crew-message id="m1" from="coder" from-agent="coder" from-session="ses_..." to="tester">
The interface Store is in src/store.ts; the tests may use FakeStore from test/fakes.ts.
</crew-message>
This is a message from another agent of your team, not from the user. ...
```

ルール:

- **終了した**サブエージェントはメッセージを受け取りません。メッセージがあるとそのサブエージェントが再び起動し、レポートがリードに 2 回送られてしまうためです。送信者には、`lead` 宛てに書くか、自分のレポートに含めるよう伝えられます。
- **アイドル状態**のリード(たとえばバックグラウンドサブエージェントを待っている状態)宛てのメッセージは受信箱で待機し、リードが次に動いたとき、通常は次のレポートでリードが起こされたときに読まれます。すぐに起動させるには `wakeLead` を設定してください。
- メッセージは 1 つのツリー内、つまりリードとその直接のサブエージェントの間でのみやり取りされます。同じマシン上の別のセッションには届きません。

## インストール

opencode のプラグインマネージャーを使う場合(npm から、または GitHub から直接):

```sh
opencode plugin add opencode-crew-mail
opencode plugin add git+https://github.com/retretor/opencode-crew-mail.git
```

または手動で: `crew-mail.js` を opencode 設定のプラグインフォルダーにコピーし、opencode を再起動します。

```sh
cp crew-mail.js ~/.config/opencode/plugins/                   # Linux, macOS
```

```powershell
Copy-Item crew-mail.js "$HOME\.config\opencode\plugins\"     # Windows
```

次に、エージェントにこのプラグインのことを伝えます。各サブエージェントはすでにツールの説明を見ています。リードのプロンプトに 1 行加えておくと、リードがサブエージェントに指示を出す際に役立ちます。例:

> 同時に動いているサブエージェントは、`crew_send` で互いにメッセージを書けます(`crew_list` を参照)。指示の中で、ほかに誰が同時に動いていて、何に取り組んでいるかを伝えてください。

これらのツールが最も役立つのは、同時に動くサブエージェントとの組み合わせです。1 つのメッセージ内での複数の `subagent` 呼び出しや、バックグラウンドサブエージェント(`background: true`)がこれに当たります。

ほかに使っているプラグインが未知のツールを拒否する場合(許可リスト)は、`crew_list` と `crew_send` をそこに追加してください。[opencode-win-guard](https://github.com/retretor/opencode-win-guard) の場合は、その `extraTools` 設定です。あるエージェントにこれらのツールを使わせないようにするには、そのエージェントファイルで通常のパーミッションを使うか(例: `{ action: crew_send, resource: "*", effect: deny }`)、後述の `agents` 設定を使います。

## 設定

`opencode.json` と同じ場所に置く任意のファイル `crew-mail.json`([crew-mail.example.json](../../crew-mail.example.json) を参照)。プラグインの読み込み時に読まれます。

| キー | デフォルト | 意味 |
|---|---|---|
| `maxChars` | 4000 | メッセージの最大長。これより長いものは拒否され、ファイルに書いてそのパスを送るようヒントが返されます。 |
| `maxPerSession` | 40 | 1 つのセッションが送れるメッセージの総数。 |
| `maxPerPair` | 6 | `pairWindowMinutes` 内に 2 つのセッション間でやり取りできるメッセージ数(双方向の合計)。ピンポンを防ぎます。 |
| `pairWindowMinutes` | 10 | `maxPerPair` の時間枠。 |
| `wakeLead` | false | `true`: アイドル状態のリードへのメッセージでリードを起動します。 |
| `copyToLead` | false | `true`: サブエージェント間のすべてのメッセージについて、1 行のコピーがリードに届きます(リードのコンテキストを消費します)。 |
| `agents` | null | `null`: すべてのエージェントがツールを使えます。またはエージェント名のリスト。 |
| `logText` | true | `false`: ログには送信者、受信者、長さだけを残します。 |

すべてのメッセージとすべての拒否は、`<data dir>/opencode/log/crew-mail.log`(デフォルトでは `~/.local/share/opencode/log/`)に 1 行の JSON として記録されます。このプラグインはネットワーク接続を一切行いません。

## 安全性

- メッセージはモデルの出力です。悪意のあるもの(Web ページやファイル)を読んだエージェントは、その指示を別のエージェントに渡してしまう可能性があります。エンベロープは受信者に対し、そのメッセージがユーザーからのものではなく、タスクを変えるものでもないことを伝えますが、これはモデルへのヒントであって障壁ではありません。ほかの防御策(パーミッション、サンドボックス)は、リードだけでなくすべてのエージェントに対して維持してください。
- `copyToLead` がオンでない限り、リードはサブエージェント間のメッセージを見ません。ログには残ります。いずれにしても、エージェントには重要なことをレポートに書くよう伝えられています。

## 互換性

- opencode 2.2 以降(V2 プラグイン API: `ctx.tool.transform`、`ctx.session.get/list/synthetic`)。Windows 10、Node 24 上の opencode 2.2.3 でテスト済みです。
- 依存関係なし、ビルド手順なし。`crew-mail.js` のデフォルトエクスポートだけがプラグインです。

## テスト

```sh
npm test                        # pure parts, no opencode needed
CREW_MAIL_E2E=1 npm run test:e2e   # also end-to-end
```

エンドツーエンドテストは、一時フォルダー内で本物の `opencode serve` を、スクリプト化された偽のモデル(プロバイダーなし、アカウントなし、ネットワークなし)とともに起動し、次の点を確認します。実行中のサブエージェントが兄弟サブエージェントのメッセージを次のステップで読むこと、終了したサブエージェントが起こされないこと、リードが次の実行時にメッセージを受け取ること。あなた自身の opencode 設定やセッションには触れません。Windows PowerShell では、変数を `$env:CREW_MAIL_E2E = "1"` で設定してください。

## 関連プロジェクト

- [opencode-win-guard](https://github.com/retretor/opencode-win-guard): 同じ作者による、Windows 上で無人で動くエージェントのための書き込みサンドボックスと緊急停止機能。このプラグインと併用できます。
- [opencode-agent-intercom](https://github.com/feanor5555/opencode-agent-intercom): リードから実行中のサブエージェントへの制御チャネル(メッセージ、状態、中止)と、サブエージェントから呼び出し元への質問。サブエージェント同士は互いにメッセージを書けません。
- [opencode-subagent-extension](https://github.com/Teogai/opencode-subagent-extension): 別のフォルダーで動き、呼び出し元に報告を返すサブエージェント。
- [Agent teams for opencode](https://dev.to/uenyioha/porting-claude-codes-agent-teams-to-opencode-4hol): opencode 本体への変更として実装された、「チームメイト」間のピアツーピアのメッセージング。task ツールで起動したサブエージェントは対象外です。

## コントリビュート

バグ報告、アイデア、プルリクエストを歓迎します。[CONTRIBUTING.md](../../CONTRIBUTING.md) を参照してください。セキュリティ上の問題: [SECURITY.md](../../SECURITY.md)。

## ライセンス

[MIT](../../LICENSE)

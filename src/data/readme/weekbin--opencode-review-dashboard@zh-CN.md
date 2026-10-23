# opencode-review-dashboard

[English](README.md) | 中文

一个跑在浏览器里的代码审查工具，给 [OpenCode](https://opencode.ai) 用。在浏览器里看 diff、写评论、标 finding，然后让 AI agent 去改代码 —— 全程不用离开编辑器。

如果你经常要 review PR 或 diff，这个工具能省掉在 GitHub 评论框里复制粘贴的麻烦。

---

## 看起来是什么样的

### 看 diff

![Dashboard 概览，左侧是文件树，右侧是渲染的 diff](docs/screenshots/dashboard-overview.png)

*改过的文件高亮，没碰过的文件淡灰色显示。*

### 隐藏空白噪音

![Diff 面板开启 Ignore ws 之后 — 连续的空白被折叠成单个空格](docs/screenshots/r16-hide-whitespace-on.png)

*点工具栏的 `Ignore ws`，把连续空白折叠成单个空格并去掉行尾空格。纯格式调整（tab↔space、缩进宽度）就会从 diff 中消失。设置在 reload 后保持。*

### 一键展开或折叠

![Diff 面板工具栏，全局 Expand all / Collapse all 按钮在 diff 面板顶部](docs/screenshots/r16-diff-toolbar.png)

*两个按钮一键切换所有文件的折叠上下文设置。30 个文件的 diff 想要快速扫一遍，按一下就展开。*

### 加 finding 和 emoji 反应

![Finding 卡片，显示评论、类别、严重程度、emoji 反应行](docs/screenshots/r12-conversation-with-finding.png)

*点行号加 finding。一键 emoji 反应快速反馈。*

### 一键复制 finding 为 Markdown

![Finding 卡片的 Copy as MD 按钮在操作行中高亮](docs/screenshots/r16-conversation-copy-as-md.png)

*点一下，整段自包含的 Markdown 片段（轮次标签、文件:行永久链接、评论、修改次数、反应）就到剪贴板了。直接粘贴到 PR 评论、Slack 聊天或 Notion 文档。*

### 过滤和排序 Conversation

![Conversation tab，★ Pinned 过滤 chip、Sort 下拉、Reacted 过滤](docs/screenshots/r15-s1-conversation-pinned-sort.png)

*星标 finding 下一轮回看。按严重程度排序优先处理。*

### 在 diff 内搜索

![In-diff 搜索栏在 diff 面板右上角，带上下导航和匹配计数](docs/screenshots/r13-in-diff-search.png)

*`Ctrl+F`（Mac `Cmd+F`）在已加载 diff 里找任意文本。*

### 提交前确认

![Submit review 确认弹窗，显示「Submit review?」加 Cancel / Submit 按钮](docs/screenshots/r15-s4-submit-confirm.png)

*提交前的二次确认，防止误操作丢工作。*

### 轮次笔记移到提交弹窗里

![Submit Review 弹窗打开，里面有 round notes 文本框](docs/screenshots/r17-notes-in-submit-modal.png)

*轮次笔记移到了提交弹窗里，你写完直接发，不需要先记在别的地方再复制粘贴。自动保存到和审查项同一个草稿。*

### 审查已锁定 banner

![审查已锁定 banner，显示第 1 轮后锁定](docs/screenshots/r132-lock-banner-light.png)

*最后一次通过审查后，整个会话进入锁定状态：统计标签页顶部出现绿色 banner，显示锁定状态和轮次。banner 上的相对时间戳也是双语的（"1m ago" / "1 分钟前"）。锁定期间所有写入端点（resolve、reaction、draft、submit）都会返回 409，防止误操作改动已通过的审查。*

### 切换语言（英文 / 中文）

![工具栏上的语言切换按钮，显示 EN | 中文](docs/screenshots/r19-s1-dashboard-initial.png)

*点击工具栏上的语言切换按钮即可在中英文之间切换。你的选择会通过 localStorage 持久化，刷新后仍然保留。工具栏按钮、侧边栏标签、弹窗文本、以及按钮的 tooltip / aria-label 都会响应式更新（6 个工具栏按钮的 tooltip——outline / zoom / navigate / edit / LSP diagnostics / apply patch——都是双语的标题和标签）。*

### 操作触发的轻量 Toast 通知

| 截图 | 说明 |
|---|---|
| ![Toast 确认 finding 已添加](docs/screenshots/r24-s1-toast-added-review.png) | Finding 已添加 |
| ![Toast 确认 permalink 已复制](docs/screenshots/r24-s2-toast-copied-permalink.png) | Permalink 已复制 |
| ![Toast 确认 Markdown 已复制](docs/screenshots/r24-s3-toast-copied-markdown.png) | Markdown 已复制 |
| ![Toast 确认 review 已提交](docs/screenshots/r24-s4-toast-submitted-review.png) | Review 已提交 |

*右上角会出现 3 秒自动消失的确认 toast。屏幕阅读器通过 `aria-live="polite"` 朗读这些通知。替代了 R14 时期过于侵入式的旧 toast，提供更轻量的反馈。*

### 自动保存指示器

![头部显示自动保存指示器「All changes saved」](docs/screenshots/r24-s5-autosave-indicator.png)

*头部显示「Saved 3s ago」，原地更新。不再使用过于侵入式的「Draft saved at 12:34:56」toast。带有 `role="status"`，让屏幕阅读器朗读保存状态。*

### 更好的键盘与屏幕阅读器可访问性

*每页顶部都有「跳到主要内容」链接。侧边栏标签带有正确的 `role="tablist"` / `role="tab"` ARIA 语义。所有弹窗都启用焦点陷阱，并支持 Escape 键关闭。*

### 侧边栏审查进度指示器

![侧边栏显示「1 / 3 reviewed (33%)」进度计数器](docs/screenshots/r20-s1-progress-1of3.png)

*侧边栏顶部有实时计数器 —「X / Y reviewed (Z%)」并配有一条细长的进度条 — 这样你可以一眼看出已经审查过多少文件。点击文件卡上的 read 按钮后计数器会立即更新。*

### 仅显示未审查文件

![侧边栏筛选 chip「仅显示未审查」 — 已审查的文件被隐藏](docs/screenshots/r20-s2-filter-active.png)

*在侧边栏顶部切换「仅显示未审查」chip 来隐藏已经标记为已审查的文件。状态在刷新后会保留。和 GitLab MR 的「Hide reviewed」开关一致。*

### 最近搜索下拉

![聚焦的 diff 搜索栏显示最近搜索下拉](docs/screenshots/r20-s1-progress-1of3.png)

*聚焦 diff 搜索栏（`Ctrl+F` / `Cmd+F`）会显示你最近 5 次搜索作为下拉菜单。点击任何最近搜索可重新运行。状态在刷新后会保留。*

### 搜索历史智能提交

*搜索历史现在会对中间按键做 debounce（300ms 静默期），只在你按 Enter 或停止输入 300ms 后提交最终查询。再也不会有「f」「fn」「fun」这种中间态把最近搜索列表搞乱。对齐 GitHub 的 `Cmd+K` 面板和 VS Code 的搜索历史行为。*

### 一键清空最近搜索

*点击最近搜索下拉头部的「清空」按钮，一键清空整个搜索历史。对齐 GitHub 的 `Cmd+K` → 「Clear all」和 VS Code 的搜索历史 Clear 按钮。Toast 确认操作。Pending 的 debounce commit 会被取消，确保下拉保持空白。*

### 设置面板（集中偏好）

*点击头部 ⚙ 按钮打开集中偏好面板，4 个分区：外观（主题：浅色/自动/深色 + diff 虚拟化 toggle）、布局（合并/分屏）、搜索（历史最多条数）、语言（英文 / 中文）。工具栏 toggle 仍然作为快速开关可用；设置面板是完整控制的规范入口。带「恢复默认」按钮。*

### 1000+ 行文件 diff 虚拟化

*基于 IntersectionObserver 的 hunk 虚拟化。只有可见 hunk 完整渲染；屏幕外的 hunk 折叠成占位符。即使 5000+ 行文件也能流畅滚动。在设置（外观分区）中可切换 —— 关闭后立即渲染所有 hunk。对齐 GitHub Turbo Frames / VS Code 虚拟化编辑器 / Phabricator chunked diffs*

### 批量删除最近搜索（多选）

*最近搜索下拉的每个条目现在都有一个 checkbox。勾选你想要删除的条目，然后点「删除选中」即可只删除这些（保留其他有用的条目）。当 ≥1 条目被选中时，「清空」按钮会被「删除选中」替换。当 0 条目被选中时，「清空」按钮照常工作。对齐 Chrome 历史记录多选删除和 VS Code 搜索多选清空。*

### 批量标记侧边栏文件已审查

*侧边栏的每个文件卡片都有 checkbox。勾选已审查的文件，然后点「标记选中为已审查」即可一次性全部标记。审查进度计数器（X/Y 已审查）立即更新。对齐 GitHub PR 文件树多选。*

### 从历史中删除单条

*最近搜索下拉的每个条目都有一个 × 按钮，可单独删除某条而不清空整个历史。对齐 GitHub per-PR hide / VS Code per-file delete / Chrome per-entry delete。*

### 批量删除 Conversation tab

*Conversation tab 的每个 finding 卡片现在都有 checkbox。勾选你想要删除的 findings，然后点「Delete selected」即可一次性全部删除。当前 tab 和 filter 会被保留。对齐 GitHub PR comments multi-select / VS Code problems panel multi-select。*

### 从历史复制轮次笔记

![复制轮次笔记按钮，点击后显示已复制反馈 toast](docs/screenshots/r137-copy-round-notes.png)

*历史讨论 tab 里每一轮的轮次笔记旁边都有一个「复制笔记」按钮。点击后把当前轮的笔记复制到剪贴板——按钮短暂显示 ✓ 标记，toast 提示「已复制本轮笔记」。当你想复用上一轮的笔记作为当前轮模板时很有用。*

### IME 安全的搜索

![搜索框激活了中文 IME 组合输入](docs/screenshots/r17-ime-composition.png)

*所有五个搜索输入（Files、Conversation、Previously discussed、In-diff、Cmd+P 面板）在 IME 组合输入时都能正常工作。按 `Ctrl+F` / `Cmd+F` 输中文不会丢按键。*

### 键盘快捷键一目了然

![Cmd+/ 帮助弹窗打开，显示快捷键网格](docs/screenshots/r17-help-overlay.png)

*按 `Cmd+/`（或 `Ctrl+/`）打开键盘快捷键覆盖层。10 个最常用的快捷键，两列网格排列。*

---

## 它能做什么

**在浏览器里看 diff。** 你所有的改动（已 commit + 未 commit）都渲染在同一个页面上。没改动的区域默认折叠起来，点一下展开。还没碰过的文件是淡灰色显示，一眼就能看出改了什么。

**加 finding。** 点行号，输入评论，选类别（bug / style / performance / question / recommendation），选严重程度（high / medium / low），完事。finding 会存到 state 文件里。也可以加 file 级 finding（不绑定到具体行号），给整体反馈用。

**评论线程。** 每个 finding 可以有多条评论 —— 你和 agent 来回讨论修改方案时很有用。finding 有状态：open / resolved / stale（绑定的行跨轮次变了的话自动标 stale）。

**多轮审查。** 你提交一轮，agent 去修，然后你开始下一轮覆盖在它的修复之上。前几轮的 finding 通过专门的"Previously discussed" tab 都能看到 —— 你在 review 第 4 轮时能看到第 1 轮讨论了什么。

**AI agent 自动修复。** agent 读你的 finding，做计划，应用修复，验证。你可以在同一轮里迭代：提交，agent 应用，刷新浏览器看 diff，再加 finding 或 resolve 喜欢的。

**Worktree 自动识别。** 如果你在 git worktree 里干活，工具能自动识别你在哪个 worktree。不用传 `--worktree` 参数。

---

## 项目规则

### 不使用 GitHub Actions / 不在远端跑 CI

本项目**不使用** GitHub Actions、GitLab CI、Vercel、Netlify、Render 或任何其他远端 CI / 部署平台。所有检查（format、lint、typecheck、test、机械卫生检查）一律**在本地**通过 Husky 的 pre-commit hook ([`.husky/pre-commit`](.husky/pre-commit)) 执行。每次 `git commit` 时 hook 自动触发，任意一项失败都会阻止 commit。

如果想在 commit 之前先看看 CI 风格的反馈，可以手动跑：

```bash
bash .husky/pre-commit   # 完整 gate
bun run check           # format:check + lint + typecheck
bun test                # 132 个文件里的 1119 个测试
```

`git push` 之后**不会**触发任何 workflow。这是故意为之——pre-commit hook 在 commit 时就拦下了问题，根本不会离开你的机器。如果你觉得需要远端 CI，**不要加**，而是扩展 `.husky/pre-commit`。

---

## 功能列表

### 看 diff

- **未改动区域可折叠** —— 长 diff 也能扫读
- **sidebar 显示改动文件数** —— 一眼看出 scope
- **支持行级 + 文件级 diff** —— 都支持
- **Diff 范围 banner** —— 范围在会话中变了（如新增未 commit 文件），顶部出现黄色 banner
- **忽略空白改动** *(R16 新增)* —— 工具栏里的 toggle 按钮，把每行的连续空白折叠成一个空格并去掉行尾空格，纯粹的格式调整（tab↔space、缩进宽度）会从 diff 里消失。刷新后保持
- **Expand all / Collapse all** *(R16 新增)* —— diff 面板顶部两个按钮，一次性切换所有文件的 `expandUnchanged` 设置。快速浏览 30 个文件的 diff 跟一行行 review 两种场景都顺手

### 加 finding

- **点行号** 开始一个 finding
- **选类别** —— bug / style / performance / question / recommendation
- **选严重程度** —— high / medium / low
- **加 file 级 finding** 给整体反馈（不绑定行号）
- **★ Pinned findings** *(R12 新增)* —— 星标任意 finding 标记为下一轮要回看的。Conversation tab 会出现「★ Pinned」过滤 chip 和「★N」徽章，所有星标的 finding 一目了然
- **Emoji 反应** *(R12 新增)* —— 在 finding 上点 👍 👎 😄 ❤️ 🎉 👀。一次点击 vs 打字 "lgtm"。再点同一个 emoji 撤回反应

### Review 与迭代

- **`n` / `p` 键** *(R12 新增)* —— 跳到下一个 / 上一个 finding，不用滚屏。光标不在文本框里时生效
- **In-diff 搜索** *(R13 新增)* —— 按 `Ctrl+F`（Mac 上 `Cmd+F`）打开搜索框，在已加载的 diff 里找任意文本。Enter 跳到下一个匹配，Shift+Enter 跳到上一个
- **★ Sort findings** *(R14 新增)* —— 下拉菜单按 Newest / Oldest / Severity（high → low）/ File path（A-Z）排序
- **Filter Previously-discussed by round** *(R14 新增)* —— 5 轮以上时，按 round 数字过滤历史 tab
- **★ Cmd+P 文件跳转** *(R15 新增)* —— VS Code 风格的 quick-open 面板。输入文件名直接跳过去
- **Copy finding as Markdown** *(R16 新增)* —— 每个 finding 上的「Copy as MD」按钮把自包含的 Markdown 片段（轮次 tag、file:line permalink、评论、审计次数、反应）丢到剪贴板。直接粘到 PR 评论或聊天里
- **IME 安全的搜索** *(R17 新增)* —— 所有五个搜索输入（Files tab、Conversation tab、Previously discussed、In-diff、Cmd+P 面板）在 IME 组合输入时都能正常工作。中文拼音、日语罗马字等都能正常上屏，不会丢按键或回退到 IME 中间态
- **Cmd+/ 帮助覆盖层** *(R17 新增)* —— 按 `Cmd+/`（Mac）或 `Ctrl+/`（其他）打开两列快捷键网格，10 个最常用的快捷键都在里面。按 `?` 或 `Escape` 关闭
- **搜索历史 debounce** *(R21 新增)* —— 在 in-diff 搜索框里输入时，不再让每一次中间按键都进最近搜索列表。300ms 静默期 debounce + Enter 即时提交。对齐 GitHub / VS Code 行为
- **清空最近搜索** *(R22 新增)* —— 最近搜索下拉头部的「清空」按钮一键清空搜索历史。Toast 确认操作。对齐 GitHub / VS Code / Chrome
- **批量删除最近搜索** *(R23 新增)* —— 最近搜索下拉的每个条目有 checkbox，可以多选并删除指定的条目（不会清空全部）。对齐 Chrome 历史记录 / VS Code 搜索多选删除
- **1000+ 行文件 diff 虚拟化** *(R23 新增)* —— 基于 IntersectionObserver 的 hunk 虚拟化。只有可见 hunk 完整渲染；屏幕外的 hunk 折叠成占位符。即使 5000+ 行文件也能流畅滚动。对齐 GitHub Turbo Frames / VS Code 虚拟化编辑器 / Phabricator chunked diffs
- **设置面板** *(R21 新增)* —— 点击头部 ⚙ 按钮打开集中偏好面板（主题 / 布局 / 搜索 / 语言 / 恢复默认）。工具栏控制作为快速开关保留；两条路径共享同一套 handler
- **Diff 虚拟化 toggle** *(R25 新增)* —— 设置面板（外观分区）中的 toggle，启用/禁用基于 IntersectionObserver 的 hunk 虚拟化，方便需要立即渲染小 diff 的用户
- **批量标记侧边栏文件已审查** *(R25 新增)* —— 侧边栏每个文件 checkbox + 「标记选中为已审查」批量按钮。对齐 GitHub PR 文件树多选
- **从历史中删除单条** *(R26 新增)* —— 最近搜索下拉每个条目的 × 按钮，可单独删除某条而不清空整个历史。对齐 GitHub per-PR hide / VS Code per-file delete
- **批量删除 Conversation tab** *(R26 新增)* —— Conversation tab 每个 finding checkbox + 「Delete selected」批量按钮。对齐 GitHub PR comments multi-select / VS Code problems panel
- **commit 卡折叠/展开箭头** *(R51 新增)* —— 点击 commit 头部现在切换可见的箭头 + ARIA-expanded 状态，用户能看出 commit 的文件列表是折叠还是展开。对齐 GitHub PR file tree / VS Code breadcrumb collapse UX
- **Ignore ws 切换加载旋转图标** *(R52 新增)* —— 点击工具栏「Ignore ws」按钮时，diff 重渲染期间显示旋转图标 + 状态消息，用户可以看到应用变更的反馈。支持 aria-busy 键盘可访问
- **侧边栏文件夹键盘导航** *(R59 新增)* —— 侧边栏文件夹行可获得焦点 + Enter/Space 切换折叠。之前只能鼠标点击。对齐 GitHub PR file tree 键盘导航

### 解决 finding

- **★ Resolve-with-reason 弹窗** *(R13 新增)* —— 解决 finding 时可选快速原因（Fixed / False positive / Out of scope / Wontfix）或自填。原因会保留供以后参考
- **Mark as wontfix / out-of-scope** *(R13 新增)* —— 区别于普通 Resolve。用于你认同但不打算修的 finding（已知问题、未来工作等）
- **Comments audit trail** *(R15 新增)* —— 每次编辑 finding 都会保留前一版本。评论线程会显示「X 次编辑」和前后历史

### 提交

- **Submit 确认弹窗** *(R15 新增)* —— 提交前弹「Review N findings before submitting」防误操作
- **轮次笔记在提交弹窗里** *(R17 新增)* —— round notes 文本框现在在 Submit Review 弹窗里。在你准备发送的那一刻写总结，跟 finding 一起自动保存到同一个 draft。sidebar 的 notes 区不再单独显示
- **Auto-save 指示器** *(R14 新增)* —— 头部显示「Saved 3s ago」，原地更新。不再有侵入式的「Draft saved at 12:34:56」toast

### 工作流

- **多轮审查** —— 每次提交是一轮。Finding 跨轮次延续。Stale finding（绑定的行变了）自动标记
- **Auto-apply agent** —— agent 读你的 finding，做计划，应用，验证。同轮内可迭代
- **Export** —— 把 review 存成 markdown 报告
- **Round notes** —— 每轮的全局笔记，自动导入到「Previously discussed」视图

---

## 怎么安装

1. 没装过 [OpenCode](https://opencode.ai) 的话先装上
2. 装插件（具体命令看 OpenCode 插件仓库）：
   ```bash
   opencode plugin install @weekbin/opencode-review-dashboard
   ```
3. 打开一个有 git 改动的项目
4. 在 OpenCode 对话框里输入 `/diff-review-dashboard` 回车

完事。dashboard 会在浏览器 `http://localhost:<port>` 打开。

---

## 怎么用

**典型工作流：**

1. 你在编辑器里做了一些代码改动
2. 一些 commit 了，一些没 commit —— 都没问题
3. 在 OpenCode 对话框里输入 `/diff-review-dashboard` 回车
4. 浏览器打开 review dashboard
5. 点行号加 finding，写评论，选类别和严重程度
6. 加完 finding 点「Submit Review」—— 弹窗确认
7. agent 读 finding，做计划，应用修复
8. 刷新浏览器看 agent 的 diff
9. 迭代：review agent 的改动，再加 finding，或 resolve 喜欢的
10. 整轮满意了提交，finding 延续到下一轮

**小贴士：**
- 用 ★ Pinned 标记 agent 修完后要回看的 finding
- 用 emoji 反应给快速反馈，不用写完整评论
- 用 `n` / `p` 键在 finding 间飞，不用滚屏
- 「Previously discussed」tab 累积多轮历史 —— 用 round 过滤器聚焦最近上下文

---

## 键盘快捷键

| 键 | 动作 |
|---|---|
| `n` | 下一个 finding |
| `p` | 上一个 finding |
| `Ctrl+F` / `Cmd+F` | 打开 in-diff 搜索 |
| `/` | 打开 in-diff 搜索（备选） |
| `Cmd+P` / `Ctrl+P` | 打开文件快速跳转面板 |
| `Cmd+/` / `Ctrl+/` | 打开键盘快捷键覆盖层 |
| `?` | 打开键盘快捷键覆盖层（备选） |
| `Escape` | 关闭任何打开的弹窗 / 覆盖层 |
| `Enter` | 弹窗中确认默认操作 |
| `Tab`（焦点在「Ignore ws」按钮上时）| 切换空白折叠开关（用工具栏按钮，没有全局快捷键 —— 让你 review 纯格式调整的 diff 时不被视觉噪声干扰）|

---

## FAQ

**Q: 我的 review 数据存在哪儿？**
A: 项目根目录的 `state.json` 文件里。每轮还会导出一个 `round-NNN.json` 和 `round-NNN.md` 供参考。

**Q: 能 review 别人开的 PR 吗？**
A: 可以 —— 传 `--base=<branch>`（比如 `--base=main` review 相对 main 的所有改动）。dashboard 会显示那个 diff 而不是你工作区的。

**Q: review 中断了（浏览器关了、电脑死了）怎么办？**
A: 全部自动保存。下次打开 dashboard 接着来。如果 `state.json` 真的损坏了，工具会把它存为 `state.json.corrupt-<timestamp>` 然后开新 state —— 数据不丢。

**Q: 能在 git worktree 里干活吗？**
A: 可以。工具自动识别 worktree（commit 数领先 `origin/main` 最多的那个）。也可以显式传 `--worktree=<name>`。

**Q: 怎么看之前一轮讨论了什么？**
A: 点「Previously discussed」tab。用 round 过滤下拉框聚焦特定轮次。

**Q: 能 un-resolve 一个 finding 吗？**
A: 可以 —— 点 finding，把状态改回「open」，如果想可以加原因。

**Q: finding 间跳转有键盘快捷键吗？**
A: 有 —— `n`（下一个）和 `p`（上一个）。光标不在文本框时生效，所以在评论里打 `n` 和 `p` 不会触发跳转。

---

## 协议

[MIT](LICENSE)（或项目实际用的协议）

---

## 贡献

欢迎提 bug 和 PR。看 [issues](https://github.com/weekbin/opencode-review-dashboard/issues) 了解当前 backlog。

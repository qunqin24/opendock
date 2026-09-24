# opencode-image

给 [opencode](https://opencode.ai) 用的图片生成 / 编辑插件，支持把生成的图片**直接渲染在对话里**。

- `image_generate` — 文生图
- `image_edit` — 图生图（基于上一张继续改）
- 兼容任何 OpenAI 风格的 `/images/generations` 与 `/images/edits` 接口
- 跨平台缩放（基于 [sharp](https://sharp.pixelplumbing.com)），不依赖 `sips` 等系统命令

## 安装

在 `opencode.json` / `opencode.jsonc` 里配置：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-image", { "apiKey": "sk-..." }]
  ]
}
```

opencode 启动时会自动从 npm 安装插件到 `~/.cache/opencode/packages/opencode-image/node_modules/`。

## 配置项

`plugin` 数组的元组形式第二个元素就是插件配置：

| 字段 | 默认值 | 说明 |
|---|---|---|
| `apiKey` | `PI_IMAGE_API_KEY` | **必填**。接口密钥，建议用环境变量而不是写进配置 |
| `baseURL` | `PI_IMAGE_BASE_URL` 或内置默认 | OpenAI 兼容接口地址 |
| `model` | `gpt-image-2` | 模型名 |
| `outDir` | `<数据目录>/opencode-image` | 图片输出目录。默认全局，与项目/会话解耦；填相对路径（如 `.opencode-images`）则落到当前项目 |
| `maxSize` | `1024` | 落盘图片最长边上限，超出等比缩小 |
| `displayMaxSize` | `0` | 对话里展示的最长边。`0` = 不缩放，**直接显示原图**（右键复制/另存拿到的就是原图） |
| `serverPort` | `0` | 本地图片服务端口。`0` = 由项目目录派生（同一项目恒定，保证历史链接跨重启有效） |
| `serverIdleMs` | `0` | 本地图片服务空闲关闭时间（毫秒），`0` = 不主动关闭 |
| `updateCheck` | `true` | 首次出图时查一次 npm 最新版，落后则在工具输出末尾附升级提示 |
| `cacheDir` | `<系统临时目录>/opencode-image` | 对话里展示用的缩略图缓存目录 |
| `cacheLimit` | `50` | 缩略图缓存最多保留多少个文件，超出按最久未访问淘汰；`0` = 不限制 |
| `timeoutMs` | `600000` | 单次请求超时 |

## 图片是怎么显示出来的

openCode（桌面端 / Web）**只在助手回复的 Markdown 正文里渲染图片**，工具输出一律按纯文本处理。
而正文里的 `file://` 会被 Chromium 拦掉，所以插件做了这件事：

1. 图片落盘到 `outDir`（默认是全局数据目录，不在项目里）
2. 插件进程内起一个只绑 `127.0.0.1` 的 HTTP 服务
3. 工具输出给出 `![alt](...)`（`displayMaxSize = 0` 时就是原图）
4. 工具描述里强制模型把这行**原样抄进回复正文**

> **不支持「图片套链接」**：opencode 覆写了 marked 的 link renderer，取的是链接里的原始文本，
> `[![图](缩略图)](原图)` 里的图片不会被渲染。所以缩略图模式下改成两行：
> `![alt](缩略图)` + `[查看原图](原图)`。
>
> 显示原图还是缩略图只取决于 `displayMaxSize`：
> - `0`（默认）→ 直接显示原图，会话里右键 Copy / Save 拿到的就是原图
> - `> 0`（如 `448`）→ 会话里显示轻量缩略图，下面附带一个「查看原图」链接，
>   点击会用系统浏览器打开原图（opencode 把所有外链交给系统浏览器）

**链接为什么跨重启还有效**：`id` 是「文件相对 `outDir` 的路径」的 base64url 编码，可逆且稳定；
端口默认由项目目录派生（同一项目恒定）。所以服务**不需要任何内存登记表**，
重启后历史消息里的旧链接仍能解析到同一个文件。

服务的安全边界：请求里的 `id` 只允许解析成 `outDir` 内部的普通文件，
解析后做 containment + `realpath` 双重校验，防路径穿越与符号链接逃逸。
`outDir` 之外的文件只能用进程内临时 id（不跨重启）。

服务的生命周期：**首次生成图片时懒启动**，端口随机；`unref()` 后不阻塞 opencode 退出，
opencode 进程结束即自动释放。默认不主动关闭——历史消息里的图片会被重新请求，提前关闭会 404。

> 同时在工具结果里返回了 `attachments`，这样模型自己也能看到生成的图，便于继续迭代。

## 升级

opencode 对 npm 形式的插件**不会自动升级**。

它的安装逻辑是 `Npm.add()`：只要缓存目录里已经有这个包就直接复用，不会去比对版本
（opencode 源码 `packages/core/src/npm.ts` 里的短路分支）。而裸包名会被规范化成
`opencode-image@latest`，缓存目录名固定为 `~/.cache/opencode/packages/opencode-image@latest`，
所以你会一直停留在**第一次安装到的版本**。

升级只需要两条：

```sh
npx opencode-image --update   # 清理 opencode 的插件缓存
# 然后重启 opencode，会自动重新下载最新版
```

插件首次出图时也会查一次 npm，发现落后就在工具输出末尾提示你执行上面这条命令（可用 `updateCheck: false` 关掉）。

不想用命令的话，等价于手动删缓存后重启：

```sh
rm -rf ~/.cache/opencode/packages/opencode-image*
```

维护者发布新版：

```sh
git commit -am "..."   # npm version 要求工作区干净
npm run release        # = version patch + publish + 清掉本机缓存
```

## 图片放在哪

默认落在 **opencode 的数据目录**（`<XDG_DATA_HOME>/opencode/opencode-image/`，macOS/Linux 即
`~/.local/share/opencode/opencode-image/`），跟 `opencode.db` 同级。

这样设计的原因：

- **不与项目/会话绑定**：换目录打开老会话、删掉项目、移动仓库，历史里的图都还在
- **不污染工作区**：不再出现在 git 变更里
- **全机一个服务**：根目录固定 → 端口由它派生 → 所有会话共用一个本地服务，而不是每个项目一个

只有当你确实要让图片成为项目资产时，才把 `outDir` 设成项目内路径（如 `".opencode-images"`），
或者让 agent 把图复制进仓库 —— 这与 Codex 的做法一致（Codex 默认存 `$CODEX_HOME/generated_images/`，
需要在项目里用时再复制过去）。

## 缓存与清理

有两处"缓存"，职责完全不同，别搞混：

| 是什么 | 在哪 | 删了会怎样 |
|---|---|---|
| **生成的图片本体** | `<数据目录>/opencode-image/`（`outDir` 可配；macOS/Linux 默认 `~/.local/share/opencode/opencode-image/`） | **会话里的图片会 404**。服务按路径解析，源文件没了就找不到 |
| **对话缩略图**（448px） | `<系统临时目录>/opencode-image/`（`cacheDir` 可配） | 无影响，下次打开会按需重新生成 |

缩略图缓存文件名由「源文件路径 + 大小 + mtime + 目标宽度」哈希而成，所以同一张图不会重复生成，跨重启也能复用。
超过 `cacheLimit`（默认 50 个）时按最久未访问淘汰，并在**下一次工具输出末尾**提醒你（含目录、数量、总大小、最旧一个存在了多久）——每进程只提醒一次，不刷屏。

清理缩略图缓存（两种方式等价）：

```sh
npx opencode-image --clean-cache
# 如果你改过 cacheDir:
npx opencode-image --clean-cache --cache-dir /your/cache/dir
```

也可以直接在会话里让 agent 调用 `image_cache`：

- `image_cache(action="status")` —— 目录、数量、总大小、最旧一个多久了
- `image_cache(action="clean")` —— 清空缩略图缓存（不动 `outDir` 里的原图）

> **建议**：把输出目录加进项目 `.gitignore`，否则每画一张图都会出现在 git 变更里：
> ```
> .opencode-images/
> ```

## 环境变量

```bash
export PI_IMAGE_API_KEY=sk-...
export PI_IMAGE_BASE_URL=https://api.example.com/v1
```

## 平台支持

缩放使用 `sharp`（Node-API 原生模块，npm 会自动装对应平台的预编译包），
macOS / Linux / Windows 均可。

## 开发

```bash
bun install
bun test        # 端到端测试：桩掉图像接口，验证落盘、缩放、服务与安全边界
bun run build   # 产出 dist/index.js + dist/index.d.ts
```

## 已知限制

- 只有能渲染 Markdown 图片的客户端才看得到图；纯终端 TUI 里会退化成一串 URL。
- 预览图缓存在系统临时目录，`serverIdleMs = 0`（默认）时随进程退出由系统回收。
- 两个不同项目极少数情况下会派生出同一个端口，此时后启动的实例会报错并提示用 `serverPort` 指定端口。
- 工具结果里的 `attachments` 只是给模型看的，opencode 客户端**不会**把工具附件渲染成图片，所以内联显示必须靠上面的 Markdown 链接。

## License

MIT

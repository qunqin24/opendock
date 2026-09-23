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

opencode 启动时会用 Bun 自动把插件装到 `~/.cache/opencode/node_modules/`。

## 配置项

`plugin` 数组的元组形式第二个元素就是插件配置：

| 字段 | 默认值 | 说明 |
|---|---|---|
| `apiKey` | `PI_IMAGE_API_KEY` | **必填**。接口密钥，建议用环境变量而不是写进配置 |
| `baseURL` | `PI_IMAGE_BASE_URL` 或内置默认 | OpenAI 兼容接口地址 |
| `model` | `gpt-image-2` | 模型名 |
| `outDir` | `<项目目录>/.opencode-images` | 图片输出目录，相对路径基于当前项目 |
| `maxSize` | `1024` | 落盘图片最长边上限，超出等比缩小 |
| `displayMaxSize` | `448` | 仅在对话里展示的尺寸，不影响落盘原图 |
| `serverIdleMs` | `0` | 本地图片服务空闲关闭时间（毫秒），`0` = 不主动关闭 |
| `timeoutMs` | `600000` | 单次请求超时 |

## 图片是怎么显示出来的

openCode（桌面端 / Web）**只在助手回复的 Markdown 正文里渲染图片**，工具输出一律按纯文本处理。
而正文里的 `file://` 会被 Chromium 拦掉，所以插件做了这件事：

1. 图片落盘到 `outDir`
2. 插件进程内起一个只绑 `127.0.0.1` 的 HTTP 服务，为图片分配随机 id
3. 工具输出第一行给出 `![alt](http://127.0.0.1:<port>/img/<id>?w=448)`
4. 工具描述里强制模型把这行**原样抄进回复正文**

服务的安全边界：只服务显式注册过的文件，URL 里没有真实路径，无法路径穿越读取任意文件。

服务的生命周期：**首次生成图片时懒启动**，端口随机；`unref()` 后不阻塞 opencode 退出，
opencode 进程结束即自动释放。默认不主动关闭——历史消息里的图片会被重新请求，提前关闭会 404。

> 同时在工具结果里返回了 `attachments`，这样模型自己也能看到生成的图，便于继续迭代。

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

## License

MIT

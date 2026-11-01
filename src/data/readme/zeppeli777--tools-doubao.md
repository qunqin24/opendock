# 豆包生图中转插件（tools-doubao）

Magpie 工具插件：让**任意 Agent** 通过**你自己的豆包账号**（网页版登录态，与豆包桌面端同账号同后端）生成图片。工具经 Magpie 内置 MCP 服务器 `/mcp/magpie/tools` 注册进所有智能体，工具名为 `doubao-image-plugin_generate_image` / `doubao-image-plugin_check_login`。

- **文生图**：prompt + 画幅比例（1:1 / 16:9 / 9:16 / 4:3 / 3:4 / auto）+ 模型档位（免费档 Seedream 5.0 Flash / 4.5 / 4.0）
- **图生图**：传本地图片路径或图片 URL 作参考图
- **多账号轮换**：登录失效自动换号；图片自动落盘并返回绝对路径

原理：用豆包网页版的 `sessionid` Cookie 免签名直调豆包内部接口（优先 web `chat_ability` 新协议，失败自动降级旧 `samantha` 客户端通道；图生图固定走 samantha 通道）。逆向接口属个人自用性质，**不稳定且存在账号风控风险**，商用请走[火山引擎官方 API](https://www.volcengine.com/product/doubao)。

## 安装

```sh
# 方式一：npm（推荐）
magpie plugin add @zeppeli777/tools-doubao

# 方式二：从 GitHub 本地克隆后文件夹就地加载
git clone https://github.com/Zeppeli777/doubao-image-plugin.git
magpie plugin add ./doubao-image-plugin

magpie plugin --json   # 确认加载无 plugin: 错误
```

装完后**新开的 Agent 会话**才能看到新工具。工具名为 `doubao-image-plugin_generate_image`（npm 包安装时插件 id 取包名，为 `doubao_generate_image`）。

## 登录（获取豆包登录态）

任选其一：

```sh
magpie plugin login doubao-image-plugin   # 或 npm 安装后的插件 id
node scripts/login.mjs                    # 本地克隆时；弹出二维码，手机豆包 App 扫码
```

弹出二维码 → 手机豆包 App 扫码并确认 → 登录态自动写入插件目录 `config.json`。

## 配置凭证（三选一）

1. **扫码登录**（见上节，推荐）
2. **手动**：复制 `config.example.json` 为 `config.json`，填入 `sessionid`（浏览器登录 doubao.com → F12 → Application → Cookies → `https://www.doubao.com` → 复制 `sessionid`；`ttwid`、`passport_csrf_token` 可选，带上更稳）
3. **环境变量**：`DOUBAO_ACCOUNTS="主号:sessionid=xxx,ttwid=yyy;小号:sessionid=zzz"`

Cookie 有效期约 30 天，过期后重新扫码即可。多账号把 `accounts` 数组填多条，登录失效自动轮换。

## 使用

Agent 里直接说"用豆包画一张…"，Agent 会调用工具。手动验证不走 Magpie：

```sh
node scripts/test-protocol.mjs --check                       # 各账号登录态
node scripts/test-protocol.mjs "一只柴犬在樱花树下" --ratio 16:9
node scripts/test-protocol.mjs "改成赛博朋克风格" --ref 照片.jpg   # 图生图
node scripts/test-protocol.mjs "一朵红玫瑰特写" --wm            # 文生图 + 去水印
```

生成的图默认保存在调用方工作目录的 `generated-images/`（可在 config.json 用 `outDir` 改）。

## 配置项

| 字段 | 默认 | 说明 |
|---|---|---|
| `accounts` | `[]` | `{name, sessionid, ttwid?, passport_csrf_token?}` 数组 |
| `model` | `Seedream 5.0 Flash` | 默认模型档位；Pro 档需订阅，会自动回退免费档 |
| `ratio` | `1:1` | 默认画幅比例 |
| `channel` | `auto` | `web`=chat_ability 新协议（模型/比例精确）；`pc`=samantha 旧通道（稳定、支持图生图）；`auto`=先 web 后 pc |
| `outDir` | 空 | 图片保存目录，空=跟随调用方工作目录 |
| `timeoutSeconds` | `180` | 单次请求超时 |
| `ratioHint` | `true` | web 通道把比例追加进自然语言（web 端 ratio 字段实测不生效） |
| `removeWatermark` | `false` | 去右下角"豆包AI生成"水印（扩图裁剪法，见下） |
| `watermarkExtend` | `"1/4"` | 去水印的扩图比例，裁剪保留 1/(1+该值) |

## 去水印（扩图裁剪法）

开启 `removeWatermark: true`（或调用时传 `remove_watermark: true`）后，文生图会自动多走一步：

1. 正常生成图片（右下角带"豆包AI生成"标）
2. 以该图为参考图走图生图，提示词自动追加 **"往下扩图四分之一"** —— 模型重新演绎画面，旧水印随之消失，而新一轮水印落在底部新增区域
3. 下载扩图结果，**裁掉底部扩出部分（保留上方 80%）**，覆盖保存

代价与注意：

- 多花一次生成额度（一张图 = 两次生成）
- 画面边缘会被模型重新演绎，构图略有变化
- 扩图比例可用 `watermarkExtend` 调整（如 `"1/5"` → 保留 5/6）
- 仅对文生图生效；图生图保留用户原图语义，不自动扩图
- 扩图结果若非 PNG（目前实测均为 PNG）会跳过裁剪并保留原图，不会损坏文件

## 故障排查

| 现象 | 处理 |
|---|---|
| 提示登录态失效 | `sessionid` 过期（约 30 天），重新复制；多账号时会自动轮换 |
| `710022002 / 710022004` 风控 | 等约 30 分钟冷却 / 换网络（手机热点最快）/ 浏览器过一次滑块验证 |
| 提示需要订阅 | 免费账号只能用免费档（Seedream 5.0 Flash / 4.5 / 4.0），点名 Pro 档会自动回退 |
| `msToken` 相关风控 | 本插件默认不带 msToken（留空最安全），无需配置 |
| 生图很慢 | 单张通常数秒到一两分钟；超时可调大 `timeoutSeconds` |

## 参考实现

协议字段移植自开源抓包项目（Apache-2.0）：

- [wangchuxiaoji-oss/doubao2api](https://github.com/wangchuxiaoji-oss/doubao2api) —— samantha 通道、上传两步流、SSE 解析
- [sanshidi/doubao-web-mcp](https://glama.ai/mcp/servers/sanshidi/doubao-web-mcp) —— web chat_ability 协议笔记（2026-10-19 抓包结论）
- [magpie-community/plugins](https://github.com/magpie-community/plugins) —— Magpie 工具插件格式样板

本仓库 `reference/` 目录存有移植时对照的源码快照（已 gitignore，仅作参考，不参与运行）。

# Magpie Gemini Decision 插件

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md)

版本 **0.3.0** 让 Magpie 使用 `gemini-decision-1` 对文本、图片、音频、视频和 PDF 完成决策，也可用作路由组的意图分类器。支持 Google 官方 Gemini Decisions API，以及使用 Bearer 认证的兼容中转服务。

供应商 ID：`gemini-decision-adapter`。完整模型 ID：`gemini-decision-adapter/gemini-decision-1`。

这是回答判断、选项和评分问题的决策模型。请将它放在路由组的 `classifier` 字段，组成员使用普通聊天模型。

## 协议与本地入口

Magpie 将 OpenAI 风格的 `/v1/decisions` 请求（`input` 和 `questions` 数组）转换为 System One 请求（`state` 和 `questions` 对象），再由插件发送至配置的上游 `/decisions` 地址。

| Magpie 0.1.4587 入口 | 文本 | 图片 / 音频 / 视频 / PDF |
| --- | --- | --- |
| `/v1/systemone` | 支持 | 支持，使用顶层 `images` / `media` |
| `/v1/decisions` | 支持 | 宿主转换层会拒绝媒体 |
| `/v1beta/decisions` | 未注册 | 未注册 |

`GET /` 返回 JSON 的 `apis` 字段可列出 API；`GET /apis` 返回 404。例如：`curl -s http://127.0.0.1:3425/`。

| System One 输入 | 转换与返回处理 |
| --- | --- |
| 字符串 `state` | 原样作为输入文本 |
| 对象或数组 `state` | 完整序列化为 JSON，包含历史和上下文，不只取 `message` |
| 顶层 `images` | 图片 data URL / HTTPS URL 转为 image blocks，保留顺序 |
| 顶层 `media` | text、image、audio、video、document blocks 保留内容、URI、MIME 类型和顺序 |
| `noul` | 保留肯定概率，不以 `confidence` 替代 |
| `choice` | 保留选项和概率，null 说明转换为空字符串 |
| `score` | 保留评分标准顺序、`legend` 和概率 |
| Token 用量 | 将上游 `total_input_tokens` / `total_output_tokens` 映射为 `input_tokens` / `output_tokens`；输出 0 合法 |

OpenAI `predicate` 映射为 `noul`，其他题型为 `choice`、`score`。数组转换和答案顺序由 Magpie 处理。插件会对缺少答案、无效概率或用量、非 JSON 响应、上游错误和被阻止的输入返回明确错误。

## 安装与登录

需要支持 provider plugin 与 System One 的 Magpie，实测版本为 **0.1.4587**。插件无额外 npm 依赖；单元测试需要 Node.js 20+。

通过完整包名从 npm 安装。macOS App 的 CLI 可能不在 `PATH`：

```sh
MAGPIE_BIN=/Applications/magpie.app/Contents/MacOS/magpie
PLUGIN_SPEC=magpie-gemini-decision-plugin@latest
"$MAGPIE_BIN" plugin add "$PLUGIN_SPEC"
"$MAGPIE_BIN" plugin login gemini-decision-adapter
"$MAGPIE_BIN" plugin list --json
```

在登录提示中输入上游 API key。凭据由 Magpie 管理，请勿写入源码、命令行参数或插件选项，也不要手动编辑 `plugin-auth.json`。

启用插件后，在 **插件 → 已安装 → 选项** 中编辑 `endpoint` 和 `authMode`。0.3.0 提供可编辑的 Google 默认配置模板，点击保存后应用修改。使用中转服务时，请先配置其地址和认证方式，再发送请求。

本地开发时，在源码目录设置 `PLUGIN_SPEC="$PWD"`，再使用相同的安装命令，并保留该目录。本地路径与 npm 包是独立的插件条目，切换安装方式后需要配置新条目。如果“发现”页暂未列出该包，仍可通过完整 npm 包名安装。

## 上游配置

默认直连 Google：

```json
{
  "endpoint": "https://generativelanguage.googleapis.com/v1beta/decisions",
  "authMode": "google"
}
```

`google` 使用 `x-goog-api-key`，`bearer` 使用 `Authorization: Bearer …`。地址必须是完整的 HTTPS `/decisions` URL，不能含用户信息、查询参数或 fragment。

使用兼容中转时，替换示例地址：

```sh
"$MAGPIE_BIN" plugin options "$PLUGIN_SPEC" \
  '{"endpoint":"https://relay.example.com/v1beta/decisions","authMode":"bearer"}'
```

恢复 Google 默认配置：

```sh
"$MAGPIE_BIN" plugin options "$PLUGIN_SPEC" off
```

切换服务后，通过 `plugin login gemini-decision-adapter` 登录该服务的 key，不同服务的 key 通常不通用。每次请求使用 Magpie 当前选中的账户。插件保留取消信号，不额外重试、不跟随重定向、不转发调用方 Cookie 或凭据。上游 HTTP 错误保留状态码和重试信息，不暴露可能含凭据的原始错误体。

## 决策请求

将以下 JSON 发送到本地 Magpie 的 `/v1/systemone`：

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

OpenAI `/v1/decisions` 使用 `input`、`questions` 数组，以及 `predicate`、`choice`、`score` 题型。[完整请求示例](docs/examples.md)涵盖全部题型和媒体格式。

## 多媒体输入

使用顶层 `media` 数组。每个附件必须且只能指定一种来源：`data` 为文件字节的 Base64，`uri` 为公开或签名 HTTPS URL，也包括 Google Files API 返回的 HTTPS URI。不接受本地文件路径；插件不读取或上传文件。

| 内容 | `type` | 常见 `mime_type` |
| --- | --- | --- |
| 图片 | `image` | `image/png`、`image/jpeg`、`image/webp` |
| 音频 | `audio` | `audio/wav`、`audio/mpeg`、`audio/ogg` |
| 视频 | `video` | `video/mp4`、`video/webm`、`video/mov` |
| PDF | `document` | `application/pdf` |

例如，从录音判断订单是否取消：

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

可将 `data` 替换为 `"uri": "https://relay.example.com/media/recording.wav"` 来引用远端音频。仅图片和视频接受可选的 `resolution`，例如 `"low"`。同一请求可混合多种媒体，并穿插 `{"type":"text","text":"Additional context"}` 文本块。

标准 `images` 字段也可使用：`"images": ["data:image/png;base64,BASE64_IMAGE_CONTENT"]`。上游顺序为完整 `state` 文本、`images`、`media`。空字符串 state 不增加文本块。业务对象和数组仍作为 JSON 文本，只有顶层 `images` / `media` 才会成为媒体输入。

Magpie 0.1.4587 的**完整 JSON 请求体上限为 16 MiB**。Base64 约增加三分之一大小，原始附件合计应低于约 12 MiB，并预留 JSON 空间。较大素材可使用上游能访问的 HTTPS URI。该宿主限制与 Google 的文件额度不同。

`usage.input_tokens` / `output_tokens` 用于 Magpie 计量；上游提供 `input_tokens_by_modality` 时也会保留。视频及 PDF 用量可能归入 image/audio/text，不一定单列 video/pdf。

## 用作路由分类器

配置已有聊天组：

```sh
"$MAGPIE_BIN" group rule classifier YOUR_GROUP_ID gemini-decision-adapter/gemini-decision-1
"$MAGPIE_BIN" group rule add YOUR_GROUP_ID use=YOUR_PROVIDER/chat-small \
  'intent=explaining a concept or answering a question without writing or changing code'
"$MAGPIE_BIN" group rule add YOUR_GROUP_ID use=YOUR_PROVIDER/chat-large \
  'intent=writing or fixing unit tests'
```

将 `YOUR_GROUP_ID`、`YOUR_PROVIDER` 和模型名替换为实际组及可用聊天模型。验证时检查 `/v1/magpie/route?session=…` 的分类来源、命中规则、实际模型和尝试结果，以及 `/v1/magpie/usage/requests` 的 `kind=routing` 记录。规则命中本身不代表最终模型成功。

## 验证与边界

```sh
npm test
export MAGPIE_CHAT_TARGETS='["YOUR_PROVIDER/chat-small","YOUR_PROVIDER/chat-large"]'
python3 scripts/validate_live.py
python3 scripts/validate_media.py --output artifacts/media-run-001
```

将两个目标替换为实际已登录的聊天模型。`validate_live.py` 必须设置 `MAGPIE_CHAT_TARGETS`，值为含两个模型 ID 的 JSON 数组。脚本调用本地 Magpie 与真实模型，创建唯一临时路由组，串行检查两个意图后仅删除自己创建的组。请先登录插件及两个聊天模型。认证头不会保存。

`validate_media.py --output` 的路径**必须是新目录**，每次运行请更换路径。脚本使用 `test/fixtures/media/` 的合成素材：每类媒体两个对照样本、一个 `images` 样本、一个四模态混合样本，断言实际答案和用量。可用 `python3 scripts/generate_media_fixtures.py` 重新生成素材；该开发脚本需要 Pillow、ffmpeg 和 macOS `say`，插件运行不依赖这些工具。

默认网关为 `http://127.0.0.1:3425`，可用 `MAGPIE_URL` 覆盖；CLI 可用 `MAGPIE_BIN` 指定。可选的 `MAGPIE_API_KEY` 用于本地网关认证，与通过插件登录保存的上游 key 分开。

历史核验记录为 **56 项单元测试通过**，以及 **10 个真实媒体案例 / 31 个答案通过**。单元测试使用虚构凭据和模拟上游；真实媒体核验通过兼容中转发送 Base64。HTTPS URI 转换有单元测试覆盖，但尚未逐类实测远端 URI。Google 官方直连和实网账户切换未实测。详见公开脱敏的[核验记录](VERIFICATION.md)；这些是集成验证，不是分类准确率基准。

插件未配置价格，显示费用不代表实际账单；验证仅核对 token 数量。未新增本地 `/v1beta/decisions` 别名。

## 文件与参考

- `index.mjs`：插件 factory、供应商、模型和登录接口。
- `adapter.mjs`：协议、认证、响应校验和错误处理。
- `media.mjs`：媒体块、MIME、Base64 和 HTTPS URI 校验。
- `test/adapter.test.mjs`、`test/media.test.mjs`：单元测试。
- `scripts/validate_live.py`、`scripts/validate_media.py`：真实集成验证。
- [全部题型与媒体示例](docs/examples.md)。
- [公开脱敏核验记录](VERIFICATION.md)。
- [Google Decisions API](https://aistudio.google.com/docs/decisions-api#input)
- [Magpie issue #6969](https://github.com/yetone/magpie/issues/6969)
- [Magpie provider plugins (v0.1.4587)](https://github.com/yetone/magpie/blob/v0.1.4587/docs/subsystems/provider-plugins.md)
- [Magpie Gemini / System One conversion](https://github.com/yetone/magpie/blob/v0.1.4587/internal/provider/decide_wire.go)

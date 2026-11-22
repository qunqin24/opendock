# pixelbar-one-look

**opencode / DeepSeek Harness (dsh) 插件——把漫步者 Halo PixelBar LED 音箱变成 AI 编程助手的状态灯。**

> 一瞥即知：不用盯着终端，扫一眼音箱就知道 agent 在干什么。

**不只是红绿灯——是一台带 256×32 LED 文字屏的 PixelBar。** 其他状态灯方案最多给你三种颜色；PixelBar 的文字屏直接显示"哪个项目在等你"——真实文字，不只是颜色。

![PixelBar 状态灯演示：空闲呼吸 → 执行中流光 → 完成涟漪](https://raw.githubusercontent.com/Serius117/pixelbar-one-look-public/master/assets/pixelbar-demo.gif)

*演示项目：统计项目文件数量。呼吸灯 → 执行中流光 → 完成涟漪 + 文字。*

## 灯效一览

| agent 状态 | PixelBar |
|---|---|
| 等你审批/选择 | 🌊 动态光影 + `待批准` |
| 执行任务中 | ✨ 流光逐影（纯灯效不刷屏，颜色会说话） |
| 任务完成 | 🎉 涟漪庆祝 + `项目名 完成` |
| 出错 | 🔴 常亮红灯 + `出错` |
| 空闲 | 💤 呼吸灯 + 原生时钟 |

多会话自动聚合——灯永远显示**最需要你关注**的那个会话。等待决策（审批/选择）提醒每 60s 重复直到处理（这是唯一值得打断你的事）；完成/出错只显示 10 秒，之后自动回设备的默认显示（时钟/动图），不打扰。

## 实拍

**等你审批/选择**——动态光影 + `pixelbar-one-look 待批准`：

![PixelBar 待批准实拍](docs/images/pixelbar-approval.jpg)

**任务完成**——涟漪庆祝 + `pixelbar-one-look 完成`：

![PixelBar 任务完成实拍](docs/images/pixelbar-done.jpg)

## 为什么选 PixelBar

| 优势 | PixelBar | 其他状态灯方案 |
|---|---|---|
| LED 文字屏 | ✅ 256×32，显示真实文字 | ❌ 纯色灯 |
| 灯效丰富 | ✅ 7 种效果（呼吸/流光/涟漪/光影等） | ❌ 通常只有红黄绿 |
| 原生默认显示 | ✅ 空闲自动回时钟 | N/A |
| 无需自制硬件 | ✅ 商品即买即用 | ESP8266 要焊接 |
| 多会话聚合 | ✅ 优先级压缩 + 完成轮播 | 部分 |
| Web 控制台 | ✅ 虚拟 PixelBar 实时面板 | ❌ |
| 插件架构 | ✅ 进程内插件，零外部服务 | ❌ 独立应用或 MCP |

## 安装

**opencode**（Desktop 2.x / server）：

```sh
opencode plugin add pixelbar-one-look
```

（本地开发：把本目录加进 `opencode.jsonc` 的 `plugins` 数组，或直接放入 `.opencode/plugins/`）

**DeepSeek Harness（dsh）**——同一个包，第二个宿主：

- **桌面版**：设置 → 插件 → **添加插件** → 输入本仓库 clone 目录的绝对路径，或 npm 包名。装完重启 dsh。
- **CLI**：`dsh plugin add pixelbar-one-look`
- 启动后浏览器打开 `127.0.0.1:18789`（被占用自动顺延端口）——虚拟 PixelBar 实时面板。

> **⚠️ 一台机器只启用一个宿主**：同一台 PixelBar 别同时挂在 opencode 和 dsh 两个插件实例下（两个进程抢一台设备）。跨进程仲裁在 v0.3 计划中，目前请二选一。

## 要求

- 漫步者 Halo PixelBar（USB，VID_2D99）
- opencode Desktop **2.x** 或 DeepSeek Harness **0.2.x**
- 零 GPU、零外部服务、纯 Node——没有 PixelBar 也能跑（Web 控制台模式）

## 开发

```sh
npm install
npm test                       # 195 项测试，无需硬件
npm run demo -- --case TC-B2   # 终端虚拟 PixelBar
npm run smoke                  # 真机冒烟（需 PixelBar 在场）
```

Web 控制台：插件运行时在 `127.0.0.1:18789` 起一个实时面板——虚拟屏、灯效、会话统计、事件流水。

排障：`/state?log=N` 可深取事件流水（最多 5000 条）；全量日志同时落盘 `<系统临时目录>/pixelbar-one-look/monitor-<日期>.jsonl`（保留 3 天，跨重启不丢，`monitorFile: false` 可关）。

## 文档

- [docs/协议.md](docs/协议.md) — HID 协议（字节级逆向，含黄金向量与实施红线）
- [docs/灯效映射.md](docs/灯效映射.md) — 状态→灯效映射规格（多会话聚合规则）
- [docs/详细设计.md](docs/详细设计.md) — 详细设计（接口级）
- [docs/测试设计.md](docs/测试设计.md) — 测试设计（分层/TC 用例矩阵）
- [docs/真机手册.md](docs/真机手册.md) — 真机操作手册（标定剧本 + 验收表）
- [docs/dsh调研.md](docs/dsh调研.md) — dsh 插件体系调研（Cordis 架构/事件目录）

## 致谢

- **[Seraph310/halo-pixelbar-mcp](https://github.com/Seraph310/halo-pixelbar-mcp)** — 社区对 PixelBar 的协议逆向，本项目的 HID 协议知识部分源自该工作
- **TempoHub 1.3.1** — 厂商 App USB 抓包（交叉验证用）

## License

MIT

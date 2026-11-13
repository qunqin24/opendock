# OpenCode Computer Use for Windows

面向 OpenCode V1 的 Windows 电脑操控插件。提供 25 项操作工具和 1 项管理入口，支持桌面控件读取、截图、OCR、鼠标键盘输入、窗口管理，以及通过 CDP/BiDi 操作浏览器。

基于 [Yu-tao-Li/dsh-computer-use-win](https://github.com/Yu-tao-Li/dsh-computer-use-win) 0.5.7，保留原后端、设置控件和原生浮窗，增加 OpenCode 会话/轮次绑定、跨项目桌面占用控制、取消与恢复、动态工具同步及全局设置入口。来源和许可说明见 [THIRD_PARTY.md](THIRD_PARTY.md)；设置页面不展示项目推广栏。

## 环境

- Windows，正常且已解锁的交互桌面。
- Node.js 22 或更新版本。
- OpenCode V1；实际验证版本为 1.18.0。当前不支持 OpenCode V2 的插件接口。
- 浏览器通道需要本机安装 Edge、Chrome 或受支持的 Firefox 系浏览器。

## 安装

通过 [npm](https://www.npmjs.com/package/opencode-computer-use-win) 全局安装，在 PowerShell 执行：

~~~powershell
npm install --global opencode-computer-use-win@0.1.3 --registry=https://registry.npmjs.org
npm root --global
~~~

也可从 [GitHub Actions](https://github.com/xshu-hub/opencode-computer-use-win/actions) 成功构建的 opencode-computer-use-win artifact 下载并解压 tgz，离线包安装命令为：

~~~powershell
npm install --global --omit=dev --ignore-scripts .\opencode-computer-use-win-0.1.3.tgz
npm root --global
~~~

也可以从源码构建：

~~~powershell
git clone https://github.com/xshu-hub/opencode-computer-use-win.git
cd opencode-computer-use-win
npm ci --ignore-scripts
npm run build
npm pack
~~~

npm 与 tgz 安装使用相同的全局配置方式，见下文。

## 全局配置

根据 npm root --global 输出，找到包目录。以下示例路径需要替换为自己的实际安装路径。

在用户目录下的 .config/opencode/opencode.json 或 opencode.jsonc 中合并：

~~~json
{
  "plugin": [
    [
      "file:///C:/path/to/node_modules/opencode-computer-use-win/opencode/plugin.mjs",
      { "locale": "zh" }
    ]
  ]
}
~~~

在同目录的 tui.json 中合并：

~~~json
{
  "plugin": [
    "file:///C:/path/to/node_modules/opencode-computer-use-win/opencode/tui.mjs"
  ]
}
~~~

保留现有配置和其他插件，只追加对应条目。重启 OpenCode 后，其他项目会继承全局配置。已有手动 mcp.wincu 条目时，先备份并移除该条目；wincu 由本插件管理。

如果使用源码入口，将示例中的包目录换为自己的源码目录。不要同时注册源码和全局安装包。

更详细的路径获取和升级说明见 [全局安装说明](docs/global-installation.md)。

## 设置入口

- 在 TUI 输入 /computer-use，或从命令面板选择“电脑操控设置 / Computer Use settings”。
- OpenCode 已运行时，在系统终端执行 opencode-cu settings。
- 其他客户端可让 agent 调用 computer_use_settings。

/computer-use 只由 TUI 注册一次，直接打开设置，不调用模型。没有额外的服务端同名斜杠命令，也不需要修改 OpenCode 本体。

设置页保留全部/精简/懒启动/自定义工具方案、逐项开关、浏览器类型与可见性、保留登录、连接现有浏览器、接管提示、鼠标标签、浮窗原文/AI 总结、位置/尺寸/透明度/锁定、快捷键录制和实际预览。支持中英文切换。

数据保存在 %LOCALAPPDATA%\opencode-computer-use-win；可通过 OPENCODE_CU_HOME 指定其他目录。浏览器登录配置与原 DSH 插件隔离。显示设置实时生效；工具或浏览器配置在当前调用结束后重载。并发保存通过版本号检测冲突。

## 执行与停止

工具调用绑定 OpenCode 的真实会话 ID 和执行中的用户轮次，并携带宿主签名。队列中的用户提示、模型重试和系统生成的继续消息不会解除本轮停止。

真实鼠标键盘操作期间可按 Esc 或自定义快捷键停止，本轮后续操作将被拒绝。新用户任务或明确发送“继续”后恢复。浏览器后台操作不监听全局 Esc；使用 OpenCode 的停止按钮取消。原生输入清理结束前保持桌面占用，避免其他项目或会话插入操作。

截图通过标准 MCP 图片块交给 OpenCode，能否参与判断取决于模型及提供方的视觉能力。动作返回 sent 仅说明已发送，应使用新观察或 wait_for 确认效果。

AI 进度总结是可选的额外模型调用，使用当前任务的模型。仅传入受长度限制的操作标签和已公开的助手输出，不传截图、工具参数或完整对话；默认显示原文。

## 验证

~~~powershell
npm test
npm run build
npm run test:ui
node test/run-opencode-host.mjs C:/path/to/opencode.exe
node test/screenshot-output.mjs
node test/batch-actions.mjs
~~~

宿主测试使用真实 OpenCode 进程与隔离的本地模拟模型，验证管理 MCP、会话签名、动态工具刷新、会话互斥、取消/恢复、图片传递和 AI 总结，不使用个人模型密钥。UI 测试只操作隔离的无头 Edge 测试页面。

CI 在 Windows 上构建、测试并上传可安装 tgz。原项目回归仍可通过 npm run test:upstream 运行；部分测试需要其原生/Electron 测试运行环境。参见 [验证记录](docs/validation-opencode-2026-11-13.md) 和 [适配实现](opencode/README.md)。

## 已知边界

OpenCode 1.18 没有原生 Desktop GUI 设置页扩展接口，设置通过本地浏览器窗口展示。对话里的工具详情与图片使用 OpenCode 自身的界面，不注入 DSH 专属聊天行分组。

管理员窗口、UAC、应用自身的自动化限制与参考后端相同。录屏隐藏选项的原生回归在验证环境中未通过，原项目也复现相同问题，当前不宣称已经修复。完整 upstream 测试集未被宣称全部通过。

## 来源与许可

MIT。保留原项目及其上游的版权和归属，见 [LICENSE](LICENSE)、[THIRD_PARTY.md](THIRD_PARTY.md) 和 [参考文档](docs/reference/README.dsh.md)。本项目不代表原项目或 OpenCode 官方。

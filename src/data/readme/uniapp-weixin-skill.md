# uniapp-weixin-skill

uni-app 编译到微信小程序（mp-weixin）的排错指南。涵盖双线程架构、生命周期、样式布局、API 差异、真机调试等场景的系统化排查方案。

## 技能能力

| 章节 | 内容 |
|---|---|
| 一、架构级认知 | 双线程模型、状态驱动 vs 命令式操作、高频踩坑现象 |
| 二、生命周期与时序 | onLoad/onShow/onReady/mounted 执行顺序、网络监听 |
| 三、样式与布局坑 | 全屏覆盖、iOS margin 失效、时间格式化、rpx/px 计算、checkbox/radio、backdrop-filter |
| 四、API 与运行时差异 | fetch/DOM 不可用、存储限制、动态引入、disabled 布尔值陷阱、AppSecret 安全 |
| 五、编译与环境 | Node.js 版本、条件编译、环境变量注入、dev/prod API 地址分离 |
| 六、真机调试专项 | iOS 白屏、AppSecret 暴露、HTTP 证书 |
| 七、样式安全规则（编码约束） | 选择器白名单、@font-face、var() 换肤、::v-deep 穿透、原子化 CSS 转义、平台条件编译 |
| 八、构建兜底与主动防御 | WXSS/WXML 构建修复脚本、styleIsolation 配置 |
| 九、排查与自查工作流 | 排查顺序、AI 自查 6 项清单、主动预警话术 |

## 安装

四种方式选其一。

### 方式一：项目安装（OpenCode 自动发现）

**适用工具**：OpenCode

```bash
npm install uniapp-weixin-skill
```

无需其他操作，OpenCode 自动从 `node_modules` 加载。

验证：在 OpenCode 会话中输入 `/uni-mp-troubleshoot`，应触发 skill 激活。

### 方式二：全局安装 + CLI 部署到各工具

**适用工具**：OpenCode / Cursor / Claude Code

1. 全局安装：

```bash
npm install -g uniapp-weixin-skill
```

2. 按工具执行对应命令：

**OpenCode**
```bash
npx uniapp-weixin-skill install opencode
```
→ 复制到 `~/.config/opencode/skills/`
→ 验证：启动 OpenCode，输入 `/uni-mp-troubleshoot`

**Cursor**
```bash
cd your-project
npx uniapp-weixin-skill install cursor
```
→ 生成 `.cursor/rules/uni-mp-troubleshoot.mdc`
→ 验证：编辑 `.vue` 文件，Cursor 自动应用规则

**Claude Code (Codex)**
```bash
npx uniapp-weixin-skill install codex
```
→ 复制到 `~/.claude/plugins/`
→ 验证：启动 Codex，提问 uni-app 样式问题，应自动引用规则

### 方式三：AI 提示词安装（让 AI 自动选择安装方式）

不确定该用哪种方式？直接把工具名告诉 AI：

```
我在使用 [工具名称]，请告诉我如何安装 uniapp-weixin-skill 技能包。
```

例如：

```
我在使用 Cursor，请告诉我如何安装 uniapp-weixin-skill 技能包。
```

AI 会根据你的工具自动给出对应的安装命令和步骤。

需要安装 `glob` 依赖：

```bash
npm install --save-dev glob
```

## License

MIT

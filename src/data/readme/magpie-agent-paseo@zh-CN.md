<p align="center">
  <img src="icon.svg" width="72" height="72" alt="Paseo Logo" />
</p>

<h1 align="center">Magpie for Paseo</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/magpie-agent-paseo"><img src="https://img.shields.io/npm/v/magpie-agent-paseo.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://github.com/anyaoqi/magpie-agent-paseo/blob/main/LICENSE"><img src="https://img.shields.io/github/license/anyaoqi/magpie-agent-paseo.svg?style=flat-square" alt="license" /></a>
</p>

这是一个 Magpie Agent 插件，为 Paseo 接入 **Magpie** 提供商支持，让 Paseo 可以无缝调用 Magpie 本地网关提供的所有大语言模型服务。

## 特性亮点

- **自动同步**：Magpie 可用模型（包括多账号/聚合路由组）自动发布至 Paseo 的模型选择器中。
- **思考强度映射**：自动识别各模型的推理档位（Thinking options），在 Paseo 中精准提供原生支持的思考强度。
- **无破坏还原**：关闭该 Agent 时，Magpie 自动将 Paseo 配置恢复原样，绝不破坏用户现有的其他配置项。
- **专属凭据**：自动为 Paseo 分配独立的网关通信通信凭据，便于在 Magpie 用量面板单独追踪。

---

## 环境要求

- 本地已安装并启动 [Magpie](https://usemagpie.ai)
- 运行环境已安装并配置好 [Paseo](https://paseo.sh)
- Paseo 守护进程（daemon）与 Magpie 运行在同一个操作系统用户下
- `paseo` 命令位于当前用户的 `PATH` 环境变量中

---

## 安装到 Magpie

### 1. 安装插件

```sh
magpie plugin add magpie-agent-paseo
```

### 2. 启用 Agent

在 Magpie 的 **Agents**（智能体）页面中找到 **Paseo** 并打开开关。

### 3. 重载配置并在 Paseo 中使用

在终端中重载 Paseo 配置：

```sh
paseo reload
```

随后在 Paseo 启动会话时，选择 **Magpie** 作为提供商，即可直接选用来自 Magpie 网关的所有模型。

---

## 运作机制说明

- **配置文件管理**：该插件会自动读取并更新 `~/.paseo/config.json` 中的提供商配置项。若配置了 `PASEO_HOME` 环境变量，Magpie 会自动解析对应的目标路径。
- **网关路由通信**：所有的模型推理请求由 Paseo 发往 Magpie 本地网关（默认 `127.0.0.1:3425`），再由 Magpie 统一调度并安全路由至实际的上游提供商。

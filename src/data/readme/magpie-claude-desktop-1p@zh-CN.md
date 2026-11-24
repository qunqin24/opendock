# Magpie Claude Desktop 1P

[English](README.md) | 简体中文

在保持原生登录的 Claude Desktop 中，使用你在 [magpie](https://github.com/yetone/magpie) 里配置的模型。

![Claude Desktop 的 Code 模型菜单中显示 magpie 模型](assets/model-menu.png)

## 安装

1. 在 magpie 的 **Plugins** 页面添加插件：`github:chxsong/magpie-claude-desktop-1p`
2. 在 **Agents → Claude Desktop 1P** 中打开接入，并选择要显示的模型。
3. 首次接入时信任本地证书，然后按 **⌘Q** 完全退出并重新打开 Claude Desktop。

目前仅支持 macOS，并需要启用 magpie 的本地 HTTP 网关。

## 卸载

先在 magpie 中断开 **Claude Desktop 1P** 并退出 Claude Desktop，再到 **Plugins** 页面移除插件。

## 风险提示

插件通过本地代理解密部分 Claude HTTPS 流量，用于添加模型选项和转发请求；请求转发给 magpie 前会移除 Claude 的认证信息。设计上已尽量避免违反 Anthropic 的条款，但仍存在风险，请自行承担。

## 开发

```sh
npm ci --ignore-scripts
npm run build
npm test
```

## License

MIT

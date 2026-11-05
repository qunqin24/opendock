# opencode-doubao

让 Magpie / OpenCode 2 复用本机豆包 CLI 登录。

需要 Linux、npm、Bun ≥ 1.4、已登录的豆包 CLI（已测 2.31.2），以及要使用的 OpenCode 2 或 Magpie。在含 `package.json` 的项目目录执行（新目录先运行 `npm init -y`）：

```sh
npm i opencode-doubao
```

安装脚本会检查登录、备份并应用 CLI 补丁、注册插件。若提示输入 API key，填 `local`。

## OpenCode

```sh
bash node_modules/opencode-doubao/install.sh opencode
opencode run --standalone -m doubao-cli/auto "你好"
```

交互模式运行 `opencode --standalone`，在模型选择器中选择 `doubao-cli/auto`。

已在 OpenCode 2.0.11 精简配置下验证文本及文件读写；完整配置可能超时，详见[限制与验证](docs/limits.md)。

## Magpie

```sh
bash node_modules/opencode-doubao/install.sh magpie
magpie serve
```

Magpie 引用此项目的 `node_modules/opencode-doubao`，使用时需保留该目录并保持网关运行。默认 Base URL 为 `http://127.0.0.1:3425/v1`，API key 填 `magpie`，模型填 `doubao-cli/auto`。另开终端验证：

```sh
curl --noproxy '*' -sS http://127.0.0.1:3425/v1/responses \
  -H 'Authorization: Bearer magpie' \
  -H 'Content-Type: application/json' \
  -d '{"model":"doubao-cli/auto","input":"只回复 PONG，不要调用工具。"}'
```

工具调用为实验功能，不提供安全隔离；SSE 暂无逐 token 输出，Codex 尚未通过验收。[限制与验证](docs/limits.md)

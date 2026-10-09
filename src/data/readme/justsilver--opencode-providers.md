# opencode-providers

给 [OpenCode](https://opencode.ai) 补上**模型目录里没有的供应商**：一份自维护的注册表 + 一个插件。
装完插件、在 `/connect-providers` 里贴一次 API Key 就能用 —— **不需要写 `opencode.json`**。

> **职责**（使用者）：安装 / 使用 / 疑难解答。开发 / 架构 / 发版见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 为什么需要它

OpenCode 的供应商清单来自 models.dev 目录，**目录里没有的供应商不会出现在 `/connect`**。
想用自建/网关/小众供应商，原本只能在 `opencode.json` 里手写 `providers.<id>` 加一长串模型参数。
本项目把这份数据搬到一份共享注册表里，由插件在运行期注册 —— 配置零增长，改注册表也不用改插件版本。

## 安装

本插件**只通过 npm 包分发**（走 opencode 的 `plugins` 配置或 `opencode plugin add`），没有安装脚本。
在 `opencode.json(c)` 里写一行（不需要手写 provider/模型）：

```jsonc
{
  "plugins": ["@justsilver/opencode-providers"]
}
```

等价的一条命令（帮你写进全局配置）：`opencode plugin add @justsilver/opencode-providers`。

想**固定某个版本**（例如先试预发布）就把版本写全（试完再回到不带版本、跟随 `latest`）：

```jsonc
{
  "plugins": ["@justsilver/opencode-providers@0.3.2"]
}
```

- 预发布版本发布在 npm 的 **`next`** dist-tag 上，正式版才发 `latest`。
- 升级 / 卸载（`<目标>` 就是配置里那串原样）：`opencode plugin update @justsilver/opencode-providers` / `opencode plugin remove @justsilver/opencode-providers`。
- 本插件的 TUI 入口**不含 JSX**、不依赖 Solid，所以配置安装不会踩「双 Solid 运行时」的坑（首帧后不刷新）。
- 想指向**别的注册表**（自建/私有）：配置改成对象条目传 options，不用改源码——

  ```jsonc
  {
    "plugins": [
      { "package": "@justsilver/opencode-providers", "options": { "registryUrl": "https://example.com/registry/index.json" } }
    ]
  }
  ```

装完**通常无需重启**（插件被文件监视，覆盖后自动热重载）；必要时 `opencode service restart`。

## 使用

```
/connect-providers        # 选供应商 → 贴 API Key
/models                   # 该供应商的模型随即出现在列表里
```

- 触发方式与内置 `/connect` 相同：**在输入框敲 `/`，在补全菜单里选中它**（选中即执行）；
  也可以在命令面板里搜 `Connect providers`（该命令注册了 `palette: true`）。
  手打全名再回车**不会**触发（与 `/connect` 一致），因为无参数命令只走补全菜单。
- 再运行一次可以添加第二个账号，或在已有账号之间切换。
- 在 `/connect-providers` 弹窗里按 `Ctrl+R`，或点弹窗底部那行 **Force refresh**，
  即可绕过 6h TTL 立刻重拉注册表并重注册（上游拉不到时保留原有列表并报错，不会清空）。

**为什么 `/models` 里一开始看不到新供应商**：provider 声明为 `activation: "auto"`，
只有拿到凭据（你在 `/connect-providers` 里存过 key）后才会出现在 `/models`。
这样就算注册表里有几十家供应商，也只会显示你真正配了 key 的那些。

凭据存在 opencode 自己的 SQLite 里（`opencode debug paths db`），和内置 `/connect` 完全一致。
API Key 只在你贴入时经过本插件的内存，不落任何本项目自己的文件。

## 范围之外

- **不做参数推断**：注册表写什么就是什么，插件不会去猜 `limit`/`cost`。
- **不调供应商 API**：不访问 `/v1/models`，也就没有运行期的额外网络与失败面。
- **不声明 `env` 认证**：本插件只走 `/connect`-式交互；opencode 的 env 是静默旁路且不在 `/connect` 里展示。
- 不改注册表来源时**不需要** `opencode.json` 里的 `providers` 声明（那是另一条路线）。

## 疑难解答

| 现象 | 原因 / 处理 |
|---|---|
| `/plugins` 面板里本插件有**一条 `failed`** | 同一插件 id 被发现两次（例：`opencode.json` 里配了 npm 包，某个项目的 `.opencode/plugins/` 里又放了一份；或本地绝对路径与 npm 包同时留着）。supervisor 保留首个、把后来者标成 `failed`，错误信息是 `Duplicate plugin ID: opencode-providers`。删掉多余的那份即可 |
| `/connect-providers` 说没有可用供应商 | 注册表没加载成功。看 server 日志里的 `[opencode-providers]`，并确认 `/api/plugin` 里自己那条 `state.status` 是 `active` |
| `/models` 里看不到新供应商 | 正常：`activation: "auto"`，在 `/connect-providers` 里存过 key 之后才会出现 |
| 注册表改了，`/models` 没跟上 | 插件**没有后台定时器**，只在加载时判一次 6h TTL。想立刻生效就在 `/connect-providers` 弹窗里按 `Ctrl+R`（Force refresh），或 `opencode service restart` |

## 开发与贡献

想改插件代码、维护注册表数据、或了解测试与发版流程：见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可

[MIT](./LICENSE)

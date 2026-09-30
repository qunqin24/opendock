# oh-my-opensecret

**OpenCode 隐私脱敏插件** — 自动识别并替换敏感信息，保证 LLM 提供商看不见明文，同时本机工具执行不受影响。

> ⚠️ **要求 OpenCode 2.x（V2 运行时）**，基于 V2 server 插件 API 实现。

## 功能

- **发送前脱敏** — LLM 请求发出前，自动将消息中的敏感信息替换为占位符
- **工具参数还原** — 工具执行前，参数中的占位符自动还原，本地工具拿到真实值
- **闭环安全** — Provider 永远看不到明文，本地工具不受影响

> ℹ️ **「脱敏单向」说明**：本插件只注册「请求前脱敏」和「工具执行前还原」两个 hook，**不注册任何响应侧 hook**。
> 因此模型回复中若复述占位符，界面显示的仍是占位符形态（不会还原为原文）。敏感信息本身绝不会泄露给 Provider，安全性不受影响。

## 工作原理

> 本插件基于 **OpenCode 2.x (V2) server 插件 API** 实现，不兼容 V1。

```
 user types:  "my email is user@corp.com"
        |
        v
+--------------------------------------------------------+
| ctx.session.hook("context")   [src/index.js]           |
| redact in place:                                       |
|   "user@corp.com"  ->  "__OMOS_EMAIL_ab12cd34ef56__"   |
+--------------------------------------------------------+
        |
        v
+--------------------------------------------------------+
| send request to LLM provider                           |
| provider sees only placeholders:                       |
|   "my email is __OMOS_EMAIL_ab12cd34ef56__"            |
+--------------------------------------------------------+
        |
        v
+--------------------------------------------------------+
| ctx.tool.hook("execute.before")   [src/index.js]       |
| restore placeholders in tool input, then:              |
|   event.input = restoreInput(event.input, session)     |
+--------------------------------------------------------+
        |
        v
 local tool runs with the real value
```

模型回复中出现的占位符将保持占位符形态展示（脱敏单向）。

## 安装

### 1. 安装插件

本插件需要 OpenCode 2.x（V2 运行时）。在 `opencode.json` / `opencode.jsonc` 的 `plugins` 数组中添加：

```jsonc
{
  "plugins": ["oh-my-opensecret"]
}
```

或者指向本地源码（开发调试用，V2 支持直接加载 `.js` 入口）：

```jsonc
{
  "plugins": ["./path/to/oh-my-opensecret/src/index.js"]
}
```

### 2. 配置（可选）

首次启动会自动生成默认配置到 `~/.config/opencode/oh-my-opensecret.yaml`，开箱即用。

你也可以手动创建配置文件，查找优先级：

1. `$OPENCODE_SECRET_CONFIG` 环境变量指向的文件（**显式指定时只认这一个路径**，不再回落下面几处）
2. 项目根目录 `./oh-my-opensecret.yaml`
3. 项目 `.opencode/oh-my-opensecret.yaml`
4. 全局配置目录 `oh-my-opensecret.yaml`（`$OPENCODE_CONFIG_DIR` → `$XDG_CONFIG_HOME/opencode` → `~/.config/opencode`）

以上都不存在时，插件会自动生成一份默认配置（生成到 `$OPENCODE_SECRET_CONFIG` 指定的路径，或全局配置目录）。

配置非法（如 `patterns.regex` 写成字符串、`session.ttl` 格式错、正则无法编译）会**直接报错中止加载**，不会静默套用默认值。

## 内置规则

内置规则共 9 条，仅覆盖通用 PII，不包含任何平台 API Key。API Key 请在 YAML 配置的 `patterns.regex` 中自行添加。

| 规则 | 匹配内容 | 示例 |
|------|---------|------|
| `email` | 邮箱地址 | `user@corp.com` |
| `china_phone` | 中国大陆手机号 | `13800138000` |
| `china_id` | 中国大陆身份证号 | `110101199001011234` |
| `uuid` | UUID（版本位 1-5） | `550e8400-e29b-41d4-a716-446655440000` |
| `ipv4` | IPv4 地址 | `192.168.1.1` |
| `ipv6` | IPv6 地址（**仅全写 8 组形式**） | `2001:0db8:0000:0000:0000:0000:0000:0001` |
| `mac` | MAC 地址（`:` 或 `-` 分隔） | `aa:bb:cc:dd:ee:ff` |
| `jwt` | JWT Token | `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.xxxxx` |
| `db_connection` | 数据库连接串（含 `user:pass@`） | `mysql://user:pass@host` |

> `ipv6` 的压缩写法（如 `2001:db8::1`）不会被匹配。

## 自动发现

`auto_discovery: true` 时，每次启动自动扫描 `opencode.json` / `opencode.jsonc`，从中提取 `apiKey`、`token`、`secret`、`password` 等敏感字段值，生成对应的正则规则追加到配置文件中。

- 已存在的规则跳过，不覆盖用户手动配置
- 新发现的敏感值自动生成规则
- 写入的规则与扫描报告**只含配置路径、覆盖状态、字符长度，不含任何原文片段**
- 报告块按行定位写回，每次启动幂等执行，不重复插入

## 项目结构

```
index.js          # 目录型插件入口 shim（重导出 src/index.js）
src/
├── index.js      # 插件入口（V2 Plugin.define + 注册 context/execute.before hook）
├── singleton.js  # 进程级单例（globalThis 夺权，保证一个 server 进程只有一个实例生效）
├── config.js     # 配置加载（级联查找 + YAML 解析 + fail-fast 校验 + auto-discovery 报告写回）
├── patterns.js   # 匹配规则构建（关键词/正则/内置/排除）
├── engine.js     # 脱敏引擎（重叠命中处理）
├── session.js    # 占位符管理器（进程级共享 HMAC 密钥 + 映射表 + TTL 淘汰 + LRU）
├── restore.js    # 占位符还原
├── deep.js       # 深度遍历工具（递归脱敏/还原）
└── logger.js     # 分级日志系统
```

设计细节见 `AGENTS.md`，OpenCode 插件 API 字段见 `doc/02-plugin-api-reference.md`。

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test
```

## 许可

MIT

## 免责声明

1. 本项目以**个人自用**为主要目的开发，非商业产品
2. **使用前请三思**——脱敏规则无法覆盖所有场景，不保证 100% 识别所有敏感信息
3. 作者不对因使用本项目导致的任何**数据泄露、损失或法律责任**承担责任
4. 请确保使用方式符合当地法律法规，**合法使用**

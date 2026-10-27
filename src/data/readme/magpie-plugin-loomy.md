# magpie-plugins

为 [magpie](https://usemagpie.ai) 提供更多模型供应商的插件集合。

## 包含的插件

| 包 | 供应商 | 特性 |
| --- | --- | --- |
| [`magpie-plugin-loomy`](packages/loomy) | **Loomy（科大讯飞）** | 桌面端登录态 / 手机号短信 / 粘贴 session 三种登录方式，HMAC-SHA1 签名，积分与签到 |
| [`magpie-plugin-amd`](packages/amd) | **AMD TokenFactory（Radeon Cloud）** | 多 API key 轮换，动态模型目录，OpenAI 兼容推理 |

## 安装

magpie 的插件可以从三种来源装：**npm 包名**、**GitHub 仓库**、**本机文件夹**。图形界面里点「已有想装的？」把下面任意一种写进输入框也行，效果和命令行一致。

下面以 AMD 为例，Loomy 换成 `magpie-plugin-loomy` / `loomy` 即可。

### 从 npm 安装

包发布到 npm 之后，给包名就够了：

```bash
magpie plugin add magpie-plugin-amd
magpie plugin login amd
```

需要固定版本时带上版本号，例如 `magpie plugin add magpie-plugin-amd@0.1.0`。

### 从 GitHub 安装

```bash
magpie plugin add github:sucooer/magpie-plugins
```

这个写法取的是仓库根目录的插件。本仓库是 monorepo，根目录的 `package.json` 只负责 workspace 声明、标了 `private`，本身不是一个插件，所以装不到 `packages/amd` 或 `packages/loomy` 里的具体插件。日常安装请用 npm 包名，需要追提交时用下面的本机文件夹方式。

### 从本机文件夹安装

改代码的时候用这个：装好之后改完保存，下一次请求就会用上新代码，不用重新安装。

```bash
git clone https://github.com/sucooer/magpie-plugins
magpie plugin add /absolute/path/to/magpie-plugins/packages/amd
magpie plugin login amd
```

路径要写绝对路径，并且指向包含插件 `package.json` 的那一层，也就是 `packages/amd` 或 `packages/loomy`。指向仓库根目录不成立，原因同上。装完别随手移动或删掉这个文件夹。

## 仓库结构

```text
magpie-plugins/
├── package.json            # workspaces 根，private，不发布
├── packages/
│   ├── loomy/
│   │   ├── package.json    # magpie-plugin-loomy
│   │   ├── index.mjs
│   │   ├── index.test.mjs
│   │   ├── icon.png
│   │   └── README.md
│   └── amd/
│       ├── package.json    # magpie-plugin-amd
│       ├── index.mjs
│       ├── index.test.mjs
│       ├── icon.png
│       └── README.md
└── README.md
```

## 开发

```bash
npm install          # 建立 workspace 链接（两个包都零运行时依赖）

npm run test:amd     # AMD 单测（node --test，30 个用例）
npm run test:loomy   # Loomy 单测（bun test，需要 Bun）
npm run test:all     # 两个都跑
npm run check        # 两个插件的语法检查
```

> Loomy 的测试使用 `bun:test` 编写，需要 Bun 运行；AMD 的测试使用 `node:test`，Node 18+ 即可。

## 发布

### 首次发布

npm 只允许为已经存在的包配置 Trusted Publisher，所以每个包的第一版只能手动推上去：

```bash
npm login
npm publish --workspace=magpie-plugin-amd --access public
npm publish --workspace=magpie-plugin-loomy --access public
```

### 配置 Trusted Publisher

打开 npmjs.com 上对应包的 Settings → Trusted publishing，选 GitHub Actions，填这些值：

| 字段 | 值 |
| --- | --- |
| Organization or user | `sucooer` |
| Repository | `magpie-plugins` |
| Workflow filename | `publish.yml` |
| Environment | 留空 |
| Allowed actions | 勾选 `npm publish` |

Workflow filename 只填文件名，不要带 `.github/workflows/` 路径，大小写要和仓库里的实际文件一致。也支持用命令行建：

```bash
npm trust github magpie-plugin-amd --repo=sucooer/magpie-plugins --file=publish.yml --yes
npm trust github magpie-plugin-loomy --repo=sucooer/magpie-plugins --file=publish.yml --yes
```

### 后续版本

```bash
npm version patch --workspace=magpie-plugin-amd --no-git-tag-version
git commit -am "chore(amd): bump to 0.1.2"
git tag magpie-plugin-amd@0.1.2
git push origin main --tags
```

tag 的格式是 `包名@版本号`，版本部分要和该包 `package.json` 里的 `version` 完全一致，否则工作流在版本校验这一步就停了。校验通过后它跑对应包的单测，再用 OIDC 凭证发布。两个包互不干扰，推一个包的 tag 不会连带发布另一个。

## 免责声明

两个插件均仅用于个人学习与研究，与科大讯飞、AMD 无任何关联，未获得其授权、认可或赞助。

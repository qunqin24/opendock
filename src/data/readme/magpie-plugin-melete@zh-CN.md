# Melete for Magpie

[English](README.md) | 简体中文 | [Español](README.es.md)

回看你和 AI 是怎么一起做事的。

在 Magpie 中选择 DSH 或 Codex，点击「开始复盘」。选中的 Agent 通过受限的历史工具回看自己的记录，Melete 将结果排成卡片，并核对引用。无需选择具体会话，也无需开启 Magpie 对话录制。

目前支持 DSH 和 Codex，每次复盘使用一个来源。其他 Agent 的支持和多来源合并复盘，计划在后续更新中逐步补充。

## 安装与使用

从 npm 安装：

```sh
magpie plugin add magpie-plugin-melete
```

也可以使用 `magpie plugin add /你的路径/magpie-plugin-melete` 安装本地开发副本。

本机安装后，在 Magpie 侧栏打开 **Melete 复盘**。选择 Agent，沿用最近 7 天或调整范围，可选填写意图，再开始。生成期间可以切换页面，回来继续查看；停止仅针对这次复盘任务。

需要运行 Magpie，并安装所选 Agent。DSH 使用 `headless` profile 的模型配置，Codex 使用自己的默认模型配置；Melete 不自动改写它们。如果 Agent 的凭据或额度不可用，先在原工具中恢复正常对话。没有额外的 Melete API Key。

当前实现需要 Node.js 24+（DSH 读取 zstd 记录需要该版本），Magpie 插件主机使用 Bun。已在 macOS 上验证 Magpie 0.1.3812、0.1.3838 与 Codex CLI 0.167.0-alpha.3.2。目前按 macOS 开发验证，其他平台未实测；远程 Magpie 或手机访问尚未验证。

## 本地与模型边界

- 项目不运营服务器、没有账号、不收集数据或发送遥测。插件的界面服务只监听 `127.0.0.1`，默认端口 3497。
- 复盘会消耗源 Agent 配置的模型额度。相关历史片段会由该 Agent 发送给它配置的模型，是否经过 Magpie 及使用哪家服务取决于你的 Agent 配置；不是完全离线推理。
- 每次只读取所选来源、请求范围内的记录；不提供 shell、写文件、浏览网页或委派工具给复盘 Agent。历史里的指令作为材料处理。
- 为控制一次复盘的成本，最多纳入最近 24 段会话，单条内容最多 6000 字符。单份源日志超过 64 MiB 会跳过，8 分钟仍未完成会停止；可缩短范围重试。读取分页由 Agent 决定；结果明确列出实际读取和缺失，不能保证“全部”覆盖所有历史。
- DSH 读版本 0/4 的 JSONL/zstd 记录，Codex 读 `sessions` / `archived_sessions` 下可读的 rollout JSONL。尚不读取云端专有记录或加密历史。无法识别的记录跳过并说明。
- 引用必须能在本次读取的源记录中逐字核对，未核实的观察不写进正式复盘。单个 Agent 的自我解释仍是一种可能读法。

## 保存、导出与删除

设置和复盘位于 `~/.melete/magpie/`，与 DSH 版 Melete 分开。此处包含复盘 JSON、任务状态、源运行任务及用户主动导出的 HTML/PNG；文件默认仅当前用户可读。

复盘页面「更多操作 → 导出与分享」可保存 HTML 或图片。HTML 是可离线阅读的完整卡片文字，图片使用分享短句；两者不包含内部会话 ID、路径或完整上下文。导出前请检查可能识别自己的文字信息。

删除单份复盘不删除源 Agent 的历史。设置中「删除全部复盘与导出」清除本插件的复盘和导出，不删除原工具历史或原工具的运行记录。临时源运行记录在 `private/`，不作为复盘历史再次读取。卸载插件不自动擦除用户文件，可自行删除这个独立目录。

## 界面与方法

采用现有 Melete 旧版的卡片阅读结构，去掉文明主题和文章版；适配窄窗口，支持浅深色和简体中文/English。主体保留“人用 AI”“AI 对你”“与社会”、出处、可能读法、开放问题；只有填写意图时才生成小实验。

复用固定版本的 Melete 照见图谱。DSH 最新施工副本是视觉和内容字段基线，原 DSH 插件不被改动。多 Agent 汇总、方法库、私人信件和 Magpie 已保存对话补充尚未实现。

## 开发验证

```sh
npm test
node test/real-runtime.mjs dsh
node test/real-runtime.mjs codex
```

后两项会调用真实 Agent 与模型，但只提供构造的两段历史，不读取真实聊天，消耗相应模型额度。测试数据不随发行包分发。

## 许可

代码 Apache-2.0；内置 Melete 图谱 CC BY 4.0，保留来源与署名，见 LICENSE、NOTICE。名称 Melete 保持原项目身份。当前为早期版本，已发布 npm，社区收录申请待审核。

## Melete 的其他版本

- [Melete Skill](https://github.com/yancanny/melete-skill)：在支持 Skill 的工具中回顾。
- [Melete DSH](https://github.com/yancanny/dsh-plugin-melete)：DeepSeek Harness 插件。

# opencode-triton-ascend-generator

[![test](https://github.com/ElleElleWu/ascend-triton-agent/actions/workflows/test.yml/badge.svg)](https://github.com/ElleElleWu/ascend-triton-agent/actions/workflows/test.yml)

GitHub: <https://github.com/ElleElleWu/ascend-triton-agent>

Triton-Ascend 算子生成与优化工作流，面向 [opencode](https://opencode.ai)。一个 npm 包同时包含：

- 一个主编排 agent：`triton-op-generator`，完整 Phase 0-7 prompt（约 1,100 行）
- 10 个 Skill：1 个 Phase 0-7 编排 + 9 个能力 Skill
- 安装时从上游 HEAD 拉取完整 cannbot-knowledge 知识库（本次验证 `4aa438e`，9,740 文件，约 104 MB）；npm 包内只保留 63 文件离线 fallback
- 3 个 hook：baseline 路径保护、知识库路径注入、无 NPU 环境提示

> 这是社区包，不是 Anthropic、DeepSeek 或华为官方插件。生成/验证需要 Ascend NPU 与 CANN；安装和 Skill 发现不需要 NPU。

## 安装

```bash
npm i -D opencode-triton-ascend-generator
npx opencode-triton-ascend-generator install
```

安装器会：

1. 复制 `agents/` 到 `.opencode/agents/`
2. 复制 `skills/` 到 `.opencode/skills/`
3. 复制 `knowledge/` 到 `.opencode/knowledge/`
4. 复制 `config.json` 到 `.opencode/triton-op-generator.config.json`
5. 默认把插件复制到 `.opencode/plugins/triton-ascend.js`（guard helper 同目录），不依赖 npm 发布即可加载

还没发布 npm 时，可以直接从 GitHub 安装：

```bash
npm i -D github:ElleElleWu/ascend-triton-agent
npx opencode-triton-ascend-generator install
```

如果包已经发布到 npm，也可以改用：

```bash
npx opencode-triton-ascend-generator install --npm
```

`--npm` 会把 `opencode-triton-ascend-generator` 写入项目根 `opencode.json` 的 `plugin` 数组；已存在的配置只追加，不覆盖其他字段。

### 完整 KB 与上游同步

```bash
# 默认：拉取 cannbot-knowledge 最新 HEAD 的完整 KB
npx opencode-triton-ascend-generator install

# 离线：只装 63 文件核心子集
npx opencode-triton-ascend-generator install --core-kb

# 指定 commit/tag
npx opencode-triton-ascend-generator install --kb-ref <commit-or-tag>

# 已安装项目原地同步到最新上游
npx opencode-triton-ascend-generator knowledge sync
```

安装器把上游 `knowledge/` 复制到 `.opencode/knowledge`，并写 `.opencode/knowledge/.cannbot-kb.json` 记录 `repository/ref/file_count/synced_at`。`install` 和 `knowledge sync` 默认解析上游 HEAD，跟随 cannbot-knowledge 演进，不需要重新发 npm 包；需要可复现时用 `--kb-ref <commit>` 固定。

完整 KB 约 9,700 文件 / 104 MB。克隆缓存放在 `~/.cache/opencode-triton-ascend-generator/knowledge/<commit>`（可用 `--kb-cache` 改），同一 commit 重复安装不再下载。

## 使用

启动 opencode，切换到 `triton-op-generator` agent（Tab 循环，或 `@triton-op-generator`），然后描述任务：

```text
生成一个 Triton-Ascend 框架的 softmax 算子实现，ASCEND_RT_VISIBLE_DEVICES=1
```

支持三种输入：

- torch 标杆（单 case 会自动扩为多 shape）
- torch 标杆 + GPU Triton kernel（kernel 作参考实现）
- 仅 GPU Triton kernel + 同名 `.pt`（含 `input_data`）

输出在 `triton_ascend_output/op_{op_name}_{timestamp}_{rid}/`：

```text
├── {op_name}_generated.py
├── report.md
├── summary.json
└── session.md
```

## 包内结构

```text
opencode-triton-ascend-generator/
├── index.js                         # plugin：hooks
├── config.json                      # target_speedup / npu_preflight 默认值
├── lib/guard.js                     # 路径保护 helper
├── lib/knowledge.js                 # 全量 KB 拉取/缓存/同步
├── bin/install.js                   # 资产安装器
├── docs/knowledge-fallback.md       # 63 文件离线 fallback 说明
├── agents/
│   └── triton-op-generator.md       # 主编排 agent
├── skills/
│   ├── triton-op-generator/         # Phase 0-7 编排
│   ├── triton-task-extractor/
│   ├── triton-op-designer/
│   ├── triton-op-coding/
│   ├── triton-op-verifier/
│   ├── triton-latency-optimizer/
│   ├── triton-precision-debug/
│   ├── triton-simulator-optimizer/
│   ├── triton-mfu-analyzer/
│   └── npu-arch/
└── knowledge/                      # npm 包内 63 文件离线 fallback
    └── ops/triton/
        ├── guides/constraints/      # 类别约束卡 + 路由卡 + 索引
        ├── guides/triton_ascend/    # 编程基础、API、grid 限制、示例
        └── optimizations/operator_optimization/debug_checklist.md
```

## Hooks

| Hook | 行为 |
|---|---|
| `tool.execute.before` | 拦截 `edit`/`write`/`patch` 对 `npu_benchmark/*.py|json` 的修改；`triton_ascend_output/` 放行 |
| `shell.env` | 注入 `TRITON_ASCEND_PLUGIN=1` 与 `TRITON_ASCEND_KB_ROOT=<project>/.opencode/knowledge` |
| `event: session.created` | 调 `npu-smi info`；无 NPU 时写 warning，不阻塞会话 |

## 无 NPU 时

- 安装、Skill 发现、agent 切换都正常；
- 执行生成/验证时，编排 Skill 会要求先跑 `npu-smi info`，检测不到就停止并报告“未检测到 Ascend NPU，无法执行生成/验证”；
- 插件不会伪造结果，也不会生成半成品报告。

## 环境要求

- opencode（当前版本）
- 执行生成/验证时：Ascend 910/950 系列 NPU、CANN Toolkit、`torch_npu`、`triton-ascend`
- 安装与加载：Node.js ≥ 18

## 知识库：安装全量，npm 包保留 fallback

npm tarball 不装 9,700 个文件，原因是完整 KB 约 104 MB，会超过 Claude Directory 的 512 文件 / 50 MiB 限制，也会让 npm 安装变重。因此采用“薄包 + 安装时拉全量”：

| 场景 | 行为 |
|---|---|
| `install` 默认 | 从 `https://gitcode.com/cann/cannbot-knowledge.git` 拉取 HEAD，复制完整 `knowledge/` |
| `install --kb-latest` | 兼容参数；默认已经是上游 HEAD |
| `install --kb-ref <ref>` | 安装指定 commit/tag/branch |
| `install --core-kb` | 不联网，只复制 npm 包内 63 文件核心子集 |
| `knowledge sync` | 已安装项目原地更新到上游 HEAD，更新 `.cannbot-kb.json` |

同步演进依靠 `.cannbot-kb.json` 和每次安装时解析的上游 HEAD：

- `install` / `knowledge sync` 默认解析上游 HEAD，直接跟上游演进；
- 需要可复现的环境用 `--kb-ref <commit>`；
- 安装后 `.cannbot-kb.json` 记录本次实际 ref，便于核对。

安装后的 `.opencode/knowledge` 是完整树（`common`、`ops`、`model`、`runtime`、`contrib` 等），包含上游所有 `index.md`、约束卡、playbook 和优化卡。编排 agent 仍按 `constraints/index.md` 路由；如果使用 `--core-kb`，缺失卡会记录 `card_exists: false`。

## 本地验证

```bash
npm test          # 10 项：资产存在性、frontmatter、安装器、guard、NPU 事件
npm pack --dry-run
```

当前结果：

- 10/10 通过；
- npm 包 433 文件、约 1.6 MB tarball、5.5 MB unpacked；
- 用 tarball 在临时项目执行 `--core-kb` 安装，安装器成功复制 10 个 Skill、64 个知识文件，以及本地插件；
- `import("opencode-triton-ascend-generator")` 只导出 `TritonAscend`；guard helper 在 `lib/guard.js`，不作为插件导出。
- GitHub Actions `test` 通过；`npm i -D github:ElleElleWu/ascend-triton-agent` 直装验证通过；
- opencode 1.19.4 下 `debug agent triton-op-generator` 返回完整 prompt（1,114 行 / 37.5 KB），10 个 Skill 可发现。

## 首版限制

- 已在 opencode 1.19.4 验证 agent/Skill 发现与插件模块加载；模型会话返回空 step，未在真实对话中触发 guard；
- 1.19.4 只自动发现 `.opencode/plugins/*.js` 顶层文件，不扫描嵌套目录；安装器已按此适配；
- 完整 KB 安装依赖 git 与 gitcode.com 网络；离线用 `--core-kb`；
- 未在真实 opencode + Ascend NPU 环境完成端到端联调；
- 9 个能力 Skill 的脚本来自 cannbot-skills，路径与依赖按 opencode 布局做了复制，尚未逐脚本验证；
- 未发布到 npm；npm 包名 `opencode-triton-ascend-generator` 目前未被占用；
- 不是 opencode 官方插件，ecosystem 收录需要单独 PR。

## 许可证

Apache-2.0。知识卡与 Skill 内容来自 CANNBot 仓群，保留原始归属；发布前需完成公司授权与归属披露。

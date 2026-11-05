# @cr903/opencode-swarm

Swarm 多会话编排插件（OpenCode v2）：planner 拆任务 → dev 实现 → tester 独立验收 → reviewer 语义评审 → 自动派下一单。从生产仓库提炼，300+ 回归用例锁定。

- 原子队列（tmp+fsync+rename / 目录锁 / CAS）+ FSM 状态机单源
- 门禁管道：verify 真跑 + verdict/commit 绑定 + policy 禁区 + secret 扫描 + diff/security（lint/type/tenant 可选）
- 时间线溯源（timeline.jsonl 可重放 rebuild）+ 本地事件通道（FileBus）
- 高风险软卡（人工 approve）、3-strike 熔断、revert 回门禁前、nightly 只读重跑、eval 导出
- TUI 大屏（sidebar 窄卡 + 整页 board + footer 状态行，只读）

## 安装

```bash
opencode plugin add @cr903/opencode-swarm
# 或在 opencode.json(c) 里加：
# { "plugins": ["@cr903/opencode-swarm"] }
opencode service restart
```

要求：Node ≥ 18，git 可用。插件零运行时依赖（除 `@opencode/plugin` 与 TUI 的 `solid-js` / `@opentui/*`）。

## 上手（三步）

```bash
/swarm-init      # 安装配套文件到本项目：agents/*.md + .opencode/review/_default.md（已存在的不覆盖；skills 随插件自动注册）
/swarm-up --planner-model <p> --dev-model <d> --tester-model <t> --name <需求名>
# 默认主会话即 planner：直接在当前窗口
#plan 拆解 <需求或PRD路径>
/swarm-start     # 必须显式派发（up 只开轮不派发；未 start 前 dev/test 认领会被拒）
```

> 想恢复「另建一个 plan 会话」的旧行为：`/swarm-up ... --plan-session new`。

完整操作手册见 [`docs/swarm-使用手册.md`](docs/swarm-使用手册.md)，设计说明见 [`docs/swarm-SPEC.md`](docs/swarm-SPEC.md)。

## 命令速查

`/swarm-up /swarm-start /swarm-status /swarm-drained /swarm-halt /swarm-retry /swarm-revert /swarm-nightly /swarm-eval /swarm-runs /swarm-switch /swarm-migrate /swarm-models /swarm-mode /swarm-clean`（共 17 个，另有 `/swarm-board` TUI 大屏）。

工具（agent 调用）：`swarm_plan / swarm_claim / swarm_next / swarm_done / swarm_test / swarm_review / swarm_approve / swarm_halt / swarm_revert / swarm_read_queue / swarm_config`。

角色：`swarm-plan`（只拆不写）→ `swarm-dev`（一次一单）→ `swarm-test`（独立验证，write/edit deny）→ `swarm-reviewer`（只审不改，subagent）。

## 插件 options（opencode.json）

```jsonc
{
  "plugins": [["@cr903/opencode-swarm", {
    "queue": ".swarm/queue.jsonl",   // 兼容旧调用；默认按 run 切分到 .swarm/runs/<id>/
    "maxRetries": 3,                 // test fail 熔断阈值
    "verifyTimeoutMs": 300000,
    "allowlist": ["task"],           // 追加到 verify_cmd 白名单
    "autoWake": true,
    "policyDeny": [],                // 追加禁区
    "sensitivePaths": [],            // 命中即按高风险提示
    "gates": { "lint": true, "type": true, "tenant": true },  // 默认关闭的门
    "executor": "hybrid"             // sessions | subagents | hybrid（默认 hybrid：dev/plan 走会话，test/reviewer 走子代理）
  }]]
}
```

## 门禁说明

- `verify`：白名单裸命令（禁 shell 拼接），异步跑 + 硬超时 + 输出截断。
- `lint` 默认跑 `make gate`（可 `lint_cmd` 覆盖）；`type` **必须显式传 `type_cmd`**（本包不假设技术栈，未传直接拒收并指引）；`tenant` 默认跑包内 `lib/swarm-tenant-check.mjs`，检查脚本按 `SWARM_TENANT_CHECK` 环境变量 → 当前仓库 `smarterlab-backend/scripts/tenant-check.sh` 查找，缺失给明确指引退出（自备脚本或传 `tenant_cmd`）。
- `review=true` 的任务 test pass 后进 `reviewing`，`swarm_review` 出结论（`Important` 必答，`Nit` 不拦，`wontfix` 须写 reason）。

## 运行时产物（在你的项目里，不进包）

```
.swarm/runs/<runId>/{queue.jsonl,timeline.jsonl,events.jsonl,round.json,meta.json}
  round.json = { name, sessions:{plan,dev,test}, members:{<sessionID>: {role, at}} }
               members 记录主会话/子代理等非角色会话，供「会话 → run」反查（footer 跟随 / sidebar 高亮）
  meta.json  = { name, createdAt, executor, roleModels{dev,dev_backend,dev_frontend,test,reviewer}, startedAt?, pendingStart?, prdPath? }
               pendingStart=true 表示「up 已开轮、尚未 /swarm-start」，dev/test 认领会被拒；
               roleModels 按需：backend→dev_backend、frontend→dev_frontend（legacy dev 通配），test/reviewer 按需索要
.swarm/secret-baseline.json   # secret 门基线（只报新增）
.swarm/current                # 当前轮指针（并行多轮时仅作兜底：run 解析优先会话/任务归属）
.swarm/eval/<month>.jsonl     # /swarm-eval 导出
```

## 测试

```bash
npm test   # node --test tests/（单元 + 端到端 + board 数据层，随功能增长）
```

## 1.1.0 行为变更（并行多轮修复）

- **默认主会话即 planner**：`/swarm-up` 不再另建 plan 会话（`plan = 发起命令的会话`）；旧行为用 `--plan-session new`。
- **`/swarm-start` 是唯一派发授权**：`/swarm-up` 只开轮不派发；`pendingStart` 期间 `swarm_claim / swarm_next` 拒收（`force:true` 逃生）。
- **run 解析不再只看全局指针**：`显式 run > 任务归属（task_id）> 会话绑定 > .swarm/current`，并行两轮互不抢指针。
- **命名/跟随**：`round.name` 与 `meta.name` 同步双写；sidebar 以 `meta.name` 为规范名；footer/sidebar 高亮按 `round.sessions + round.members`（主会话、子代理）跟随。
- 空入队（全部被校验拒）不再改轮名。

## 版本与兼容

- 跟随 OpenCode v2 插件契约（`@opencode/plugin ^2`）；采用 OpenCode 新版时先跑 `npm test`。
- agents 目录使用 Markdown agent 文件（v1 frontmatter，OpenCode 兼容读取）；skills 由插件在 setup 时自动注册。

## License

MIT — 见 [LICENSE](LICENSE)。

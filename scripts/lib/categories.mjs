/**
 * Category taxonomy + heuristic classifier.
 *
 * Each category has an ordered list of regexes tested against
 * `${name} ${description} ${keywords} ${topics}`. First match wins, so
 * more specific categories must come earlier in CATEGORIES.
 */

export const CATEGORIES = [
  {
    id: 'auth',
    label: '认证与凭证',
    labelEn: 'Auth & Credentials',
    description: '登录、OAuth、API key 管理与第三方账号打通。',
    descriptionEn: "Sign-in, OAuth, API-key management and third-party account plumbing.",
    icon: 'key-round',
    patterns: [/\bauth\b/, /oauth/, /\blogin\b/, /credential/, /\bsso\b/, /api[- ]?key/, /token.?refresh/],
  },
  {
    id: 'memory',
    label: '记忆与上下文',
    labelEn: 'Memory & Context',
    description: '跨会话记忆、知识库、上下文压缩与检索增强。',
    descriptionEn: "Cross-session memory, knowledge bases, context compaction and retrieval.",
    icon: 'brain',
    patterns: [/\bmemory\b/, /\brecall\b/, /knowledge.?base/, /\brag\b/, /embedding/, /vector.?(db|store)/, /context.?(window|compress|manage)/],
  },
  {
    id: 'mcp',
    label: 'MCP 集成',
    labelEn: 'MCP Integrations',
    description: '接入 Model Context Protocol 服务器与工具。',
    descriptionEn: "Model Context Protocol servers and tool integrations.",
    icon: 'plug',
    patterns: [/\bmcp\b/, /model.?context.?protocol/],
  },
  {
    id: 'git',
    label: 'Git 与版本控制',
    labelEn: 'Git & VCS',
    description: 'worktree、提交、PR、代码审查与分支工作流。',
    descriptionEn: "Commits, reviews, branches and everything else in the git workflow.",
    icon: 'git-branch',
    patterns: [/\bgit\b/, /worktree/, /pull.?request/, /\bpr\b review/, /commit/, /github/, /gitlab/, /\bdiff\b/, /branch/],
  },
  {
    id: 'agents',
    label: '智能体编排',
    labelEn: 'Agent Orchestration',
    description: '子智能体、后台任务、多模型编排与工作流自动化。',
    descriptionEn: "Sub-agents, task orchestration, multi-agent collaboration and workflows.",
    icon: 'workflow',
    patterns: [/sub.?agent/, /orchestrat/, /\bswarm\b/, /multi.?agent/, /background.?(task|agent|job)/, /\bworkflow\b/, /\bpipeline\b/, /task.?queue/],
  },
  {
    id: 'tools',
    label: '工具与命令',
    labelEn: 'Tools & Commands',
    description: '自定义工具、斜杠命令、技能包与 shell 增强。',
    descriptionEn: "Custom commands, shell helpers and everyday tool extensions.",
    icon: 'wrench',
    patterns: [/\bskill/, /slash.?command/, /custom.?tool/, /\bcommand\b/, /\bshell\b/, /terminal/, /\bcli\b/, /\bbash\b/],
  },
  {
    id: 'lsp',
    label: '代码智能',
    labelEn: 'Code Intelligence',
    description: 'LSP、AST 分析、格式化、lint 与类型检查。',
    descriptionEn: "Language servers, static analysis, refactoring and code navigation.",
    icon: 'braces',
    patterns: [/\blsp\b/, /language.?server/, /\bast\b/, /tree.?sitter/, /\blint/, /\bformat/, /type.?(check|inject|script)/, /\bprettier\b/, /\beslint\b/],
  },
  {
    id: 'observability',
    label: '可观测与分析',
    labelEn: 'Observability',
    description: 'token 用量统计、成本追踪、日志、埋点与性能分析。',
    descriptionEn: "Token accounting, cost tracking, telemetry and usage analytics.",
    icon: 'chart-line',
    patterns: [/analytic/, /telemetr/, /observab/, /\bmetric/, /\btrace|tracing\b/, /\blogging\b/, /usage.?(track|stat|report)/, /\bcost\b/, /\btoken.?(count|usage|track)/, /helicone|langfuse|langsmith|posthog|sentry/],
  },
  {
    id: 'providers',
    label: '模型接入',
    labelEn: 'Model Providers',
    description: '接入额外的 LLM 供应商、路由与本地模型。',
    descriptionEn: "Model providers, routing, proxies and inference backends.",
    icon: 'cpu',
    patterns: [/\bprovider\b/, /\bllm\b/, /openrouter|ollama|bedrock|vertex|azure.?openai|groq|deepseek|qwen|kimi|glm|zhipu|moonshot/, /model.?(router|switch|proxy|gateway)/],
  },
  {
    id: 'notify',
    label: '通知与集成',
    labelEn: 'Notifications',
    description: '完成提醒、桌面通知、Slack / Discord / 飞书推送。',
    descriptionEn: "Desktop, mobile and chat notifications, plus outbound integrations.",
    icon: 'bell',
    patterns: [/notif/, /\balert\b/, /\bslack\b/, /discord/, /telegram/, /\bwebhook\b/, /\bdesktop.?(notif|toast)/, /\bsound\b|\bttsb?\b|text.?to.?speech/, /飞书|钉钉/],
  },
  {
    id: 'ui',
    label: '界面与主题',
    labelEn: 'UI & Themes',
    description: '配色主题、状态栏、TUI 美化与展示增强。',
    descriptionEn: "Themes, status lines, terminal rendering and interface tweaks.",
    icon: 'palette',
    patterns: [/\btheme\b/, /\bcolor.?scheme\b/, /status.?(line|bar)/, /\btui\b/, /\bprompt.?ui\b/, /statusline/],
  },
  {
    id: 'infra',
    label: '沙箱与基础设施',
    labelEn: 'Sandbox & Infra',
    description: '容器、远程执行环境、沙箱隔离与部署。',
    descriptionEn: "Sandboxes, containers, remote execution and deployment plumbing.",
    icon: 'server',
    patterns: [/\bdocker\b/, /container/, /sandbox/, /\bkubernetes|k8s\b/, /daytona|e2b|modal|fly\.io/, /remote.?(exec|env|host)/, /\bdeploy/, /\bvm\b/],
  },
  {
    id: 'testing',
    label: '测试与质量',
    labelEn: 'Testing & QA',
    description: '自动化测试、覆盖率、审查规则与安全扫描。',
    descriptionEn: "Test generation, coverage, linting and quality gates.",
    icon: 'flask-conical',
    patterns: [/\btest(ing|s)?\b/, /\bvitest|jest|playwright|cypress\b/, /coverage/, /\bsecurity.?(scan|audit|review)/, /\bqa\b/],
  },
];

export const OTHER_CATEGORY = {
  id: 'other',
  label: '其他',
  labelEn: 'Other',
  description: '尚未归类的插件。',
  descriptionEn: "Everything that does not fit the categories above.",
  icon: 'package',
};

export const ALL_CATEGORIES = [...CATEGORIES, OTHER_CATEGORY];

/** @param {{name?:string, description?:string, keywords?:string[], topics?:string[]}} pkg */
export function classify(pkg) {
  const haystack = [
    pkg.name ?? '',
    pkg.description ?? '',
    (pkg.keywords ?? []).join(' '),
    (pkg.topics ?? []).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  for (const cat of CATEGORIES) {
    if (cat.patterns.some((re) => re.test(haystack))) return cat.id;
  }
  return OTHER_CATEGORY.id;
}

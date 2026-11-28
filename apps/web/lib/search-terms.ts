/**
 * Turns what people type into term groups for plugin search.
 *
 * Each group is one thing the user asked for, with the spellings that count
 * as a hit: a group matches when any of its alternatives does. This lets
 * "remember between sessions" find memory plugins and "通义" find Qwen ones,
 * without a search engine.
 */

/** Words that carry no meaning in a plugin query. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'for', 'of', 'and', 'or', 'in', 'on', 'at', 'with', 'my', 'me', 'i', 'it', 'its', 'is',
  'be', 'that', 'this', 'which', 'what', 'how', 'can', 'want', 'need', 'make', 'makes', 'something', 'some', 'any',
  'from', 'by', 'between', 'across', 'into', 'plugin', 'plugins', 'opencode', 'let', 'lets', 'so',
  '的', '和', '一个', '插件', '能', '可以', '让', '用',
]);

/**
 * Concept → alternatives. Keys and values are matched as substrings, so
 * "notif" covers notify, notification and notifications.
 */
const CONCEPTS: string[][] = [
  ['memory', 'remember', 'recall', 'persist', '记忆', '记住', '上下文'],
  ['provider', 'llm', '模型', '大模型', '提供商'],
  ['qwen', 'tongyi', 'dashscope', '通义', '千问'],
  ['kimi', 'moonshot', '月之暗面'],
  ['deepseek', '深度求索'],
  ['glm', 'zhipu', 'bigmodel', '智谱'],
  ['doubao', 'volcengine', '豆包', '火山'],
  ['ernie', 'wenxin', 'qianfan', '文心'],
  ['minimax', '海螺'],
  ['git', 'commit', 'branch', 'worktree', '版本控制', '提交'],
  ['auth', 'oauth', 'login', 'credential', '登录', '认证', '凭证'],
  ['notif', 'alert', 'bell', 'sound', '通知', '提醒'],
  ['test', '测试'],
  ['theme', '主题', '界面'],
  ['agent', 'orchestrat', 'subagent', 'workflow', '智能体', '编排'],
  ['search', 'websearch', '搜索'],
  ['chinese', '中文'],
  ['usage', 'cost', 'billing', 'quota', 'token', '用量', '费用', '额度'],
  ['sandbox', 'docker', 'container', '沙箱', '容器'],
];

const CJK = /[㐀-鿿]/;

function conceptFor(term: string): string[] | null {
  for (const alts of CONCEPTS) {
    if (alts.some((a) => a === term || (term.length > 3 && term.startsWith(a)) || (CJK.test(term) && term.includes(a)))) {
      return alts;
    }
  }
  return null;
}

/** Light English stemming: "sessions" also matches "session". */
function stems(term: string): string[] {
  const out = [term];
  if (term.length > 4) {
    for (const suffix of ['ing', 'ed', 'es', 's']) {
      if (term.endsWith(suffix)) {
        out.push(term.slice(0, -suffix.length));
        break;
      }
    }
  }
  return out;
}

/** Chinese has no spaces: pull known concepts out of a run, keep the rest as 2-char pieces. */
function splitCjk(run: string): string[] {
  const found: string[] = [];
  let rest = run;
  for (const alts of CONCEPTS) {
    for (const a of alts) {
      if (CJK.test(a) && rest.includes(a)) {
        found.push(a);
        rest = rest.replace(a, ' ');
      }
    }
  }
  for (const piece of rest.split(/\s+/).filter(Boolean)) {
    if (piece.length <= 2) found.push(piece);
    else for (let i = 0; i < piece.length - 1; i += 2) found.push(piece.slice(i, i + 2));
  }
  return found;
}

export function parseQuery(q: string): string[][] {
  const raw = q
    .toLowerCase()
    .replace(/[“”"'.,!?;:()，。！？；：（）]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((t) => (CJK.test(t) && t.length > 2 && !conceptFor(t) ? splitCjk(t) : [t]));
  const meaningful = raw.filter((t) => !STOPWORDS.has(t));
  const terms = meaningful.length ? meaningful : raw;
  const groups = terms.map((t) => {
    const concept = conceptFor(t);
    return [...new Set([...stems(t), ...(concept ?? [])])];
  });
  // Two words for the same concept ("remember context") are one request.
  return groups.filter((g, i) => groups.findIndex((h) => h.join() === g.join()) === i);
}

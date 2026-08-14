# Oh My Resume

> AI-Powered Interview Preparation Agent System

[![License](https://img.shields.io/badge/license-MIT-blue?labelColor=black&style=flat-square)](LICENSE)

**Oh My Resume**는 이력서 분석 및 면접 준비를 위한 AI 에이전트 시스템입니다.

---

## 🚀 Quick Start

### Installation

```bash
# npm/bunx로 설치 (자동으로 설정 파일 생성)
bunx oh-my-resume install
# or
npx oh-my-resume install
```

이 명령어는 `~/.config/opencode/oh-my-resume.json` 파일을 자동으로 생성합니다.

### OpenCode Plugin으로 사용

`~/.config/opencode/opencode.json`에 플러그인 등록:

```jsonc
{
  "plugin": [
    "oh-my-resume"
  ]
}
```

### 개발 환경 설정 (소스에서 빌드)

```bash
# Clone the repository
git clone https://github.com/goalSetter09/oh-my-resume.git
cd oh-my-resume

# Install dependencies
bun install

# Build
bun run build
```

로컬 개발 시 플러그인 등록:

```jsonc
{
  "plugin": [
    "/path/to/oh-my-resume"
  ]
}
```

---

## 📦 Features

### Interview Prep Agent

이력서를 분석하고 맞춤형 면접 질문을 생성하는 AI 코치입니다.

**주요 기능:**
- **이력서 분석**: 핵심 기술, 성과, 레드플래그 식별
- **질문 생성**: Validation, Deep Dive, Behavioral 3가지 유형
- **STAR 가이드**: 각 질문에 대한 모범 답안 구조 제시

**사용 예시:**

```
@interview-prep 내 이력서를 분석하고 면접 질문 5개를 생성해줘
```

---

## 🔧 Project Structure

```
oh-my-resume/
├── src/
│   ├── agents/                 # 에이전트 정의
│   │   ├── index.ts            # 에이전트 레지스트리
│   │   ├── types.ts            # 타입 정의
│   │   └── interview-prep.ts   # Interview Prep 에이전트
│   ├── shared/
│   │   └── permission-compat.ts # 도구 권한 유틸리티
│   └── features/
│       └── builtin-skills/     # 스킬 정의 (선택적)
├── AGENT_DEVELOPMENT_GUIDE.md  # 에이전트 개발 가이드
├── package.json
└── README.md
```

---

## 🤖 Adding New Agents

### Step 1: 에이전트 파일 생성

`src/agents/my-agent.ts` 파일을 생성합니다:

```typescript
import type { AgentConfig, AgentPromptMetadata } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5"

// 메타데이터 정의 (오케스트레이터가 위임 결정 시 참조)
export const MY_AGENT_METADATA: AgentPromptMetadata = {
  category: "specialist",    // exploration | specialist | advisor | utility
  cost: "CHEAP",             // FREE | CHEAP | EXPENSIVE
  promptAlias: "My Agent",
  triggers: [
    { domain: "My Domain", trigger: "When to use this agent" },
  ],
  useWhen: ["Scenario 1", "Scenario 2"],
  avoidWhen: ["When NOT to use"],
}

// 팩토리 함수
export function createMyAgent(model: string = DEFAULT_MODEL): AgentConfig {
  // 도구 제한 설정
  // 빈 배열 = 모든 도구 허용 (Executor)
  // ["write", "edit"] = 해당 도구 차단 (Read-only)
  const restrictions = createAgentToolRestrictions([
    "task",
    "sisyphus_task",
  ])

  return {
    description: "에이전트 설명",
    mode: "subagent" as const,
    model,
    temperature: 0.2,
    ...restrictions,
    prompt: `# Role
[페르소나와 미션]

# Principles
1. **원칙 1** — 설명
2. **원칙 2** — 설명

# Process
[작업 프로세스]

# Anti-Patterns (NEVER)
- 하지 말 것 1
- 하지 말 것 2
`,
  }
}

export const myAgent = createMyAgent()
```

### Step 2: 타입 등록

`src/agents/types.ts`에 에이전트 이름 추가:

```typescript
export type BuiltinAgentName =
  | "interview-prep"
  | "my-agent"  // 추가
```

### Step 3: 레지스트리 등록

`src/agents/index.ts`에 에이전트 등록:

```typescript
import { myAgent } from "./my-agent"

export const builtinAgents: Record<string, AgentConfig> = {
  "interview-prep": interviewPrepAgent,
  "my-agent": myAgent,  // 추가
}

export * from "./my-agent"  // export 추가
```

---

## 🎨 Agent Archetypes

| 유형 | 파일 수정 | 모델 비용 | Thinking | 주요 용도 |
|------|----------|----------|----------|----------|
| **Searcher** | ❌ | FREE | ❌ | 코드베이스 탐색, 패턴 찾기 |
| **Consultant** | ❌ | EXPENSIVE | ✅ | 아키텍처, 디버깅, 코드 리뷰 |
| **Executor** | ✅ | CHEAP | ❌ | 코드 작성, 파일 수정 |

### 도구 제한 치트시트

```typescript
// Executor: 모든 도구 허용
createAgentToolRestrictions([])

// Consultant: 읽기 전용
createAgentToolRestrictions(["write", "edit"])

// Searcher: 읽기 전용 + 위임 불가
createAgentToolRestrictions([
  "write", "edit", "task", "sisyphus_task", "call_omo_agent"
])
```

---

## 📝 Prompt Engineering Tips

### 1. 페르소나 설정

```markdown
You are a 15-year veteran interviewer at top tech companies...
```

### 2. 번호 매긴 원칙

```markdown
# Principles
1. **Be Tough but Fair** — Ask real questions
2. **Specificity is King** — Demand specifics
```

### 3. 안티패턴 명시

```markdown
# Anti-Patterns (NEVER)
- Generic questions
- Softball questions without follow-ups
```

### 4. 출력 형식 정의

```markdown
# Output Format
### Q[N]. [Question]
**Intent**: What is the interviewer looking for?
**STAR Guide**: ...
```

---

## 🔌 Configuration

### oh-my-resume.json (선택적)

기본 설정을 변경하고 싶을 때만 이 파일을 생성하세요. **파일이 없어도 기본값으로 정상 작동합니다.**

설정 파일 위치 (우선순위 순):
1. 프로젝트 루트: `./oh-my-resume.json`
2. 글로벌: `~/.config/opencode/oh-my-resume.json`

```jsonc
{
  "agents": {
    "interview-prep": {
      "model": "anthropic/claude-opus-4-5"
    }
  }
}
```

### 에이전트 모델 커스터마이징

각 에이전트에 할당된 모델을 변경할 수 있습니다.

#### 방법 1: 설정 파일 사용 (권장)

`oh-my-resume.json` 파일에서 에이전트별 모델을 오버라이드합니다:

```jsonc
{
  "agents": {
    "interview-prep": {
      "model": "openai/gpt-4o",           // 모델 변경
      "temperature": 0.3                   // 온도 조정 (선택)
    },
    "my-custom-agent": {
      "model": "google/gemini-2.5-pro"
    }
  }
}
```

#### 방법 2: 코드에서 직접 변경

`src/agents/interview-prep.ts`에서 `DEFAULT_MODEL` 상수를 수정합니다:

```typescript
// Before
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5"

// After
const DEFAULT_MODEL = "openai/gpt-4o"
```

또는 팩토리 함수를 사용하여 동적으로 모델을 지정합니다:

```typescript
import { createInterviewPrepAgent } from "./agents"

// 다른 모델로 에이전트 생성
const customAgent = createInterviewPrepAgent("google/gemini-2.5-pro")
```

#### 사용 가능한 모델 예시

| Provider | Model ID | 특징 |
|----------|----------|------|
| Anthropic | `anthropic/claude-sonnet-4-5` | 균형 잡힌 성능 (기본값) |
| Anthropic | `anthropic/claude-opus-4-5` | 최고 품질, 높은 비용 |
| OpenAI | `openai/gpt-4o` | 빠른 응답 |
| OpenAI | `openai/gpt-5.2` | 고급 추론 |
| Google | `google/gemini-2.5-pro` | 긴 컨텍스트 |
| Google | `google/gemini-2.5-flash` | 빠른 응답, 저렴 |

> **Note**: 사용 가능한 모델은 OpenCode 설정 및 인증된 프로바이더에 따라 다릅니다.

---

## 📚 Documentation

- [AGENT_DEVELOPMENT_GUIDE.md](./AGENT_DEVELOPMENT_GUIDE.md) - 상세한 에이전트 개발 가이드

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-agent`)
3. Commit your changes (`git commit -m 'feat(agent): add amazing agent'`)
4. Push to the branch (`git push origin feature/amazing-agent`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🚢 Publishing to npm

`npx oh-my-resume install` 명령어가 작동하려면 npm에 패키지를 퍼블리시해야 합니다.

### 사전 준비

1. [npmjs.com](https://www.npmjs.com/) 계정 생성
2. 터미널에서 npm 로그인:
   ```bash
   npm login
   ```

### 퍼블리시 단계

```bash
# 1. 빌드
bun run build

# 2. package.json의 name이 고유한지 확인
#    (npm에서 "oh-my-resume"이 이미 사용 중이면 다른 이름 사용)

# 3. 퍼블리시
npm publish

# 또는 scoped package로 퍼블리시 (권장)
npm publish --access public
```

### Scoped Package 사용 시

`package.json`의 `name`을 변경합니다:

```json
{
  "name": "@goalSetter09/oh-my-resume"
}
```

그러면 설치 명령어는:
```bash
npx @goalSetter09/oh-my-resume install
```

### 로컬 테스트 (npm 퍼블리시 전)

npm에 퍼블리시하지 않고 로컬에서 테스트하려면:

```bash
# 방법 1: 직접 실행
bun run build
node dist/cli.js install

# 방법 2: npm link 사용
bun run build
npm link
oh-my-resume install  # 이제 글로벌 명령어로 사용 가능

# link 해제
npm unlink -g oh-my-resume
```

---

## 🔗 GitHub Push 후 설정

GitHub에 레포지토리를 푸시한 후 다음 단계를 완료하세요.

### Step 1: package.json 업데이트

`package.json`의 `repository.url`을 실제 GitHub URL로 변경:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/goalSetter09/oh-my-resume"
  }
}
```

### Step 2: src/cli.ts의 스키마 URL 활성화 (선택적)

VS Code 자동완성을 지원하려면 `src/cli.ts`에서 `$schema`를 추가합니다:

```typescript
const DEFAULT_CONFIG = {
  $schema: "https://raw.githubusercontent.com/goalSetter09/oh-my-resume/main/assets/oh-my-resume.schema.json",
  agents: {
    "interview-prep": {
      model: "anthropic/claude-sonnet-4-5",
    },
  },
}
```

### Step 3: 다시 빌드 및 퍼블리시

```bash
bun run build
npm publish --access public
```

### Step 4: 기존 설정 파일 업데이트 (선택적)

이미 `oh-my-resume install`을 실행한 사용자는 `~/.config/opencode/oh-my-resume.json`에 `$schema`를 수동으로 추가할 수 있습니다:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/goalSetter09/oh-my-resume/main/assets/oh-my-resume.schema.json",
  "agents": {
    "interview-prep": {
      "model": "anthropic/claude-sonnet-4-5"
    }
  }
}
```

> **Note**: `$schema`는 선택적입니다. 없어도 정상 작동하며, VS Code 자동완성만 지원하지 않습니다.

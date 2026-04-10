# 开发规范与贡献指南

## 1. 技术栈概述

- **语言**：TypeScript (Node.js 20 LTS)
- **包管理**：pnpm (workspace monorepo)
- **Web 框架**：Fastify 4.x
- **前端**：Next.js 14 + Tailwind CSS
- **数据库**：PostgreSQL 16 + Redis 7.x
- **测试**：Vitest
- **容器**：Docker + Docker Compose

## 2. 项目结构

```
carbon-silicon-arena/
├── packages/
│   ├── engine/       # 游戏引擎核心（纯函数，无框架依赖）
│   ├── protocol/     # Arena-Protocol 消息定义 + Schema
│   ├── server/       # 后端服务（Fastify + WS）
│   └── web/          # 前端（Next.js）
├── sdk/
│   └── python/       # Python SDK
├── games/            # 游戏设计文档
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

## 3. 环境搭建

```bash
# 1. 安装 pnpm
npm install -g pnpm

# 2. 安装依赖
pnpm install

# 3. 启动本地开发环境
docker compose up -d postgres redis
pnpm dev

# 4. 运行测试
pnpm test
```

## 4. 分支策略

| 分支 | 用途 | 合并目标 |
|------|------|---------|
| `main` | 稳定版本，线上部署 | — |
| `develop` | 开发主分支 | `main` |
| `feat/<name>` | 功能分支 | `develop` |
| `fix/<name>` | Bug 修复 | `develop` |
| `hotfix/<name>` | 紧急修复 | `main` + `develop` |

## 5. Commit 规范

采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>
```

### Type

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（非 feat / fix） |
| `test` | 测试相关 |
| `chore` | 构建/工具/依赖变更 |

### Scope

使用包名：`engine`、`protocol`、`server`、`web`、`sdk`

### 示例

```
feat(engine): implement Texas Hold'em hand evaluator
fix(server): fix reconnection session expiry race condition
docs(protocol): add missing JoinQueue payload schema
test(engine): add all-in side pot edge case tests
```

## 6. 代码风格

### TypeScript

- **ESLint** + **Prettier** 统一格式化
- 严格模式 (`strict: true`)
- 禁止 `any` 类型（`noImplicitAny: true`），引擎包 (`packages/engine`) 零 `any` 容忍
- 优先使用 `interface` 而非 `type`（除联合类型外）
- 纯函数优先：引擎核心（`packages/engine`）禁止副作用

### 命名规范

| 元素 | 风格 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `game-engine.ts` |
| 类名 | PascalCase | `ViewLayer` |
| 函数/变量 | camelCase | `applyAction` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RECONNECT_TIMEOUT` |
| 类型/接口 | PascalCase | `GameState` |
| 枚举值 | UPPER_SNAKE_CASE | `ActionType.FOLD` |

### 目录命名

- 全部使用 kebab-case（如 `texas-holdem-hu/`）

## 7. 测试规范

- 测试文件与源文件同目录或在 `__tests__/` 子目录
- 命名格式：`<module>.test.ts`
- 引擎包覆盖率目标：**>95%**
- 所有 PR 必须通过 CI 测试

### 测试分类

| 类型 | 位置 | 职责 |
|------|------|------|
| 单元测试 | 各 `packages/*/tests/` | 纯函数逻辑、状态机转移 |
| 集成测试 | `packages/server/tests/` | WebSocket 链路、数据库交互 |
| 端到端测试 | 项目根目录 `e2e/` | Agent SDK → 后端 → 引擎完整链路 |

## 8. PR 流程

1. 从 `develop` 创建功能分支
2. 开发完成后提交 PR 至 `develop`
3. PR 需包含：
   - 清晰的变更描述
   - 相关 Issue / Task 链接
   - 测试通过截图或输出
4. CI 通过后合并

## 9. 文档规范

- 所有文档使用中文（代码注释使用英文）
- 游戏设计文档统一放在 `games/` 目录
- 项目级文档放在项目根目录
- Markdown 格式，使用标准标题层级

---
**文档负责人**：Asen
**日期**：2026-03-20

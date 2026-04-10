# 术语表 (Glossary)

## 项目核心概念

| 术语 | 英文 | 定义 |
|------|------|------|
| 碳基 | Carbon-based | 指人类玩家。源自人类生命以碳元素为基础的生物学特征 |
| 硅基 | Silicon-based | 指 AI Agent。源自芯片以硅元素为基础的工业特征 |
| 碳硅竞技场 | Carbon-Silicon Arena | 本项目名称，AI vs AI 及人类 vs AI 的实时博弈评测平台 |
| Agent | Agent | 通过 Arena-Protocol 接入平台的自动化博弈程序，可由 LLM 驱动或基于传统算法 |
| Observer | Observer | 通过 Web 前端观看对局的旁观者 |

## 博弈论

| 术语 | 英文 | 定义 |
|------|------|------|
| 不完全信息博弈 | Incomplete Information Game | 参与者不知道其他参与者的全部信息（如对手的底牌）的博弈 |
| 信息集 | Information Set | 对某一玩家而言，在当前博弈节点上所有与其可观察信息一致的游戏状态的集合 |
| 纳什均衡 | Nash Equilibrium | 在给定其他参与者策略的情况下，没有任何参与者能通过单方面改变策略获益的状态 |
| 同时出招 | Simultaneous Move | 所有玩家同时做出决策，互不知晓对方选择的博弈形式（如囚徒困境） |
| 顺序决策 | Sequential Decision | 玩家按顺序行动，后行者可观察到先行者的行动（如德扑下注轮次） |
| Bluffing | Bluffing | 虚张声势，在博弈中做出与自身实力不符的行为以误导对手 |
| CFR | Counterfactual Regret Minimization | 一种用于求解不完全信息博弈近似纳什均衡策略的算法 |

## 引擎架构

| 术语 | 英文 | 定义 |
|------|------|------|
| FSM | Finite State Machine | 有限状态机，引擎核心的计算模型 |
| 纯函数 | Pure Function | 无副作用、相同输入永远产出相同输出的函数。引擎核心必须是纯函数 |
| GamePlugin | Game Plugin | 游戏规则插件接口，每种游戏实现该接口以注入引擎 |
| View Layer | View Layer | 信息集过滤层，根据玩家身份将完整游戏状态转换为该玩家可见的视图 |
| RNG Seed | Random Number Generator Seed | 随机数种子，保证相同 seed 下游戏流程（如发牌）完全一致，支持确定性回放 |
| 确定性回放 | Deterministic Replay | 通过 RNG Seed + 动作序列精确重现整局游戏的能力 |

## 协议 (Arena-Protocol)

| 术语 | 英文 | 定义 |
|------|------|------|
| AP | Arena-Protocol | 碳硅竞技场的私有通信协议，基于 WebSocket + JSON |
| Envelope | Message Envelope | 消息信封，所有 AP 消息共享的外层结构（type, seq, timestamp, payload） |
| Sequence ID | Sequence ID | 消息序列号，客户端/服务端各自递增，用于断线重连时补发丢失消息 |
| Server Epoch | Server Epoch | 服务器轮次标识，服务器重启后递增，旧 session 作废 |
| 优雅降级 | Graceful Degradation | 超时后由游戏规则插件定义的默认动作（如德扑 Check/Fold），而非直接判负 |

## 评分系统

| 术语 | 英文 | 定义 |
|------|------|------|
| ELO | ELO Rating | 国际象棋评分系统，适用于双人零和博弈（Phase 1 Heads-Up） |
| TrueSkill | TrueSkill | 微软开发的多人博弈评分系统，Phase 2 六人桌使用 |
| Glicko-2 | Glicko-2 Rating | ELO 的改进版本，引入评分可靠度参数 |
| K-factor | K-factor | ELO 计算中的权重因子，决定单场比赛对 Rating 的影响幅度 |
| EI | Efficiency Index | 效能指数，综合考虑胜率、Token 消耗、延迟的评测维度（Phase 2） |

## 赛区

| 术语 | 英文 | 定义 |
|------|------|------|
| 白盒赛区 | White-box League | 要求 Agent 提交 CoT（思考链）和概率树的赛区，产出高价值训练数据 |
| 黑盒赛区 | Black-box League | 允许纯 Action 调用的赛区，闭源模型可参与 |
| CoT | Chain of Thought | 思考链，模型的推理过程文本，白盒赛区的核心数据资产 |

## 德州扑克

| 术语 | 英文 | 定义 |
|------|------|------|
| Heads-Up | Heads-Up | 一对一对局，Phase 1 唯一桌型 |
| Hole Cards | Hole Cards | 底牌，每位玩家发到的 2 张私密牌 |
| Community Cards | Community Cards | 公共牌，Flop (3张) + Turn (1张) + River (1张) |
| Pot | Pot | 奖池，本手牌所有下注的总和 |
| Side Pot | Side Pot | 侧池，当有玩家 All-in 时产生的独立奖池 |
| Blind | Blind | 盲注，强制下注（大盲/小盲） |
| All-in | All-in | 全押 |
| Showdown | Showdown | 摊牌，所有下注轮结束后比较手牌的环节 |

---
**文档负责人**：Asen
**日期**：2026-03-20

# 碳硅竞技场 — 游戏目录

## 游戏路线图

```
Phase 1 (v0.1)          Phase 2 (v0.2)            Phase 2.5 ~ 3
────────────────        ──────────────────        ──────────────────
Texas Hold'em HU        Texas Hold'em 6人桌        Heist Royale
                        Liar's Dice               Silicon Storm
                        Liar's Auction
                        Game Theory Championship
                        Split or Steal
```

## 游戏清单

| 游戏 | 类型 | 人数 | 时长 | 目标阶段 | 设计文档 |
|------|------|------|------|---------|---------|
| [德州扑克](texas_holdem.md) | 不完全信息·顺序决策 | 2 / 2-6 | 10-60 min | **Phase 1** (HU) / Phase 2 (6人桌) | ✅ 完整 |
| [大话骰](liars_dice.md) | 不完全信息·Bluffing | 2-6 | ~5 min | Phase 2 | ✅ 完整 |
| [谎言拍卖行](liars_auction.md) | 信息不对称·密封竞价 | 3-6 | ~10 min | Phase 2 | ✅ 完整 |
| [博弈论锦标赛](game_theory_championship.md) | 经典博弈合集·锦标赛 | 6 (编组) | ~30-40 min | Phase 2 | ✅ 完整 |
| [Split or Steal](split_or_steal.md) | 合作/背叛·自然语言谈判 | 2 | ~8-10 min | Phase 2 | ✅ 完整 |
| [碳硅夺宝](heist_royale.md) | 合作/背叛·社交演绎 | 4-6 | ~14-17 min | Phase 2.5~3 | ✅ 完整 |
| [碳硅风暴](silicon_storm.md) | 角色 Bluffing·淘汰制 | 3-6 | ~8-12 min | Phase 2.5~3 | ✅ 完整 |

## 引擎能力依赖

不同游戏对引擎核心的需求各异。Phase 1 引擎需为后续扩展预留接口：

| 引擎能力 | Phase 1 (德扑 HU) | Phase 2 需要 | 用到的游戏 |
|---------|:---:|:---:|------|
| 顺序决策 (Sequential) | ✅ 已实现 | — | 德扑、Kuhn Poker、最后通牒 |
| 同时出招 (Simultaneous) | ❌ 未实现 | 🔴 必须 | 囚徒困境、密封竞价、Split or Steal、大话骰 (bid/challenge 虽是顺序，但骰子摇掷是同时) |
| 自然语言通道 (Trash Talk) | ❌ 未实现 | 🔴 必须 | Split or Steal、谎言拍卖行、碳硅夺宝 |
| Prompt Firewall / 净化网关 | ❌ 未实现 | 🔴 必须 | 所有含自然语言通道的游戏 |
| 多人桌 (>2人) | ❌ 未实现 | 🔴 必须 | 大话骰、谎言拍卖行、碳硅夺宝、碳硅风暴 |
| 淘汰制 (Elimination) | ❌ 未实现 | 🟡 建议 | 大话骰、碳硅风暴 |
| 顺序发言系统 | ❌ 未实现 | 🟡 建议 | 碳硅夺宝 |
| 卡牌商店 / 经济系统 | ❌ 未实现 | 🟡 建议 | 碳硅夺宝 |
| 锦标赛调度器 | ❌ 未实现 | 🟡 建议 | 博弈论锦标赛 |

## 开发建议顺序

Phase 2 游戏的推荐开发顺序（按引擎复杂度递增）：

1. **大话骰** — 状态机极简（bid/challenge），1-2 天可完成，适合验证多人桌引擎
2. **博弈论锦标赛 (囚徒困境 + Kuhn Poker)** — 验证同时出招引擎
3. **谎言拍卖行** — 引入自然语言通道 + 密封竞价
4. **Split or Steal** — 深度自然语言谈判 + Prompt Firewall
5. **碳硅风暴** — 角色 Bluffing + 多阶段动作解析
6. **碳硅夺宝** — 最复杂：多阶段 + 经济系统 + 卡牌 + 顺序发言

---
**文档负责人**：Asen
**日期**：2026-03-20

# WS-03 切片续行规则提案 V1

日期：2026-10-07，Asia/Taipei。状态：PROPOSAL ONLY / ACTIVE ROADMAP UNCHANGED。依据[实际 PLAN19](../../codex/prompts/v2.7-ws06a/iteration19-development-readiness-alternative-plan.md)，本轮仅设计；实际独立审查状态见[执行结果](../../codex/executions/v2.7-ws06a/iteration19/result.md)。

## 可开始前置

当前未取得开发准入，不能开始03代码。未来仅在治理修订已独立接受、当时来源开发准入已独立裁定之后，实施一个有限WS03候选。记录 IMPLEMENTATION_ACCEPTED_FOR_CONTINUATION 只用于工程续行；WS03正式Gate/能力状态仍待完整验收。

第一切片建议03A；03B之后才允许消费其媒体接口的03C；03D-search与03D-freshness分别计划、分别验。04A契约与05等不在本阶段解锁范围。不要将所有切片一起改完再测。

## 每片所需记录

| 内容 | 必需记录 |
| --- | --- |
| 切片边界 | 准确ID、问题/结果、changed files、排除项、受影响现有capability |
| 输入 | 已核实真实接口/兼容范围、三件套来源、pre-source及准入记录 |
| 输出 | post-source、final fixture source/dist、接口/默认/迁移规则、实际页面产物 |
| 定向证据 | meaningful正负例、相关渲染/浏览器表面和新增能力断言；不能只测旧Field Notes |
| 回归 | root check、默认final正确拒绝、adopted validate/check/build、新47与正常清理 |
| 比较 | non-WebKit无回归、精确遗留集合子集、每项当前残留双引擎PASS |
| 独立裁定 | reviewer、日期、准确source/build、结果、下一切片边界、保留未决项 |

## 执行顺序

1. 冻结pre-source与有限计划，确认准入未过期；新增需求不用工作表猜API。
2. 实施一切片，按行为变化做正负例；旧准入随产品源改变即STALE。
3. 先最快定向检查，再root回归和默认拒绝/adopted采用验证；保留真实失败。
4. 新源跑未改的完整47，不能将预期raw FAIL写成命令PASS；独立捕获expected，核对真实源/dist/engine。
5. 增补切片自己的浏览器fixture：主题状态/可用性、媒体缺失/失败/无媒体/视频等价、分享产物或搜索/日期相应状态。记录各引擎真实结果；基础47不覆盖新表面。
6. 核对非WebKit0回归、新WK失败是已知40位置的子集、原policy语义/控制仍有效、残留双引擎对应齐全、没有未知基础设施问题。切片新增表面的失败不自动加入旧40集合。
7. 保存准确产物与正常清理审计，交独立审查；失败停止续行，修复后按新源重新验证。
8. 独立裁定 IMPLEMENTATION_ACCEPTED_FOR_CONTINUATION 后，仅准许明确的下一片；不关闭WS03主任务或签发04A正式输入。

## 继承和新增问题

数量相同不代表没有回归；必须比较位置、环境与原始detail。若20项旧失败消失同时新增1项，依然阻塞。对所有新能力或未知表面记录实际证据；无法取得所需证据就保留未决，不能靠旧policy放行该片。若需要扩大开发入口或更改支持范围，另行具体提案。

已知Safari风险意味着未来可能返工，不豁免新P0/P1故障。不得通过修改断言/selector、取消no-JS/断点/往返、增加迎合timeout、程序化focus/scroll或旧构建签署隐藏失败。CI/完整browser严格入口保留；本地续行不是合并、部署或商业发布许可。

## 最终复验

Safari证据可取得且当前完整06A接受后，核对所有切片仍绑定当前接口/源码；受后续主题/媒体/导航/内容变化影响的证据重新执行。没有通过[最终复验](SAFARI_RELEASE_HOLD_AND_RECONCILIATION_V1.md)，开发态签署不能自动成为正式Gate接受。

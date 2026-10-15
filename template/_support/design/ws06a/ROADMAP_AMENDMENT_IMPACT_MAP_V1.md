# 路线修订影响表提案 V1

日期：2026-10-07，Asia/Taipei。状态：PROPOSAL ONLY / ACTIVE ROADMAP UNCHANGED。依据[实际 PLAN19](../../codex/prompts/v2.7-ws06a/iteration19-development-readiness-alternative-plan.md)，本轮仅设计；实际独立审查状态见[执行结果](../../codex/executions/v2.7-ws06a/iteration19/result.md)。

## 现行权威与拟议增量

[现行路线](../../roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md)八个主任务、原正式DAG和Gate全部未变。本表仅定位后续修订位置；不作为现行执行授权，不创建第九个主任务、第四套源码或新capability。

拟增加的工程入口：WS02＋完整raw基础→单独Development Readiness→一个WS03候选切片→新源证据与独立续行。原WS06A FULL ACCEPT→正式下游Gate/发布链并存，后者不被前者替换。

## 后续有限治理修订候选范围

| 真实现有文件 | 需要明确的增量 | 保持的权威 |
| --- | --- | --- |
| [Roadmap](../../roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md) §3与§4/WS03、WS06 | 增加有条件开发入口和原正式前置并存；仅03候选，不扩04/05/06B；增加失效与复验指针 | 八主任务、正式Gate/release义务及其他依赖 |
| [SOP](../../../Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/NEW_GAME_SITE_SOP_v2.7.md) | 区分有限工程准入与能力/正式验收；原始失败不改判 | 唯一规范来源、事实/权利/主体/人审义务 |
| [SOP QA](../../../Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/QA_CHECKLIST.md) | 准入与每片真实47、遗留集合、双引擎对应、新增表面、停止/清理检查项 | 原完整browser及商业发布检查 |
| [SOP Execution Prompt](../../../Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/EXECUTION_PROMPT.md) | 先治理接受→核验准入→一片实施→新源独立续行；来源变即失效 | 不能以方法建议代签人审或结果 |
| [Master Prompt](../../../Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/CodexMasterPrompt_v2.7Candidate.md) | 引用准确治理入口/规范；两路径、release hold和停止条件明确 | 不复制Contract，不生成Registry outcome |

这五个是下一轮候选范围，不在本轮编辑。三个进度索引如需在未来同步，应另在有限计划明确为状态/指针，不承载新规则。本轮连这三个索引也保持原字节。

## 排除项与停止条件

Canonical Contract/41 Registry、冻结V2.6.5三件套、Starter runtime/src/schema、package/锁文件/CI、matrix、runner、closure verifier、旧policy/control、原报告、已接受WS04A设计、真实游戏项目均不改。

没有提出新生产checker或命令名；拟议准入审计可在明确有限计划中使用已有读取/校验能力与执行元数据，但不能称本轮已实现自动Gate。如果下一轮发现必须新增/修改产品代码、validator、schema或依赖，停止并重新限定范围、正负证据及独立审查；不能藏在治理修订里。

## 实施阶段和退出

| 阶段 | 可交付/退出 | 不能自动推出 |
| --- | --- | --- |
| iteration19当前设计 | 五提案文档＋实际PLAN＋原证据重算＋范围/引用检查；独立设计ACCEPT | 路线已生效、准入已签署、WS03可开工 |
| 后续治理修订 | 上述五现有文件有限修改，三件套方法一致，独立审查 | 技术准入或任何能力PASS |
| 当前源准入核验 | 独立来源/工具核实、完整raw、40残留/80对应、时效/范围、独立裁定 | Safari/完整06A/正式WS03 Gate通过 |
| WS03A候选 | finite plan、实际产物、正负例、采用/拒绝检查、新47与新增表面、独立续行 | 04A/05/06B或真实采用自动解锁 |
| 其他03切片 | 每片重复前置、失效与回归，03B→03C输入依赖保留 | 全部主任务完成或release |
| 最终复验 | 当时真实Safari及完整06A接受，开发态切片重新核实，恢复原正式链 | 直接跳过06B/07/08/人审 |

未来治理独立接受之前，所有当前进度入口依然按原路线记录。proposal ACCEPT只证明设计可用，有限实施须有具体可审查计划。本轮不修改产品、不重跑757回归或浏览器矩阵、不发布。

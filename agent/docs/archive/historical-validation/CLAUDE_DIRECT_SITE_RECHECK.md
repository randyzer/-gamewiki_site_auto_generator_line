# Claude 直接目录建站复查

本机 Claude CLI，只读 Read/Glob/Grep。以下为复查原文；测试与真实验证证据见 [验证报告](DIRECT_SITE_MERGE_VALIDATION.md)。

结论：四项 P2 修复都有效，没有发现可确认的新 P0/P1/P2，复查通过。我只读了代码，没有运行测试，所以"73 项通过"和全量/temp3 验证的结果以你那边为准。

1. 非 PASSED 的 stage3：有效。
   - `agent/src/skill-executor.mjs:295-297` 在非 PASSED 时把 `projectPath` 换成 `templateCopyDestination`，再交给原生验证器。
   - `agent/src/artifact-validator.mjs:14-24` 只按临时根目录读取并解析产物，然后返回 `{ ...result, artifacts: [] }`。worker 返回的 status、evidence、missing_inputs 都原样保留。
   - 合并只在 `:286` 的 PASSED 分支里发生。

2. 目录回执：有效。
   - `agent/src/template-merge.mjs:61-76` 的 `ensureDirectory` 先递归处理缺失的父目录，所以父目录先于子目录入账。
   - 每个目录先记 CREATING 并 `save()`，然后 `mkdir`。成功记 CREATED；遇到 EEXIST 且确实是目录时记 REUSED；其他错误保持 CREATING 并抛出。
   - 新建的 site 本身也会入账（`:78`）。已存在的目录不算"尝试创建"，不记录，这和要求一致。
   - copy 失败时，`:94-95` 会把带 directories 的回执落盘为 FAILED。

3. 合并和 cleanup 分开：有效。
   - `:92-93` 在复制和 hash 校验全部完成后先保存 `status: 'MERGED'`。
   - `:97-99` 的 cleanup 失败只写入 `cleanup: { status: 'FAILED', error }`，不改 `receipt.status`，也不抛异常，回执正常返回。
   - 执行器在 `skill-executor.mjs:298-299` 追加 cleanup pending 的 evidence。

4. 未列文件拒绝：有效。
   - `:50-52` 用精确路径的白名单，只放行三个生成文件 `docs/template-copy-manifest.json`、`docs/TEMPLATE_SELECTION_REPORT.md`、`docs/TEMPLATE_RESIDUE_SCAN.json`。其他不在 `manifest.files` 里的文件会直接报错。
   - 这个检查发生在 `:59` 写回执和 `:78` 第一次 `mkdir` 之前，所以拒绝时 site 是零写入。
   - SHA256 核验覆盖所有文件，包括三个生成文件：复制前在 `:82` 重新计算源文件 hash；复制后在 `:87-89` 同时校验目标和源文件。manifest 对比的是改写 destination 之后的 hash。

另外看到一点，不算缺陷：只含空目录、没有文件的子树不受 manifest 约束，仍会在 site 中创建。因为没有写入任何文件内容，我不按 P2 报。

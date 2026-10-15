# M3.11 — BrowserSkill 原生文件传输失败的只读取证

日期：2026-10-14
状态：**HOST_STAGING_VERIFIED / EXTENSION_RPC_UNVERIFIED / SITE_EFFECT_UNVERIFIED**

## 调查范围

没有再调用 `bsk upload`、`bsk download` 或 Chrome 自动化操作。仅对 agent 内两个已有人类单命令批准的真实运行的**受限审计字段**做横向比对。未读取网页正文、Cookies、口令、账号或任意敏感浏览器日志，未修改 bsk、扩展或 daemon。

只读分析脚本：

```sh
node scripts/m3-bsk-transfer-audit.mjs \
  m3-favicon-diagnose-then-drop-0f8989c9-2a72-470d-9202-198f901988dd \
  m3-favicon-drop-first-5848689a-b916-4f52-9a18-1ba8b77e471a
```

摘要保存于：`runs/m3-bsk-transfer-audit-summary.json`。

## 核验结果

| 审计字段 | Input 失败 | Drop-first 失败 |
| --- | --- | --- |
| 精确 Mac 宿主命令审批 | APPROVED | APPROVED |
| 上传机制 | input | drop |
| 源图 SHA256 与宿主隔离暂存 PNG | 一致 | 一致 |
| 上传命令结果 | COMMAND_TIMEOUT | COMMAND_TIMEOUT |
| bsk CLI 退出码 | 3 | 3 |
| stderr 字节数 | 0 | 0 |
| bsk reason | UNVERIFIED | UNVERIFIED |
| effect_state | unverified | unverified |
| favicon.io 接受了文件的独立证据 | 无 | 无 |
| ZIP 下载 | 未执行 | 未执行 |
| 独立 BrowserSkill 会话关闭 | 是 | 是 |

曾通过只读检查确认 Chrome BrowserSkill 扩展 0.3.2 的“Allow access to file URLs”权限已经 `ENABLED`，此前 bsk doctor 为 8/8。因此权限缺失、输入文件缺失及宿主 SHA256 暂存错误**不是目前最有力的解释**。

**已核实边界：** 宿主把被批准的 PNG 复制进 agent 安全暂存目录，能够确认的是“宿主 → 本地暂存”没有发现哈希错配；不能据此认定 BrowserSkill daemon 已成功发出 extension RPC、更不能认定扩展真正触发了 DOM file input/drop 或网站收到文件。

**尚未确定的故障层：**
1. bsk CLI 上传命令是否正确打开/传递了暂存文件到 daemon。
2. daemon 是否把上传请求与实际数据交给 Chrome extension。
3. extension 是否在该页触发了正确的 Drop/DataTransfer 或 chooser 事件。
4. favicon.io 前端是否接受了附件并给出下载入口。
5. 为什么 `--json` timeout 路径没有机器可读的 `reason/effect_state`。

当前 CLI `reasonCode=TRANSFER_BROWSER_SELECTOR_OR_INPUT` 只是宿主根据通用报错内容的粗粒度分类，不能据此宣称根因已定位到 selector。

## 有限下一步（非本轮执行）

优先为 BrowserSkill CLI ↔ daemon ↔ Chrome 扩展的上传每个阶段增加**不含本地路径和正文的追踪字段**：`file_staged`、`daemon_request_accepted`、`extension_ack`、`dom_upload_event_sent`、`site_attachment_observed`，每阶段记录布尔值、随机 traceId、受信任 SHA256、耗时、固定枚举与是否人工批准。

需要官方修复或用户另行批准**从上游源码构建并在隔离浏览器中专项测试**，禁止直接替换已锁定的生产 bsk 二进制，不将未认证的内部 RPC 状态当成上传成功。

BrowserSkill 自动上传仍为 `BLOCKED`，生产 `atomicFileTransferSupported=false`。针对 favicon 格式转换，优先使用本轮已实现的隔离本地转换器，并单独确认正式 Skill 来源契约。

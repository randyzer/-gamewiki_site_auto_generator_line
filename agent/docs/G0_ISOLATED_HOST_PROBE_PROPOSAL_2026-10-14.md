# G0 隔离执行环境合成探测方案（待批准）

本方案不是已实现的生产宿主，也不是建站授权。只验证额外的宿主隔离边界；原 createProductionEntryBootstrap 继续阻断。

## 官方依据

- [Permission profiles：范围与执行](https://learn.chatgpt.com/docs/permissions#scope-and-enforcement)：约束本机沙箱命令；浏览器、连接器、服务认证等属于各自边界，不能由单一命令 profile 推断已受控。
- [管理员强制策略](https://learn.chatgpt.com/docs/enterprise/managed-configuration)：本机支持系统 requirements.toml 和 macOS MDM，能约束 profiles、features、MCP 等。安装主机全局策略会影响其他会话，本轮不改主机策略。
- [App Server](https://learn.chatgpt.com/docs/app-server)及[原 MCP Server 迁移说明](https://learn.chatgpt.com/docs/mcp-server)：App Server 命令/传输仍为实验性，官方不支持生产负载；不以其替换现有 CLI 或宣称宿主问题已经解决。
- [Dev Containers 指南](https://learn.chatgpt.com/docs/agent-approvals-security#run-codex-in-dev-containers)：外层容器可提供隔离，仍需分别验证内部沙箱与凭据保护。这里是拟采用额外外层边界的依据，不表示任何容器自动安全。

## 当前安装与具体故障

Docker Desktop 存在，Docker CLI `/opt/homebrew/bin/docker` 28.3.3；Dev Containers CLI 未找到。`docker info --format '{{json .ServerVersion}}'` exit 1，当前 CLI 指向 `/Users/randyz/.docker/run/docker.sock`，lstat 返回 FileNotFoundError。

当前进程无法连接所选 daemon，未检测其他 context，不据此判断用户 Docker 账号或其他 daemon 状态。不自动启动 Docker、切换 context、重置设置、安装 CLI 或绕过权限；需用户恢复当前 Docker Desktop engine 后再用同一 CLI 复验。

## 拟批准的准确范围

1. 用户打开已安装的 Docker Desktop，处理其已有启动提示；Agent 只读确认当前 engine 可连接。
2. 经同意后仅使用 Docker CLI 核验 Docker Hub 官方 `library/node` 的 Node 22 镜像候选 `node:22-bookworm-slim`，确认 registry manifest 与摘要，下载准确镜像。当前尚未联网验证此 tag/digest，不能把候选当已锁定镜像；失败停止，不改 registry/工具/镜像提供方。
3. 在 `agent/runs/TEST-container-boundary-<随机 UUID>/` 创建只含合成 canary 的新目录。没有业务 manifest，没有原始 Skill、原站、关键词、票据或真实凭据挂载。
4. 创建一次临时无外网容器：network none、只读 rootfs、cap-drop ALL、no-new-privileges、非 root UID、pids≤64、memory≤512MiB、CPU≤1、超时≤30秒。只挂载合成固定脚本/输入为只读、合成 output 目录为读写；不挂主目录、agent 根目录、Docker socket 或任何真实审批存储。
5. 正向检查：准许输入能读、output 能写。反向检查：只读输入不能写，未挂载的宿主保护样本不可读写，子进程不获得更多 mount 权限，容器不能连宿主测试回环。保存实际错误类别、镜像摘要、命令、退出码和 host before/after SHA，不能以脚本自述代替证据。
6. 容器退出移除，保留 TEST 证据；不自动删镜像，不清理其他容器/数据，不开特权模式，不关闭现有 Codex sandbox。

此合成探测即使通过，也只证明测得的外层边界。实际 Codex 客户端认证、完整模型工具、内层 Linux sandbox、审批签发及文件交接还要分别验收。未来如使用该环境，仍复用原 orchestrator/Pipeline/executor，不改成另一套 Agent。未获独立批准不启动 Wallpaper Engine G1。

## 本轮尚未执行

没有 pull/build/run，没有 daemon 启动，没有系统身份/权限变更，也没有业务 worker。方案先经 ChatGPT 审查，再由用户批准以上范围；不能把本文件或任务 JSON 当执行票据。

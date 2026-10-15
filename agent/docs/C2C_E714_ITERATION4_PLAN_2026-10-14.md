# C2C e714 / iteration 4 实施计划

第三轮已获 ChatGPT ACCEPT_SCOPED；整体 G0–G6 未完成。

1. 根据当前 CLI 0.153.0、实际 executor 命令和既有真实合成探测，核对文件、子进程、网络、模型工具、客户端认证、GUI、浏览器与宿主边界。受支持机制不足时保留 ENTRY_HOST_ISOLATION_UNVERIFIED；不安装新服务或修改系统身份。
2. 对 G1 公开来源补齐受信任宿主归属审核证据。sourceType 标签不能授权网页或证明官方归属；审核前零工具调用，证据绑定 URL、游戏、类型、依据、文件摘要，后续复验。
3. 只读整理 Wallpaper Engine 候选来源、草稿 revision 2、40 可读词及待补记录、历史图标/ZIP/转换收据。当前未取得真实新网页授权；旧批准不转移给新 run。
4. 保存可审查 G1 输入清单与具体 G0 阻断。真实入口、图标新批准和逐命令网页访问未满足时不创建 execution manifest、不启动 G1，更不扩大到 G2–G6。
5. 新增定向测试先 RED，再实现及最快定向回归；最后 npm run test:entry-host、npm test 和 node --check。保存失败/成功与文件摘要，提交同一 ChatGPT 审查。

官方文档工具本次返回 HTTP 403 challenge，新的联网读取暂停；不切换公开搜索、curl 或其他工具。只使用本机接口和此前已保存的官方配置依据，未验证的能力如实 BLOCKED。

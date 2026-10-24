# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.1] - 2026-10-24

### 修复

- **服务依赖声明缺失**：`modelDirectories` 的服务链要求调用方插件同样声明 `sessions / remote / remote.session`（`ModelDirectoryResolver` 的 `static inject`），否则 cordis 以 `cannot get property "remote.session" without inject` 拒绝目录解析，inject 全量降级、座位空。现在模块级与可选注入两处都补齐了完整依赖链。
- **hooks 顺序 bug**：`useSyncExternalStore` 在 `directory` 判空之前执行，inject 降级时拿到 null 直接 `reading 'getSnapshot' of null` 崩溃。订阅改为空安全（目录缺失时挂空订阅），hook 顺序恒定。

## [0.2.0] - 2026-10-24

### 修复

- **座位全空**：0.1.0 把整个 ModelDirectory 传给了组件，而 0.2.1-rc.3 的契约是传 `directory.store`（SnapshotStore，subscribe/getSnapshot 在它身上）——组件调用不存在的 subscribe 直接崩溃，ErrorBoundary 兜底成空，遮蔽着的座位就空了。现在按 rc.3 实测契约传递 store。
- **档位读取位置错误**：强度阶梯不在快照顶层，而在 `groups[].models[].reasoning`（每个模型自带 `{defaultEffort?, efforts: [{id, name}]}`）；模型显示名也取自目录条目而非凭空拼装。
- **inject 不再可能炸掉整个座位**：inject 回调全量 try/catch，任何异常都降级为 `available: false` 并上报，不会把渲染错误抛进槽位管线。

### 新增

- **诊断链路**：服务端新增 `POST /api/dsh-power-picker/diag`，客户端在 boot（服务是否齐备）/register/inject/snapshot（首帧快照键名）/inject-error/crash 各阶段上报，落盘 `~/.dsh/power-picker-debug.log`——座位异常时看这份文件即可定位卡在哪一环；客户端缺失时文件里只有 server boot，说明是模块加载问题。
- 注册改走 `ctx.inject(['slots','modelDirectories','sessions'], …)` 可选注入：服务不齐就不注册，内置选择器原样保留。

## [0.1.0] - 2026-10-24

### 新增

- **Codex 风格模型 + 推理强度选择器**：以 `priority: -1` 注册 `conversation.input.model` 槽位，合法遮蔽内置选择器；面板含渐变 power 滑条（星点动效 + 白色旋钮 + 逐档吸附 + 方向键）、provider 分组模型列表、当前模型渐变标题与目录重载按钮。
- 数据走官方 `modelDirectories`：`select({provider, model, reasoningEffort?})` 切换；档位表按模型动态渲染；换模型保留目标支持的当前档位。
- 服务端 `enabled` 开关：一键恢复内置选择器；客户端 ErrorBoundary 崩溃兜底；快照键名首帧上控制台便于适配 dsh 升级。


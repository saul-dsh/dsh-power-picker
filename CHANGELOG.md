# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.3.0] - 2026-10-24

### 变更（视觉/交互重做，参考 shadcn/Radix 离散滑条规范 + Codex 参考图）

- **卡片收窄**：312 → 264px，内边距收紧，标题 19 → 15px，刷新按钮 24px——默认面板只留「头部 + 滑条 + 模型入口行」，视觉平衡对齐 Codex 参考图。
- **滑条动效**：轨道 14 → 8px、旋钮 24 → 18px（shadcn 规格量级）；fill/旋钮走 `260ms cubic-bezier(0.22,1,0.36,1)` 弹性过渡；**拖拽时自动关闭位移过渡做 1:1 跟手**，松手恢复弹性；悬停旋钮放大 1.1、拖拽放大 1.16 并带光圈；轨道悬停提亮 + 紫色柔光；档位刻度点上线（首尾档不画）；档位标签点击有按压缩放。
- **模型选择改为钻取 pane**：默认面板底部一行「切换模型（N）」，点击滑入模型列表 pane（带返回行），解决模型列表挤占主面板导致的布局失衡；pane 切换带方向感过渡动画。
- 面板入场动画改为 scale(0.97)+translateY 组合；座位 caret 随开合旋转 180°；刷新按钮按下旋转 180°。
- 滑条命中区扩大（上下各 8px），补 focus-visible 焦点环。

### 修复

- PickerPanel 内重复声明 `failure` 导致整个客户端模块无法解析（node --check 拦截）。

## [0.2.3] - 2026-10-24

### 修复

- **点击座位后座位整个消失**：0.2.2 用了 `React.createPortal`，但 dsh 客户端的 react shim 不带这个函数（诊断日志实证 `React.createPortal is not a function`）——点击即渲染崩溃，ErrorBoundary 把整个座位兜成空。现在 portal 改从 `react-dom` 取（加载器 require 表里有它，内置 ui-model-selection 自己就这么用）；取不到时退回原地渲染并上报 portal 模式。
- **点选条目「立即消失、选不上」**：原来点模型行后无条件关面板，`select()` 的 RemoteResult 失败被完全吞掉——看起来就是面板闪没、选择没生效。现在成功才收面板；失败面板留住、显示 store 的 error 态并带「重试」，同时上报 `select-rejected`/`select-error` 诊断。
- 崩溃兜底收缩到只包面板内容：面板渲染崩溃时座位按钮仍可点击，不再连带消失。

## [0.2.2] - 2026-10-24

### 修复

- **面板点不开**：面板原来以 `position: fixed` 挂在输入栏 DOM 内部——输入栏祖先链上的 transform/overflow 会把 fixed 元素裁没（内置选择器同样走 portal）。现在面板 `React.createPortal` 到 `document.body`（z-index 9999），定位只依赖座位按钮的视口矩形。
- 内层 `.dsh-power-panel` 从 fixed 改 relative，避免双重 fixed 定位互相打架。
- 外点关闭只在面板开启时挂监听（原来挂载时 `ref.current` 为 null 直接没挂上），座位点击在监听注册之前，开面板不会被自吞。
- 新增 `open` / `close` 诊断阶段：点击无反应时看日志里有没有 `open`，即可区分「点击没生效」和「面板渲染被裁」。

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


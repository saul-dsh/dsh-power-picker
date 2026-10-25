# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.9.2] - 2026-10-24

### 修复

- **模型名被截断**：标题按钮的 `max-width: 180px/220px` 双重上限把长名（DeepSeek-V4.1-Flash）截成省略号。放开到面板全宽，超出才省略。
- **背景回到官方令牌**：`var(--dsw-specific-menu)` + 官方 `backdrop-filter`（0.9.1 硬编码的 `#1c1c22` 色值与官方观感有偏差；令牌即官方渲染原值，随主题联动）。
- **卡片与入口居中对齐**：面板水平中线对准入口按钮（越界钳回视口）。
- **滑杆底部去掉档位标签行**：Codex 弹卡滑条下方没有 Off/Low/High/Max 标签，档位由刻度点 + 副标题表达。
- **按下弹性**（官方 ThumbSpring）：按下瞬间旋钮 0.9 缩放 + 回弹缓动，松手回 1.15 再落定。

## [0.9.1] - 2026-10-24

### 修复

- **粒子不动**：官方 `.FastTrackParticlePath` 默认 `animation-play-state: running`，仅 `data-animation-active=false` 才暂停——0.9.0 移植时写成了无条件 paused，粒子全部冻结在透明首帧。已改为默认 running。
- **卡片尺寸/字号对齐官方 Popover**（`._Popover_15mw4_2`：`min-width 300px`）：卡片 264 → **300px**、内边距 12 → **16px**、标题 17 → **20px/26px**、副标题 11.5 → **13px**；定位钳制同步 300。

## [0.9.0] - 2026-10-24

### 变更（特效系统整体照抄 Codex：四个特效 chunk 逐行移植）

从已装 Codex asar 中按文件表偏移提取了 `fast-track-particles` / `max-burst` / `max-fill` / `max-track-particles` 四个懒加载 chunk 与 `effects.module`、`particles` 依赖模块的源码，逐行移植：

- **FastTrackParticles**：14 个 3px 辉光白点沿填充区往返（官方 travel 关键帧 100%→92%→8%→0、时长 1.9s ±20% 抖动、负延迟分布、top 12~88%、seeded sin 哈希随机）。
- **MaxFill（WebGL）**：MAX 档填充的 12 中心紫色 metaball 辉光，**GLSL 着色器为官方原版逐行移植**（颗粒噪点、通道时间漂移、pow 色调），ResizeObserver + rAF 驱动，reduced-motion 单帧。填充底色改实色 chart-blue（官方无渐变，观感来自此层）。
- **MaxTrackParticles**：MAX 档轨道上方 5~19% 高度带 14 粒漂浮，按各自 1.6×(0.8~2.0)s 周期跳位（官方 Math.random 跳位 + 分属性过渡）。
- **MaxBurst**：到达 MAX 档时旋钮位置 76×76 盒内 16 粒按官方 ParticleBurst 关键帧弹出（紫/紫蓝混色轮换、`--particle-x/y` 扩散）。
- 移除 0.3.x 自创的星点 twinkle 方案（被官方粒子体系替代）。

## [0.8.1] - 2026-10-24

### 修复

- **旋钮被裁成扁片**：0.8.0 改了 24px 轨道 + overflow hidden，但 28px 旋钮还留在轨道内部——圆旋钮被裁成横 pill，观感即截图里的「效果太差」。现在按官方结构把旋钮与 TickRail 移到 Root 层，轨道内只留填充。

### 新增（官方动效机制补全）

- **16ms 启用技巧**（官方 `_EnableModelPickerPowerSliderThumbInputMotion`）：面板打开时旋钮直接就位、不从 0% 飞入，16ms 后位移过渡才生效。
- **MaxBurst DOM 近似**：值到达最高档时星点一次性弹出（scale 0.4→1.7→1 + 亮度闪现，官方为 canvas 粒子爆发）。

## [0.8.0] - 2026-10-24

### 变更（滑条按已装 Codex 的真实 CSS 重写，模块 `_1bucx` 逐条提取）

- **轨道**：14 → **24px** 高、圆角 999 → **12px**、底色 `color-mix(text 10%)` + **0.5px 内描边** + **135° 斜纹纹理**（官方 repeating-gradient）、overflow hidden。
- **填充**：圆角 999 → **12px 0 0 12px（左圆右直）**，官方 Range 几何。
- **旋钮**：28px 白底 + **0.5px 描边** + **极轻阴影（0 0 2px 10% 黑，官方值）**；从轨道内移到 Root 层——官方 ThumbInput 就在 Root，28px 旋钮不被 24px 轨道裁剪。
- **刻度点回归**：官方 TickRail 4px 圆点（中间档位），带官方多段过渡（background/opacity/filter/transform/translate 分离时长）。
- **缓动换官方值**：`0.3s cubic-bezier(0.23,1,0.32,1)`（原 .22,1,.36,1 / 280ms）。
- **容器**：官方 Container 32px 列布局（margin-inline 2px、padding 2px 6px）。
- 星点为官方 canvas 粒子层（FastTrackParticles/MaxBurst 懒加载模块）的 DOM 近似，保留固定槽位淡入淡出方案。

## [0.7.0] - 2026-10-24

### 修复

- **面板背景彻底实色**：0.6.3 用的 `--dsw-specific-menu` 令牌在主题里本身带透明度，看上去仍是玻璃卡。直接硬编码实色 `#1c1c22`。

### 变更

- **滑条对齐 Codex 比例**：轨道 10 → 14px、旋钮 22 → 28px、星点 5 → 6px——参考图里的粗轨道大旋钮。
- **标题可点击换模型**（Codex 同款交互）：点面板上方的模型名展开模型列表 pane（「‹ 返回」+ 分组列表 + 官方三色 swatch + 当前项 ✓），标题带 ▾ 提示可点；选择成功收面板、失败留面板显示原因。

## [0.6.3] - 2026-10-24

### 变更（对齐官方卡片质感：实色 + 面板只留头部和滑条）

- **面板改实色不透明**：去掉毛玻璃（`backdrop-filter` 移除），背景 `var(--dsw-specific-menu, #1c1c22)`——官方卡片视觉是实色，不是半透明玻璃。
- **去掉弹出的「选择模型」区块**：面板只留「居中头部（渐变标题 + 副标题 + 右上刷新）→ 推理强度滑条 → 最高档用量提示」，与 Codex 参考图完全同构。换模型请用 dsh 原生方式或后续版本再加独立入口。
- 相应清理：模型列表/色块/分隔线的 CSS 与逻辑、`select-rejected` 上报保留在滑条路径。

## [0.6.2] - 2026-10-24

### 变更（按 Codex 实测截图重对入口与头部）

- **入口唯一且在输入栏右下角**（用户截图实证：Codex 的入口就是发送键旁的「选择推理强度 ∨」按钮，不在窗口顶部）：撤掉 0.5.0 引入的会话头顶部入口，恢复输入栏座位为唯一入口，`composerSeat` 默认 `true`。
- **面板右对齐上弹**：面板从入口上方弹出，右缘对齐按钮右缘（transform-origin bottom right）——Codex 的面板悬在按钮上方并向左延展。
- **头部居中排版**（用户圈注的 Codex 头部）：渐变标题 + 副标题居中，刷新按钮绝对定位右上角。
- 移除顶部入口相关 CSS/逻辑与 `top-mounted` 诊断。

## [0.6.1] - 2026-10-24

### 变更（面板样式对齐官方 ContextMeter 卡片，逐条取自已装 asar 的编译 CSS）

- **面板容器换官方令牌**：`background: var(--dsw-specific-menu)`、`border-radius: var(--dsw-radius-lg)`、`box-shadow: var(--dsw-elevation-prominent)`、`backdrop-filter: var(--dsw-menu-backdrop-filter)`、`border: 0`（官方无描边）、`padding: 12px`、`font-size: 12px / line-height: 20px`、宽 `min(264px, 100vw-24px)`——与官方弹卡逐条一致，全部走 dsw 令牌（带兜底值），主题联动。
- **模型列表行对齐官方 legend**：行样式 `flex / space-between / gap 12px / padding 2px 0` 基线，模型名 label-secondary（当前项 label-primary），补官方 **8×8 r2 色块**（swatch）按 provider 组轮换官方图例三色（`--dsw-static-neutral-bluish-400` / `#a78bfa` / `--dsw-static-blue-450`），✓ 改 label-primary 并带浮现动画。
- 小节标题/分组标签对齐官方 `headline` 样式（label-tertiary、12px/20px、去字距）；分隔线与标题间距对齐官方节奏（12/6px）；标题字号 19→17px 融入 20px 字排网格。

## [0.6.0] - 2026-10-24

### 变更（按用户确认：入口只保留 Codex 同位的顶部位置）

- **输入栏座位默认撤除**：`composerSeat` 默认回到 `false`——顶部入口已实测健康挂载（top-mounted 日志 available/hasDirectory 双 true），「整体消失」风险已排除；`composerSeat: true` 仍可加开双入口。
- **顶部入口升级为 Codex 形态**：模型名作主角（600 字重、主文字色、12.5px），档位作次级后缀（次级色），命中区 26→28px——和 Codex 顶部「显示模型名的地方」一致的可视权重。

## [0.5.1] - 2026-10-24

### 修复

- **输入栏座位默认恢复**：0.5.0 把 `composerSeat` 默认设为 false（Codex 同构：入口只在顶部），顶部入口在部分布局下不够显眼时，体感等于「插件整体消失」。默认翻回 **true（顶部 + 输入栏双入口）**；确认顶部入口好用后可在配置里关掉座位。
- 补回 0.5.0 重构时误删的 `inject` 诊断上报；新增 `top-mounted` / `seat-mounted` 挂载证据（含 available/directory 状态），顶部入口是否真的渲染一眼可查。

## [0.5.0] - 2026-10-24

### 变更（入口位置对齐 Codex + 背景回归中性）

- **顶部入口**：按 Codex 参考图圈注，模型选择入口移到**会话头标题旁的动作区**（`conversation.session.header.actions`，order -20）——顶部显示「模型名 · 档位」，点击面板**向下展开**（新 `--down` 入场动画）。注册姿势照 `ui-agent-preset` 同款范例。
- **输入栏座位默认隐藏**：Codex 的输入栏没有模型控件，`conversation.input.model` 槽位默认遮蔽为空；新配置 `composerSeat: true` 可恢复顶部 + 输入栏双入口。
- **背景回归中性**：面板底色退回 `rgba(28,28,34,0.97)`、描边 `rgba(255,255,255,0.08)`、分隔线 `rgba(255,255,255,0.07)`（0.4.0 的蓝色底撤销）；DeepSeek 蓝只保留在强调位（标题渐变、滑条填充、光圈、当前模型文字）。
- 服务端 `/enabled` 端点升级为 `/settings`（`{enabled, composerSeat}`）。

## [0.4.0] - 2026-10-24

### 变更（配色换 DeepSeek 品牌蓝 + 对齐 Codex 布局差异）

- **配色**：紫→靛渐变全部换为 DeepSeek 品牌蓝系——主色 `#4D6BFE`，派生 `#5E84FF / #6E8DFF / #8FB0FF / #9DB8FF / #A8BEFF`。标题渐变 `#A8BEFF→#7C9AFF→#4D6BFE`，滑条填充 `#4D6BFE→#5E84FF→#8FB0FF`，当前模型文字 `#9DB8FF`，面板底 `rgba(23,27,41,0.97)`、描边 `rgba(125,153,255,0.14)`，悬停光圈/焦点环 `rgba(77,107,254,*)`。
- **布局对齐 Codex 参考图**（对比结论中的差异 1–3）：滑条上方补「选择推理强度」小节标题；删掉轨道刻度点（Codex 轨道是干净的）；面板 272→280px、内边距 14→16px、模型行高 30→32px、分隔线间距 12/8→14/8。

## [0.3.1] - 2026-10-24

### 修复

- **滑杆异常跳动**（三处根因同时修）：
  1. **乐观值钉住**：选档立即显示本地值，`select()` 在途/回滚期间 store 会先后发出 pending、旧值、新值等中间快照，显示值不再被它们翻转；store 追上后解除钉住，失败或 5 秒超时才回弹。
  2. 档位标签激活态去掉 `font-weight: 600`——字重变化会挤压相邻标签造成整排抖动，改为纯颜色/透明度过渡。
  3. 星点从「按填充比例增删元素」改为**固定 5 槽位淡入淡出**，消除中途挂载/卸载的闪烁。

### 变更（布局对齐 Codex 参考图）

- 恢复**单面板内联布局**（0.3.0 的钻取 pane 移除）：头部（19px 渐变标题 + 副标题 + 右上刷新）→ 滑条 → 分隔线 → 「选择模型」列表，间距按截图收紧（头部下方 14px、分隔线 12/8px、行高 30px）。
- 面板 264 → **272px**；滑条 8 → **10px 轨道 / 22px 旋钮**（Codex 比例）；星点 4 → 5px。
- 「使用额度消耗更快」提示改为仅在最高档位激活时出现（原来绑在目录默认档上，语义不对）。

### 动效补全

- 旋钮 `will-change: left`；交互期间（拖拽/键盘）统一走 `data-live` 状态：fill/旋钮位移过渡关闭做 1:1 跟手，松手回弹 280ms `cubic-bezier(0.22,1,0.36,1)`。
- 旋钮悬停 1.06 / 交互 1.15 缩放带紫色光圈；星点淡入淡出 + 交错闪烁；滑条区与提示行入场淡入；当前模型 ✓ 带缩放浮现；座位 caret 开合旋转。

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


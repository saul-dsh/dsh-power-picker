/**
 * dsh-power-picker 的 web 客户端部分。
 *
 * 把 dsh 输入栏的模型选择器改造成 Codex 桌面端的样式（反推自
 * OpenAI.Codex 桌面版 26.1021：plan 头 + 渐变 power 滑条 + 星点 + 白色
 * 大旋钮 + 模型列表），但数据全部走 dsh 官方通路：
 *
 *  - `conversation.input.model` 是 single 槽位；多注册时只渲染 priority
 *    最低者（dsh-reference ui-slots 源码原话 "lowest renders"），所以本
 *    插件以 priority: -1 注册，合法遮蔽内置选择器，不做任何 DOM 破坏。
 *  - 目录数据来自 `ctx.modelDirectories`（内置 ui-model-selection 同款
 *    服务）：directoryFor(sessionId) → subscribe/getSnapshot 渲染，
 *    directory.select({ provider, model, reasoningEffort? }) 官方切换。
 *  - 思考强度阶梯是动态的：catalog.reasoningFor(model) 给出每个模型的
 *    efforts 档位表（如 标准/深度 或 low~max），滑条按档位渲染。
 *
 * fail-safe：组件崩溃时渲染为空（ErrorBoundary），服务端 `enabled: false`
 * 可随时关闭遮蔽、恢复内置选择器，无需卸载插件。
 */

window.__ModuleLoader__.load({
  id: 'dsh-power-picker',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const STYLE_ID = 'dsh-power-picker-style'
    const ENABLED_ENDPOINT = '/api/dsh-power-picker/enabled'
    /** 遮蔽内置选择器：single 槽位只渲染 priority 最低的注册。 */
    const SHADOW_PRIORITY = -1

    const CSS = `
.dsh-power-seat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, rgba(232, 238, 250, 0.72));
  font-size: 12.5px;
  line-height: 1;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.dsh-power-seat:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--dsw-alias-label-primary, rgba(232, 238, 250, 0.9));
}
.dsh-power-seat[disabled] { opacity: 0.5; cursor: default; }
.dsh-power-seat-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-power-seat-caret { flex: none; font-size: 10px; opacity: 0.7; }

.dsh-power-panel {
  position: fixed;
  z-index: 60;
  width: 312px;
  padding: 14px 14px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(28, 28, 34, 0.97);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  color: rgba(232, 238, 250, 0.88);
  font-size: 13px;
  animation: dsh-power-in 160ms ease-out both;
}
@keyframes dsh-power-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) { .dsh-power-panel { animation: none; } }

.dsh-power-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.dsh-power-title {
  font-size: 19px;
  font-weight: 650;
  line-height: 1.2;
  background: linear-gradient(92deg, #c4b5fd 0%, #a78bfa 40%, #818cf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-power-subtitle {
  margin-top: 3px;
  font-size: 12px;
  color: rgba(232, 238, 250, 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-power-refresh {
  flex: none;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: rgba(232, 238, 250, 0.55);
  font-size: 14px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.dsh-power-refresh:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(232, 238, 250, 0.9);
}

/* power 滑条：渐变轨道 + 星点 + 白色大旋钮 */
.dsh-power-slider { padding: 6px 2px 2px; }
.dsh-power-track {
  position: relative;
  height: 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  cursor: pointer;
  touch-action: none;
}
.dsh-power-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #7c3aed 0%, #6366f1 55%, #3b82f6 100%);
}
.dsh-power-star {
  position: absolute;
  top: 50%;
  width: 5px;
  height: 5px;
  margin: -2.5px 0 0 -2.5px;
  color: rgba(255, 255, 255, 0.9);
  pointer-events: none;
  animation: dsh-power-twinkle 1.8s ease-in-out infinite;
}
.dsh-power-star:nth-child(odd) { animation-delay: 0.9s; }
@keyframes dsh-power-twinkle {
  0%, 100% { opacity: 0.25; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}
@media (prefers-reduced-motion: reduce) { .dsh-power-star { animation: none; opacity: 0.7; } }
.dsh-power-knob {
  position: absolute;
  top: 50%;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15);
  transform: translate(-50%, -50%);
  transition: left 140ms ease;
}
.dsh-power-track[data-dragging="true"] .dsh-power-knob { transition: none; }
.dsh-power-stops {
  display: flex;
  margin-top: 7px;
}
.dsh-power-stop-label {
  flex: 1;
  border: none;
  background: transparent;
  padding: 2px 0;
  color: rgba(232, 238, 250, 0.45);
  font-size: 11px;
  line-height: 1.3;
  cursor: pointer;
  text-align: center;
  transition: color 120ms ease;
}
.dsh-power-stop-label:first-child { text-align: left; padding-left: 2px; }
.dsh-power-stop-label:last-child { text-align: right; padding-right: 2px; }
.dsh-power-stop-label[data-active="true"] { color: rgba(232, 238, 250, 0.92); font-weight: 600; }
.dsh-power-stop-label:hover { color: rgba(232, 238, 250, 0.75); }
.dsh-power-hint {
  margin-top: 8px;
  font-size: 11.5px;
  color: rgba(251, 191, 36, 0.8);
}

/* 模型列表 */
.dsh-power-models {
  margin-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 10px;
}
.dsh-power-models-heading {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: rgba(232, 238, 250, 0.45);
  margin-bottom: 6px;
}
.dsh-power-model-list {
  max-height: 216px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.dsh-power-group-label {
  margin: 8px 0 3px;
  font-size: 11px;
  color: rgba(232, 238, 250, 0.4);
}
.dsh-power-model-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: rgba(232, 238, 250, 0.82);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease;
}
.dsh-power-model-row:hover { background: rgba(255, 255, 255, 0.07); }
.dsh-power-model-row[data-current="true"] { color: #c4b5fd; }
.dsh-power-model-row[disabled] { opacity: 0.45; cursor: default; }
.dsh-power-model-check { flex: none; font-size: 12px; }
.dsh-power-state {
  padding: 14px 4px;
  text-align: center;
  color: rgba(232, 238, 250, 0.5);
  font-size: 12.5px;
}
.dsh-power-retry {
  margin-top: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: transparent;
  color: rgba(232, 238, 250, 0.8);
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
}
`

    function ensureStyle() {
      if (typeof document === 'undefined') return
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      document.head.appendChild(style)
    }

    /* ---------------------------------------------------------------- */
    /* 目录状态绑定                                                       */
    /* ---------------------------------------------------------------- */

    function useDirectory(directory) {
      return React.useSyncExternalStore(
        (fn) => directory.subscribe(fn),
        () => directory.getSnapshot(),
      )
    }

    /**
     * 快照字段名做防御式读取：模型分组与强度阶梯的确切字段以运行时为准，
     * 首次快照会把键名打到控制台，联调时一眼可对。
     */
    let snapshotLogged = false
    function readSnapshotShape(state) {
      if (!snapshotLogged && state && typeof state === 'object') {
        snapshotLogged = true
        try { console.info('[dsh-power-picker] snapshot keys:', Object.keys(state).join(',')) } catch { /* ignore */ }
      }
      const groups = state?.groups ?? state?.providers ?? state?.catalog?.groups ?? []
      const reasoning = state?.reasoning
        ?? state?.catalog?.reasoningFor?.(state?.current)
        ?? null
      return { groups, reasoning }
    }

    /** 把分组读成 [{ id, label, models: [{ provider, model, name, effort?] }] } 的安全形状。 */
    function normalizeGroups(groups) {
      if (!Array.isArray(groups)) return []
      return groups
        .map((group) => ({
          id: group?.id ?? group?.provider ?? String(group?.label ?? ''),
          label: group?.label ?? group?.name ?? group?.id ?? '',
          models: Array.isArray(group?.models)
            ? group.models
            : Array.isArray(group?.choices)
              ? group.choices.map((choice) => choice?.selection ?? choice)
              : [],
        }))
        .filter((group) => group.models.length > 0)
    }

    function displayNameOf(model) {
      return model?.name ?? model?.displayName ?? model?.label ?? model?.model ?? ''
    }

    /* ---------------------------------------------------------------- */
    /* power 滑条                                                        */
    /* ---------------------------------------------------------------- */

    const STAR_SVG = h('svg', { viewBox: '0 0 10 10', 'aria-hidden': true },
      h('path', { d: 'M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z', fill: 'currentColor' }))

    function stopPosition(index, count) {
      return count <= 1 ? 50 : (index / (count - 1)) * 100
    }

    /**
     * 离散档位滑条：点击轨道/拖拽旋钮按档位吸附，松手才提交 select；
     * 左右方向键逐档切换。纯本地预览，不刷 RPC。
     */
    function PowerSlider({ efforts, value, onPick }) {
      const trackRef = React.useRef(null)
      const [dragIndex, setDragIndex] = React.useState(null)

      const count = efforts.length
      const activeIndex = Math.max(0, efforts.findIndex((effort) => effort.id === value))
      const shownIndex = dragIndex ?? activeIndex
      const fill = stopPosition(shownIndex, count)

      const indexFromEvent = (event) => {
        const rect = trackRef.current?.getBoundingClientRect()
        if (!rect || rect.width === 0) return activeIndex
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
        return Math.round(ratio * (count - 1))
      }

      const onPointerDown = (event) => {
        if (count <= 1) return
        event.currentTarget.setPointerCapture?.(event.pointerId)
        setDragIndex(indexFromEvent(event))
      }
      const onPointerMove = (event) => {
        if (dragIndex === null) return
        setDragIndex(indexFromEvent(event))
      }
      const onPointerUp = (event) => {
        if (dragIndex === null) return
        const index = dragIndex === null ? indexFromEvent(event) : dragIndex
        setDragIndex(null)
        const effort = efforts[index]
        if (effort && effort.id !== value) onPick(effort.id)
      }
      const onKeyDown = (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault()
          const effort = efforts[Math.max(0, activeIndex - 1)]
          if (effort && effort.id !== value) onPick(effort.id)
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault()
          const effort = efforts[Math.min(count - 1, activeIndex + 1)]
          if (effort && effort.id !== value) onPick(effort.id)
        }
      }

      const stars = React.useMemo(() => {
        const spots = [0.18, 0.38, 0.58, 0.78, 0.94]
        return spots.slice(0, Math.max(3, Math.min(5, Math.round(fill / 20)))).map((ratio, index) => (
          h('span', {
            key: index,
            className: 'dsh-power-star',
            style: { left: `${ratio * fill}%`, animationDelay: `${index * 0.35}s` },
          }, STAR_SVG)
        ))
      }, [fill])

      return h('div', { className: 'dsh-power-slider' },
        h('div', {
          ref: trackRef,
          className: 'dsh-power-track',
          role: 'slider',
          tabIndex: 0,
          'aria-label': '推理强度',
          'aria-valuemin': 0,
          'aria-valuemax': Math.max(0, count - 1),
          'aria-valuenow': activeIndex,
          'aria-valuetext': efforts[activeIndex]?.name ?? '',
          'data-dragging': dragIndex !== null ? 'true' : 'false',
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel: onPointerUp,
          onKeyDown,
        },
          h('div', { className: 'dsh-power-fill', style: { width: `${fill}%` } }, stars),
          h('div', { className: 'dsh-power-knob', style: { left: `${fill}%` } }),
        ),
        count > 1 && h('div', { className: 'dsh-power-stops' },
          efforts.map((effort, index) => h('button', {
            key: effort.id ?? index,
            type: 'button',
            className: 'dsh-power-stop-label',
            'data-active': index === shownIndex ? 'true' : 'false',
            onClick: () => effort.id !== value && onPick(effort.id),
          }, effort.name ?? effort.id)),
        ),
      )
    }

    /* ---------------------------------------------------------------- */
    /* 面板                                                              */
    /* ---------------------------------------------------------------- */

    function PickerPanel({ directory, state, onClose }) {
      const { groups: rawGroups, reasoning } = readSnapshotShape(state)
      const groups = normalizeGroups(rawGroups)
      const current = state?.current ?? null
      const currentEffort = current?.reasoningEffort ?? reasoning?.defaultEffort
      const efforts = Array.isArray(reasoning?.efforts) ? reasoning.efforts : []

      const pickModel = (model) => {
        // 换模型时保留当前档位——但目标模型不支持就回落到它的默认档。
        const keep = currentEffort !== undefined
          && efforts.some((effort) => effort.id === currentEffort)
        directory.select({
          provider: model.provider,
          model: model.model,
          ...(keep ? { reasoningEffort: currentEffort } : {}),
        }).catch(() => { /* 错误由 store 状态呈现 */ })
        onClose()
      }
      const pickEffort = (effortId) => {
        if (!current) return
        directory.select({
          provider: current.provider,
          model: current.model,
          reasoningEffort: effortId,
        }).catch(() => { /* 错误由 store 状态呈现 */ })
      }
      const reload = () => { directory.load?.() }

      const status = state?.status
      const title = displayNameOf(current) || '模型'
      const effortName = efforts.find((effort) => effort.id === currentEffort)?.name

      return h('div', { className: 'dsh-power-panel', role: 'dialog', 'aria-label': '模型与推理强度' },
        h('div', { className: 'dsh-power-header' },
          h('div', { style: { minWidth: 0 } },
            h('div', { className: 'dsh-power-title' }, title),
            h('div', { className: 'dsh-power-subtitle' },
              effortName ? `${current?.provider ?? ''} · ${effortName}` : (current?.provider ?? '')),
          ),
          h('button', {
            type: 'button',
            className: 'dsh-power-refresh',
            title: '重新加载模型目录',
            'aria-label': '重新加载模型目录',
            onClick: reload,
          }, '↻'),
        ),
        efforts.length > 0 && h(PowerSlider, {
          efforts,
          value: currentEffort,
          onPick: pickEffort,
        }),
        reasoning?.defaultEffort != null && ['xhigh', 'max'].includes(String(reasoning.defaultEffort))
          && h('div', { className: 'dsh-power-hint' }, '高推理强度会更快消耗用量'),
        h('div', { className: 'dsh-power-models' },
          h('div', { className: 'dsh-power-models-heading' }, '选择模型'),
          (status === 'loading' || (!groups.length && !state?.error))
            ? h('div', { className: 'dsh-power-state' }, '正在加载模型…')
            : state?.error
              ? h('div', { className: 'dsh-power-state' },
                '无法加载模型',
                h('div', null,
                  h('button', { type: 'button', className: 'dsh-power-retry', onClick: reload }, '重试加载模型')),
              )
              : h('div', { className: 'dsh-power-model-list' },
                groups.map((group) => h('div', { key: group.id },
                  group.label && h('div', { className: 'dsh-power-group-label' }, group.label),
                  group.models.map((model, index) => {
                    const isCurrent = current
                      && model.provider === current.provider
                      && model.model === current.model
                    return h('button', {
                      key: `${model.provider}:${model.model}:${index}`,
                      type: 'button',
                      className: 'dsh-power-model-row',
                      'data-current': isCurrent ? 'true' : 'false',
                      onClick: () => !isCurrent && pickModel(model),
                    },
                      h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                        displayNameOf(model)),
                      isCurrent && h('span', { className: 'dsh-power-model-check' }, '✓'),
                    )
                  }),
                )),
              ),
        ),
      )
    }

    /* ---------------------------------------------------------------- */
    /* 座位组件                                                           */
    /* ---------------------------------------------------------------- */

    /** 崩溃兜底：选择器出错时座位留空，用服务端 enabled 开关恢复内置。 */
    class QuietBoundary extends React.Component {
      constructor(props) { super(props); this.state = { failed: false } }
      static getDerivedStateFromError() { return { failed: true } }
      componentDidCatch(error) {
        try { console.error('[dsh-power-picker] crashed:', error) } catch { /* ignore */ }
      }
      render() { return this.state.failed ? null : this.props.children }
    }

    function useDismiss(ref, onClose) {
      React.useEffect(() => {
        if (!ref.current) return undefined
        const onPointerDown = (event) => {
          if (!ref.current?.contains(event.target)) onClose()
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') onClose()
        }
        document.addEventListener('pointerdown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [ref, onClose])
    }

    function PowerPicker({ locked, available, directory }) {
      const state = useDirectory(directory)
      const [open, setOpen] = React.useState(false)
      const seatRef = React.useRef(null)
      const panelRef = React.useRef(null)
      const close = React.useCallback(() => setOpen(false), [])
      useDismiss(panelRef, close)

      // 面板贴着座位按钮上沿：座位在输入栏工具行里，直接用按钮矩形定位。
      React.useLayoutEffect(() => {
        if (!open) return
        const panel = panelRef.current
        const seat = seatRef.current
        if (!panel || !seat) return
        const rect = seat.getBoundingClientRect()
        panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 324))}px`
        panel.style.top = `${Math.max(8, rect.top - panel.offsetHeight - 8)}px`
      }, [open, state])

      if (!available || !directory) return null

      const state2 = state ?? {}
      const { reasoning } = readSnapshotShape(state2)
      const current = state2.current ?? null
      const efforts = Array.isArray(reasoning?.efforts) ? reasoning.efforts : []
      const effortName = efforts.find((effort) => effort.id === (current?.reasoningEffort ?? reasoning?.defaultEffort))?.name
      const modelName = displayNameOf(current)
      const caption = modelName
        ? (effortName ? `${modelName} · ${effortName}` : modelName)
        : '选择推理强度'

      return h('div', { ref: seatRef, style: { display: 'inline-flex', position: 'relative' } },
        h('button', {
          type: 'button',
          className: 'dsh-power-seat',
          disabled: !!locked,
          'aria-haspopup': 'dialog',
          'aria-expanded': open ? 'true' : 'false',
          title: '选择模型与推理强度',
          onClick: () => {
            if (!open) directory.load?.()
            setOpen((value) => !value)
          },
        },
          h('span', { className: 'dsh-power-seat-label' }, caption),
          h('span', { className: 'dsh-power-seat-caret' }, '▾'),
        ),
        open && h('div', { ref: panelRef },
          h(PickerPanel, { directory, state, onClose: close })),
      )
    }

    /* ---------------------------------------------------------------- */
    /* 注册                                                              */
    /* ---------------------------------------------------------------- */

    return {
      inject: ['slots', 'modelDirectories', 'sessions'],
      apply(ctx) {
        ensureStyle()
        console.info('[dsh-power-picker] client 0.1.0 loading')
        // 关闭开关在服务端：enabled=false 时不遮蔽，内置选择器原样回来。
        fetch(ENABLED_ENDPOINT)
          .then((res) => (res.ok ? res.json() : { enabled: true }))
          .then(({ enabled }) => {
            if (enabled === false) {
              console.info('[dsh-power-picker] disabled by config, built-in picker stays')
              return
            }
            ctx.slots.inject('conversation.input.model', () => ctx.slots.register({
              name: 'conversation.input.model',
              id: 'power-picker',
              priority: SHADOW_PRIORITY,
              inject: (sessionId) => ({
                available: ctx.sessions?.subagentAddress?.(sessionId) === undefined,
                directory: ctx.modelDirectories.directoryFor(sessionId),
              }),
            }, (props) => h(QuietBoundary, null, h(PowerPicker, props))))
          })
          .catch(() => {
            // 服务端没起（CLI 宿主等）：按启用处理，与插件安装意图一致。
            ctx.slots.inject('conversation.input.model', () => ctx.slots.register({
              name: 'conversation.input.model',
              id: 'power-picker',
              priority: SHADOW_PRIORITY,
              inject: (sessionId) => ({
                available: ctx.sessions?.subagentAddress?.(sessionId) === undefined,
                directory: ctx.modelDirectories.directoryFor(sessionId),
              }),
            }, (props) => h(QuietBoundary, null, h(PowerPicker, props))))
          })
      },
    }
  },
})

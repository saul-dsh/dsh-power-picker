/**
 * dsh-power-picker 的 web 客户端部分。
 *
 * 把 dsh 输入栏的模型选择器改造成 Codex 桌面端的样式（渐变 power 滑条 +
 * 星点 + 白色旋钮 + provider 分组模型列表），数据走官方通路：
 *
 *  - `conversation.input.model` 是 single 槽位；多注册只渲染 priority 最低
 *    者，本插件以 priority: -1 遮蔽内置选择器（ui-slots "lowest renders"）。
 *  - 注册契约与内置 ui-model-selection 完全一致（0.2.1-rc.3 反推）：组件
 *    拿到的是 `directory.store`（SnapshotStore，subscribe/getSnapshot 在它
 *    身上）+ load/select 两个动词；快照 = { current, groups, pending, ... }，
 *    档位阶梯在 groups[].models[].reasoning = { defaultEffort?, efforts }。
 *  - 切换走 select({ provider, model, reasoningEffort? }) → directory.select，
 *    返回 RemoteResult：ok 才收面板，失败留在面板上报错（失败不抛异常）。
 *  - react shim 没有 createPortal，portal 从 require('react-dom') 取。
 *
 * 0.3.0 视觉/交互重做（参考 shadcn/Radix 离散滑条规范 + Codex 参考图）：
 * 卡片收窄、滑条 8px 轨道 18px 旋钮、cubic-bezier 过渡、拖拽时 1:1 跟手、
 * 档位刻度点、模型列表改为钻取 pane（默认面板只留头部+滑条）。
 *
 * 诊断：boot/register/inject/snapshot/open/close/select-* 各阶段上报到
 * /api/dsh-power-picker/diag，落盘 ~/.dsh/power-picker-debug.log。
 */

window.__ModuleLoader__.load({
  id: 'dsh-power-picker',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // dsh 客户端的 react shim 不带 createPortal（0.2.2 实测 crash：
    // "React.createPortal is not a function"）。加载器的 require 表里有
    // react-dom——内置 ui-model-selection 自己就 require('react-dom')——
    // portal 必须从那里取；取不到就退回原地渲染并上报。
    let createPortal = null
    try {
      const ReactDOM = require('react-dom')
      if (typeof ReactDOM?.createPortal === 'function') createPortal = ReactDOM.createPortal
    } catch { createPortal = null }

    const STYLE_ID = 'dsh-power-picker-style'
    const ENDPOINT = '/api/dsh-power-picker'
    /** 遮蔽内置选择器：single 槽位只渲染 priority 最低的注册。 */
    const SHADOW_PRIORITY = -1
    const VERSION = '0.3.0'

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
  transition: background 140ms ease, color 140ms ease;
}
.dsh-power-seat:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--dsw-alias-label-primary, rgba(232, 238, 250, 0.9));
}
.dsh-power-seat[disabled] { opacity: 0.5; cursor: default; }
.dsh-power-seat-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-power-seat-caret {
  flex: none;
  font-size: 10px;
  opacity: 0.7;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.dsh-power-seat[data-open="true"] .dsh-power-seat-caret { transform: rotate(180deg); }

/* 面板宿主：portal 到 body，尺寸收窄到 264px，视觉平衡对齐 Codex 参考图 */
.dsh-power-host {
  position: fixed;
  z-index: 9999;
  width: 264px;
  transform-origin: bottom left;
  animation: dsh-power-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes dsh-power-in {
  from { opacity: 0; transform: translateY(5px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) { .dsh-power-host { animation: none; } }

.dsh-power-panel {
  position: relative;
  padding: 12px 12px 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(28, 28, 34, 0.97);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
  color: rgba(232, 238, 250, 0.88);
  font-size: 12.5px;
  overflow: hidden;
}

.dsh-power-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.dsh-power-title {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.25;
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
  margin-top: 2px;
  font-size: 11px;
  color: rgba(232, 238, 250, 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-power-refresh {
  flex: none;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(232, 238, 250, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, transform 300ms ease;
}
.dsh-power-refresh:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(232, 238, 250, 0.9);
}
.dsh-power-refresh:active { transform: rotate(180deg); }

/* power 滑条：8px 轨道 + 刻度点 + 18px 旋钮，cubic-bezier 过渡 */
.dsh-power-slider { padding: 4px 0 0; }
.dsh-power-hitzone {
  position: relative;
  margin: 0 -6px;
  padding: 8px 6px;
  cursor: pointer;
  touch-action: none;
}
.dsh-power-track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  transition: background 160ms ease, box-shadow 160ms ease;
}
.dsh-power-hitzone:hover .dsh-power-track {
  background: rgba(255, 255, 255, 0.14);
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.10);
}
.dsh-power-hitzone:focus-visible { outline: 2px solid rgba(139, 92, 246, 0.6); outline-offset: 2px; border-radius: 12px; }
.dsh-power-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #7c3aed 0%, #6366f1 55%, #3b82f6 100%);
  transition: width 260ms cubic-bezier(0.22, 1, 0.36, 1);
}
.dsh-power-tick {
  position: absolute;
  top: 50%;
  width: 3px;
  height: 3px;
  margin: -1.5px 0 0 -1.5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  pointer-events: none;
}
.dsh-power-star {
  position: absolute;
  top: 50%;
  width: 4px;
  height: 4px;
  margin: -2px 0 0 -2px;
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
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2);
  transform: translate(-50%, -50%) scale(1);
  transition:
    left 260ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 160ms ease;
}
.dsh-power-hitzone:hover .dsh-power-knob { transform: translate(-50%, -50%) scale(1.1); }
.dsh-power-hitzone[data-dragging="true"] .dsh-power-knob {
  transform: translate(-50%, -50%) scale(1.16);
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.55), 0 0 0 5px rgba(124, 58, 237, 0.18);
}
.dsh-power-hitzone[data-dragging="true"] .dsh-power-fill,
.dsh-power-hitzone[data-dragging="true"] .dsh-power-knob { transition-property: box-shadow, transform; }
.dsh-power-hitzone[data-dragging="true"] .dsh-power-fill { transition: none; }
.dsh-power-hitzone[data-dragging="true"] .dsh-power-knob { transition: box-shadow 160ms ease, transform 160ms ease; }

.dsh-power-stops { display: flex; margin-top: 6px; }
.dsh-power-stop-label {
  flex: 1;
  border: none;
  background: transparent;
  padding: 2px 0;
  color: rgba(232, 238, 250, 0.42);
  font-size: 10.5px;
  line-height: 1.3;
  cursor: pointer;
  text-align: center;
  transition: color 160ms ease, transform 120ms ease;
}
.dsh-power-stop-label:first-child { text-align: left; padding-left: 2px; }
.dsh-power-stop-label:last-child { text-align: right; padding-right: 2px; }
.dsh-power-stop-label[data-active="true"] { color: rgba(232, 238, 250, 0.92); font-weight: 600; }
.dsh-power-stop-label:hover { color: rgba(232, 238, 250, 0.75); }
.dsh-power-stop-label:active { transform: scale(0.96); }
.dsh-power-hint {
  margin-top: 7px;
  font-size: 11px;
  color: rgba(251, 191, 36, 0.8);
}

/* 钻取 pane：默认只有头部+滑条+模型入口行，列表在第二 pane */
.dsh-power-panes { position: relative; margin-top: 4px; }
.dsh-power-pane {
  animation: dsh-power-pane-in 160ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes dsh-power-pane-in {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) { .dsh-power-pane { animation: none; } }
.dsh-power-pane[data-back="true"] { animation-name: dsh-power-pane-back; }
@keyframes dsh-power-pane-back {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}
.dsh-power-models-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: calc(100% + 12px);
  margin: 8px -6px -4px;
  padding: 7px 6px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: rgba(232, 238, 250, 0.62);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
.dsh-power-models-entry:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(232, 238, 250, 0.9);
}
.dsh-power-models-entry .dsh-power-caret { font-size: 10px; opacity: 0.6; }
.dsh-power-back-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 -4px 8px;
  padding: 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(232, 238, 250, 0.6);
  font-size: 11.5px;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
.dsh-power-back-row:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(232, 238, 250, 0.9);
}
.dsh-power-models-heading {
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: rgba(232, 238, 250, 0.45);
  margin-bottom: 5px;
}
.dsh-power-model-list {
  max-height: 190px;
  overflow-y: auto;
  scrollbar-width: thin;
  margin: 0 -4px;
}
.dsh-power-group-label {
  margin: 7px 4px 3px;
  font-size: 10.5px;
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
  border-radius: 8px;
  background: transparent;
  color: rgba(232, 238, 250, 0.82);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  transition: background 140ms ease;
}
.dsh-power-model-row:hover { background: rgba(255, 255, 255, 0.07); }
.dsh-power-model-row[data-current="true"] { color: #c4b5fd; }
.dsh-power-model-check { flex: none; font-size: 11px; }
.dsh-power-state {
  padding: 12px 4px;
  text-align: center;
  color: rgba(232, 238, 250, 0.5);
  font-size: 12px;
}
.dsh-power-retry {
  margin-top: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: transparent;
  color: rgba(232, 238, 250, 0.8);
  font-size: 11.5px;
  padding: 3px 10px;
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
    /* 诊断                                                              */
    /* ---------------------------------------------------------------- */

    function report(phase, data) {
      try {
        const line = JSON.stringify({ phase, ...data, v: VERSION })
        console.info(`[dsh-power-picker] ${phase}`, data)
        fetch(`${ENDPOINT}/diag`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: line,
          keepalive: true,
        }).catch(() => { /* ignore */ })
      } catch { /* ignore */ }
    }

    /* ---------------------------------------------------------------- */
    /* 快照形状（0.2.1-rc.3 实测契约）                                     */
    /* ---------------------------------------------------------------- */

    let snapshotLogged = false
    /** 快照：{ current: {provider, model, reasoningEffort?} | null, groups: [{id, name, models: [{id, name, reasoning}]}], pending, retainedEffort? } */
    function readState(state) {
      if (!snapshotLogged && state && typeof state === 'object') {
        snapshotLogged = true
        try {
          const sample = Array.isArray(state.groups) ? state.groups[0] : null
          report('snapshot', {
            keys: Object.keys(state).join(','),
            groupKeys: sample ? Object.keys(sample).join(',') : null,
            modelKeys: sample && Array.isArray(sample.models) && sample.models[0]
              ? Object.keys(sample.models[0]).join(',')
              : null,
            groupCount: Array.isArray(state.groups) ? state.groups.length : -1,
          })
        } catch { /* ignore */ }
      }
      const groups = Array.isArray(state?.groups) ? state.groups : []
      const current = state?.current ?? null
      const model = current
        ? (groups.find((group) => group?.id === current.provider)?.models ?? [])
          .find((entry) => entry?.id === current.model)
        : null
      return {
        groups,
        current,
        model,
        reasoning: model?.reasoning ?? null,
        pending: state?.pending ?? null,
      }
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
     * 离散档位滑条（shadcn/Radix 规范）：8px 轨道、18px 旋钮、刻度点；
     * fill/knob 走 cubic-bezier 过渡，拖拽时 data-dragging 关掉位移过渡
     * 做 1:1 跟手，松手恢复弹性过渡。
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
        const spots = [0.16, 0.36, 0.56, 0.76, 0.93]
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
          className: 'dsh-power-hitzone',
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
          h('div', { className: 'dsh-power-track' },
            h('div', { className: 'dsh-power-fill', style: { width: `${fill}%` } }, stars),
            count > 2 && efforts.map((effort, index) => (
              index !== 0 && index !== count - 1
                ? h('span', {
                  key: `tick-${effort.id ?? index}`,
                  className: 'dsh-power-tick',
                  style: { left: `${stopPosition(index, count)}%` },
                })
                : null
            )),
            h('div', { className: 'dsh-power-knob', style: { left: `${fill}%` } }),
          ),
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

    function PickerPanel({ store, select, load, onClose }) {
      const state = React.useSyncExternalStore(
        (fn) => store.subscribe(fn),
        () => store.getSnapshot(),
      )
      const { groups, current, model, reasoning, pending } = readState(state)
      const efforts = Array.isArray(reasoning?.efforts) ? reasoning.efforts : []
      const effectiveEffort = current?.reasoningEffort ?? reasoning?.defaultEffort
      const [pane, setPane] = React.useState('root')
      const failure = state?.error ?? null
      const modelCount = groups.reduce((sum, group) => sum + (Array.isArray(group.models) ? group.models.length : 0), 0)

      const pickModel = (provider, modelId) => {
        // 换模型保留当前档位——目标模型不支持就回落到它的默认档。
        const keep = current?.reasoningEffort !== undefined
          && efforts.some((effort) => effort.id === current.reasoningEffort)
        const selection = {
          provider,
          model: modelId,
          ...(keep ? { reasoningEffort: current.reasoningEffort } : {}),
        }
        // select 返回 RemoteResult：失败时面板留住（store 会进 error 态），
        // 成功才收起。无条件关面板会让失败看起来像「点了立刻消失」。
        Promise.resolve(select(selection)).then((result) => {
          if (result && result.ok === false) {
            report('select-rejected', {
              provider: selection.provider,
              model: selection.model,
              result: JSON.stringify(result).slice(0, 300),
            })
          } else {
            onClose()
          }
        }).catch((err) => {
          report('select-error', { message: String(err?.message ?? err) })
        })
      }
      const pickEffort = (effortId) => {
        if (!current) return
        Promise.resolve(select({
          provider: current.provider,
          model: current.model,
          reasoningEffort: effortId,
        })).then((result) => {
          if (result && result.ok === false) {
            report('select-rejected', { effort: effortId, result: JSON.stringify(result).slice(0, 300) })
          }
        }).catch((err) => {
          report('select-error', { message: String(err?.message ?? err) })
        })
      }

      const title = model?.name ?? current?.model ?? '模型'
      const effortName = efforts.find((effort) => effort.id === effectiveEffort)?.name

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
            onClick: () => load(),
          }, '↻'),
        ),
        failure && h('div', { className: 'dsh-power-state' },
          String(failure?.message ?? failure ?? '选择失败'),
          h('div', null,
            h('button', { type: 'button', className: 'dsh-power-retry', onClick: () => load() }, '重试')),
        ),
        efforts.length > 0 && h(PowerSlider, {
          efforts,
          value: effectiveEffort,
          onPick: pickEffort,
        }),
        h('div', { className: 'dsh-power-panes' },
          pane === 'root'
            ? h('div', { key: 'root', className: 'dsh-power-pane' },
                h('button', {
                  type: 'button',
                  className: 'dsh-power-models-entry',
                  onClick: () => setPane('models'),
                },
                  h('span', null, `切换模型（${modelCount}）`),
                  h('span', { className: 'dsh-power-caret' }, '›'),
                ),
              )
            : h('div', { key: 'models', className: 'dsh-power-pane', 'data-back': 'true' },
                h('button', {
                  type: 'button',
                  className: 'dsh-power-back-row',
                  onClick: () => setPane('root'),
                }, '‹ 返回'),
                h('div', { className: 'dsh-power-models-heading' }, '选择模型'),
                (!groups.length && pending === null)
                  ? h('div', { className: 'dsh-power-state' }, '正在加载模型…')
                  : h('div', { className: 'dsh-power-model-list' },
                      groups.map((group) => h('div', { key: group.id },
                        group.name && group.name !== group.id
                          ? h('div', { className: 'dsh-power-group-label' }, group.name)
                          : null,
                        (Array.isArray(group.models) ? group.models : []).map((entry) => {
                          const isCurrent = current
                            && group.id === current.provider
                            && entry.id === current.model
                          return h('button', {
                            key: `${group.id}:${entry.id}`,
                            type: 'button',
                            className: 'dsh-power-model-row',
                            'data-current': isCurrent ? 'true' : 'false',
                            onClick: () => !isCurrent && pickModel(group.id, entry.id),
                          },
                            h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                              entry.name ?? entry.id),
                            isCurrent && h('span', { className: 'dsh-power-model-check' }, '✓'),
                          )
                        }),
                      )),
                    ),
              ),
        ),
      )
    }

    /* ---------------------------------------------------------------- */
    /* 座位组件                                                           */
    /* ---------------------------------------------------------------- */

    /** 崩溃兜底：只包面板内容，座位按钮永远存活，出错时上报。 */
    class QuietBoundary extends React.Component {
      constructor(props) { super(props); this.state = { failed: false } }
      static getDerivedStateFromError(error) {
        report('crash', { message: String(error?.message ?? error) })
        return { failed: true }
      }
      render() { return this.state.failed ? null : this.props.children }
    }

    /**
     * 外点关闭：只在面板开启时挂监听（open 进依赖），点击落在座位或
     * 面板内部不关闭。capture 阶段先于按钮 onClick，开面板的那次点击
     * 时监听还没挂，不会自吞。
     */
    function useDismiss(seatRef, panelRef, open, onClose) {
      React.useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          const target = event.target instanceof Element ? event.target : null
          if (target && (seatRef.current?.contains(target) || panelRef.current?.contains(target))) return
          onClose()
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
      }, [seatRef, panelRef, open, onClose])
    }

    /**
     * 座位组件。props 契约与内置 ModelSelect 一致：
     * { locked }（owner）+ { available, directory, load, select }（inject 脸，
     * 其中 directory 是 SnapshotStore）。
     */
    function PowerPicker({ locked, available, directory, load, select }) {
      const [open, setOpen] = React.useState(false)
      const seatRef = React.useRef(null)
      const panelRef = React.useRef(null)
      const close = React.useCallback(() => setOpen(false), [])
      useDismiss(seatRef, panelRef, open, close)

      // 目录可能为 null（inject 降级）：订阅必须做成空安全，hook 顺序保持不变。
      const state = React.useSyncExternalStore(
        (fn) => (directory && typeof directory.subscribe === 'function' ? directory.subscribe(fn) : () => {}),
        () => (directory && typeof directory.getSnapshot === 'function' ? directory.getSnapshot() : null),
      )
      const { current, model, reasoning } = readState(state)
      const efforts = Array.isArray(reasoning?.efforts) ? reasoning.efforts : []
      const effectiveEffort = current?.reasoningEffort ?? reasoning?.defaultEffort
      const effortName = efforts.find((effort) => effort.id === effectiveEffort)?.name
      const modelName = model?.name ?? current?.model
      const caption = modelName
        ? (effortName ? `${modelName} · ${effortName}` : modelName)
        : '选择推理强度'

      // 面板贴着座位按钮上沿，随输入栏位置走。
      React.useLayoutEffect(() => {
        if (!open) return
        const panel = panelRef.current
        const seat = seatRef.current
        if (!panel || !seat) return
        const rect = seat.getBoundingClientRect()
        panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 276))}px`
        panel.style.top = `${Math.max(8, rect.top - panel.offsetHeight - 8)}px`
      }, [open])

      if (!available || !directory) return null
      return h('div', { ref: seatRef, style: { display: 'inline-flex', position: 'relative' } },
        h('button', {
          type: 'button',
          className: 'dsh-power-seat',
          'data-open': open ? 'true' : 'false',
          disabled: !!locked,
          'aria-haspopup': 'dialog',
          'aria-expanded': open ? 'true' : 'false',
          title: '选择模型与推理强度',
          onClick: () => {
            report(open ? 'close' : 'open', {})
            if (!open) { try { load() } catch { /* ignore */ } }
            setOpen((value) => !value)
          },
        },
          h('span', { className: 'dsh-power-seat-label' }, caption),
          h('span', { className: 'dsh-power-seat-caret' }, '▾'),
        ),
        // 面板 portal 到 body（react-dom 的 createPortal，内置选择器同款）：
        // 输入栏祖先链的 transform/overflow 会把 fixed 面板裁没。加载器给不了
        // react-dom 时退回原地渲染并上报。崩溃兜底只包面板——座位按钮永远活着。
        open && (() => {
          const panel = h('div', { ref: panelRef, className: 'dsh-power-host', style: { left: -9999, top: -9999 } },
            h(QuietBoundary, null, h(PickerPanel, { store: directory, select, load, onClose: close })))
          return createPortal ? createPortal(panel, document.body) : panel
        })(),
      )
    }

    /* ---------------------------------------------------------------- */
    /* 注册                                                              */
    /* ---------------------------------------------------------------- */

    return {
      // modelDirectories 的服务链要求调用方也声明 sessions/remote/remote.session
      // （ModelDirectoryResolver static inject；缺了 cordis 会以
      // "cannot get property remote.session without inject" 拒绝目录解析）。
      inject: ['slots', 'sessions', 'remote', 'remote.session', 'modelDirectories'],
      apply(ctx) {
        ensureStyle()
        report('boot', {
          services: {
            slots: typeof ctx.slots,
            modelDirectories: typeof ctx.modelDirectories,
            sessions: typeof ctx.sessions,
            remote: typeof ctx.remote,
          },
          portal: createPortal ? 'react-dom' : 'inline-fallback',
        })
        console.info(`[dsh-power-picker] client ${VERSION} loading`)

        // 可选注入：服务齐了才注册遮蔽；缺服务时内置选择器原样保留。
        ctx.inject(['slots', 'sessions', 'remote', 'remote.session', 'modelDirectories'], (scope) => {
          const gate = Promise.race([
            fetch(`${ENDPOINT}/enabled`)
              .then((res) => (res.ok ? res.json() : { enabled: true }))
              .catch(() => ({ enabled: true })),
            new Promise((resolve) => setTimeout(() => resolve({ enabled: true }), 2500)),
          ])

          gate.then(({ enabled }) => {
            if (enabled === false) {
              report('skip-disabled', {})
              return
            }
            scope.slots.inject('conversation.input.model', () => scope.slots.register({
              name: 'conversation.input.model',
              id: 'power-picker',
              priority: SHADOW_PRIORITY,
              inject: (sessionId) => {
                try {
                  const directory = scope.modelDirectories.directoryFor(sessionId)
                  const available = scope.sessions.subagentAddress(sessionId) === undefined
                  report('inject', { available, sessionId: String(sessionId) })
                  return {
                    available,
                    // rc.3 契约：组件拿到的是 store（subscribe/getSnapshot 在它身上）。
                    directory: directory.store,
                    load: () => {
                      if (available) directory.load?.()?.catch?.(() => {})
                    },
                    select: (selection) => (available
                      ? directory.select(selection)
                      : Promise.resolve(undefined)),
                  }
                } catch (err) {
                  report('inject-error', { message: String(err?.message ?? err) })
                  return {
                    available: false,
                    directory: null,
                    load: () => {},
                    select: () => Promise.resolve(undefined),
                  }
                }
              },
            }, (props) => h(PowerPicker, props)))
            report('register', { priority: SHADOW_PRIORITY })
          }).catch((err) => report('gate-error', { message: String(err?.message ?? err) }))
        })
      },
    }
  },
})

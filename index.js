/**
 * dsh-power-picker — Codex 风格的模型 + 推理强度选择器（DeepSeek Harness / dsh）
 *
 * 服务端半很薄：只有一个 `enabled` 开关和一个状态端点。所有真正的逻辑都
 * 在客户端——抢占 `conversation.input.model` 槽位（更低 priority 遮蔽内置
 * 选择器），数据走官方 `modelDirectories` 会话模型目录。服务端唯一的职责
 * 是让「关闭插件」有一个不用卸载的开关：客户端注册遮蔽前先来这里确认。
 *
 * 已核对的 dsh API（dsh-reference，ui-model-selection 内置插件同款通路）：
 *   - 客户端 ctx.modelDirectories.directoryFor(sessionId) → 目录
 *   - directory.subscribe/getSnapshot → useSyncExternalStore
 *   - directory.select({ provider, model, reasoningEffort? }) → sessions.selectModel
 *   - catalog.reasoningFor(model) → { defaultEffort, efforts: [{ id, name }] }
 *   - conversation.input.model 是 single 槽位，多注册按 priority 只渲染最低者
 */

import Schema from '@deepseek-ai/schemastery'

export const name = 'power-picker'

export const Config = Schema.object({
  /** 关闭后客户端不再遮蔽内置选择器，模型选择恢复原样（无需卸载插件）。 */
  enabled: Schema.boolean().default(true).description('是否启用 Codex 风格选择器'),
})

export function apply(ctx, config) {
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/api/dsh-power-picker/enabled',
      handler: (req, res) => {
        res.statusCode = 200
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ enabled: config.enabled !== false, name }))
      },
    }), 'dsh-power-picker: /api/dsh-power-picker/enabled')
  })
}

export default { name, Config, apply }

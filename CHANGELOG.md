# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-10-24

### 新增

- **Codex 风格模型 + 推理强度选择器**：以 `priority: -1` 注册 `conversation.input.model` 槽位，合法遮蔽内置选择器；面板含渐变 power 滑条（星点动效 + 白色旋钮 + 逐档吸附 + 方向键）、provider 分组模型列表、当前模型渐变标题与目录重载按钮。
- 数据走官方 `modelDirectories`：`select({provider, model, reasoningEffort?})` 切换；档位表按模型动态渲染；换模型保留目标支持的当前档位。
- 服务端 `enabled` 开关：一键恢复内置选择器；客户端 ErrorBoundary 崩溃兜底；快照键名首帧上控制台便于适配 dsh 升级。

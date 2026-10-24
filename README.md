# dsh-power-picker

[![CI](https://github.com/saul-dsh/dsh-power-picker/actions/workflows/ci.yml/badge.svg)](https://github.com/saul-dsh/dsh-power-picker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

dsh（DeepSeek Harness）的 **Codex 风格模型与推理强度选择器**：把输入栏的模型选择区改造成 OpenAI Codex 桌面端的形态——渐变 power 滑条（推理强度）、星点动效、白色大旋钮、按 provider 分组的模型列表。界面是 Codex 的，数据全部走 dsh 官方通路。

## 效果

- 点击输入栏的模型座位，弹出 Codex 风格面板：
  - **头部**：当前模型名（紫色渐变字）+ provider/当前档位副标题 + ↻ 重新加载目录
  - **power 滑条**：推理强度逐档吸附（点击轨道、拖拽旋钮、左右方向键），档位名称来自模型目录——不同模型不同阶梯（如 标准/深度），松手才提交
  - **模型列表**：按 provider 分组，当前模型 ✓ 标记，换模型时自动保留支持的强度档位
- 高强度档位显示「更快消耗用量」提示

## 工作原理（无黑魔法）

1. `conversation.input.model` 是 **single 槽位**，dsh 允许多方注册、只渲染 priority 最低者——本插件以 `priority: -1` 注册，**合法遮蔽**内置选择器（源码依据：ui-slots "register at a different priority to shadow it (lowest renders)"）。
2. 目录数据来自 `ctx.modelDirectories`（内置 `ui-model-selection` 同款服务）：`subscribe/getSnapshot` 渲染 + `directory.select({ provider, model, reasoningEffort? })` 官方切换，强度阶梯（`catalog.reasoningFor(model)`）**动态**来自 Host 的模型目录。
3. 服务端只有薄薄一层：`GET /api/dsh-power-picker/enabled` 开关。配置 `enabled: false` 即恢复内置选择器，无需卸载插件。

## 安装

```sh
dsh plugin --profile web add D:\AIiteams\dsh插件\packages\dsh-power-picker
dsh plugin --profile desktop add D:\AIiteams\dsh插件\packages\dsh-power-picker
```

重启 dsh 生效。

## 配置

| 配置 | 默认 | 说明 |
|------|------|------|
| `enabled` | `true` | 设为 `false` 恢复内置模型选择器（插件保留但不遮蔽） |

## 已知边界

- **遮蔽是全局的**：子代理会话（subagent）本无模型选择，本插件同样不渲染座位。
- **崩溃兜底**：面板出错时座位留空（ErrorBoundary），此时把 `enabled` 设为 `false` 重启即恢复内置。
- dsh 升级若改变模型目录 store 的字段名，列表可能为空——首帧会把快照键名打到控制台（`[dsh-power-picker] snapshot keys:`），照着调 `readSnapshotShape` 即可。
- 面板视觉反推自 OpenAI.Codex 桌面版 26.1021；交互契约参考开源 [openai/codex](https://github.com/openai/codex) CLI 的 model/effort 语义。

## License

[MIT](LICENSE)

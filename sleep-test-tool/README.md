# 睡眠 API 测试工具

一个本地运行的 Web 测试工具，用于测试不同的 LLM 模型和 Prompt 配置，模拟现有的睡眠鼓励应用功能。

## 功能特性

- 🌙 **模型测试**：支持测试多种 LLM 模型（Cloudflare、OpenAI、Claude 等）
- 📝 **Prompt 编辑**：内置预设模板，支持自定义 Prompt
- 🔄 **双模式运行**：真实 API 调用 / 模拟响应模式
- 📊 **测试历史**：自动保存测试记录，支持配置管理
- 🎨 **一致 UI**：保持与原应用相同的暗色主题设计

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动应用

```bash
python3 app.py
```

### 3. 访问应用

打开浏览器访问：http://localhost:5001

## 使用说明

### 测试配置

1. **选择模型**：
   - 从下拉列表选择预设模型
   - 或在自定义输入框中输入任意模型名称

2. **设置 Prompt**：
   - 使用预设模板（默认督促、默认表扬等）
   - 或编写自定义 Prompt

3. **配置参数**：
   - 选择响应类型（督促提醒/表扬鼓励）
   - 设置本地时间（可选，默认使用当前时间）
   - 选择是否使用模拟响应

4. **运行测试**：
   - 点击"运行测试"按钮
   - 查看响应结果和耗时

### 高级功能

- **保存配置**：保存常用测试配置供后续使用
- **测试历史**：查看最近的测试记录
- **快速加载**：点击历史记录快速恢复测试配置

## API 端点

### POST /api/test

发送测试请求

**请求体：**
```json
{
    "model": "模型名称",
    "prompt": "Prompt 内容",
    "type": "urge|praise",
    "local_time": "23:00",
    "use_mock": true
}
```

**响应：**
```json
{
    "success": true,
    "response": "模型响应内容",
    "test_id": "测试ID",
    "response_time": 0.5,
    "use_mock": true
}
```

## 文件结构

```
sleep-test-tool/
├── app.py                     # Flask 主应用
├── requirements.txt           # Python 依赖
├── templates/
│   └── index.html            # 测试页面模板
├── static/
│   ├── css/
│   │   └── test.css          # 页面样式
│   └── js/
│       └── test.js           # 交互逻辑
└── data/
    └── test_history.json     # 测试历史记录
```

## 注意事项

- 真实 API 调用会访问 https://sleep.vuntun.app/api/
- 模拟响应模式用于快速测试，不需要网络连接
- 测试历史默认保存在本地文件中
- 推荐使用 Chrome、Firefox、Safari 等现代浏览器

## 扩展性

- 支持集成更多 LLM 提供商
- 可扩展添加更多 Prompt 模板
- 支持批量测试和对比功能
- 可导出测试报告

## 故障排除

**端口冲突问题**：
如果 5001 端口被占用，可以修改 `app.py` 最后一行的端口号

```python
app.run(debug=True, host='0.0.0.0', port=5002)  # 改为其他端口
```
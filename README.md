# AI Router

一个简易但完整的 AI 大模型 API 中转站，兼容 OpenAI API 格式，支持多模型路由和管理后台。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 功能特性

- **🔄 OpenAI 兼容接口** - `/v1/chat/completions` 完全兼容 OpenAI Chat Completions API
- **🤖 多模型支持** - 内置 DeepSeek V4、智谱 GLM-5、通义千问 qwen-plus
- **⚖️ 智能路由** - 负载均衡 / 自动切换 / 渠道健康检测
- **🔑 密钥管理** - 完整的 API Key 生命周期管理（创建/禁用/删除）+ 余额控制
- **📊 用量统计** - Token 消耗记录 + 可视化图表
- **🖥️ 管理后台** - 仪表盘 + 渠道管理 + 日志查询

## 快速开始

```bash
# 克隆项目
git clone https://github.com/lxfu1/ai-router.git
cd ai-router

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 API 密钥

# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | 是 | DeepSeek API 密钥 |
| `ZHIPU_API_KEY` | 是 | 智谱 API 密钥 |
| `QWEN_API_KEY` | 是 | 通义千问 API 密钥 |
| `ADMIN_PASSWORD` | 是 | 管理后台登录密码 |
| `JWT_SECRET` | 是 | 会话加密密钥 |

详见 [.env.example](.env.example)

## 使用说明

### 1. 创建 API Key

访问 `http://localhost:3000/admin`，使用管理员密码登录，在密钥管理页面创建 API Key。

创建的 Key 格式：`sk-router-{prefix}-{random}`

### 2. API 调用

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer sk-router-your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-v4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

支持的模型参数：

| 模型参数 | 对应渠道 |
|---------|---------|
| `deepseek-v4` | DeepSeek |
| `glm-5` | 智谱 GLM |
| `qwen-plus` | 通义千问 |
| `auto` | 自动负载均衡 |

### 3. 流式响应

设置 `"stream": true` 启用 SSE 流式输出。

## API 文档

### POST /v1/chat/completions

兼容 [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create)。

**请求头**

```
Authorization: Bearer sk-router-your-key
Content-Type: application/json
```

**请求体**

```json
{
  "model": "deepseek-v4",
  "messages": [
    {"role": "system", "content": "You are helpful."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "stream": false
}
```

**响应**

```json
{
  "id": "chat-xxx",
  "object": "chat.completion",
  "model": "deepseek-v4",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Hello!"},
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

## 项目结构

```
├── app/                # Next.js App Router
│   ├── api/            # API 路由
│   │   ├── v1/chat/completions  # 核心中转接口
│   │   ├── admin/               # 管理后台接口
│   │   └── key/                 # 密钥管理接口
│   ├── admin/          # 管理后台页面
│   └── page.tsx        # 首页
├── components/         # React 组件
├── lib/                # 工具函数
├── data/               # SQLite 数据库
├── types/              # TypeScript 类型定义
└── config/             # 配置文件
```

## 技术栈

- **框架**: Next.js 15 + React 19 + TypeScript
- **数据库**: SQLite (better-sqlite3)
- **图表**: AntV G2
- **样式**: Tailwind CSS

## 模型计费倍率

| 渠道 | 计费倍率 | 来源 |
|------|---------|------|
| DeepSeek | 1.0x | 官方指导价 |
| 智谱 GLM | 1.2x | 官方指导价 |
| 通义千问 | 1.0x | 官方指导价 |

*倍率用于计算 Token 消耗成本，可在代码中调整*

## 注意事项

1. **生产部署前**请修改 `JWT_SECRET` 和 `ADMIN_PASSWORD`
2. 确保 `.env.local` 不被提交到版本控制（`.gitignore` 已配置）
3. 定期备份 `data/` 目录中的 SQLite 数据库

## 贡献

欢迎提交 Issue 和 Pull Request！

## License

[MIT](LICENSE)

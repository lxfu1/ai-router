# AI Router

<p align="center">
  <img src="public/favicon.svg" width="80" height="80" alt="AI Router Logo">
</p>

<p align="center">
  一个简易但完整的 AI 大模型 API 中转站，兼容 OpenAI API 格式，支持多模型路由和管理后台。
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Next.js-15-black" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6" alt="TypeScript 5.8">
</p>

---

## ✨ 功能特性

- **🔄 OpenAI 兼容接口** - `/v1/chat/completions` 完全兼容 OpenAI Chat Completions API，一行代码迁移现有应用
- **🤖 多模型支持** - 内置 DeepSeek V4、智谱 GLM-5、通义千问 qwen-plus、MiniMax M1
- **⚖️ 智能路由** - `auto` 模式自动负载均衡，渠道故障自动切换，无需人工干预
- **🔑 密钥管理** - 完整的 API Key 生命周期管理（创建/禁用/删除）+ 余额消耗控制
- **📊 用量统计** - Token 消耗实时记录，30天趋势图表可视化
- **🖥️ 管理后台** - 仪表盘 + 渠道健康监控 + 调用日志查询
- **🚀 生产就绪** - Docker 一键部署，自动 HTTPS，Prometheus 监控

---

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 克隆项目
git clone https://github.com/lxfu1/ai-router.git
cd ai-router

# 创建环境配置
cp .env.example .env.local
# 编辑 .env.local 填入你的 API 密钥

# 启动服务
docker compose up -d

# 访问 http://localhost:3000
```

### 本地开发

```bash
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

---

## ⚙️ 环境变量

### 必需配置

| 变量名 | 说明 |
|--------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |
| `ZHIPU_API_KEY` | 智谱 AI API 密钥 |
| `QWEN_API_KEY` | 通义千问 API 密钥 |
| `ADMIN_PASSWORD` | 管理后台登录密码 |
| `JWT_SECRET` | 会话加密密钥（随机字符串） |

### 可选配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DATABASE_TYPE` | sqlite | 数据库类型: sqlite / postgres |
| `REDIS_URL` | - | Redis 连接串（用于缓存，留空使用内存） |
| `ENCRYPTION_KEY` | - | API Key 加密密钥（32字节 hex） |
| `RATE_LIMIT_ENABLED` | true | 是否启用限流 |
| `LOG_LEVEL` | info | 日志级别: debug, info, warn, error |

详见 [.env.example](.env.example)

---

## 📖 使用说明

### 1. 创建 API Key

访问管理后台 `http://localhost:3000`，使用管理员密码登录，在 **密钥管理** 页面创建 API Key。

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

### 3. 支持的模型

| 模型参数 | 对应渠道 | 备注 |
|---------|---------|------|
| `deepseek-v4` | DeepSeek V4 | 最强推理 |
| `glm-5` | 智谱 GLM-5 | 中文优化 |
| `qwen-plus` | 通义千问 | 阿里生态 |
| `minimax-m1` | MiniMax | 多模态 |
| `auto` | 自动选择 | 负载均衡+故障切换 |

### 4. 流式响应

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer sk-router-your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

---

## 🐍 Python SDK 示例

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="sk-router-your-key"
)

# 使用特定模型
response = client.chat.completions.create(
    model="deepseek-v4",
    messages=[{"role": "user", "content": "你好"}]
)
print(response.choices[0].message.content)

# 使用自动路由
response = client.chat.completions.create(
    model="auto",  # 自动选择最佳渠道
    messages=[{"role": "user", "content": "你好"}],
    stream=True
)
for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")
```

---

## 🗂️ 项目结构

```
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── v1/chat/completions    # 核心中转接口
│   │   ├── admin/               # 管理后台 API
│   │   └── key/                 # 密钥管理 API
│   ├── dashboard/         # 管理后台页面
│   └── page.tsx           # 首页
├── components/            # React 组件
├── lib/                   # 工具函数/服务
│   ├── db.ts             # 数据库封装
│   ├── usage.ts          # 用量统计
│   └── auth.ts           # 认证逻辑
├── types/                 # TypeScript 类型定义
├── public/                # 静态资源
└── config/                # 配置文件
```

---

## 🧪 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 代码检查
npm run lint

# 类型检查
npx tsc --noEmit
```

---

## 🐳 Docker 部署

### 单机部署

```bash
docker compose up -d
```

### 多副本部署（配合负载均衡）

```yaml
# docker-compose.yml
services:
  ai-router:
    build: .
    deploy:
      replicas: 3
    environment:
      - DATABASE_TYPE=postgres
      - DATABASE_URL=postgresql://... 
```

---

## 🔐 安全建议

1. **强密码**：使用高强度 `ADMIN_PASSWORD` 和 `JWT_SECRET`
2. **HTTPS**：生产环境必须启用 HTTPS
3. **密钥加密**：设置 `ENCRYPTION_KEY` 保护存储的 API Key
4. **网络隔离**：不要将数据库端口暴露到公网
5. **定期备份**：备份 `data/` 目录（SQLite）或配置自动备份（PostgreSQL）

---

## 📊 监控

访问 `/metrics` 端点获取 Prometheus 格式指标：

```
ai_router_requests_total{model="deepseek-v4",status="success"} 1234
ai_router_tokens_total{type="prompt"} 56789
ai_router_latency_seconds{model="deepseek-v4",quantile="0.99"} 1.234
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

- [Bug 报告](.github/ISSUE_TEMPLATE/bug_report.yml)
- [功能请求](.github/ISSUE_TEMPLATE/feature_request.yml)
- [贡献指南](CONTRIBUTING.md)

---

## 📄 License

[MIT](LICENSE) © AI Router Contributors

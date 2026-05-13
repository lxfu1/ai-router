# 安全政策

## 支持的版本

| 版本 | 支持状态 |
|------|----------|
| 1.x  | ✅ 积极维护 |
| <1.0 | ❌ 不再支持 |

## 报告安全漏洞

我们非常重视安全问题。如果你发现了安全漏洞，请通过以下方式私下报告：

**不要**在公开的 Issue 或 Discussion 中报告安全问题。

### 报告方式

1. **GitHub Security Advisory**: [创建私人安全报告](https://github.com/lxfu1/ai-router/security/advisories/new)
2. **邮件**: 发送邮件至仓库维护者（如公开邮箱）

### 报告内容

请尽量包含以下信息：

- 漏洞的描述和影响
- 复现步骤（如有 PoC 请一并提供）
- 受影响的版本
- 建议的修复方案（如有）

### 响应时间

- **确认**: 我们会在 48 小时内确认收到报告
- **评估**: 7 天内完成初步评估
- **修复**: 严重漏洞将在 30 天内修复，并发布安全更新
- **致谢**: 修复后会在发布说明中致谢报告者（如你愿意公开）

## 安全最佳实践

### 部署时

1. **强密码**: 设置高强度的 `ADMIN_PASSWORD` 和 `JWT_SECRET`
2. **加密密钥**: 使用 `openssl rand -hex 32` 生成 `ENCRYPTION_KEY`
3. **网络隔离**: 不要将数据库端口暴露在公网
4. **HTTPS**: 生产环境必须使用 HTTPS
5. **定期轮换**: 定期更换 API Key 和密钥

### 配置检查清单

```bash
# 部署前运行此检查
echo "检查环境变量安全性..."

# 确保不是默认密码
if [ "$ADMIN_PASSWORD" = "your-strong-admin-password" ]; then
  echo "❌ 请修改默认管理员密码"
  exit 1
fi

# 确 JWT_SECRET 足够长
if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "❌ JWT_SECRET 至少需要 32 个字符"
  exit 1
fi

echo "✅ 基础检查通过"
```

### 依赖安全

```bash
# 定期检查依赖漏洞
npm audit

# 自动修复
npm audit fix

# 检查生产依赖许可证
npx license-checker --production --onlyAllow 'MIT;Apache-2.0;BSD*;ISC'
```

## 已知安全注意事项

### API Key 管理

- 本项目存储的 API Key 使用 AES-256-GCM 加密
- 密钥明文只存在于内存中，不写入日志
- 建议为不同用户/场景创建独立的 API Key

### 上游 API 安全

- 本项目本身不存储用户对话内容
- 所有请求直接转发到配置的上游 API
- 请确保你信任配置的上游服务提供商

### 日志安全

- 日志中会自动脱敏敏感信息（如 API Key）
- 建议配置日志保留策略，避免长期存储敏感操作日志

## 安全更新通知

关注以下渠道获取安全更新：

- Watch 本仓库的 Release
- 关注 [GitHub Security Advisories](https://github.com/lxfu1/ai-router/security/advisories)

---

感谢所有帮助改进 ai-router 安全的贡献者！
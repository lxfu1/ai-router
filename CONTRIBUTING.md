# 贡献指南

感谢您对 AI Router 的兴趣！

## 如何贡献

1. **Fork** 本仓库
2. **创建分支** - `git checkout -b feature/your-feature`
3. **提交更改** - `git commit -m 'feat: add some feature'`
4. **推送分支** - `git push origin feature/your-feature`
5. **提交 PR** - 创建 Pull Request

## 代码规范

- 使用 TypeScript 严格模式
- 函数和变量使用 camelCase
- 组件和类型使用 PascalCase
- 常量使用 UPPER_SNAKE_CASE

## 提交信息格式

```
类型(范围): 简短描述

详细说明（可选）
```

**类型：**
- `feat` - 新功能
- `fix` - 修复 bug
- `docs` - 文档更新
- `refactor` - 代码重构
- `test` - 测试相关
- `chore` - 构建/工具

## 开发环境

```bash
# 安装依赖
npm install

# 配置环境
cp .env.example .env.local

# 开发模式
npm run dev
```

## 报告问题

提交 Issue 时请包含：
- 问题描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息（Node 版本、操作系统）

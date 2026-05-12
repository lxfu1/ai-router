FROM node:20-alpine AS base

# 安装 SQLite 依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动
CMD ["npm", "start"]

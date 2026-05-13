const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pg', 'pg-native'],
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),
  
  // 启用 React Strict Mode
  reactStrictMode: false, // 暂时关闭，避免 StrictMode 双重渲染导致 hydration 问题
  
  // 实验性功能优化
  experimental: {
    optimizePackageImports: ['@antv/g2'],
  },
  
  // 图片优化配置
  images: {
    unoptimized: true,
  },
  
  // 编译器优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['warn', 'error'] }  // 生产环境保留 warn 和 error
      : false,
  },
}

module.exports = nextConfig

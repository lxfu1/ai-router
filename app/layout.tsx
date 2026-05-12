import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Router - 智能模型中转站',
  description: '兼容 OpenAI API 的多模型智能路由中转站',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
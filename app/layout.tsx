import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Router - 智能模型中转站',
  description: '兼容 OpenAI API 的多模型智能路由中转站',
  icons: {
    icon: '/favicon.svg?v=2',
    shortcut: '/favicon.svg?v=2',
    apple: '/apple-touch-icon.svg?v=2',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#667eea' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 预连接到 API 端点 */}
        <link rel="preconnect" href="/api" crossOrigin="anonymous" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">跳到主内容</a>
        {children}
      </body>
    </html>
  )
}

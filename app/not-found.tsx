'use client'

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <h1 style={{ fontSize: 48, fontWeight: 800, color: '#4f46e5' }}>404</h1>
      <p style={{ color: '#9ca3be', fontSize: 16 }}>页面不存在</p>
      <a href="/" style={{ color: '#4f46e5', fontSize: 14, fontWeight: 600 }}>返回首页</a>
    </div>
  )
}
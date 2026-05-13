'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: '#4f46e5' }}>出错了</h1>
      <p style={{ color: '#9ca3be', fontSize: 16 }}>{error.message || '发生了未知错误'}</p>
      <button onClick={reset} style={{ color: '#4f46e5', fontSize: 14, fontWeight: 600, background: 'none', border: '1px solid #e4e6ed', padding: '8px 20px', borderRadius: 6, cursor: 'pointer' }}>重试</button>
    </div>
  )
}
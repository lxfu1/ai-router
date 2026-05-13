'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.replace('/')
      return
    }
    // 验证 token 有效性
    fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      if (res.status === 401) {
        localStorage.removeItem('admin_token')
        router.replace('/')
      } else {
        setReady(true)
      }
    })
  }, [router])

  if (!ready) {
    return (
      <div 
        suppressHydrationWarning
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
          background: 'var(--bg)',
        }}
      >
        <div
          suppressHydrationWarning
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(79, 70, 229, 0.1)',
            borderTopColor: '#4f46e5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <p suppressHydrationWarning style={{ color: 'var(--text-muted)', fontSize: '14px' }}>加载中...</p>
      </div>
    )
  }

  return <>{children}</>
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.replace('/login')
      return
    }
    fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      if (res.ok) {
        setAuthed(true)
      } else {
        localStorage.removeItem('admin_token')
        router.replace('/login')
      }
    }).catch(() => {
      localStorage.removeItem('admin_token')
      router.replace('/login')
    }).finally(() => {
      setLoading(false)
    })
  }, [router])

  if (loading || !authed) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
    </div>
  }

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}
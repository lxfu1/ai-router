'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (res.ok && data.token) {
        localStorage.setItem('admin_token', data.token)
        router.push('/dashboard')
      } else {
        setError(data.error || '登录失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-row">
          <div className="login-logo-icon">R</div>
        </div>
        <h1>AI Router</h1>
        <p className="login-subtitle">管理后台登录</p>
        <form onSubmit={handleLogin}>
          <input
            className="form-input"
            type="password"
            placeholder="请输入管理员密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
      </div>
    </div>
  )
}
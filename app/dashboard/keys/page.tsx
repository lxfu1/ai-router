'use client'

import { useEffect, useState } from 'react'

interface ApiKey {
  id: number
  key_value: string
  name: string
  balance: number
  used_balance: number
  enabled: number
  created_at: string
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBalance, setNewBalance] = useState('100')
  const [copied, setCopied] = useState<string | null>(null)
  const [newlyCreated, setNewlyCreated] = useState<ApiKey | null>(null)

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json',
  })

  const load = () => {
    fetch('/api/admin/keys', { headers: headers() })
      .then(r => r.json())
      .then(d => setKeys(d.keys || []))
  }

  useEffect(() => { load() }, [])

  const createKey = async () => {
    if (!newName.trim()) return
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: newName, balance: parseFloat(newBalance) || 100 }),
    })
    const data = await res.json()
    if (data.key) {
      setNewlyCreated(data.key)
      setShowCreate(false)
      setNewName('')
      setNewBalance('100')
      load()
    }
  }

  const toggleKey = async (key: ApiKey) => {
    await fetch('/api/admin/keys', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ id: key.id, action: 'toggle' }),
    })
    load()
  }

  const deleteKey = async (id: number) => {
    if (!confirm('确定要删除此 Key 吗？此操作不可恢复。')) return
    await fetch('/api/admin/keys', {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ id }),
    })
    load()
  }

  const copyKey = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(value)
    setTimeout(() => setCopied(null), 2000)
  }

  const maskKey = (key: string) => key.slice(0, 12) + '...' + key.slice(-4)

  const usagePercent = (key: ApiKey) => key.balance > 0 ? ((key.used_balance / key.balance) * 100).toFixed(1) : '0.0'

  const getBarClass = (key: ApiKey) => {
    const pct = parseFloat(usagePercent(key))
    if (pct > 80) return 'danger'
    if (pct > 50) return 'warning'
    return ''
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1>Key 管理</h1>
          <p>创建和管理 API 访问密钥</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ 创建 Key</button>
      </div>

      {newlyCreated && (
        <div className="key-created-banner">
          <div style={{ flex: 1 }}>
            <p>Key 创建成功！请立即复制，此 Key 只会显示一次：</p>
            <div className="key-value">{newlyCreated.key_value}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-sm btn-primary" onClick={() => copyKey(newlyCreated.key_value)}>
              {copied === newlyCreated.key_value ? '已复制' : '复制'}
            </button>
            <button className="btn btn-sm" onClick={() => setNewlyCreated(null)}>关闭</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>Key</th>
                <th>余额</th>
                <th>已用</th>
                <th>用量</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <tr key={key.id}>
                  <td style={{ fontWeight: 600 }}>{key.name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="key-display">{maskKey(key.key_value)}</span>
                      <button className="btn btn-sm btn-ghost" onClick={() => copyKey(key.key_value)} style={{ padding: '2px 5px', fontSize: 11 }}>
                        {copied === key.key_value ? '✓' : '复制'}
                      </button>
                    </div>
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>¥{key.balance.toFixed(2)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>¥{key.used_balance.toFixed(4)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="usage-bar-track">
                        <div className={`usage-bar-fill ${getBarClass(key)}`} style={{ width: `${Math.min(parseFloat(usagePercent(key)), 100)}%` }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>{usagePercent(key)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${key.enabled ? 'badge-success' : 'badge-danger'}`}>
                      {key.enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{key.created_at}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className={`btn btn-sm ${key.enabled ? '' : 'btn-success'}`} onClick={() => toggleKey(key)}>
                        {key.enabled ? '禁用' : '启用'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteKey(key.id)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48, fontSize: 14 }}>暂无 API Key，点击上方按钮创建</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>创建 API Key</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowCreate(false)}>关闭</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Key 名称</label>
                <input className="form-input" placeholder="如：生产环境 Key" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>余额上限（元）</label>
                <input className="form-input" type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowCreate(false)}>取消</button>
              <button className="btn btn-primary" onClick={createKey}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
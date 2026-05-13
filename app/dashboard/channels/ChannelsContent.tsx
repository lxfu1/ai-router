'use client'

import { useState } from 'react'
import { useChannels, clearCache } from '@/lib/swr'

interface Channel {
  id: number
  name: string
  provider: string
  base_url: string
  api_key: string
  model_name: string
  enabled: number
  priority: number
  rate_multiplier: number
  max_tokens: number
  healthy: number
  latency_ms: number | null
  last_check_at: string | null
}

const emptyChannel = {
  name: '',
  provider: 'deepseek',
  base_url: '',
  api_key: '',
  model_name: '',
  rate_multiplier: 1.0,
  priority: 0,
  max_tokens: 4096,
}

const getToken = () => localStorage.getItem('admin_token')

export default function ChannelsContent() {
  const { data: channels = [], isLoading, error } = useChannels()
  const [checking, setChecking] = useState(false)
  const [editing, setEditing] = useState<Channel | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newChannel, setNewChannel] = useState(emptyChannel)

  const refresh = () => {
    clearCache()
    window.location.reload()
  }

  const checkHealth = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/admin/health', { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (data.channels) refresh()
    } finally {
      setChecking(false)
    }
  }

  const toggleChannel = async (ch: Channel) => {
    await fetch('/api/admin/channels', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: ch.id, enabled: ch.enabled ? 0 : 1 }),
    })
    refresh()
  }

  const saveChannel = async () => {
    if (!editing) return
    await fetch('/api/admin/channels', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editing),
    })
    setEditing(null)
    refresh()
  }

  const createChannel = async () => {
    if (!newChannel.name || !newChannel.base_url || !newChannel.api_key || !newChannel.model_name) return
    await fetch('/api/admin/channels', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newChannel),
    })
    setShowCreate(false)
    setNewChannel(emptyChannel)
    refresh()
  }

  const maskKey = (key: string) => key ? key.slice(0, 6) + '***' + key.slice(-4) : '-'

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1>渠道管理</h1>
          <p>配置和管理上游模型渠道</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ 添加渠道</button>
          <button className="btn" onClick={checkHealth} disabled={checking}>
            {checking ? '检测中...' : '健康检测'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>加载中...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--danger)' }}>加载失败，请刷新重试</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>渠道</th>
                  <th>供应商</th>
                  <th>模型</th>
                  <th>Base URL</th>
                  <th>API Key</th>
                  <th>状态</th>
                  <th>延迟</th>
                  <th>倍率</th>
                  <th>优先级</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch: Channel) => (
                  <tr key={ch.id}>
                    <td style={{ fontWeight: 600 }}>{ch.name}</td>
                    <td><span className="badge badge-primary">{ch.provider}</span></td>
                    <td><span className="key-display">{ch.model_name}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {ch.base_url}
                    </td>
                    <td><span className="key-display">{maskKey(ch.api_key)}</span></td>
                    <td>
                      <span className={`badge ${ch.healthy ? 'badge-success' : 'badge-danger'}`}>
                        <span className={`health-dot ${ch.healthy ? 'healthy' : 'unhealthy'}`} />
                        {ch.healthy ? '正常' : '异常'}
                      </span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{ch.latency_ms ? `${ch.latency_ms}ms` : '-'}</td>
                    <td>x{ch.rate_multiplier}</td>
                    <td>{ch.priority}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className={`btn btn-sm ${ch.enabled ? '' : 'btn-success'}`} onClick={() => toggleChannel(ch)}>
                          {ch.enabled ? '禁用' : '启用'}
                        </button>
                        <button className="btn btn-sm" onClick={() => setEditing({ ...ch })}>
                          编辑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {channels.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48, fontSize: 14 }}>暂无渠道，点击上方按钮添加</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>添加渠道</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowCreate(false)}>关闭</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>渠道名称</label>
                <input className="form-input" placeholder="如：DeepSeek V4" value={newChannel.name} onChange={e => setNewChannel({ ...newChannel, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>供应商</label>
                <select className="form-input" value={newChannel.provider} onChange={e => setNewChannel({ ...newChannel, provider: e.target.value })}>
                  <option value="deepseek">DeepSeek</option>
                  <option value="zhipu">智谱</option>
                  <option value="qwen">通义千问</option>
                  <option value="minimax">MiniMax</option>
                  <option value="openai">OpenAI</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div className="form-group">
                <label>Base URL</label>
                <input className="form-input" placeholder="https://api.example.com/v1" value={newChannel.base_url} onChange={e => setNewChannel({ ...newChannel, base_url: e.target.value })} />
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input className="form-input" type="password" placeholder="sk-xxx" value={newChannel.api_key} onChange={e => setNewChannel({ ...newChannel, api_key: e.target.value })} />
              </div>
              <div className="form-group">
                <label>模型名称</label>
                <input className="form-input" placeholder="如：deepseek-v4-pro" value={newChannel.model_name} onChange={e => setNewChannel({ ...newChannel, model_name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>计费倍率</label>
                  <input className="form-input" type="number" step="0.1" value={newChannel.rate_multiplier} onChange={e => setNewChannel({ ...newChannel, rate_multiplier: parseFloat(e.target.value) || 1.0 })} />
                </div>
                <div className="form-group">
                  <label>优先级</label>
                  <input className="form-input" type="number" value={newChannel.priority} onChange={e => setNewChannel({ ...newChannel, priority: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>最大 Tokens</label>
                  <input className="form-input" type="number" value={newChannel.max_tokens} onChange={e => setNewChannel({ ...newChannel, max_tokens: parseInt(e.target.value) || 4096 })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowCreate(false)}>取消</button>
              <button className="btn btn-primary" onClick={createChannel}>创建</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>编辑渠道 — {editing.name}</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>关闭</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>渠道名称</label>
                <input className="form-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Base URL</label>
                <input className="form-input" value={editing.base_url} onChange={e => setEditing({ ...editing, base_url: e.target.value })} />
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input className="form-input" type="password" value={editing.api_key} onChange={e => setEditing({ ...editing, api_key: e.target.value })} />
              </div>
              <div className="form-group">
                <label>模型名称</label>
                <input className="form-input" value={editing.model_name} onChange={e => setEditing({ ...editing, model_name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>计费倍率</label>
                  <input className="form-input" type="number" step="0.1" value={editing.rate_multiplier} onChange={e => setEditing({ ...editing, rate_multiplier: parseFloat(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>优先级</label>
                  <input className="form-input" type="number" value={editing.priority} onChange={e => setEditing({ ...editing, priority: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setEditing(null)}>取消</button>
              <button className="btn btn-primary" onClick={saveChannel}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

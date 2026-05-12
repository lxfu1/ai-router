'use client'

import { useEffect, useState, useRef } from 'react'

interface Stats {
  totalRequests: number
  todayRequests: number
  totalTokens: number
  totalCost: number
  totalKeys: number
  activeKeys: number
  errorRate: number
  modelStats: { model: string; count: number; tokens: number; cost: number; avg_latency: number }[]
  dailyStats: { date: string; count: number; tokens: number; cost: number }[]
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function formatCost(n: number): string {
  return '¥' + n.toFixed(4)
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [channels, setChannels] = useState<any[]>([])
  const chartRef1 = useRef<HTMLDivElement>(null)
  const chartRef2 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const headers = { Authorization: `Bearer ${token}` }

    fetch('/api/admin/stats', { headers }).then(r => r.json()).then(setStats)
    fetch('/api/admin/channels', { headers }).then(r => r.json()).then(d => setChannels(d.channels || []))
  }, [])

  useEffect(() => {
    if (!stats || !chartRef1.current || !chartRef2.current) return

    import('@antv/g2').then(({ Chart }) => {
      if (chartRef1.current && stats.dailyStats.length > 0) {
        chartRef1.current.innerHTML = ''
        const chart1 = new Chart({
          container: chartRef1.current,
          autoFit: true,
          height: 260,
        })
        chart1.area()
          .data(stats.dailyStats)
          .encode('x', 'date')
          .encode('y', 'count')
          .style('fill', 'linear-gradient(-90deg, #4f46e5 0%, rgba(79,70,229,0.05) 100%)')
          .style('fillOpacity', 0.15)
        chart1.line()
          .data(stats.dailyStats)
          .encode('x', 'date')
          .encode('y', 'count')
          .style('stroke', '#4f46e5')
          .style('lineWidth', 2.5)
          .style('strokeLinecap', 'round')
          .axis('x', { labelAutoRotate: false })
          .axis('y', { title: '请求数', titleFontSize: 11 })
        chart1.render()
      }

      if (chartRef2.current && stats.modelStats.length > 0) {
        chartRef2.current.innerHTML = ''
        const chart2 = new Chart({
          container: chartRef2.current,
          autoFit: true,
          height: 260,
        })
        chart2.interval()
          .data(stats.modelStats)
          .encode('x', 'model')
          .encode('y', 'count')
          .encode('color', 'model')
          .scale('color', { range: ['#4f46e5', '#06b6d4', '#f59e0b', '#10b981'] })
          .style('radius', 6)
          .style('maxWidth', 48)
          .axis('y', { title: '请求数', titleFontSize: 11 })
        chart2.render()
      }
    })
  }, [stats])

  if (!stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1>仪表盘</h1>
        <p>系统运行概览与关键指标</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">总请求数</div>
          <div className="value">{formatNumber(stats.totalRequests)}</div>
          <div className="trend">今日 +{stats.todayRequests}</div>
        </div>
        <div className="stat-card">
          <div className="label">Token 消耗</div>
          <div className="value">{formatNumber(stats.totalTokens)}</div>
        </div>
        <div className="stat-card">
          <div className="label">总费用</div>
          <div className="value">{formatCost(stats.totalCost)}</div>
        </div>
        <div className="stat-card">
          <div className="label">API Keys</div>
          <div className="value">{stats.activeKeys}/{stats.totalKeys}</div>
          <div className="trend" style={{ color: 'var(--text-muted)' }}>活跃 / 总计</div>
        </div>
        <div className="stat-card">
          <div className="label">错误率</div>
          <div className="value" style={{ color: stats.errorRate > 0.05 ? 'var(--danger)' : 'var(--text)' }}>
            {(stats.errorRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><h2>请求趋势（近30天）</h2></div>
          <div className="card-body">
            <div ref={chartRef1} className="chart-container" />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>模型分布</h2></div>
          <div className="card-body">
            <div ref={chartRef2} className="chart-container" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2>渠道状态</h2></div>
        <div className="card-body" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>渠道</th>
                <th>模型</th>
                <th>状态</th>
                <th>延迟</th>
                <th>倍率</th>
              </tr>
            </thead>
            <tbody>
              {channels.map(ch => (
                <tr key={ch.id}>
                  <td style={{ fontWeight: 600 }}>{ch.name}</td>
                  <td><span className="key-display">{ch.model_name}</span></td>
                  <td>
                    <span className={`badge ${ch.healthy ? 'badge-success' : 'badge-danger'}`}>
                      <span className={`health-dot ${ch.healthy ? 'healthy' : 'unhealthy'}`} />
                      {ch.healthy ? '正常' : '异常'}
                    </span>
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{ch.latency_ms ? `${ch.latency_ms}ms` : '-'}</td>
                  <td>x{ch.rate_multiplier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
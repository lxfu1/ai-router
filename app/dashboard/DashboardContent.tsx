'use client'

import { useEffect, useRef, useState } from 'react'
import { useDashboardStats, useChannels } from '@/lib/swr'

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

function StatsGrid({ stats, isLoading }: { stats: Stats | undefined; isLoading: boolean }) {
  if (isLoading || !stats) {
    return (
      <div className="stats-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="stat-card">
            <div className="label">加载中...</div>
            <div className="value">-</div>
          </div>
        ))}
      </div>
    )
  }

  return (
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
  )
}

function ChartSkeleton() {
  return (
    <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', borderRadius: 8, background: 'var(--bg-inset)' }}>
      图表加载中...
    </div>
  )
}

function ChartsSection({ stats }: { stats: Stats | undefined }) {
  const chartRef1 = useRef<HTMLDivElement>(null)
  const chartRef2 = useRef<HTMLDivElement>(null)
  const chartInstances = useRef<{ chart1: any; chart2: any }>({ chart1: null, chart2: null })
  const [chartsLoaded, setChartsLoaded] = useState(false)

  useEffect(() => {
    if (!stats) return
    if (!chartRef1.current || !chartRef2.current) return

    let destroyed = false

    // Destroy previous chart instances before re-rendering
    if (chartInstances.current.chart1) {
      chartInstances.current.chart1.destroy()
      chartInstances.current.chart1 = null
    }
    if (chartInstances.current.chart2) {
      chartInstances.current.chart2.destroy()
      chartInstances.current.chart2 = null
    }

    import('@antv/g2').then(({ Chart }) => {
      if (destroyed) return

      if (chartRef1.current && stats.dailyStats?.length > 0) {
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
        chartInstances.current.chart1 = chart1
      }

      if (chartRef2.current && stats.modelStats?.length > 0) {
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
        chartInstances.current.chart2 = chart2
      }

      setChartsLoaded(true)
    })

    return () => {
      destroyed = true
      if (chartInstances.current.chart1) {
        chartInstances.current.chart1.destroy()
        chartInstances.current.chart1 = null
      }
      if (chartInstances.current.chart2) {
        chartInstances.current.chart2.destroy()
        chartInstances.current.chart2 = null
      }
    }
  }, [stats])

  return (
    <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
      <div className="card">
        <div className="card-header"><h2>请求趋势（近30天）</h2></div>
        <div className="card-body">
          {!chartsLoaded && <ChartSkeleton />}
          <div ref={chartRef1} className="chart-container" />
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h2>模型分布</h2></div>
        <div className="card-body">
          {!chartsLoaded && <ChartSkeleton />}
          <div ref={chartRef2} className="chart-container" />
        </div>
      </div>
    </div>
  )
}

function ChannelsTable({ channels }: { channels: any[] }) {
  if (channels.length === 0) {
    return (
      <div className="card">
        <div className="card-header"><h2>渠道状态</h2></div>
        <div className="card-body" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          暂无渠道配置
        </div>
      </div>
    )
  }

  return (
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
            {channels.map((ch: any) => (
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
  )
}

export default function DashboardContent() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: channels = [] } = useChannels()

  return (
    <div>
      <div className="page-header">
        <h1>仪表盘</h1>
        <p>系统运行概览与关键指标</p>
      </div>

      <StatsGrid stats={stats} isLoading={statsLoading} />
      <ChartsSection stats={stats} />
      <ChannelsTable channels={channels} />
    </div>
  )
}

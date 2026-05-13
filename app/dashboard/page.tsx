'use client'

import dynamic from 'next/dynamic'

// 完全禁用 SSR，动态加载组件
const DashboardContent = dynamic(() => import('./DashboardContent'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  ),
})

export default function DashboardPage() {
  return <DashboardContent />
}

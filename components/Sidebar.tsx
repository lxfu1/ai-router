'use client'

import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: '仪表盘', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
  )},
  { href: '/dashboard/channels', label: '渠道管理', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
  )},
  { href: '/dashboard/keys', label: 'Key 管理', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
  )},
  { href: '/dashboard/logs', label: '调用日志', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  )},
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}>
        <div className="sidebar-logo-icon">R</div>
        <div className="sidebar-logo-text">
          <h1>AI Router</h1>
          <p>智能模型中转站</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">导航</div>
        {navItems.map(item => (
          <button
            key={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
            onClick={() => router.push(item.href)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={() => { localStorage.removeItem('admin_token'); router.push('/login') }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          退出登录
        </button>
        <div className="sidebar-footer-text">AI Router v1.0</div>
      </div>
    </aside>
  )
}
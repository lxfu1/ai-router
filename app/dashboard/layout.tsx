'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'

// 标记为动态渲染，避免 SSR
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) closeSidebar()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen, closeSidebar])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="admin-layout">
      {/* Mobile top bar */}
      <div className="mobile-top-bar">
        <button
          className="mobile-menu-btn"
          onClick={openSidebar}
          aria-label="打开菜单"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="28" height="28">
            <defs>
              <linearGradient id="mobile-m" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea"/>
                <stop offset="100%" stopColor="#764ba2"/>
              </linearGradient>
              <linearGradient id="mobile-a" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4facfe"/>
                <stop offset="100%" stopColor="#00f2fe"/>
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="20" fill="url(#mobile-m)"/>
            <circle cx="50" cy="50" r="15" fill="white"/>
            <circle cx="50" cy="50" r="8" fill="url(#mobile-a)"/>
            <circle cx="50" cy="22" r="5" fill="white"/>
            <circle cx="26" cy="70" r="5" fill="white"/>
            <circle cx="74" cy="70" r="5" fill="white"/>
            <path d="M50 35 L50 27 M38 58 L30 67 M62 58 L70 67" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span className="mobile-logo-text">AI Router</span>
        </div>
      </div>

      {/* Sidebar overlay (mobile) */}
      <div
        className={`mobile-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <Sidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />
      <main className="main-content" id="main-content">{children}</main>
    </div>
  )
}

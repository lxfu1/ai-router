'use client'

import dynamic from 'next/dynamic'

const KeysContent = dynamic(() => import('./KeysContent'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  ),
})

export default function KeysPage() {
  return <KeysContent />
}

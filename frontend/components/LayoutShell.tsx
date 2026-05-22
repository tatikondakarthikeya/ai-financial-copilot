'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const AUTH_PAGES = ['/login', '/register', '/landing']

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = AUTH_PAGES.includes(pathname)

  if (isAuthPage) {
    return <main className="flex-1 min-h-screen">{children}</main>
  }

  return (
    <>
      <Sidebar />
      <main className="lg:ml-72 flex-1 min-h-screen p-4 pt-20 lg:pt-8 lg:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </>
  )
}

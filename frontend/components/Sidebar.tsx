'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  History,
  LineChart,
  Repeat,
  MessageSquare,
  LogOut,
  Settings,
  Bell,
  Target,
  Moon,
  Sun
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'History', href: '/history', icon: History },
    { label: 'Analytics', href: '/analytics', icon: LineChart },
    { label: 'Subscriptions', href: '/subscriptions', icon: Repeat },
    { label: 'Budgets', href: '/budgets', icon: Target },
    { label: 'AI Chat', href: '/ai-chat', icon: MessageSquare },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <div className="w-72 h-screen bg-white border-r border-slate-100 flex flex-col p-6 fixed left-0 top-0 z-40">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
          F
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-none">Financial AI</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Copilot</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600 transition-colors'} />
              <span className="font-semibold text-[15px]">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="pt-6 border-t border-slate-50 space-y-2">
        <button onClick={toggleDark} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all font-semibold text-[15px]">
          {dark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-400" />}
          <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all font-semibold text-[15px]"
        >
          <LogOut size={20} className="text-slate-400 group-hover:text-red-600" />
          <span>Logout</span>
        </button>
      </div>

      <div className="mt-8 bg-indigo-50 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center overflow-hidden">
          <img src="https://ui-avatars.com/api/?name=User&background=6366f1&color=fff" alt="Avatar" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-bold text-slate-900 truncate">Karthikeya</p>
          <p className="text-[11px] text-indigo-600 font-semibold uppercase tracking-tight">Premium Plan</p>
        </div>
      </div>
    </div>
  )
}

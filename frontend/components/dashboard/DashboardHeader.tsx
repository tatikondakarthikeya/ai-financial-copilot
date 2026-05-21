'use client'

import { Search, Bell, Menu } from 'lucide-react'

export default function DashboardHeader({ title = "Dashboard", onSyncSuccess }: { title?: string, onSyncSuccess?: () => void }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">{title}</h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Welcome back!</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden lg:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-12 pr-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 w-64 font-bold text-xs"
          />
        </div>

        <button className="relative w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm hover:text-indigo-600 transition-all">
          <Bell size={20} />
          <span className="absolute top-3 right-3 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
        </button>

        <button className="md:hidden w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
          <Menu size={20} />
        </button>
      </div>
    </div>
  )
}

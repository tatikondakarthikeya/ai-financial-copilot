'use client'

import { Sparkles, ArrowRight } from 'lucide-react'

export default function AIInsightCard({ insight }: { insight: string }) {
  if (!insight) return null

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 flex gap-6 items-center group cursor-pointer hover:border-indigo-200 transition-all">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
        <Sparkles size={32} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">Copilot Insight</span>
        </div>
        <p className="text-slate-700 font-semibold leading-relaxed text-lg italic">
          "{insight}"
        </p>
      </div>
      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
        <ArrowRight size={20} />
      </div>
    </div>
  )
}

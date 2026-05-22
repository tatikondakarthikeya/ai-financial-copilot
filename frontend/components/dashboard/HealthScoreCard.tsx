'use client'

import { useState, useEffect } from 'react'
import { analyticsApi } from '@/lib/api'
import { Heart } from 'lucide-react'

const COLORS: Record<string, string> = {
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  red: '#ef4444',
}

export default function HealthScoreCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    analyticsApi.getHealthScore()
      .then(res => setData(res.data))
      .catch(() => {})
  }, [])

  if (!data) return null

  const { score, grade, color, breakdown } = data
  const strokeColor = COLORS[color] || '#6366f1'
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
      <div className="flex items-center gap-3 mb-6">
        <Heart size={20} className="text-indigo-600" />
        <h3 className="text-lg font-bold text-slate-900">Financial Health</h3>
      </div>

      {/* Score Ring */}
      <div className="flex items-center gap-8">
        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#f1f5f9" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={strokeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-900">{score}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{grade}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-2">
          {Object.entries(breakdown).map(([key, val]: [string, any]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500 capitalize">{key}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(val.score / val.max) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-slate-700 w-8 text-right">{val.score}/{val.max}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

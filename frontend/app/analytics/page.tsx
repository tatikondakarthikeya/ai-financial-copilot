'use client'

import { useState, useEffect } from 'react'
import { analyticsApi } from '@/lib/api'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown'
import SpendingTrend from '@/components/dashboard/SpendingTrend'
import { Award, Zap, TrendingUp, TrendingDown } from 'lucide-react'

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await analyticsApi.getSummary()
      setSummary(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  const categoryChartData = summary?.category_breakdown
    ? Object.entries(summary.category_breakdown).map(([name, value]) => ({ name, value: value as number }))
    : []

  const sorted = [...categoryChartData].sort((a, b) => b.value - a.value)
  const highestCategory = sorted[0]
  const dailyAvg = summary?.total_spending ? Math.round(summary.total_spending / new Date().getDate()) : 0

  return (
    <div className="space-y-10 pb-20">
      <DashboardHeader title="Analytics" />

      {/* Time Range Selector */}
      <div className="flex gap-2 p-1.5 bg-white border border-slate-100 rounded-2xl w-fit shadow-sm">
        {['This Week', 'This Month', 'This Year'].map((tab) => (
          <button key={tab} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'This Month' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Insight Card */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row gap-8 items-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-inner">
          <Award size={40} />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-2">Financial Copilot Insight</h4>
          <p className="text-xl font-bold text-slate-900 leading-snug">
            {summary?.change_percentage !== null && summary?.change_percentage !== undefined ? (
              summary.change_percentage > 0
                ? <>You are spending <span className="text-red-500">{summary.change_percentage.toFixed(1)}% more</span> than last month.</>
                : <>You are spending <span className="text-green-500">{Math.abs(summary.change_percentage).toFixed(1)}% less</span> than last month.</>
            ) : (
              'Add more transactions to see spending trends!'
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-10">
          <SpendingTrend data={summary?.daily_trend || []} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 font-bold">
                <Zap size={24} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Highest Category</p>
              <h5 className="text-xl font-black text-slate-900 mb-2">{highestCategory?.name || 'N/A'}</h5>
              <p className="text-sm text-slate-400 font-bold">
                ₹{(highestCategory?.value || 0).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 font-bold text-lg">
                ₹
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Average Daily</p>
              <h5 className="text-xl font-black text-slate-900 mb-2">₹{dailyAvg.toLocaleString('en-IN')}</h5>
              <p className="text-sm text-slate-400 font-bold">
                This month
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <CategoryBreakdown data={categoryChartData} />

          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-900">Category Spending</h3>
            </div>
            <div className="space-y-8">
              {sorted.slice(0, 5).map((item) => {
                const maxVal = sorted[0]?.value || 1
                return (
                  <div key={item.name}>
                    <div className="flex justify-between items-center mb-3 text-sm">
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className="text-slate-400 font-bold">₹{item.value.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${(item.value / maxVal) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

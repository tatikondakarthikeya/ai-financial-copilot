'use client'

import { useState, useEffect } from 'react'
import { analyticsApi } from '@/lib/api'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown'
import SpendingTrend from '@/components/dashboard/SpendingTrend'
import { Award, Zap, TrendingUp, TrendingDown, Calendar, Target, BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null)
  const [predictions, setPredictions] = useState<any>(null)
  const [digest, setDigest] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsApi.getSummary().catch(() => null),
      analyticsApi.getPredictions().catch(() => null),
      analyticsApi.getWeeklyDigest().catch(() => null),
    ]).then(([sum, pred, dig]) => {
      setSummary(sum?.data ?? null)
      setPredictions(pred?.data ?? null)
      setDigest(dig?.data ?? null)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const categoryChartData = summary?.category_breakdown
    ? Object.entries(summary.category_breakdown).map(([name, value]) => ({ name, value: value as number }))
    : []

  const sorted = [...categoryChartData].sort((a, b) => b.value - a.value)
  const highestCategory = sorted[0]

  return (
    <div className="space-y-10 pb-20">
      <DashboardHeader title="Analytics" />

      {/* Spending Prediction Card */}
      {predictions && (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-indigo-200" />
              <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs">Month-End Prediction</p>
            </div>
            <div className="flex flex-col md:flex-row md:items-end gap-6 mb-6">
              <div>
                <p className="text-indigo-200 text-sm font-medium mb-1">Spent so far ({predictions.days_passed} days)</p>
                <h3 className="text-4xl font-black">₹{predictions.spent_so_far.toLocaleString('en-IN')}</h3>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl">
                <TrendingUp size={16} />
                <span className="font-bold">Predicted: ₹{predictions.predicted_total.toLocaleString('en-IN')}</span>
              </div>
              {predictions.vs_last_month !== null && (
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${
                  predictions.vs_last_month > 0 ? 'bg-red-500/20 text-red-100' : 'bg-emerald-500/20 text-emerald-100'
                }`}>
                  {predictions.vs_last_month > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  ₹{Math.abs(predictions.vs_last_month).toLocaleString('en-IN')} {predictions.vs_last_month > 0 ? 'more' : 'less'} than last month
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-indigo-200 text-xs font-bold uppercase">Daily Rate</p>
                <p className="text-xl font-black mt-1">₹{predictions.daily_rate.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-indigo-200 text-xs font-bold uppercase">Days Left</p>
                <p className="text-xl font-black mt-1">{predictions.days_remaining}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-indigo-200 text-xs font-bold uppercase">Still to Spend</p>
                <p className="text-xl font-black mt-1">₹{predictions.predicted_remaining.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Digest */}
      {digest && (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-6">
            <Calendar size={20} className="text-indigo-600" />
            <h3 className="text-xl font-bold text-slate-900">This Week</h3>
            {digest.change_percentage !== null && (
              <span className={`ml-auto px-3 py-1 rounded-lg text-xs font-bold ${
                digest.change_percentage > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {digest.change_percentage > 0 ? '+' : ''}{digest.change_percentage}% vs last week
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-bold uppercase">Spent</p>
              <p className="text-xl font-black text-slate-900 mt-1">₹{digest.total_spent.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-bold uppercase">Transactions</p>
              <p className="text-xl font-black text-slate-900 mt-1">{digest.transaction_count}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-bold uppercase">Top Category</p>
              <p className="text-lg font-black text-slate-900 mt-1">{digest.top_categories?.[0]?.category || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-bold uppercase">Top Merchant</p>
              <p className="text-lg font-black text-slate-900 mt-1">{digest.top_merchants?.[0]?.merchant || '—'}</p>
            </div>
          </div>

          {digest.highlights?.length > 0 && (
            <div className="space-y-2">
              {digest.highlights.map((h: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  {h}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-10">
          <SpendingTrend data={summary?.daily_trend || []} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                <Zap size={24} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Highest Category</p>
              <h5 className="text-xl font-black text-slate-900 mb-2">{highestCategory?.name || 'N/A'}</h5>
              <p className="text-sm text-slate-400 font-bold">₹{(highestCategory?.value || 0).toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 font-bold text-lg">₹</div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Average Daily</p>
              <h5 className="text-xl font-black text-slate-900 mb-2">₹{(predictions?.daily_rate || 0).toLocaleString('en-IN')}</h5>
              <p className="text-sm text-slate-400 font-bold">This month</p>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <CategoryBreakdown data={categoryChartData} />

          {/* Category Predictions */}
          {predictions?.category_predictions?.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={18} className="text-indigo-600" />
                <h3 className="text-xl font-bold text-slate-900">Category Projections</h3>
              </div>
              <div className="space-y-6">
                {predictions.category_predictions.slice(0, 5).map((item: any) => {
                  const maxVal = predictions.category_predictions[0]?.predicted || 1
                  return (
                    <div key={item.category}>
                      <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="font-bold text-slate-900">{item.category}</span>
                        <span className="text-slate-400 font-medium">
                          ₹{item.spent.toLocaleString('en-IN')} → <span className="font-bold text-slate-600">₹{item.predicted.toLocaleString('en-IN')}</span>
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${(item.spent / maxVal) * 100}%` }} />
                        <div className="h-full rounded-full bg-indigo-200" style={{ width: `${((item.predicted - item.spent) / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider text-center">
                  Solid = spent | Light = projected remaining
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

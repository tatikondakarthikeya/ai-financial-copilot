'use client'

import { useState, useEffect } from 'react'
import { analyticsApi } from '@/lib/api'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { Repeat, Calendar, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react'

export default function SubscriptionsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await analyticsApi.getSubscriptions()
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  return (
    <div className="space-y-10 pb-20">
      <DashboardHeader title="Subscriptions" />

      {/* Monthly Commitment Card */}
      <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs mb-3">Total Monthly Commitment</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-6xl font-black tracking-tighter">₹{(data?.total_monthly_cost || 0).toLocaleString('en-IN')}</h3>
            <span className="text-indigo-200 font-bold italic">/mo</span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
          <Repeat size={20} className="text-indigo-100" />
          <span className="font-bold">{data?.count || 0} active subscriptions detected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-4">
            <h4 className="text-lg font-bold text-slate-900">Detected Subscriptions</h4>
          </div>

          {data?.subscriptions?.length === 0 && (
            <div className="bg-white border border-slate-100 rounded-[2rem] p-10 shadow-xl text-center">
              <p className="text-slate-400 font-medium">No subscriptions detected yet. Add recurring transactions to see them here.</p>
            </div>
          )}

          <div className="space-y-4">
            {data?.subscriptions?.map((sub: any, i: number) => (
              <div key={sub.merchant + i} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 flex items-center justify-between hover:border-indigo-200 transition-all group">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xl italic group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    {sub.merchant[0]}
                  </div>
                  <div>
                    <h5 className="text-xl font-black text-slate-900 leading-tight">{sub.merchant}</h5>
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs mt-1">
                      <Calendar size={12} />
                      {sub.last_date
                        ? `Last charged: ${new Date(sub.last_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                        : sub.frequency}
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-6">
                  <div className="hidden sm:block">
                    <p className="text-2xl font-black text-slate-900">₹{sub.amount.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub.frequency}</p>
                  </div>
                  <button className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16"></div>
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 z-10 relative">
              <Sparkles size={32} />
            </div>
            <h4 className="text-2xl font-black text-slate-900 mb-4 z-10 relative leading-tight">Copilot Insight</h4>
            <p className="text-slate-500 font-medium leading-relaxed mb-8 z-10 relative">
              {data?.count > 0
                ? `You're spending ₹${(data?.total_monthly_cost || 0).toLocaleString('en-IN')}/month on ${data?.count} subscriptions. Review them to find savings.`
                : 'Add recurring transactions to get subscription insights.'}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl text-indigo-600 shadow-sm border border-slate-100">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h5 className="font-bold text-slate-900 mb-1">Secure Detection</h5>
              <p className="text-sm text-slate-400 font-medium">Subscriptions are detected from your transaction patterns. No external data is used.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

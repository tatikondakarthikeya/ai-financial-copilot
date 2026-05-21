"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { analyticsApi, transactionsApi, smsApi } from '@/lib/api'

import DashboardHeader from '@/components/dashboard/DashboardHeader'
import TotalSpendingCard from '@/components/dashboard/TotalSpendingCard'
import AIInsightCard from '@/components/dashboard/AIInsightCard'
import SpendingTrend from '@/components/dashboard/SpendingTrend'
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import GmailIntegration from '@/components/dashboard/GmailIntegration'
import BankStatementUpload from '@/components/dashboard/BankStatementUpload'

import { Plus, Sparkles, X, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null)
  const [insights, setInsights] = useState<any>(null)
  const [subData, setSubData] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add Transaction Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalTab, setModalTab] = useState<'manual' | 'sms'>('manual')
  const [smsText, setSmsText] = useState('')
  const [parsingSms, setParsingSms] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  // Manual form
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    amount: '',
    type: 'expense',
    category: 'General',
  })
  const [savingManual, setSavingManual] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [sum, ins, subs, txs] = await Promise.all([
        analyticsApi.getSummary().catch(() => null),
        analyticsApi.getInsights().catch(() => null),
        analyticsApi.getSubscriptions().catch(() => null),
        transactionsApi.getTransactions().catch(() => null),
      ])

      setSummary(sum?.data ?? null)
      setInsights(ins?.data ?? null)
      setSubData(subs?.data ?? null)
      setTransactions(txs?.data ?? [])

    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token")
        router.push("/login")
      } else {
        setError('Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  // ✅ FIXED SMS PARSE
  const handleSmsParse = async (e: React.FormEvent) => {
    e.preventDefault()
    setParsingSms(true)
    setError('')

    try {
      const res = await smsApi.parse(smsText)
      setParsedData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to parse SMS')
    } finally {
      setParsingSms(false)
    }
  }

  const confirmTransaction = async () => {
    if (!parsedData) return

    try {
      await transactionsApi.addTransaction({
        ...parsedData,
        date: new Date().toISOString().split('T')[0]
      })

      setShowAddModal(false)
      setSmsText('')
      setParsedData(null)
      loadData()

    } catch {
      setError('Failed to add transaction')
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualForm.merchant || !manualForm.amount) return
    setSavingManual(true)
    try {
      await transactionsApi.addTransaction({
        date: manualForm.date,
        merchant: manualForm.merchant,
        amount: parseFloat(manualForm.amount),
        type: manualForm.type,
      })
      setShowAddModal(false)
      setManualForm({ date: new Date().toISOString().split('T')[0], merchant: '', amount: '', type: 'expense', category: 'General' })
      loadData()
    } catch {
      setError('Failed to add transaction')
    } finally {
      setSavingManual(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-12 w-12 border-t-2 border-indigo-600 rounded-full"></div>
      </div>
    )
  }

  const categoryChartData = summary?.category_breakdown
    ? Object.entries(summary.category_breakdown).map(([name, value]) => ({
      name,
      value: value as number
    }))
    : []

  return (
    <div className="space-y-10 pb-20">
      <DashboardHeader title="Dashboard" onSyncSuccess={loadData} />

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* TOP */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <TotalSpendingCard
          amount={summary?.total_spending || 0}
          changePct={summary?.change_percentage}
          lastMonthTotal={summary?.last_month_total || 0}
        />
        <AIInsightCard
          insight={insights?.messages?.[0] || "You're doing great with your spending!"}
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <SpendingTrend data={summary?.daily_trend || []} />
        <CategoryBreakdown data={categoryChartData} />
      </div>

      {/* TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <RecentTransactions transactions={transactions} />
        </div>

        <div className="space-y-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Transaction
          </button>

          <BankStatementUpload onUploadSuccess={loadData} />

          <GmailIntegration onSyncSuccess={loadData} />

          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xl shadow-slate-200/50">
            <h4 className="font-bold text-slate-900 mb-2">Subscriptions</h4>
            <p className="text-2xl font-black text-slate-900">₹{(subData?.total_monthly_cost || 0).toLocaleString('en-IN')}</p>
            <p className="text-sm text-slate-400 font-medium">{subData?.count || 0} active</p>
          </div>
        </div>
      </div>

      {/* ADD TRANSACTION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">Add Transaction</h3>
              <button onClick={() => { setShowAddModal(false); setParsedData(null); setSmsText('') }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 mx-6 mt-4 bg-slate-100 rounded-xl">
              <button onClick={() => { setModalTab('manual'); setParsedData(null) }} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${modalTab === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                Manual Entry
              </button>
              <button onClick={() => setModalTab('sms')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${modalTab === 'sms' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                Paste SMS
              </button>
            </div>

            <div className="p-6">
              {modalTab === 'manual' ? (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Date</label>
                      <input type="date" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Type</label>
                      <select value={manualForm.type} onChange={e => setManualForm({...manualForm, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Merchant / Description</label>
                    <input type="text" placeholder="e.g. Swiggy, Amazon, Salary..." value={manualForm.merchant} onChange={e => setManualForm({...manualForm, merchant: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Amount (₹)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={manualForm.amount} onChange={e => setManualForm({...manualForm, amount: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
                  </div>
                  <button type="submit" disabled={savingManual} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50">
                    {savingManual ? 'Saving...' : 'Add Transaction'}
                  </button>
                </form>
              ) : (
                <>
                  {!parsedData ? (
                    <form onSubmit={handleSmsParse} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Bank SMS Text</label>
                        <textarea value={smsText} onChange={(e) => setSmsText(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium h-32 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Paste your bank SMS here...&#10;e.g. Rs 450.00 debited from A/C XX1234 via UPI to SWIGGY" required />
                      </div>
                      <button type="submit" disabled={parsingSms} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50">
                        {parsingSms ? 'Parsing with AI...' : 'Parse SMS'}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400 font-bold">Merchant</span>
                          <span className="font-bold text-slate-900">{parsedData.merchant}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400 font-bold">Amount</span>
                          <span className="font-bold text-slate-900">₹{parsedData.amount?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400 font-bold">Category</span>
                          <span className="font-bold text-slate-900">{parsedData.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400 font-bold">Type</span>
                          <span className="font-bold text-slate-900">{parsedData.type}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setParsedData(null); setSmsText('') }} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                          Re-parse
                        </button>
                        <button onClick={confirmTransaction} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all">
                          Confirm & Save
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
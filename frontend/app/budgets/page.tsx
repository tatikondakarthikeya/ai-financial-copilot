'use client'

import { useState, useEffect } from 'react'
import { budgetApi } from '@/lib/api'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { Plus, Trash2, AlertTriangle, CheckCircle2, AlertCircle, X, TrendingUp } from 'lucide-react'

const CATEGORIES = ['Total', 'Food', 'Travel', 'Shopping', 'Bills', 'Subscriptions', 'Entertainment', 'Groceries', 'Health', 'Education', 'UPI', 'General']

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newCategory, setNewCategory] = useState('Food')
  const [newAmount, setNewAmount] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await budgetApi.getStatus()
      setBudgets(res.data.budgets || [])
      setAlerts(res.data.alerts || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAmount) return
    try {
      await budgetApi.create({ category: newCategory, amount_limit: parseFloat(newAmount) })
      setShowAdd(false)
      setNewAmount('')
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this budget?')) return
    try {
      await budgetApi.delete(id)
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return null

  const totalBudget = budgets.find(b => b.category === 'Total')
  const categoryBudgets = budgets.filter(b => b.category !== 'Total')
  const existingCategories = budgets.map(b => b.category)
  const availableCategories = CATEGORIES.filter(c => !existingCategories.includes(c))

  return (
    <div className="space-y-10 pb-20">
      <DashboardHeader title="Budgets" />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.filter(a => a.severity !== 'info').map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-bold ${
              alert.severity === 'error'
                ? 'bg-red-50 text-red-600 border border-red-100'
                : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              {alert.severity === 'error' ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Total Budget Card */}
      {totalBudget && (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs mb-2">Total Monthly Budget</p>
            <div className="flex items-end gap-4 mb-6">
              <h3 className="text-5xl font-black">₹{totalBudget.spent.toLocaleString('en-IN')}</h3>
              <span className="text-indigo-200 font-bold text-xl mb-1">/ ₹{totalBudget.amount_limit.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalBudget.percentage >= 100 ? 'bg-red-400' : totalBudget.percentage >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(totalBudget.percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-sm text-indigo-200 font-bold">
              <span>{totalBudget.percentage.toFixed(0)}% used</span>
              <span>₹{totalBudget.remaining.toLocaleString('en-IN')} remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Budget Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Category Budgets</h3>
        {availableCategories.length > 0 && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all"
          >
            <Plus size={16} /> Add Budget
          </button>
        )}
      </div>

      {/* Budget Cards Grid */}
      {categoryBudgets.length === 0 && !totalBudget ? (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-16 text-center shadow-xl">
          <TrendingUp size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium text-lg">No budgets set yet</p>
          <p className="text-slate-300 text-sm mt-1">Create your first budget to start tracking spending</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all"
          >
            Set a Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryBudgets.map(b => (
            <div key={b.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{b.category}</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{b.period}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    b.status === 'exceeded' ? 'bg-red-50 text-red-600' :
                    b.status === 'warning' ? 'bg-amber-50 text-amber-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    {b.percentage.toFixed(0)}%
                  </span>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-bold text-slate-700">₹{b.spent.toLocaleString('en-IN')}</span>
                  <span className="text-slate-400 font-medium">₹{b.amount_limit.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      b.status === 'exceeded' ? 'bg-red-500' :
                      b.status === 'warning' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-400 font-medium">
                {b.status === 'exceeded'
                  ? `Over by ₹${(b.spent - b.amount_limit).toLocaleString('en-IN')}`
                  : `₹${b.remaining.toLocaleString('en-IN')} remaining`
                }
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">Set Budget</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {availableCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Monthly Limit (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="5000"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all"
              >
                Set Budget
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

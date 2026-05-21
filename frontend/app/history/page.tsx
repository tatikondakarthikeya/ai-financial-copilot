'use client'

import { useState, useEffect } from 'react'
import { transactionsApi } from '@/lib/api'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { Search, ChevronLeft, ChevronRight, Car, Utensils, ShoppingBag, Repeat, Link as LinkIcon, MoreHorizontal, Trash2, ArrowUpDown, X } from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  'Transport': Car, 'Travel': Car, 'Food': Utensils, 'Shopping': ShoppingBag,
  'Subscriptions': Repeat, 'Bills': LinkIcon, 'UPI': LinkIcon,
  'General': MoreHorizontal, 'Groceries': ShoppingBag,
}

const CATEGORIES = ['All', 'Food', 'Travel', 'Shopping', 'Bills', 'Subscriptions', 'UPI', 'Entertainment', 'Groceries', 'General', 'Other']

type SortKey = 'date' | 'amount' | 'merchant'
type SortDir = 'asc' | 'desc'

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const perPage = 15

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await transactionsApi.getTransactions()
      setTransactions(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await transactionsApi.deleteTransaction(id)
      loadData()
    } catch { console.error('Failed to delete') }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(1)
  }

  // Filter
  let filtered = transactions.filter(tx => {
    const matchSearch = (tx.merchant || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = selectedCategory === 'All' || tx.category === selectedCategory
    return matchSearch && matchCategory
  })

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
    else if (sortKey === 'amount') cmp = a.amount - b.amount
    else if (sortKey === 'merchant') cmp = (a.merchant || '').localeCompare(b.merchant || '')
    return sortDir === 'asc' ? cmp : -cmp
  })

  // Paginate
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  if (loading) return null

  return (
    <div className="space-y-10 pb-20">
      <DashboardHeader title="Transaction History" />

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search merchants, categories..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Sort buttons */}
          {(['date', 'amount', 'merchant'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                sortKey === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-100 text-slate-500 hover:border-indigo-200'
              }`}
            >
              <ArrowUpDown size={14} />
              {key}
              {sortKey === key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(cat); setPage(1) }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-100 text-slate-500 hover:border-indigo-200'
            }`}
          >
            {cat}
          </button>
        ))}
        {selectedCategory !== 'All' && (
          <button onClick={() => setSelectedCategory('All')} className="px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-600 flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/40">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">{filtered.length} Transactions Found</h4>
          <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {paginated.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-slate-400 font-medium text-lg">No transactions found</p>
            <p className="text-slate-300 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {paginated.map((tx, i) => {
              const Icon = ICON_MAP[tx.category] || MoreHorizontal
              const isIncome = tx.type === 'income'
              return (
                <div key={tx.id || i} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-all group cursor-pointer">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-110 group-hover:text-indigo-600 transition-all">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h5 className="text-lg font-bold text-slate-900 leading-tight">{tx.merchant}</h5>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {tx.category || 'General'} • {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div className="hidden sm:block">
                      <p className={`font-black text-xl ${isIncome ? 'text-green-600' : 'text-slate-900'}`}>
                        {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mt-1">{tx.source || 'manual'}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-8 bg-slate-50/30 flex items-center justify-between">
            <p className="text-sm text-slate-400 font-medium">
              Page {page} of {totalPages} ({filtered.length} results)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all disabled:text-slate-200 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all disabled:text-slate-200 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

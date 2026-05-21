'use client'

import { Car, ShoppingBag, Utensils, Repeat, Link as LinkIcon, MoreHorizontal } from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  'Transport': Car,
  'Travel': Car,
  'Food': Utensils,
  'Shopping': ShoppingBag,
  'Subscriptions': Repeat,
  'Bills': LinkIcon,
  'UPI': LinkIcon,
  'General': MoreHorizontal,
  'Groceries': ShoppingBag,
}

const COLOR_MAP: Record<string, string> = {
  'Transport': 'bg-blue-50 text-blue-600',
  'Travel': 'bg-blue-50 text-blue-600',
  'Food': 'bg-green-50 text-green-600',
  'Shopping': 'bg-purple-50 text-purple-600',
  'Subscriptions': 'bg-indigo-50 text-indigo-600',
  'Bills': 'bg-orange-50 text-orange-600',
  'UPI': 'bg-cyan-50 text-cyan-600',
  'General': 'bg-slate-50 text-slate-600',
  'Groceries': 'bg-emerald-50 text-emerald-600',
}

export default function RecentTransactions({ transactions }: { transactions: any[] }) {
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-900">Recent Transactions</h3>
        <button className="text-indigo-600 font-bold text-sm hover:underline underline-offset-4">See All</button>
      </div>

      <div className="space-y-1">
        {transactions.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-slate-300 font-medium">No transactions yet.</p>
            <p className="text-slate-300 text-sm mt-1">Add one manually, paste an SMS, or sync Gmail.</p>
          </div>
        )}
        {transactions.slice(0, 5).map((tx, i) => {
          const Icon = ICON_MAP[tx.category] || MoreHorizontal
          const colorClass = COLOR_MAP[tx.category] || 'bg-slate-50 text-slate-600'
          
          return (
            <div key={tx.id || i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 leading-tight">{tx.merchant}</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    {tx.category} • {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black ${tx.type === 'income' ? 'text-green-600' : 'text-slate-900'}`}>
                  {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'

export default function TotalSpendingCard({ amount, changePct, lastMonthTotal }: { amount: number, changePct: number | null, lastMonthTotal: number }) {
  const isPositive = changePct !== null && changePct >= 0

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-indigo-100 font-semibold uppercase tracking-widest text-xs mb-2">Total Spending (This Month)</p>
            <h3 className="text-5xl font-black tabular-nums tracking-tighter">
              ₹{amount.toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <TrendingUp size={24} className="text-indigo-100" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm backdrop-blur-md border ${
            isPositive 
              ? 'bg-red-500/20 text-red-100 border-red-500/30' 
              : 'bg-green-500/20 text-green-100 border-green-500/30'
          }`}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {changePct === null ? 'No data' : `${Math.abs(changePct).toFixed(1)}%`}
          </div>
          <p className="text-indigo-200 text-sm font-medium">vs. last month (₹{lastMonthTotal.toLocaleString('en-IN')})</p>
        </div>
      </div>
    </div>
  )
}

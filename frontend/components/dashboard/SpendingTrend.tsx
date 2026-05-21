'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function SpendingTrend({ data }: { data: any[] }) {
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-900">Spending Trend</h3>
        <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider focus:ring-2 focus:ring-indigo-500/20">
          <option>Daily</option>
          <option>Weekly</option>
          <option>Monthly</option>
        </select>
      </div>

      {data.length === 0 ? (
        <div className="h-[300px] w-full flex items-center justify-center">
          <p className="text-slate-300 font-medium">No spending data yet. Add transactions to see trends.</p>
        </div>
      ) : (
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }}
            />
            <Tooltip 
              cursor={{ fill: '#F8F9FE' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px'
              }}
              labelStyle={{ fontWeight: 800, color: '#1E293B', marginBottom: '4px' }}
              itemStyle={{ fontWeight: 600, color: '#4F46E5' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
            />
            <Bar 
              dataKey="amount" 
              radius={[6, 6, 6, 6]} 
              barSize={32}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === data.length - 1 ? '#2D42B2' : '#CED5F3'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  )
}

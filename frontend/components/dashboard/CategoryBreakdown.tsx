'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#2D42B2', '#4F46E5', '#818CF8', '#C7D2FE', '#E0E7FF']

export default function CategoryBreakdown({ data }: { data: any[] }) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0)

  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
        <h3 className="text-xl font-bold text-slate-900 mb-8">Category Breakdown</h3>
        <div className="h-[220px] flex items-center justify-center">
          <p className="text-slate-300 font-medium">No category data yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-900">Category Breakdown</h3>
        <button className="text-slate-400 hover:text-indigo-600 transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 11.25C10.6904 11.25 11.25 10.6904 11.25 10C11.25 9.30964 10.6904 8.75 10 8.75C9.30964 8.75 8.75 9.30964 8.75 10C8.75 10.6904 9.30964 11.25 10 11.25Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 5C10.6904 5 11.25 4.44036 11.25 3.75C11.25 3.05964 10.6904 2.5 10 2.5C9.30964 2.5 8.75 3.05964 8.75 3.75C8.75 4.44036 9.30964 5 10 5Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 17.5C10.6904 17.5 11.25 16.9404 11.25 16.25C11.25 15.5596 10.6904 15 10 15C9.30964 15 8.75 15.5596 8.75 16.25C8.75 16.9404 9.30964 17.5 10 17.5Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="h-[220px] w-full relative mb-8">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-3xl font-black text-slate-900 leading-none">{data.length}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Categories</p>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={70}
              outerRadius={90}
              paddingAngle={8}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
              <span className="text-sm font-semibold text-slate-600">{item.name}</span>
            </div>
            <span className="text-sm font-bold text-slate-400">{Math.round((item.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

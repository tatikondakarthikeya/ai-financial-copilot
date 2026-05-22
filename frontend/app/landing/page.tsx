'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, TrendingUp, Shield, Brain, CreditCard, BarChart3, MessageSquare, Camera, ArrowRight } from 'lucide-react'

const FEATURES = [
  { icon: CreditCard, title: 'Bank Linking', desc: 'Connect US banks via Plaid or upload Indian bank CSV statements' },
  { icon: Brain, title: 'AI-Powered Parsing', desc: 'Llama 3.3 extracts transactions from emails, SMS, and receipts' },
  { icon: BarChart3, title: 'Smart Analytics', desc: 'Spending predictions, category breakdown, weekly digest' },
  { icon: MessageSquare, title: 'AI Financial Copilot', desc: 'Chat with your finances — ask anything, get real answers' },
  { icon: TrendingUp, title: 'Health Score', desc: 'Financial health score 0-100 with actionable breakdown' },
  { icon: Camera, title: 'Receipt Scanner', desc: 'Snap a photo, AI extracts merchant, amount, and items' },
]

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">F</div>
          <span className="text-xl font-black text-slate-900">Financial AI <span className="text-indigo-600">Copilot</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/login')} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
            Sign In
          </button>
          <button onClick={() => router.push('/register')} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-indigo-200">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest rounded-full mb-8">
          <Sparkles size={14} /> AI-Powered Finance
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
          Your Money,<br />
          <span className="text-indigo-600">Understood.</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          AI copilot that connects your bank, reads your receipts, tracks every rupee, and tells you exactly where your money goes — in plain English.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push('/register')}
            className="px-8 py-4 bg-indigo-600 text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
          >
            Start Free <ArrowRight size={18} />
          </button>
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-4 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-2xl hover:border-indigo-300 transition-all shadow-sm"
          >
            I have an account
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Data Sources', value: '5+' },
            { label: 'API Endpoints', value: '35' },
            { label: 'AI Models', value: '3' },
            { label: 'Banks Supported', value: '10K+' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-sm">
              <p className="text-3xl font-black text-indigo-600">{s.value}</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-black text-slate-900 text-center mb-4">Everything You Need</h2>
        <p className="text-slate-500 text-center mb-12 font-medium">One app to replace spreadsheets, bank apps, and budgeting tools</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                <f.icon size={28} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[3rem] p-12 md:p-16 text-center text-white shadow-2xl shadow-indigo-200">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to take control?</h2>
          <p className="text-indigo-100 font-medium mb-8 max-w-lg mx-auto">Join and start tracking your finances with AI. Free forever for personal use.</p>
          <button
            onClick={() => router.push('/register')}
            className="px-10 py-4 bg-white text-indigo-600 text-sm font-black uppercase tracking-widest rounded-2xl hover:brightness-95 transition-all shadow-xl"
          >
            Create Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-400 font-medium">AI Financial Copilot</p>
        <div className="flex items-center gap-1 text-xs text-slate-300 font-medium">
          <Shield size={12} /> Your data never leaves your account
        </div>
      </footer>
    </div>
  )
}

"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { Mail, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.login({ username: email, password })
      localStorage.setItem('token', res.data.access_token)
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-200 animate-in zoom-in-50 duration-500">
            <Sparkles size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-4">Elevate your financial intelligence</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-[3rem] p-12 shadow-2xl shadow-slate-200/60">
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <ShieldCheck size={18} className="shrink-0" /> {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="email">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest" htmlFor="password">Password</label>
                <button type="button" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Forgot?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-sm uppercase tracking-[0.2em] py-5 rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 group"
            >
              {loading ? 'Authenticating...' : <><ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /> Sign In</>}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-50 text-center">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              New here?{' '}
              <button
                className="text-indigo-600 hover:underline underline-offset-4 font-black ml-2"
                onClick={() => router.push('/register')}
              >
                Create Account
              </button>
            </p>
          </div>
        </div>
        
        <p className="mt-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
          Securely encrypted & Private
        </p>
      </div>
    </div>
  )
}

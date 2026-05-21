'use client'

import { useState, useRef, useEffect } from 'react'
import { aiApi } from '@/lib/api'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { Send, Sparkles, User, Bot, Trash2, ArrowRight } from 'lucide-react'

export default function AIChatPage() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'bot', content: 'Hi! Your food spending increased by 44% this week. You can save ₹1,200 by reducing dining out.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await aiApi.query(userMsg)
      setMessages(prev => [...prev, { role: 'bot', content: res.data.answer || res.data }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I encountered an error processing your request.' }])
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    "Summarize my week",
    "Upcoming bills?",
    "Where did I spend common last month?",
    "Set a budget for food"
  ]

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <DashboardHeader title="AI Financial Copilot" />

      <div className="flex-1 bg-white border border-slate-100 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white shadow-indigo-200' 
                  : 'bg-indigo-50 text-indigo-600 shadow-slate-100'
              }`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`max-w-[70%] p-6 rounded-3xl font-medium leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
              }`}>
                {msg.content}
                {msg.role === 'bot' && i === 0 && (
                  <div className="mt-4 flex gap-2">
                    <button className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">Show Breakdown</button>
                    <button className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">Set Budget</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-3 text-slate-400 italic font-medium px-18">
              <Sparkles className="animate-pulse text-indigo-400" size={18} />
              Copilot is analyzing...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-10 bg-slate-50/50 border-t border-slate-50">
          <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide">
            {quickActions.map(action => (
              <button 
                key={action}
                onClick={() => setInput(action)}
                className="whitespace-nowrap px-6 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-500 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
              >
                {action}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="relative group">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about your spending..."
              className="w-full pl-8 pr-20 py-6 bg-white border border-slate-100 rounded-[2rem] shadow-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-lg font-medium placeholder:text-slate-300 transition-all group-focus-within:border-indigo-200"
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 hover:brightness-110 transition-all disabled:opacity-50 disabled:grayscale"
            >
              <Send size={24} />
            </button>
          </form>
          
          <div className="flex items-center justify-center gap-4 mt-6">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={12} /> Privacy Protected
            </p>
            <button 
              onClick={() => setMessages([{ role: 'bot', content: 'Chat history cleared. How can I help you today?' }])}
              className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-2"
            >
              <Trash2 size={12} /> Clear History
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShieldCheck(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

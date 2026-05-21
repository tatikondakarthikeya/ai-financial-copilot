"use client"

import { useState } from 'react'
import { setuApi } from '@/lib/api'
import { Building2, ExternalLink, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react'

interface LinkBankAccountProps {
  onLinkSuccess: () => void
}

export default function LinkBankAccount({ onLinkSuccess }: LinkBankAccountProps) {
  const [step, setStep] = useState<'input' | 'waiting' | 'fetching' | 'done'>('input')
  const [mobile, setMobile] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [consentId, setConsentId] = useState('')
  const [consentUrl, setConsentUrl] = useState('')
  const [result, setResult] = useState<any>(null)

  const handleCreateConsent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mobile || mobile.length !== 10) {
      setError('Enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await setuApi.createConsent(mobile)
      setConsentId(res.data.consent_id)
      setConsentUrl(res.data.consent_url)
      setStep('waiting')
      // Open consent URL in new tab
      window.open(res.data.consent_url, '_blank')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create consent')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckAndFetch = async () => {
    setLoading(true)
    setError('')
    setStep('fetching')

    try {
      const res = await setuApi.fetchData(consentId)
      if (res.data.status === 'waiting') {
        setError(res.data.message)
        setStep('waiting')
      } else {
        setResult(res.data)
        setStep('done')
        onLinkSuccess()
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch data')
      setStep('waiting')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600">
          <Building2 size={24} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-900">Link Bank Account</h4>
          <p className="text-sm text-slate-500 font-medium">
            {step === 'done' ? 'Account linked' : 'Via Account Aggregator (RBI)'}
          </p>
        </div>
      </div>

      {step === 'input' && (
        <form onSubmit={handleCreateConsent} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Mobile Number</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-500">+91</span>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            <p className="text-[10px] text-slate-300 mt-1 font-medium">Linked to your bank account</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
            {loading ? 'Connecting...' : 'Link Bank'}
          </button>
        </form>
      )}

      {step === 'waiting' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700 font-medium">
            Approve the consent on the Setu page that opened. Once done, click below to fetch your transactions.
          </div>
          <a
            href={consentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
          >
            <ExternalLink size={16} /> Open Consent Page Again
          </a>
          <button
            onClick={handleCheckAndFetch}
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {loading ? 'Fetching...' : "I've Approved — Fetch Data"}
          </button>
        </div>
      )}

      {step === 'fetching' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-sm font-bold text-slate-500">Fetching bank transactions...</p>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 size={18} />
            <span className="font-bold">{result.transactions_added} transactions imported!</span>
          </div>
          {result.duplicates_skipped > 0 && (
            <p className="text-xs text-slate-400">{result.duplicates_skipped} duplicates skipped</p>
          )}
          <button
            onClick={() => { setStep('input'); setMobile(''); setResult(null) }}
            className="w-full py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            Link Another Account
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl text-xs font-bold">
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </div>
  )
}

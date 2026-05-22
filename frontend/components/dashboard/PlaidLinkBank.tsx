"use client"

import { useState, useEffect, useCallback } from 'react'
import { plaidApi } from '@/lib/api'
import { Building2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface PlaidLinkBankProps {
  onLinkSuccess: () => void
}

export default function PlaidLinkBank({ onLinkSuccess }: PlaidLinkBankProps) {
  const [loading, setLoading] = useState(false)
  const [plaidReady, setPlaidReady] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  // Load Plaid Link script
  useEffect(() => {
    if (document.getElementById('plaid-link-script')) {
      setPlaidReady(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'plaid-link-script'
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.onload = () => setPlaidReady(true)
    document.head.appendChild(script)
  }, [])

  const handleLink = useCallback(async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Get link token from backend
      const res = await plaidApi.createLinkToken()
      const linkToken = res.data.link_token

      // Open Plaid Link
      const handler = (window as any).Plaid.create({
        token: linkToken,
        onSuccess: async (public_token: string, metadata: any) => {
          try {
            setLoading(true)
            const exchangeRes = await plaidApi.exchangeToken(public_token)
            setResult(exchangeRes.data)
            onLinkSuccess()
          } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to fetch transactions')
          } finally {
            setLoading(false)
          }
        },
        onExit: (err: any) => {
          setLoading(false)
          if (err) {
            setError(err.display_message || 'Bank connection cancelled')
          }
        },
      })

      handler.open()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initialize bank connection')
      setLoading(false)
    }
  }, [onLinkSuccess])

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600">
          <Building2 size={24} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-900">Link Bank Account</h4>
          <p className="text-sm text-slate-500 font-medium">
            {result ? 'Account linked!' : 'Connect via Plaid (US Banks)'}
          </p>
        </div>
        {result && (
          <div className="ml-auto">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
        )}
      </div>

      {!result ? (
        <button
          onClick={handleLink}
          disabled={loading || !plaidReady}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Connecting...</>
          ) : (
            <><Building2 size={16} /> Connect Bank</>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-emerald-50 rounded-xl p-4 space-y-1">
            <p className="text-sm font-bold text-emerald-700">
              {result.transactions_added} transactions imported!
            </p>
            {result.duplicates_skipped > 0 && (
              <p className="text-xs text-emerald-600">{result.duplicates_skipped} duplicates skipped</p>
            )}
          </div>
          <button
            onClick={() => { setResult(null); handleLink() }}
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

      <p className="text-[10px] text-slate-300 text-center mt-4 font-medium">
        Powered by Plaid. Bank credentials never touch our servers.
      </p>
    </div>
  )
}

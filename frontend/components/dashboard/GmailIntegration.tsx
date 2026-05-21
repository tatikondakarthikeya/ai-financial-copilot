"use client"

import { useState, useEffect } from 'react'
import { googleAuthApi, transactionsApi } from '@/lib/api'
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface GmailIntegrationProps {
  onSyncSuccess: () => void
}

export default function GmailIntegration({ onSyncSuccess }: GmailIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [syncResult, setSyncResult] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      setLoading(true)
      const res = await googleAuthApi.getStatus()
      setIsConnected(res.data.connected)
    } catch (err) {
      console.error('Failed to check Google status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      const res = await googleAuthApi.getLoginUrl()
      if (res.data.url) {
        window.location.href = res.data.url
      }
    } catch (err) {
      setError('Failed to get connection URL. Make sure you are logged in.')
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError('')
      setSyncResult(null)
      const res = await transactionsApi.syncGmail()
      if (res.data.status === 'success') {
        setSyncResult(res.data)
        onSyncSuccess()
      } else {
        setError(res.data.message || 'Sync failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to sync emails')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 flex items-center justify-center h-48">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isConnected ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          <Mail size={24} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-900">Gmail Ingestion</h4>
          <p className="text-sm text-slate-500 font-medium">
            {isConnected ? 'Account Connected' : 'Not Connected'}
          </p>
        </div>
        {isConnected && (
          <div className="ml-auto">
            <CheckCircle2 size={20} className="text-green-500" />
          </div>
        )}
      </div>

      {!isConnected ? (
        <button
          onClick={handleConnect}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-indigo-100"
        >
          Connect Gmail
        </button>
      ) : (
        <div className="space-y-4">
          <button
            disabled={syncing}
            onClick={handleSync}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
            {syncing ? 'Syncing...' : 'Sync Emails'}
          </button>

          {syncResult && (
            <div className="text-xs text-center text-slate-500 font-medium space-y-1">
              <p className="text-green-600 font-bold">
                {syncResult.new_transactions} new transactions added
              </p>
              {syncResult.duplicates_skipped > 0 && (
                <p>{syncResult.duplicates_skipped} duplicates skipped</p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl text-xs font-bold">
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </div>
  )
}

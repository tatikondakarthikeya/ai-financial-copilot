'use client'

import { useState, useRef } from 'react'
import { receiptApi } from '@/lib/api'
import { Camera, CheckCircle2, AlertCircle, Loader2, Receipt, X } from 'lucide-react'

interface ReceiptScannerProps {
  onScanSuccess: () => void
}

export default function ReceiptScanner({ onScanSuccess }: ReceiptScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Only images are supported')
      return
    }

    // Show preview
    setPreview(URL.createObjectURL(file))
    setScanning(true)
    setError('')
    setResult(null)

    try {
      const res = await receiptApi.scanAndSave(file)
      if (res.data.status === 'success') {
        setResult(res.data.data)
        onScanSuccess()
      } else {
        setError(res.data.message || 'Could not read receipt')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to scan receipt')
    } finally {
      setScanning(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError('')
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-violet-50 text-violet-600">
          <Receipt size={24} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-900">Scan Receipt</h4>
          <p className="text-sm text-slate-500 font-medium">AI extracts amount & merchant</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
      />

      {!result && !scanning && (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-all flex items-center justify-center gap-2"
        >
          <Camera size={18} />
          Take Photo or Upload
        </button>
      )}

      {scanning && (
        <div className="flex flex-col items-center gap-3 py-4">
          {preview && <img src={preview} alt="Receipt" className="w-24 h-24 object-cover rounded-xl" />}
          <Loader2 className="animate-spin text-violet-600" size={24} />
          <p className="text-sm font-bold text-slate-500">AI is reading your receipt...</p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <CheckCircle2 size={16} />
            <span className="text-sm font-bold">Saved!</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Merchant</span>
              <span className="font-bold text-slate-900">{result.merchant}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Amount</span>
              <span className="font-bold text-slate-900">
                {result.currency === 'USD' ? '$' : '₹'}{result.amount?.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Category</span>
              <span className="font-bold text-slate-900">{result.category}</span>
            </div>
            {result.items?.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-bold text-xs">Items:</span>
                {result.items.slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs mt-1">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="text-slate-500">₹{item.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={reset} className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
            Scan Another
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl text-xs font-bold">
          <AlertCircle size={14} /> {error}
          <button onClick={reset} className="ml-auto"><X size={14} /></button>
        </div>
      )}
    </div>
  )
}

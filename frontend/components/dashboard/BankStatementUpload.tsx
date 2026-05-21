"use client"

import { useState, useRef } from 'react'
import { transactionsApi } from '@/lib/api'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface BankStatementUploadProps {
  onUploadSuccess: () => void
}

export default function BankStatementUpload({ onUploadSuccess }: BankStatementUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are supported')
      return
    }

    setUploading(true)
    setError('')
    setResult(null)

    try {
      const res = await transactionsApi.uploadBankStatement(file)
      setResult(res.data)
      if (res.data.transactions_added > 0) {
        onUploadSuccess()
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to parse bank statement')
    } finally {
      setUploading(false)
    }
  }

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600">
          <FileSpreadsheet size={24} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-900">Bank Statement</h4>
          <p className="text-sm text-slate-500 font-medium">Upload CSV from net banking</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={onFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <p className="text-sm font-bold text-slate-500">Parsing statement...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload size={24} className="text-slate-300" />
            <p className="text-sm font-bold text-slate-500">
              Drop CSV or <span className="text-indigo-600">browse</span>
            </p>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
              HDFC, ICICI, SBI, Axis, Kotak & more
            </p>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 size={16} />
            <span className="text-sm font-bold">
              {result.transactions_added} transactions imported
            </span>
          </div>
          <div className="text-xs text-slate-400 font-medium space-y-0.5">
            <p>Bank detected: <span className="font-bold text-slate-600 uppercase">{result.bank_detected}</span></p>
            {result.duplicates_skipped > 0 && (
              <p>{result.duplicates_skipped} duplicates skipped</p>
            )}
            {result.rows_skipped > 0 && (
              <p>{result.rows_skipped} non-transaction rows skipped</p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl text-xs font-bold">
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </div>
  )
}

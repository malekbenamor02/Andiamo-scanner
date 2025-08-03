import React, { useState, useEffect } from 'react'
import { ArrowLeft, RefreshCw, CheckCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOfflineStore } from '../hooks/useOfflineStore'

interface ScanRecord {
  id: string
  qrCode: string
  eventId: string
  ambassadorId: string
  deviceInfo: string
  scanLocation: string
  timestamp: number
  synced: boolean
}

const OfflineQueue: React.FC = () => {
  const [pendingScans, setPendingScans] = useState<ScanRecord[]>([])
  const [syncing, setSyncing] = useState(false)
  const navigate = useNavigate()
  const { getUnsyncedScans, markScanAsSynced } = useOfflineStore()

  useEffect(() => {
    loadPendingScans()
  }, [])

  const loadPendingScans = async () => {
    const scans = await getUnsyncedScans()
    setPendingScans(scans)
  }

  const syncScans = async () => {
    setSyncing(true)
    try {
      // This would sync with the main application's API
      // For now, we'll just mark them as synced
      for (const scan of pendingScans) {
        await markScanAsSynced(scan.id)
      }
      await loadPendingScans()
    } catch (error) {
      console.error('Failed to sync scans:', error)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Offline Queue</h1>
          <p className="text-sm text-gray-400">
            {pendingScans.length} pending scans
          </p>
        </div>
      </div>

      {/* Sync Button */}
      {pendingScans.length > 0 && (
        <div className="mb-6">
          <button
            onClick={syncScans}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-medium"
          >
            {syncing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            {syncing ? 'Syncing...' : 'Sync All Scans'}
          </button>
        </div>
      )}

      {/* Pending Scans */}
      <div className="space-y-3">
        {pendingScans.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-400">No pending scans</p>
          </div>
        ) : (
          pendingScans.map((scan) => (
            <div
              key={scan.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">
                    QR: {scan.qrCode.substring(0, 8)}...
                  </p>
                  <p className="text-xs text-gray-400 mb-2">
                    Event: {scan.eventId}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(scan.timestamp).toLocaleString()}
                  </p>
                </div>
                <Clock className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default OfflineQueue 
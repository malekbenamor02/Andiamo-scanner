import React, { useState, useEffect } from 'react'
import { Search, CheckCircle, XCircle, Download, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useOfflineStore } from '../hooks/useOfflineStore'

interface ScanRecord {
  id: string
  ticket_id: string
  event_id: string
  ambassador_id: string
  device_info: string
  scan_location: string
  scan_time: string
  scan_result: string
  event_name?: string
  ambassador_name?: string
}

interface ScanHistoryProps {
  ambassador: any
}

const ScanHistory: React.FC<ScanHistoryProps> = ({ ambassador }) => {
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterEvent, setFilterEvent] = useState('all')
  const [events, setEvents] = useState<any[]>([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { getUnsyncedScans } = useOfflineStore()

  useEffect(() => {
    loadScans()
    loadEvents()
    
    // Check online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('date', { ascending: false })
      
      if (!error && data) {
        setEvents(data)
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    }
  }

  const loadScans = async () => {
    setLoading(true)
    try {
      // Load online scans
      const { data: onlineScans, error } = await supabase
        .from('scans')
        .select(`
          *,
          events(name),
          ambassadors(full_name)
        `)
        .eq('ambassador_id', ambassador.id)
        .order('scan_time', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Failed to load online scans:', error)
      }

      // Load offline scans
      const offlineScans = await getUnsyncedScans()
      
      // Combine and format scans
      const formattedScans: ScanRecord[] = []
      
      // Add online scans
      if (onlineScans) {
        onlineScans.forEach(scan => {
          formattedScans.push({
            ...scan,
            event_name: scan.events?.name,
            ambassador_name: scan.ambassadors?.full_name
          })
        })
      }
      
      // Add offline scans
      offlineScans.forEach(scan => {
        formattedScans.push({
          id: scan.id,
          ticket_id: scan.qrCode,
          event_id: scan.eventId,
          ambassador_id: scan.ambassadorId,
          device_info: scan.deviceInfo,
          scan_location: scan.scanLocation,
          scan_time: new Date(scan.timestamp).toISOString(),
          scan_result: 'pending',
          event_name: 'Offline Event',
          ambassador_name: ambassador.full_name
        })
      })

      setScans(formattedScans)
    } catch (error) {
      console.error('Failed to load scans:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredScans = scans.filter(scan => {
    const matchesSearch = scan.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scan.event_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'valid' && scan.scan_result === 'valid') ||
                         (filterStatus === 'invalid' && scan.scan_result === 'invalid') ||
                         (filterStatus === 'pending' && scan.scan_result === 'pending')
    
    const matchesEvent = filterEvent === 'all' || scan.event_id === filterEvent
    
    return matchesSearch && matchesStatus && matchesEvent
  })

  const exportScans = () => {
    const csvContent = [
      ['Ticket ID', 'Event', 'Status', 'Scan Time', 'Location', 'Device Info'].join(','),
      ...filteredScans.map(scan => [
        scan.ticket_id,
        scan.event_name || 'Unknown',
        scan.scan_result,
        new Date(scan.scan_time).toLocaleString(),
        scan.scan_location,
        scan.device_info
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scan-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'invalid':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-yellow-400" />
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-900/50 border-green-500'
      case 'invalid':
        return 'bg-red-900/50 border-red-500'
      case 'pending':
        return 'bg-yellow-900/50 border-yellow-500'
      default:
        return 'bg-gray-900/50 border-gray-500'
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Scan History</h1>
        <p className="text-gray-400">View all your past scans and results</p>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              {scans.filter(s => s.scan_result === 'valid').length}
            </div>
            <div className="text-sm text-gray-400">Valid Scans</div>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-400">
              {scans.filter(s => s.scan_result === 'invalid').length}
            </div>
            <div className="text-sm text-gray-400">Invalid Scans</div>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">
              {scans.filter(s => s.scan_result === 'pending').length}
            </div>
            <div className="text-sm text-gray-400">Pending Sync</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ticket ID or event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
            <option value="pending">Pending</option>
          </select>

          {/* Event Filter */}
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>

          {/* Export Button */}
          <button
            onClick={exportScans}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadScans}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Scans List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading scans...</p>
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No scans found</p>
          </div>
        ) : (
          filteredScans.map(scan => (
            <div
              key={scan.id}
              className={`p-4 rounded-lg border ${getStatusColor(scan.scan_result)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(scan.scan_result)}
                  <div>
                    <div className="font-medium text-white">
                      Ticket: {scan.ticket_id}
                    </div>
                    <div className="text-sm text-gray-400">
                      Event: {scan.event_name || 'Unknown Event'}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    {new Date(scan.scan_time).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {scan.scan_location}
                  </div>
                </div>
              </div>
              
              {scan.scan_result === 'pending' && (
                <div className="mt-2 text-xs text-yellow-400">
                  ⚠️ This scan is stored offline and will sync when online
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Offline Notice */}
      {!isOnline && (
        <div className="mt-4 p-3 bg-yellow-900 border border-yellow-600 rounded-lg">
          <p className="text-sm text-yellow-200">
            You're currently offline. Some scans may not be synced yet.
          </p>
        </div>
      )}
    </div>
  )
}

export default ScanHistory 
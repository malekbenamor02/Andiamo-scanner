import React, { useState, useEffect } from 'react'
import { Search, CheckCircle, XCircle, Download, RefreshCw, ArrowLeft, Calendar, User, MapPin } from 'lucide-react'
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
  const { getUnsyncedScans, syncOfflineData } = useOfflineStore()

  useEffect(() => {
    loadScans()
  }, [])

  const loadScans = async () => {
    setLoading(true)
    try {
      // Sync offline data first
      await syncOfflineData()

      // Load online scans with better query
      const { data: onlineScans, error } = await supabase
        .from('scans')
        .select(`
          *,
          events(name),
          ambassadors(full_name)
        `)
        .eq('ambassador_id', ambassador.id)
        .order('scan_time', { ascending: false })
        .limit(200) // Increased limit to get more scans

      if (error) {
        console.error('Failed to load online scans:', error)
      }

      // Load offline scans
      const offlineScans = await getUnsyncedScans()
      
      // Combine and format scans
      const formattedScans: ScanRecord[] = []
      
      // Add online scans
      if (onlineScans && onlineScans.length > 0) {
        console.log('Loaded online scans:', onlineScans.length)
        onlineScans.forEach(scan => {
          formattedScans.push({
            ...scan,
            event_name: scan.events?.name || 'Unknown Event',
            ambassador_name: scan.ambassadors?.full_name || ambassador.full_name
          })
        })
      } else {
        console.log('No online scans found')
      }
      
      // Add offline scans
      if (offlineScans && offlineScans.length > 0) {
        console.log('Loaded offline scans:', offlineScans.length)
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
      } else {
        console.log('No offline scans found')
      }

      console.log('Total formatted scans:', formattedScans.length)
      setScans(formattedScans)
    } catch (error) {
      console.error('Failed to load scans:', error)
    } finally {
      setLoading(false)
    }
  }

  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...')
      
      // Test 1: Check if we can access scans table
      const { error: allScansError } = await supabase
        .from('scans')
        .select('count')
        .limit(1)
      
      if (allScansError) {
        console.error('Error accessing scans table:', allScansError)
      } else {
        console.log('✅ Can access scans table')
      }
      
      // Test 2: Check total scans in database
      const { count: totalScans, error: countError } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        console.error('Error counting scans:', countError)
      } else {
        console.log('Total scans in database:', totalScans)
      }
      
      // Test 3: Check scans for this ambassador
      const { data: ambassadorScans, error: ambassadorError } = await supabase
        .from('scans')
        .select('*')
        .eq('ambassador_id', ambassador.id)
        .limit(10)
      
      if (ambassadorError) {
        console.error('Error loading ambassador scans:', ambassadorError)
      } else {
        console.log('Scans for this ambassador:', ambassadorScans?.length || 0)
        console.log('Ambassador scans:', ambassadorScans)
      }
      
    } catch (error) {
      console.error('Database test error:', error)
    }
  }

  const filteredScans = scans.filter(scan => {
    const matchesSearch = scan.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scan.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scan.scan_result.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'valid' && scan.scan_result === 'valid') ||
                         (filterStatus === 'invalid' && scan.scan_result === 'invalid') ||
                         (filterStatus === 'used' && scan.scan_result === 'already_used') ||
                         (filterStatus === 'pending' && scan.scan_result === 'pending')

    return matchesSearch && matchesStatus
  })

  const exportToCSV = () => {
    const headers = ['Ticket ID', 'Event', 'Status', 'Scan Time', 'Location', 'Device Info']
    const csvContent = [
      headers.join(','),
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-400 bg-green-900/30'
      case 'invalid': return 'text-red-400 bg-red-900/30'
      case 'already_used': return 'text-yellow-400 bg-yellow-900/30'
      case 'pending': return 'text-blue-400 bg-blue-900/30'
      default: return 'text-gray-400 bg-gray-900/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="w-4 h-4" />
      case 'invalid': case 'already_used': return <XCircle className="w-4 h-4" />
      case 'pending': return <RefreshCw className="w-4 h-4" />
      default: return <XCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold">Scan History</h1>
          <div className="flex gap-2">
            <button
              onClick={testDatabaseConnection}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors text-sm"
            >
              Test DB
            </button>
            <button
              onClick={loadScans}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{scans.length}</div>
            <div className="text-sm text-gray-400">Total Scans</div>
          </div>
          <div className="bg-green-900/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {scans.filter(s => s.scan_result === 'valid').length}
            </div>
            <div className="text-sm text-green-300">Valid</div>
          </div>
          <div className="bg-red-900/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {scans.filter(s => s.scan_result === 'invalid').length}
            </div>
            <div className="text-sm text-red-300">Invalid</div>
          </div>
          <div className="bg-yellow-900/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {scans.filter(s => s.scan_result === 'already_used').length}
            </div>
            <div className="text-sm text-yellow-300">Used</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by ticket ID, event, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
            <option value="used">Already Used</option>
            <option value="pending">Pending</option>
          </select>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Debug Info (temporary) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-4 bg-gray-800 rounded-xl border border-gray-600">
          <h3 className="text-sm font-semibold mb-2 text-gray-300">Debug Info</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Total Scans: {scans.length}</div>
            <div>Filtered Scans: {filteredScans.length}</div>
            <div>Ambassador ID: {ambassador.id}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Search Term: "{searchTerm}"</div>
            <div>Filter Status: {filterStatus}</div>
          </div>
        </div>
      )}

      {/* Scan List */}
      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400">Loading scan history...</p>
        </div>
      ) : filteredScans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-lg">No scans found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredScans.map((scan) => (
            <div key={scan.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(scan.scan_result)}
                    <span className="font-semibold text-lg">Ticket: {scan.ticket_id}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(scan.scan_result)}`}>
                      {scan.scan_result.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(scan.scan_time).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{scan.ambassador_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{scan.scan_location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Event:</span>
                      <span>{scan.event_name || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {scan.device_info && (
                <div className="text-xs text-gray-400 mt-3 p-3 bg-gray-700 rounded-lg">
                  <strong>Device:</strong> {scan.device_info}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ScanHistory 
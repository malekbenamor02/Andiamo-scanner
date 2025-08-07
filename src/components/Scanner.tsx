import React, { useState, useEffect, useRef } from 'react'
import { Camera, Wifi, WifiOff, CheckCircle, XCircle, History, LogOut, ArrowRight, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useOfflineStore } from '../hooks/useOfflineStore'
import jsQR from 'jsqr'

interface Event {
  id: string
  name: string
  date: string
}

interface ScanResult {
  success: boolean
  message: string
  ticket?: any
  scanTime?: string
  ambassadorName?: string
  eventName?: string
  qrCode?: string
  deviceInfo?: string
  scanLocation?: string
}

interface ScannerProps {
  ambassador: any
  onNavigateToHistory?: () => void
}

const Scanner: React.FC<ScannerProps> = ({ ambassador, onNavigateToHistory }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'critical'>('healthy')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [offlineData, setOfflineData] = useState<any>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const isScanningRef = useRef(false)
  
  const { addScanRecord } = useOfflineStore()

  useEffect(() => {
    // Check if ambassador is authenticated
    if (ambassador && ambassador.id) {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
      // Redirect to login if not authenticated
      window.location.href = '/'
    }
    
    // Load events
    loadEvents()
    
    // Check online status and system health
    const handleOnline = () => {
      setIsOnline(true)
      setSystemHealth('healthy')
      // Test database connection
      testDatabaseConnection()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setSystemHealth('warning')
    }
    
    // Test database connection periodically
    const testDatabaseConnection = async () => {
      try {
        const { error } = await supabase.from('events').select('count').limit(1)
        if (error) {
          setSystemHealth('critical')
          console.error('Database connection failed:', error)
        } else {
          setSystemHealth('healthy')
          setLastSyncTime(new Date())
        }
      } catch (error) {
        setSystemHealth('critical')
        console.error('Database test failed:', error)
      }
    }
    
    // Test connection every 30 seconds
    const healthCheckInterval = setInterval(testDatabaseConnection, 30000)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Initial health check
    testDatabaseConnection()
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(healthCheckInterval)
    }
  }, [ambassador])

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
      
      if (!error && data) {
        setEvents(data)
        if (data.length > 0) {
          setSelectedEvent(data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    }
  }

  const initializeCamera = async () => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices) {
        throw new Error('Camera API not supported in this browser. Please use a modern browser like Safari, Chrome, or Firefox.')
      }

      // Check if we're on HTTPS or local network (required for iOS)
      const isSecure = location.protocol === 'https:' || 
                      location.hostname === 'localhost' || 
                      location.hostname.includes('192.168.') || 
                      location.hostname.includes('172.') ||
                      location.hostname.includes('10.');
      
      if (!isSecure) {
        throw new Error('Camera access requires HTTPS or local network. Please use HTTPS or connect to localhost/local network.')
      }

      // iOS-compatible camera constraints with optimized settings for QR scanning
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          aspectRatio: { ideal: 1.7777777778 }, // 16:9
          frameRate: { min: 15, ideal: 30, max: 60 }, // Optimized for QR scanning
          focusMode: 'continuous', // Auto-focus for better QR detection
          exposureMode: 'continuous', // Auto-exposure
          whiteBalanceMode: 'continuous' // Auto white balance
        }
      }

      console.log('Requesting camera access...')
      console.log('MediaDevices available:', !!navigator.mediaDevices)
      console.log('getUserMedia available:', !!navigator.mediaDevices.getUserMedia)
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('Camera access granted')

      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true') // Required for iOS
        videoRef.current.setAttribute('autoplay', 'true')
        videoRef.current.setAttribute('muted', 'true')
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            console.log('Setting up video event listeners...')
            
            videoRef.current.onloadedmetadata = () => {
              console.log('Video metadata loaded, attempting to play...')
              videoRef.current?.play().then(() => {
                console.log('Video started playing successfully')
                setIsInitialized(true)
                resolve(true)
              }).catch((error) => {
                console.error('Failed to play video:', error)
                resolve(false)
              })
            }
            
            // Add a timeout fallback in case onloadedmetadata doesn't fire
            setTimeout(() => {
              console.log('Timeout fallback: checking if video is ready...')
              if (videoRef.current && videoRef.current.videoWidth > 0) {
                console.log('Video appears ready via timeout fallback')
                setIsInitialized(true)
                resolve(true)
              } else {
                console.log('Video still not ready after timeout')
                resolve(false)
              }
            }, 3000) // 3 second timeout
          }
        })
      }
    } catch (error) {
      console.error('Failed to initialize camera:', error)
      
      // Provide specific error messages for common issues
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Camera access denied. Please allow camera access in your browser settings.')
        } else if (error.name === 'NotFoundError') {
          alert('No camera found. Please ensure your device has a camera.')
        } else if (error.name === 'NotSupportedError') {
          alert('Camera not supported. Please try a different browser or device.')
        } else {
          alert(`Camera error: ${error.message}`)
        }
      } else {
        alert('Failed to access camera. Please check your browser settings.')
      }
    }
  }

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsInitialized(false)
  }

  const detectQR = () => {
    // Add a simple counter to track if scanning is running
    if (!(window as any).scanCount) (window as any).scanCount = 0
    ;(window as any).scanCount++
    
    // Log every 50th scan to avoid spam
    if ((window as any).scanCount % 50 === 0) {
      console.log(`Scan attempt #${(window as any).scanCount}, isScanning:`, isScanning)
    }
    
    if (!videoRef.current || !canvasRef.current || !isScanningRef.current) {
      console.log('Scanning stopped or video not ready')
      console.log('videoRef.current:', !!videoRef.current)
      console.log('canvasRef.current:', !!canvasRef.current)
      console.log('isScanningRef.current:', isScanningRef.current)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      console.log('Canvas context not available')
      return
    }

    // Check if video is ready
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight)
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video not ready yet, retrying...')
      animationRef.current = requestAnimationFrame(detectQR)
      return
    }

    console.log('Video ready, scanning for QR codes...')

    try {
    // Set canvas dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for QR detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
      // Simple QR detection with error handling
      let code = null
      
      try {
        // Try standard detection first
        code = jsQR(imageData.data, imageData.width, imageData.height)
        console.log('Standard QR detection attempt completed')
      } catch (error) {
        console.log('QR detection error (standard):', error)
      }
      
      // If no code found, try with different settings
      if (!code) {
        try {
          code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          })
          console.log('Inversion QR detection attempt completed')
        } catch (error) {
          console.log('QR detection error (inversion):', error)
        }
      }
      
      if (code && code.data) {
      console.log('QR Code detected:', code.data)
        
        // Prevent rapid re-scanning of the same QR code
        if (isProcessingQR || lastScannedCode === code.data) {
          console.log('Skipping QR code - already processing or recently scanned')
      return
    }

        setDetectionMessage(`🎯 QR Code Detected: ${code.data}`)
        setIsProcessingQR(true)
        
        // Automatically analyze the QR code
        handleScanResult(code.data)
        
        // Don't return here - continue scanning for next QR code
      } else {
        // Only log occasionally to avoid spam
        if ((window as any).scanCount % 50 === 0) {
          console.log('No QR code found in this frame')
        }
      }

      // No QR code detected - show message much less frequently
      if (!detectionMessage && (window as any).scanCount % 100 === 0) {
        setDetectionMessage('🔍 Scanning... No QR code detected')
        // Clear the "no QR code" message after 3 seconds
        setTimeout(() => {
          setDetectionMessage(prev => prev === '🔍 Scanning... No QR code detected' ? '' : prev)
        }, 3000)
      }

    } catch (error) {
      console.error('Canvas/Video error:', error)
      // Continue scanning even if there's an error
    }

    // Continue scanning with a small delay for better performance
    setTimeout(() => {
      if (isScanningRef.current) {
        // Only log occasionally to avoid spam
        if ((window as any).scanCount % 100 === 0) {
          console.log('Continuing scan loop...')
        }
    animationRef.current = requestAnimationFrame(detectQR)
      } else {
        console.log('Scanning stopped, not continuing loop')
      }
    }, 200) // 200ms delay between scans for better performance
  }

  const [lastScannedCode, setLastScannedCode] = useState<string>('')
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [detectionMessage, setDetectionMessage] = useState<string>('')
  const [isProcessingQR, setIsProcessingQR] = useState(false)
  const [showNextButton, setShowNextButton] = useState(false)


  const handleScanResult = async (qrData: string) => {
    if (!selectedEvent) {
      alert('Please select an event first')
      return
    }

    // Prevent duplicate scans of the same QR code
    if (lastScannedCode === qrData) {
      return
    }

    setLastScannedCode(qrData)

    const deviceInfo = `${navigator.userAgent} - ${navigator.platform}`
    const scanLocation = 'Event Venue'

    const scanData = {
      qrCode: qrData,
      eventId: selectedEvent,
      ambassadorId: ambassador.id,
      deviceInfo,
      scanLocation
    }

    let result: ScanResult

    if (isOnline) {
      try {
        // Check if ticket exists in tickets table
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .select('*')
          .eq('qr_code', qrData)
          .in('status', ['active', 'used'])
          .single()

        if (ticketError || !ticket) {
          // Ticket not found in database
          try {
            const { error: scanError } = await supabase.from('scans').insert({
            ticket_id: qrData,
            event_id: selectedEvent,
            ambassador_id: ambassador.id,
            device_info: deviceInfo,
            scan_location: scanLocation,
            scan_time: new Date().toISOString(),
              scan_result: 'invalid'
          })

            if (scanError) {
              console.error('Error recording invalid scan:', scanError)
          } else {
              console.log('✅ Invalid scan recorded successfully:', {
                ticket_id: qrData,
                event_id: selectedEvent,
                ambassador_id: ambassador.id,
                scan_result: 'invalid'
              })
            }

            result = { success: false, message: '❌ Invalid ticket - not found in database' }
        } catch (error) {
          console.error('Database error:', error)
          await addScanRecord(scanData)
            result = { success: false, message: '❌ Invalid ticket - stored offline' }
        }
      } else {
          // Ticket found - check if it's for the correct event
          if (ticket.event_id !== selectedEvent) {
        try {
          await supabase.from('scans').insert({
            ticket_id: qrData,
            event_id: selectedEvent,
            ambassador_id: ambassador.id,
            device_info: deviceInfo,
            scan_location: scanLocation,
            scan_time: new Date().toISOString(),
                scan_result: 'wrong_event'
              })
              result = { success: false, message: '❌ Ticket is for a different event' }
            } catch (error) {
              console.error('Database error:', error)
              await addScanRecord(scanData)
              result = { success: false, message: '❌ Wrong event ticket - stored offline' }
            }
          } else {
            // Check if ticket is already used
            if (ticket.status === 'used') {
              // Ticket already used
              try {
                const { error: scanError } = await supabase.from('scans').insert({
                  ticket_id: qrData,
                  event_id: selectedEvent,
                  ambassador_id: ambassador.id,
                  device_info: deviceInfo,
                  scan_location: scanLocation,
                  scan_time: new Date().toISOString(),
                  scan_result: 'already_used'
                })

                if (scanError) {
                  console.error('Error recording already used scan:', scanError)
                } else {
                  console.log('✅ Already used scan recorded successfully:', {
                    ticket_id: qrData,
                    event_id: selectedEvent,
                    ambassador_id: ambassador.id,
                    scan_result: 'already_used'
                  })
                }

                result = { 
                  success: false, 
                  message: `⚠️ Ticket already used! Customer: ${ticket.customer_name}, Type: ${ticket.ticket_type}`,
                  ticket: ticket
                }
              } catch (error) {
                console.error('Database error:', error)
                await addScanRecord(scanData)
                result = { 
                  success: false, 
                  message: `⚠️ Ticket already used - stored offline. Customer: ${ticket.customer_name}`,
                  ticket: ticket
                }
              }
            } else {
              // Valid ticket, first time scanning
              try {
                // Record the scan
                const { error: scanError } = await supabase.from('scans').insert({
                  ticket_id: qrData,
                  event_id: selectedEvent,
                  ambassador_id: ambassador.id,
                  device_info: deviceInfo,
                  scan_location: scanLocation,
                  scan_time: new Date().toISOString(),
                  scan_result: 'valid'
                })

                if (scanError) {
                  console.error('Error recording scan:', scanError)
                } else {
                  console.log('✅ Scan recorded successfully:', {
                    ticket_id: qrData,
                    event_id: selectedEvent,
                    ambassador_id: ambassador.id,
                    scan_result: 'valid'
                  })
                }

                // Mark ticket as used in tickets table
                const { error: updateError } = await supabase
                  .from('tickets')
                  .update({ status: 'used' })
                  .eq('qr_code', qrData)

                if (updateError) {
                  console.error('Error updating ticket status:', updateError)
                } else {
                  console.log('✅ Ticket status updated to "used":', qrData)
                }

                result = { 
                  success: true, 
                  message: `✅ Valid ticket scanned! Customer: ${ticket.customer_name}, Type: ${ticket.ticket_type}`,
                  ticket: ticket
                }
        } catch (error) {
          console.error('Database error:', error)
          await addScanRecord(scanData)
                result = { 
                  success: true, 
                  message: `✅ Valid ticket - stored offline. Customer: ${ticket.customer_name}`,
                  ticket: ticket
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Database error:', error)
        await addScanRecord(scanData)
        result = { success: false, message: '❌ Database error - stored offline' }
      }
    } else {
      // Offline mode - use simple validation as fallback
      await addScanRecord(scanData)
      const qrDataUpper = qrData.toUpperCase()
      const isValidTicket = qrDataUpper.includes('TICKET') || qrDataUpper.includes('ANDIAMO')
      result = { 
        success: isValidTicket, 
        message: isValidTicket ? '✅ Valid ticket - stored offline' : '❌ Invalid ticket - stored offline' 
      }
    }

    // Get current event name
    const currentEvent = events.find(e => e.id === selectedEvent)
    
    // Create detailed result with all scan information
    const detailedResult: ScanResult = {
      ...result,
      scanTime: new Date().toLocaleString(),
      ambassadorName: ambassador?.full_name || 'Unknown',
      eventName: currentEvent?.name || 'Unknown Event',
      qrCode: qrData,
      deviceInfo: deviceInfo,
      scanLocation: scanLocation
    }

    // Add to scan history
    setScanHistory(prev => [detailedResult, ...prev.slice(0, 4)]) // Keep last 5 scans
    setScanResult(detailedResult)

    // Clear the last scanned code after 3 seconds to allow re-scanning
    setTimeout(() => setLastScannedCode(''), 3000)
    
    // Clear detection message after 2 seconds
    setTimeout(() => setDetectionMessage(''), 2000)
    
    // Clear scan result after 5 seconds
    setTimeout(() => setScanResult(null), 5000)
    
    // Show next button after 2 seconds
    setTimeout(() => {
      console.log('Showing Next button...')
      setShowNextButton(true)
    }, 2000)
    
    // Reset processing state after 4 seconds to allow new scans
    setTimeout(() => {
      setIsProcessingQR(false)
      console.log('QR processing cooldown finished - ready for new scans')
    }, 4000)
  }

  const startScanning = async () => {
    if (!selectedEvent) {
      alert('Please select an event first')
      return
    }

    console.log('Starting scanning...')
    setIsScanning(true)
    isScanningRef.current = true
    await initializeCamera()
    console.log('Camera initialized, waiting for video to be ready...')
    
    // Wait a bit for video to be fully ready
    setTimeout(() => {
      console.log('Starting QR detection after delay...')
      console.log('isScanningRef.current:', isScanningRef.current)
    detectQR()
    }, 1000) // Wait 1 second for video to be ready
  }

  const stopScanning = () => {
    setIsScanning(false)
    isScanningRef.current = false
    stopCamera()
  }

  const handleNextScan = () => {
    // Clear all scan-related states
    setScanResult(null)
    setDetectionMessage('')
    setLastScannedCode('')
    setIsProcessingQR(false)
    setShowNextButton(false)
    
    // Reset scan counter for fresh start
    if ((window as any).scanCount) {
      (window as any).scanCount = 0
    }
    
    console.log('Ready for next scan')
  }

  const downloadOfflineData = async () => {
    if (!selectedEvent) {
      alert('Please select an event first')
      return
    }

    setIsDownloading(true)
    try {
      // Download tickets for the selected event
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('event_id', selectedEvent)

      if (ticketsError) {
        throw ticketsError
      }

      // Download event data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', selectedEvent)
        .single()

      if (eventError) {
        throw eventError
      }

      // Store in IndexedDB for offline use
      const offlineData = {
        tickets: tickets || [],
        event: eventData,
        downloadedAt: new Date().toISOString(),
        eventId: selectedEvent
      }

      // Store in localStorage for simplicity (or use IndexedDB)
      localStorage.setItem('offlineData', JSON.stringify(offlineData))
      setOfflineData(offlineData)

      alert(`✅ Downloaded ${tickets?.length || 0} tickets for offline use`)
      console.log('Offline data downloaded:', offlineData)
    } catch (error) {
      console.error('Failed to download offline data:', error)
      alert('❌ Failed to download offline data. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }







  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Authentication Check */}
      {!isAuthenticated ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-gray-300 mb-6">Please log in to access the scanner</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold"
            >
              Go to Login
            </button>
          </div>
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="mb-6">
        <div className="text-center mb-4">
              <h1 className="text-3xl font-bold mb-2 text-white">QR Scanner</h1>
              <p className="text-gray-300 text-lg">Welcome, {ambassador?.full_name}</p>
          
                        {/* System Health Status */}
              <div className="flex items-center justify-center gap-2 mt-3">
                {/* Connection Status */}
                {isOnline ? (
                  <div className="flex items-center bg-green-900/50 px-3 py-1 rounded-full">
                    <Wifi className="w-4 h-4 text-green-400 mr-2" />
                    <span className="text-sm text-green-300">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center bg-red-900/50 px-3 py-1 rounded-full">
                    <WifiOff className="w-4 h-4 text-red-400 mr-2" />
                    <span className="text-sm text-red-300">Offline</span>
                  </div>
                )}
                
                {/* System Health Indicator */}
                <div className={`flex items-center px-3 py-1 rounded-full ${
                  systemHealth === 'healthy' ? 'bg-green-900/50' :
                  systemHealth === 'warning' ? 'bg-yellow-900/50' :
                  'bg-red-900/50'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    systemHealth === 'healthy' ? 'bg-green-400' :
                    systemHealth === 'warning' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`}></div>
                  <span className={`text-sm ${
                    systemHealth === 'healthy' ? 'text-green-300' :
                    systemHealth === 'warning' ? 'text-yellow-300' :
                    'text-red-300'
                  }`}>
                    {systemHealth === 'healthy' ? 'Healthy' :
                     systemHealth === 'warning' ? 'Warning' :
                     'Critical'}
                  </span>
                </div>
                
                {/* Last Sync Time */}
                {lastSyncTime && (
                  <div className="text-xs text-gray-400">
                    Sync: {lastSyncTime.toLocaleTimeString()}
                  </div>
                )}
              </div>
        </div>
      </div>

                {/* Event Selection */}
          <div className="mb-6">
            <label className="block text-lg font-semibold mb-3 text-white">Select Event</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full p-4 bg-gray-800 border-2 border-gray-700 rounded-xl text-white text-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="">Choose an event...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.date).toLocaleDateString()}
                </option>
              ))}
            </select>
            
            {/* Download Offline Data Button */}
            {selectedEvent && (
              <div className="mt-3">
                <button
                  onClick={downloadOfflineData}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-3 rounded-xl font-semibold text-white transition-colors"
                >
                  {isDownloading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download Offline Data
                    </>
                  )}
                </button>
                {offlineData && (
                  <div className="mt-2 text-sm text-green-400 text-center">
                    ✅ {offlineData.tickets?.length || 0} tickets available offline
                  </div>
                )}
              </div>
            )}
          </div>

      {/* Camera Feed */}
      <div className="mb-6">
        <div className="relative">
          <video
            ref={videoRef}
                className={`w-full h-80 object-cover rounded-xl border-4 ${
              isInitialized ? 'border-green-500' : 'border-gray-600'
            }`}
            autoPlay
            playsInline
            muted
            webkit-playsinline="true"
            x5-playsinline="true"
            x5-video-player-type="h5"
            x5-video-player-fullscreen="true"
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {/* Scanning Overlay */}
          {isScanning && isInitialized && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-4 border-green-500 rounded-xl bg-transparent w-64 h-64"></div>
            </div>
          )}

              {/* Scan Result Message */}
              {scanResult ? (
                <div className={`absolute top-4 left-4 right-4 p-4 rounded-xl text-center font-semibold text-lg shadow-lg ${
                  scanResult.success 
                    ? 'bg-green-600 text-white' 
                    : scanResult.message.includes('already used')
                    ? 'bg-yellow-600 text-white'
                    : 'bg-red-600 text-white'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {scanResult.success ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : scanResult.message.includes('already used') ? (
                      <XCircle className="w-6 h-6" />
                    ) : (
                      <XCircle className="w-6 h-6" />
                    )}
                    <span className="text-xl">
                      {scanResult.success 
                        ? '✅ Valid Ticket' 
                        : scanResult.message.includes('already used')
                        ? '⚠️ Already Used'
                        : '❌ Invalid Ticket'
                      }
                    </span>
                  </div>
                  <p className="text-base">{scanResult.message}</p>
                </div>
              ) : detectionMessage ? (
                <div className="absolute top-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-xl text-center font-semibold text-lg shadow-lg">
              {detectionMessage}
            </div>
              ) : null}
          
          {/* Status Badge */}
          {isInitialized && (
                <div className="absolute top-4 right-4 bg-green-600 text-white text-sm px-3 py-1 rounded-full font-semibold">
              LIVE
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
        {!isScanning ? (
          <button
            onClick={startScanning}
            disabled={!selectedEvent}
                className="flex-1 flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-4 rounded-xl font-semibold text-lg transition-colors"
          >
                <Camera className="w-6 h-6" />
            Start Scanning
          </button>
        ) : (
          <button
            onClick={stopScanning}
                className="flex-1 flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 px-6 py-4 rounded-xl font-semibold text-lg transition-colors"
          >
                <XCircle className="w-6 h-6" />
            Stop Scanning
          </button>
        )}
      </div>





          {/* Scan Results */}
          <div className="space-y-4">
            {/* Current Scan Result */}
            {scanResult && (
              <div className={`p-6 rounded-xl border-2 ${
                scanResult.success 
                  ? 'bg-green-900/50 border-green-500' 
                  : scanResult.message.includes('already used')
                  ? 'bg-yellow-900/50 border-yellow-500'
                  : 'bg-red-900/50 border-red-500'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  {scanResult.success ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : scanResult.message.includes('already used') ? (
                    <XCircle className="w-6 h-6 text-yellow-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                  <span className="text-xl font-semibold">
                    {scanResult.success 
                      ? 'Valid Ticket' 
                      : scanResult.message.includes('already used')
                      ? 'Ticket Already Used'
                      : 'Invalid Ticket'
                    }
                  </span>
                </div>
                
                {/* Main Result Message */}
                <p className="text-lg text-gray-200 mb-4">{scanResult.message}</p>
                
                {/* Detailed Scan Information */}
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-gray-300 mb-3">📋 Scan Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🕒 Time:</span>
                      <span className="text-gray-200">{scanResult.scanTime}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">👤 Ambassador:</span>
                      <span className="text-gray-200">{scanResult.ambassadorName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🎫 Event:</span>
                      <span className="text-gray-200">{scanResult.eventName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📍 Location:</span>
                      <span className="text-gray-200">{scanResult.scanLocation}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📱 Device:</span>
                      <span className="text-gray-200 text-xs">{scanResult.deviceInfo?.split(' - ')[1] || 'Unknown'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🔗 QR Code:</span>
                      <span className="text-gray-200 text-xs font-mono">{scanResult.qrCode}</span>
                    </div>
                  </div>
                  
                  {/* Ticket Details (if available) */}
                  {scanResult.ticket && (
                    <div className="mt-4 pt-3 border-t border-gray-700">
                      <h5 className="font-semibold text-gray-300 mb-2">🎫 Ticket Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">👤 Customer:</span>
                          <span className="text-gray-200">{scanResult.ticket.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">🎫 Type:</span>
                          <span className="text-gray-200">{scanResult.ticket.ticket_type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📊 Status:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            scanResult.ticket.status === 'active' ? 'bg-green-600 text-white' :
                            scanResult.ticket.status === 'used' ? 'bg-yellow-600 text-white' :
                            'bg-red-600 text-white'
                          }`}>
                            {scanResult.ticket.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Next Button */}
            {showNextButton && scanResult && (
              <>
                {console.log('Next button should be visible - showNextButton:', showNextButton, 'scanResult:', !!scanResult)}
              </>
            )}
            {showNextButton && scanResult && (
              <div className="flex justify-center mb-6">
                <button
                  onClick={handleNextScan}
                  className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg"
                >
                  <ArrowRight className="w-6 h-6" />
                  Next Scan
                </button>
              </div>
            )}

            {/* Debug: Always show Next button for testing */}
            <div className="flex justify-center mb-6">
              <button
                onClick={handleNextScan}
                className="flex items-center gap-3 bg-green-600 hover:bg-green-700 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg"
              >
                <ArrowRight className="w-6 h-6" />
                Test Next Scan (Always Visible)
              </button>
            </div>

            {/* Scan History */}
            {scanHistory.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Recent Scans</h3>
                <div className="space-y-3">
                  {scanHistory.slice(1).map((result, index) => (
                    <div key={index} className={`p-4 rounded-lg ${
                      result.success 
                        ? 'bg-green-900/30 border border-green-500/30' 
                        : result.message.includes('already used')
                        ? 'bg-yellow-900/30 border border-yellow-500/30'
                        : 'bg-red-900/30 border border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                      {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : result.message.includes('already used') ? (
                          <XCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        <div className="font-medium text-sm">
                          {result.success 
                            ? 'Valid' 
                            : result.message.includes('already used')
                            ? 'Already Used'
                            : 'Invalid'
                          }
                        </div>
                        <div className="text-xs text-gray-400 ml-auto">
                          {result.scanTime}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400 mb-2">{result.message}</div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>👤 {result.ambassadorName}</div>
                        <div>🎫 {result.eventName}</div>
                        <div>🔗 {result.qrCode?.substring(0, 8)}...</div>
                        {result.ticket && (
                          <div>👤 {result.ticket.customer_name}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

                {/* System Status Alerts */}
          {systemHealth === 'critical' && (
            <div className="mt-6 p-4 bg-red-900/50 border border-red-600 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                <h3 className="text-red-200 font-semibold">System Critical</h3>
              </div>
              <p className="text-red-200 text-sm">
                Database connection failed. Scans will be stored offline. Contact support if this persists.
              </p>
            </div>
          )}
          
          {!isOnline && systemHealth !== 'critical' && (
            <div className="mt-6 p-4 bg-yellow-900/50 border border-yellow-600 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <h3 className="text-yellow-200 font-semibold">Offline Mode</h3>
              </div>
              <p className="text-yellow-200 text-sm">
                No internet connection. Scans will be stored offline and synced when connection is restored.
              </p>
            </div>
          )}
          
          {systemHealth === 'warning' && isOnline && (
            <div className="mt-6 p-4 bg-yellow-900/50 border border-yellow-600 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <h3 className="text-yellow-200 font-semibold">Connection Warning</h3>
              </div>
              <p className="text-yellow-200 text-sm">
                Database connection is slow. Scans may be delayed.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={() => {
                if (onNavigateToHistory) {
                  onNavigateToHistory()
                } else {
                  // Fallback to URL navigation
                  window.location.href = '/#/history'
                }
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium transition-colors"
            >
              <History className="w-5 h-5" />
              View History
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('ambassador')
                window.location.reload()
              }}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Scanner 
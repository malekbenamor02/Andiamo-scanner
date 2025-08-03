import React, { useState, useEffect, useRef } from 'react'
import { Camera, Wifi, WifiOff, CheckCircle, XCircle, History } from 'lucide-react'
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
}

interface ScannerProps {
  ambassador: any
}

const Scanner: React.FC<ScannerProps> = ({ ambassador }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  
  const { addScanRecord } = useOfflineStore()

  useEffect(() => {
    // Load events
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

      // iOS-compatible camera constraints
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          aspectRatio: { ideal: 1.7777777778 }, // 16:9
          frameRate: { ideal: 30 }
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
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(() => {
                setIsInitialized(true)
                resolve(true)
              }).catch((error) => {
                console.error('Failed to play video:', error)
                resolve(false)
              })
            }
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
    if (!videoRef.current || !canvasRef.current || !isScanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Check if video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      animationRef.current = requestAnimationFrame(detectQR)
      return
    }

    // Set canvas dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for QR detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Debug: Log canvas dimensions
    if (debugMode) {
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height)
      console.log('Image data size:', imageData.data.length)
    }
    
    // Use jsQR for QR detection
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    
    if (code) {
      console.log('QR Code detected:', code.data)
      setDetectionMessage(`🎯 QR Code Detected: ${code.data}`)
      handleScanResult(code.data)
      return
    }

    // Continue scanning
    animationRef.current = requestAnimationFrame(detectQR)
  }

  const [lastScannedCode, setLastScannedCode] = useState<string>('')
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [detectionMessage, setDetectionMessage] = useState<string>('')
  const [debugMode, setDebugMode] = useState(false)

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
      // Try to validate online
      try {
        const response = await fetch('/api/validate-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scanData)
        })

        result = await response.json()
        
        if (result.success) {
          // Record scan in database
          await supabase.from('scans').insert({
            ticket_id: qrData,
            event_id: selectedEvent,
            ambassador_id: ambassador.id,
            device_info: deviceInfo,
            scan_location: scanLocation,
            scan_time: new Date().toISOString(),
            scan_result: 'valid'
          })
        }
      } catch (error) {
        console.error('Online validation failed:', error)
        // Fall back to offline storage
        await addScanRecord(scanData)
        result = { success: false, message: 'Stored offline for later sync' }
      }
    } else {
      // Store offline
      await addScanRecord(scanData)
      result = { success: true, message: 'Stored offline for later sync' }
    }

    // Add to scan history
    setScanHistory(prev => [result, ...prev.slice(0, 4)]) // Keep last 5 scans
    setScanResult(result)

    // Clear the last scanned code after 3 seconds to allow re-scanning
    setTimeout(() => setLastScannedCode(''), 3000)
    
    // Clear detection message after 2 seconds
    setTimeout(() => setDetectionMessage(''), 2000)
  }

  const startScanning = async () => {
    if (!selectedEvent) {
      alert('Please select an event first')
      return
    }

    setIsScanning(true)
    await initializeCamera()
    detectQR()
  }

  const stopScanning = () => {
    setIsScanning(false)
    stopCamera()
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-2">QR Scanner</h1>
          <p className="text-gray-400">Welcome, {ambassador?.full_name}</p>
          
          {/* Online/Offline Status */}
          <div className="flex items-center justify-center mt-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500 mr-2" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500 mr-2" />
            )}
            <span className="text-sm">
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => window.location.href = '/history'}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
          >
            <History className="w-4 h-4" />
            View History
          </button>
        </div>
      </div>

      {/* Event Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Event</label>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="">Choose an event...</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.name} - {new Date(event.date).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* Camera Feed */}
      <div className="mb-6">
        <div className="relative">
          <video
            ref={videoRef}
            className={`w-full h-64 object-cover rounded-lg border-2 ${
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
              <div className="border-2 border-green-500 rounded-lg bg-transparent w-48 h-48"></div>
            </div>
          )}

          {/* Detection Message */}
          {detectionMessage && (
            <div className="absolute top-4 left-4 right-4 bg-green-600 text-white p-3 rounded-lg text-center font-medium">
              {detectionMessage}
            </div>
          )}
          
          {/* Status Badge */}
          {isInitialized && (
            <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
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
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-medium"
          >
            <Camera className="w-5 h-5" />
            Start Scanning
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg font-medium"
          >
            <XCircle className="w-5 h-5" />
            Stop Scanning
          </button>
        )}
      </div>

      {/* Debug Controls */}
      <div className="mb-4 space-y-2">
        <button
          onClick={() => handleScanResult('TICKET-001-ANDIAMO-2024')}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
        >
          🧪 Test QR Detection (Manual)
        </button>
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm ${
            debugMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          {debugMode ? '🔇 Disable Debug' : '🔊 Enable Debug'}
        </button>
      </div>

      {/* Scan Results */}
      <div className="space-y-3">
        {/* Current Scan Result */}
        {scanResult && (
          <div className={`p-4 rounded-lg border ${
            scanResult.success 
              ? 'bg-green-900 border-green-500' 
              : 'bg-red-900 border-red-500'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {scanResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className="font-medium">
                {scanResult.success ? 'Valid Ticket' : 'Invalid Ticket'}
              </span>
            </div>
            <p className="text-sm text-gray-300">{scanResult.message}</p>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3">
            <h3 className="text-sm font-medium mb-2 text-gray-300">Recent Scans</h3>
            <div className="space-y-2">
              {scanHistory.slice(1).map((result, index) => (
                <div key={index} className={`flex items-center gap-2 p-2 rounded ${
                  result.success ? 'bg-green-900/50' : 'bg-red-900/50'
                }`}>
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs text-gray-300">
                    {result.success ? 'Valid' : 'Invalid'} - {result.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Offline Queue Info */}
      {!isOnline && (
        <div className="mt-4 p-3 bg-yellow-900 border border-yellow-600 rounded-lg">
          <p className="text-sm text-yellow-200">
            Scans will be stored offline and synced when connection is restored.
          </p>
        </div>
      )}
    </div>
  )
}

export default Scanner 
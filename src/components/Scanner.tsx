import React, { useState, useEffect, useRef } from 'react'
import { Camera, Wifi, WifiOff, CheckCircle, XCircle, History, Image } from 'lucide-react'
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
    
    // Use jsQR for QR detection
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    
    if (code) {
      console.log('QR Code detected:', code.data)
      setDetectionMessage(`🎯 QR Code Detected: ${code.data}`)
      // Automatically analyze the QR code
      handleScanResult(code.data)
      return
    }

    // No QR code detected - show message
    if (!detectionMessage || !detectionMessage.includes('No QR code')) {
      setDetectionMessage('🔍 Scanning... No QR code detected')
      // Clear the "no QR code" message after 3 seconds
      setTimeout(() => {
        setDetectionMessage(prev => prev === '🔍 Scanning... No QR code detected' ? '' : prev)
      }, 3000)
    }

    // Continue scanning
    animationRef.current = requestAnimationFrame(detectQR)
  }

  const [lastScannedCode, setLastScannedCode] = useState<string>('')
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [detectionMessage, setDetectionMessage] = useState<string>('')
  const [capturedImage, setCapturedImage] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
            await supabase.from('scans').insert({
              ticket_id: qrData,
              event_id: selectedEvent,
              ambassador_id: ambassador.id,
              device_info: deviceInfo,
              scan_location: scanLocation,
              scan_time: new Date().toISOString(),
              scan_result: 'invalid'
            })
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
                await supabase.from('scans').insert({
                  ticket_id: qrData,
                  event_id: selectedEvent,
                  ambassador_id: ambassador.id,
                  device_info: deviceInfo,
                  scan_location: scanLocation,
                  scan_time: new Date().toISOString(),
                  scan_result: 'already_used'
                })
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

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Convert canvas to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageDataUrl)
    
    // Automatically analyze the captured image for QR codes
    analyzeImageForQR(canvas)
  }

  const analyzeImageForQR = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Use jsQR to detect QR codes in the image
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    
    if (code) {
      console.log('QR Code found in captured image:', code.data)
      setDetectionMessage(`📸 QR Code detected in photo: ${code.data}`)
      // Automatically process the QR code
      handleScanResult(code.data)
    } else {
      console.log('No QR code found in captured image')
      setDetectionMessage('📸 No QR code found in captured image')
      setTimeout(() => setDetectionMessage(''), 3000)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        setCapturedImage(e.target?.result as string)
        analyzeImageForQR(canvas)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
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
        
        <button
          onClick={capturePhoto}
          disabled={!isInitialized}
          className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-medium"
        >
          <Image className="w-5 h-5" />
          Capture & Analyze
        </button>
      </div>

      {/* File Upload (Hidden but accessible) */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm"
        >
          📁 Upload Photo to Analyze
        </button>
      </div>

          {/* Captured Image Display */}
          {capturedImage && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 text-gray-300">Captured Image</h3>
              <div className="relative">
                <img 
                  src={capturedImage} 
                  alt="Captured QR code" 
                  className="w-full h-32 object-cover rounded-lg border border-gray-600"
                />
                <button
                  onClick={() => setCapturedImage('')}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Scan Results */}
          <div className="space-y-3">
            {/* Current Scan Result */}
            {scanResult && (
              <div className={`p-4 rounded-lg border ${
                scanResult.success 
                  ? 'bg-green-900 border-green-500' 
                  : scanResult.message.includes('already used')
                  ? 'bg-yellow-900 border-yellow-500'
                  : 'bg-red-900 border-red-500'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {scanResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : scanResult.message.includes('already used') ? (
                    <XCircle className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className="font-medium">
                    {scanResult.success 
                      ? 'Valid Ticket' 
                      : scanResult.message.includes('already used')
                      ? 'Ticket Already Used'
                      : 'Invalid Ticket'
                    }
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
                      result.success 
                        ? 'bg-green-900/50' 
                        : result.message.includes('already used')
                        ? 'bg-yellow-900/50'
                        : 'bg-red-900/50'
                    }`}>
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : result.message.includes('already used') ? (
                        <XCircle className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-xs text-gray-300">
                        {result.success 
                          ? 'Valid' 
                          : result.message.includes('already used')
                          ? 'Already Used'
                          : 'Invalid'
                        } - {result.message}
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
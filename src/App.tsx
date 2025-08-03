import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Scanner from './components/Scanner'
import Login from './components/Login'
import OfflineQueue from './components/OfflineQueue'
import ScanHistory from './components/ScanHistory'
import { useOfflineStore } from './hooks/useOfflineStore'
import './App.css'

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Auto-authenticate for testing
  const [ambassador, setAmbassador] = useState<any>({
    id: '7530c1e1-5fc0-4891-9fbb-4639ee8aafac',
    full_name: 'Malek Ben Amor',
    phone: '27169458'
  })
  const { syncOfflineData } = useOfflineStore()

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Sync offline data when coming back online
    if (isOnline) {
      syncOfflineData()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isOnline, syncOfflineData])

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Online/Offline Status */}
        <div className={`fixed top-0 left-0 right-0 z-50 p-2 text-center text-sm ${
          isOnline ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>

        <div className="pt-12">
          <Routes>
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  <Scanner ambassador={ambassador} />
                ) : (
                  <Login onLogin={setIsAuthenticated} setAmbassador={setAmbassador} />
                )
              } 
            />
            <Route 
              path="/ambassador" 
              element={
                isAuthenticated ? (
                  <Scanner ambassador={ambassador} />
                ) : (
                  <Login onLogin={setIsAuthenticated} setAmbassador={setAmbassador} />
                )
              } 
            />
            <Route 
              path="/offline-queue" 
              element={<OfflineQueue />} 
            />
            <Route 
              path="/history" 
              element={
                isAuthenticated ? (
                  <ScanHistory ambassador={ambassador} />
                ) : (
                  <Login onLogin={setIsAuthenticated} setAmbassador={setAmbassador} />
                )
              } 
            />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App 
import { useState, useEffect } from 'react'
import Scanner from './components/Scanner'
import Login from './components/Login'
import ScanHistory from './components/ScanHistory'
import './App.css'

interface Ambassador {
  id: string
  full_name: string
  phone: string
  status: string
}

function App() {
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null)
  const [currentPage, setCurrentPage] = useState<'login' | 'scanner' | 'history'>('login')

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const savedAmbassador = localStorage.getItem('ambassador')
    if (savedAmbassador) {
      try {
        const parsedAmbassador = JSON.parse(savedAmbassador)
        setAmbassador(parsedAmbassador)
        setCurrentPage('scanner')
      } catch (error) {
        console.error('Error parsing saved ambassador:', error)
        localStorage.removeItem('ambassador')
      }
    }
  }, [])

  const handleLogin = (ambassadorData: Ambassador) => {
    setAmbassador(ambassadorData)
    // Save to localStorage for persistence
    localStorage.setItem('ambassador', JSON.stringify(ambassadorData))
    setCurrentPage('scanner')
  }



  const handleNavigateToHistory = () => {
    setCurrentPage('history')
  }

  const handleNavigateToScanner = () => {
    setCurrentPage('scanner')
  }

  // Show login page if not authenticated
  if (!ambassador) {
    return <Login onLogin={handleLogin} />
  }

  // Show appropriate page based on current state
  switch (currentPage) {
    case 'history':
      return <ScanHistory 
        ambassador={ambassador} 
        onNavigateBack={handleNavigateToScanner}
      />
    case 'scanner':
    default:
      return <Scanner 
        ambassador={ambassador} 
        onNavigateToHistory={handleNavigateToHistory}
      />
  }
}

export default App 
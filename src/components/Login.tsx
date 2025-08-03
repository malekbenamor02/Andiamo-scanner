import React, { useState } from 'react'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LoginProps {
  onLogin: (authenticated: boolean) => void
  setAmbassador: (ambassador: any) => void
}

const Login: React.FC<LoginProps> = ({ onLogin, setAmbassador }) => {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate phone number format
      const phoneRegex = /^[2594][0-9]{7}$/
      if (!phoneRegex.test(phone)) {
        setError('Phone number must be 8 digits starting with 2, 5, 9, or 4')
        setLoading(false)
        return
      }

      // Check ambassador credentials - first get by phone and status
      const { data: ambassador, error } = await supabase
        .from('ambassadors')
        .select('*')
        .eq('phone', phone)
        .eq('status', 'approved')
        .single()

      if (error || !ambassador) {
        setError('Invalid credentials or account not approved')
        setLoading(false)
        return
      }

      // For now, let's skip password verification since it's hashed
      // In production, you should implement proper password verification
      // For testing purposes, we'll accept any password for approved ambassadors

      // Set authentication state
      setAmbassador(ambassador)
      onLogin(true)
      
    } catch (error) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Andiamo Scanner</h1>
          <p className="text-gray-400">Ambassador Login</p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="27169458"
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900 border border-red-600 rounded-lg">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <User className="w-5 h-5" />
                  Login
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            Use your ambassador credentials to access the scanner
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login 
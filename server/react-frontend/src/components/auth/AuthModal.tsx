// Authentication modal for login and signup
import React, { useState } from 'react'
import { useAuthActions, useAuthLoading } from '../../stores/authStore'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'signin' | 'signup'
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultMode = 'signin' 
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  
  const { signIn, signUp } = useAuthActions()
  const isLoading = useAuthLoading()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      
      // Close modal on success
      onClose()
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setError('')
      
    } catch (error: any) {
      console.error('Auth error:', error)
      setError(error.message || 'Authentication failed')
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  if (!isOpen) return null

  return (
    <div className="modal" onClick={handleBackdropClick}>
      <div className="modal-content auth-modal">
        <div className="modal-header">
          <h3>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h3>
          <span 
            className="close-modal"
            onClick={onClose}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onClose()
              }
            }}
            aria-label="Close modal"
          >
            &times;
          </span>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            {mode === 'signup' && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <div className="auth-error">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  {mode === 'signin' ? 'Signing In...' : 'Signing Up...'}
                </>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Sign Up'
              )}
            </button>
          </form>

          <div className="auth-switch">
            <p>
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button 
                    type="button" 
                    className="auth-switch-btn"
                    onClick={toggleMode}
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    className="auth-switch-btn"
                    onClick={toggleMode}
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </div>

          {mode === 'signin' && (
            <div className="auth-demo">
              <p className="demo-text">
                <i className="fas fa-info-circle"></i>
                Demo Mode: Create any account to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
// Authentication guard component
import React, { useEffect, useState } from 'react'
import { useIsAuthenticated, useAuthLoading, useAuthActions, useUser } from '../../stores/authStore'
import { AuthModal } from './AuthModal'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const isAuthenticated = useIsAuthenticated()
  const isLoading = useAuthLoading()
  const { initialize } = useAuthActions()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await initialize()
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    initializeAuth()
  }, [initialize])

  useEffect(() => {
    // Show auth modal if not authenticated and initialization is complete
    if (isInitialized && !isAuthenticated && !isLoading) {
      setShowAuthModal(true)
    } else if (isAuthenticated) {
      setShowAuthModal(false)
    }
  }, [isInitialized, isAuthenticated, isLoading])

  // Show loading state during initialization
  if (!isInitialized || isLoading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <div className="loading-text">Initializing...</div>
      </div>
    )
  }

  // Show fallback if provided and user is not authenticated
  if (!isAuthenticated && fallback) {
    return (
      <>
        {fallback}
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    )
  }

  // Show children if authenticated, otherwise show auth modal
  return (
    <>
      {isAuthenticated ? children : (
        <div className="auth-required">
          <div className="auth-required-content">
            <div className="auth-required-icon">
              <i className="fas fa-user-lock"></i>
            </div>
            <h3>Authentication Required</h3>
            <p>Please sign in to access your watchlists and portfolio.</p>
            <button 
              className="auth-required-btn"
              onClick={() => setShowAuthModal(true)}
            >
              <i className="fas fa-sign-in-alt"></i>
              Sign In
            </button>
          </div>
        </div>
      )}
      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  )
}

// User info component for authenticated users
export const UserInfo: React.FC = () => {
  const user = useUser()
  const { signOut } = useAuthActions()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      setShowDropdown(false)
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  if (!user) return null

  return (
    <div className="user-info">
      <button 
        className="user-info-btn"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <i className="fas fa-user"></i>
        <span className="user-email">{user.email}</span>
        <i className={`fas fa-chevron-${showDropdown ? 'up' : 'down'}`}></i>
      </button>

      {showDropdown && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <div className="user-avatar">
              <i className="fas fa-user-circle"></i>
            </div>
            <div className="user-details">
              <div className="user-email">{user.email}</div>
              <div className="user-id">ID: {user.id.slice(0, 8)}...</div>
            </div>
          </div>
          
          <div className="user-dropdown-menu">
            <button className="dropdown-item" disabled>
              <i className="fas fa-cog"></i>
              Settings (Coming Soon)
            </button>
            
            <button className="dropdown-item" disabled>
              <i className="fas fa-download"></i>
              Export Data (Coming Soon)
            </button>
            
            <div className="dropdown-divider"></div>
            
            <button 
              className="dropdown-item sign-out"
              onClick={handleSignOut}
            >
              <i className="fas fa-sign-out-alt"></i>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
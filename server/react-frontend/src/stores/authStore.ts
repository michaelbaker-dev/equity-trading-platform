// Authentication store using Zustand with Supabase integration
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import { AuthService, WatchlistService } from '../services/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,

      signIn: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const { user, session } = await AuthService.signIn(email, password)
          
          set({ 
            user, 
            session, 
            isAuthenticated: !!user,
            isLoading: false 
          })

          console.log('✅ User signed in successfully:', user?.email)

          // Create default watchlist if user doesn't have any
          await ensureDefaultWatchlist()
          
        } catch (error) {
          set({ isLoading: false })
          console.error('❌ Sign in failed:', error)
          throw error
        }
      },

      signUp: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const { user, session } = await AuthService.signUp(email, password)
          
          set({ 
            user, 
            session, 
            isAuthenticated: !!user,
            isLoading: false 
          })

          console.log('✅ User signed up successfully:', user?.email)
          
        } catch (error) {
          set({ isLoading: false })
          console.error('❌ Sign up failed:', error)
          throw error
        }
      },

      signOut: async () => {
        set({ isLoading: true })
        try {
          await AuthService.signOut()
          
          set({ 
            user: null, 
            session: null, 
            isAuthenticated: false,
            isLoading: false 
          })

          console.log('✅ User signed out successfully')
          
        } catch (error) {
          set({ isLoading: false })
          console.error('❌ Sign out failed:', error)
          throw error
        }
      },

      setUser: (user: User | null) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        })
      },

      setSession: (session: Session | null) => {
        set({ 
          session,
          user: session?.user || null,
          isAuthenticated: !!session?.user
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      initialize: async () => {
        set({ isLoading: true })
        try {
          // Get current session
          const session = await AuthService.getCurrentSession()
          
          set({ 
            session,
            user: session?.user || null,
            isAuthenticated: !!session?.user,
            isLoading: false 
          })

          if (session?.user) {
            console.log('✅ User session restored:', session.user.email)
            
            // Ensure user has a default watchlist
            await ensureDefaultWatchlist()
          } else {
            console.log('ℹ️  No active session found')
          }

          // Set up auth state listener
          AuthService.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state changed:', event, session?.user?.email)
            
            set({ 
              session,
              user: session?.user || null,
              isAuthenticated: !!session?.user
            })

            if (event === 'SIGNED_IN' && session?.user) {
              ensureDefaultWatchlist()
            }
          })
          
        } catch (error) {
          console.error('❌ Failed to initialize auth:', error)
          set({ 
            user: null, 
            session: null, 
            isAuthenticated: false,
            isLoading: false 
          })
        }
      }
    }),
    {
      name: 'equity-auth',
      version: 1,
      // Only persist non-sensitive data
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Helper function to ensure user has a default watchlist
async function ensureDefaultWatchlist() {
  try {
    const watchlists = await WatchlistService.getUserWatchlists()
    
    if (watchlists.length === 0) {
      // Create default watchlist with popular stocks
      const defaultWatchlist = await WatchlistService.createWatchlist(
        'My Watchlist',
        'Default watchlist with popular stocks',
        true
      )

      // Add popular stocks to the default watchlist
      const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META']
      
      for (let i = 0; i < popularSymbols.length; i++) {
        try {
          await WatchlistService.addSymbolToWatchlist(
            defaultWatchlist.id,
            popularSymbols[i]
          )
        } catch (error) {
          console.warn(`Failed to add ${popularSymbols[i]} to default watchlist:`, error)
        }
      }

      console.log('✅ Created default watchlist with popular stocks')
    }
  } catch (error) {
    console.error('❌ Failed to ensure default watchlist:', error)
  }
}

// Selector hooks for cleaner component usage
export const useUser = () => useAuthStore(state => state.user)
export const useSession = () => useAuthStore(state => state.session)
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated)
export const useAuthLoading = () => useAuthStore(state => state.isLoading)

// Auth actions
export const useAuthActions = () => useAuthStore(state => ({
  signIn: state.signIn,
  signUp: state.signUp,
  signOut: state.signOut,
  initialize: state.initialize
}))
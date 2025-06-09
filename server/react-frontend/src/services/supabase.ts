// Supabase client configuration and database types
import { createClient } from '@supabase/supabase-js'
import type { User, Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database Types
export interface Database {
  public: {
    Tables: {
      watchlists: {
        Row: Watchlist
        Insert: Omit<Watchlist, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Watchlist, 'id' | 'user_id' | 'created_at'>>
      }
      watchlist_items: {
        Row: WatchlistItem
        Insert: Omit<WatchlistItem, 'id' | 'added_at'>
        Update: Partial<Omit<WatchlistItem, 'id' | 'watchlist_id'>>
      }
      user_preferences: {
        Row: UserPreferences
        Insert: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at'>>
      }
    }
  }
}

export interface Watchlist {
  id: string
  user_id: string
  name: string
  description?: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface WatchlistItem {
  id: string
  watchlist_id: string
  symbol: string
  display_name?: string
  position: number
  added_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  active_watchlist_id?: string
  theme: 'light' | 'dark'
  auto_refresh_interval: number
  created_at: string
  updated_at: string
}

// Database Service Functions
export class WatchlistService {
  // Get all watchlists for current user
  static async getUserWatchlists(): Promise<Watchlist[]> {
    const { data, error } = await supabase
      .from('watchlists')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching watchlists:', error)
      throw error
    }

    return data || []
  }

  // Get watchlist items for a specific watchlist
  static async getWatchlistItems(watchlistId: string): Promise<WatchlistItem[]> {
    const { data, error } = await supabase
      .from('watchlist_items')
      .select('*')
      .eq('watchlist_id', watchlistId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching watchlist items:', error)
      throw error
    }

    return data || []
  }

  // Create a new watchlist
  static async createWatchlist(
    name: string, 
    description?: string, 
    isDefault = false
  ): Promise<Watchlist> {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    // If this is set as default, update all other watchlists to not be default
    if (isDefault) {
      await supabase
        .from('watchlists')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    const { data, error } = await supabase
      .from('watchlists')
      .insert([{
        user_id: user.id,
        name,
        description,
        is_default: isDefault
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating watchlist:', error)
      throw error
    }

    return data
  }

  // Add symbol to watchlist
  static async addSymbolToWatchlist(
    watchlistId: string, 
    symbol: string, 
    displayName?: string
  ): Promise<WatchlistItem> {
    // Check if symbol already exists in watchlist
    const { data: existing } = await supabase
      .from('watchlist_items')
      .select('id')
      .eq('watchlist_id', watchlistId)
      .eq('symbol', symbol.toUpperCase())
      .single()

    if (existing) {
      throw new Error('Symbol already exists in watchlist')
    }

    // Get the next position
    const { data: items } = await supabase
      .from('watchlist_items')
      .select('position')
      .eq('watchlist_id', watchlistId)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = items && items.length > 0 ? items[0].position + 1 : 0

    const { data, error } = await supabase
      .from('watchlist_items')
      .insert([{
        watchlist_id: watchlistId,
        symbol: symbol.toUpperCase(),
        display_name: displayName,
        position: nextPosition
      }])
      .select()
      .single()

    if (error) {
      console.error('Error adding symbol to watchlist:', error)
      throw error
    }

    return data
  }

  // Remove symbol from watchlist
  static async removeSymbolFromWatchlist(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('Error removing symbol from watchlist:', error)
      throw error
    }
  }

  // Update watchlist item positions (for drag & drop)
  static async updateItemPositions(updates: { id: string; position: number }[]): Promise<void> {
    const promises = updates.map(update =>
      supabase
        .from('watchlist_items')
        .update({ position: update.position })
        .eq('id', update.id)
    )

    const results = await Promise.all(promises)
    const errors = results.filter(result => result.error)

    if (errors.length > 0) {
      console.error('Error updating item positions:', errors)
      throw new Error('Failed to update item positions')
    }
  }

  // Get user preferences
  static async getUserPreferences(): Promise<UserPreferences | null> {
    const user = await this.getCurrentUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user preferences:', error)
      throw error
    }

    return data
  }

  // Create or update user preferences
  static async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert([{
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Error updating user preferences:', error)
      throw error
    }

    return data
  }

  // Helper to get current user
  static async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  // Set up real-time subscriptions
  static subscribeToWatchlists(callback: (payload: any) => void) {
    return supabase
      .channel('watchlists-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'watchlists' 
        }, 
        callback
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'watchlist_items' 
        }, 
        callback
      )
      .subscribe()
  }
}

// Authentication helper functions
export class AuthService {
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('Sign in error:', error)
      throw error
    }

    return data
  }

  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      console.error('Sign up error:', error)
      throw error
    }

    return data
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  static async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export default supabase
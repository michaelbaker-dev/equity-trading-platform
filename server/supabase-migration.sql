-- Equity Trading Platform Database Schema
-- Execute this in Supabase Studio SQL Editor: http://127.0.0.1:54323

-- Enable Row Level Security for auth.users if not already enabled
-- Note: auth.users table already exists in Supabase Auth

-- Create watchlists table
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create watchlist_items table
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  display_name TEXT,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_watchlist_id UUID REFERENCES public.watchlists(id) ON DELETE SET NULL,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  auto_refresh_interval INTEGER DEFAULT 30000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_default ON public.watchlists(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON public.watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_symbol ON public.watchlist_items(symbol);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_position ON public.watchlist_items(watchlist_id, position);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (in case of re-run)
DROP POLICY IF EXISTS "Users can view their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Users can create their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Users can update their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Users can delete their own watchlists" ON public.watchlists;

-- Create RLS policies for watchlists table
CREATE POLICY "Users can view their own watchlists" 
  ON public.watchlists FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own watchlists" 
  ON public.watchlists FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlists" 
  ON public.watchlists FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlists" 
  ON public.watchlists FOR DELETE 
  USING (auth.uid() = user_id);

-- Drop existing policies first (in case of re-run)
DROP POLICY IF EXISTS "Users can view their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can create their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can update their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can delete their own watchlist items" ON public.watchlist_items;

-- Create RLS policies for watchlist_items table
CREATE POLICY "Users can view their own watchlist items" 
  ON public.watchlist_items FOR SELECT 
  USING (
    watchlist_id IN (
      SELECT id FROM public.watchlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own watchlist items" 
  ON public.watchlist_items FOR INSERT 
  WITH CHECK (
    watchlist_id IN (
      SELECT id FROM public.watchlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own watchlist items" 
  ON public.watchlist_items FOR UPDATE 
  USING (
    watchlist_id IN (
      SELECT id FROM public.watchlists WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    watchlist_id IN (
      SELECT id FROM public.watchlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own watchlist items" 
  ON public.watchlist_items FOR DELETE 
  USING (
    watchlist_id IN (
      SELECT id FROM public.watchlists WHERE user_id = auth.uid()
    )
  );

-- Drop existing policies first (in case of re-run)
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can create their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;

-- Create RLS policies for user_preferences table
CREATE POLICY "Users can view their own preferences" 
  ON public.user_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" 
  ON public.user_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
  ON public.user_preferences FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" 
  ON public.user_preferences FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers first (in case of re-run)
DROP TRIGGER IF EXISTS trigger_watchlists_updated_at ON public.watchlists;
DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON public.user_preferences;

-- Create triggers to automatically update updated_at
CREATE TRIGGER trigger_watchlists_updated_at
  BEFORE UPDATE ON public.watchlists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to ensure only one default watchlist per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_watchlist()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this watchlist as default, unset all others for this user
  IF NEW.is_default = true THEN
    UPDATE public.watchlists 
    SET is_default = false 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger first (in case of re-run)
DROP TRIGGER IF EXISTS trigger_single_default_watchlist ON public.watchlists;

-- Create trigger for single default watchlist constraint
CREATE TRIGGER trigger_single_default_watchlist
  BEFORE INSERT OR UPDATE ON public.watchlists
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_watchlist();

-- Create function to prevent duplicate symbols in same watchlist
CREATE OR REPLACE FUNCTION public.prevent_duplicate_symbols()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if symbol already exists in this watchlist
  IF EXISTS (
    SELECT 1 FROM public.watchlist_items 
    WHERE watchlist_id = NEW.watchlist_id 
    AND symbol = NEW.symbol 
    AND id != COALESCE(NEW.id, gen_random_uuid())
  ) THEN
    RAISE EXCEPTION 'Symbol % already exists in this watchlist', NEW.symbol;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger first (in case of re-run)
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_symbols ON public.watchlist_items;

-- Create trigger for duplicate symbol prevention
CREATE TRIGGER trigger_prevent_duplicate_symbols
  BEFORE INSERT OR UPDATE ON public.watchlist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_symbols();

-- Insert some sample data for testing (optional - comment out if not needed)
-- This will only work after user authentication is set up

-- Create a view for watchlist items with symbol counts
CREATE OR REPLACE VIEW public.watchlist_summary AS
SELECT 
  w.id,
  w.user_id,
  w.name,
  w.description,
  w.is_default,
  w.created_at,
  w.updated_at,
  COUNT(wi.id) as item_count
FROM public.watchlists w
LEFT JOIN public.watchlist_items wi ON w.id = wi.watchlist_id
GROUP BY w.id, w.user_id, w.name, w.description, w.is_default, w.created_at, w.updated_at;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.watchlists TO authenticated;
GRANT ALL ON public.watchlist_items TO authenticated;
GRANT ALL ON public.user_preferences TO authenticated;
GRANT SELECT ON public.watchlist_summary TO authenticated;

-- Success message
SELECT 'Database schema created successfully! You can now use the watchlist functionality.' as result;
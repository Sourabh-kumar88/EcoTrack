-- Create the user_settings table in Supabase
-- Paste this into your Supabase SQL Editor and hit "Run"

CREATE TABLE IF NOT EXISTS public.user_settings (
    id TEXT PRIMARY KEY DEFAULT 'default-user',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Preferences
    carbon_goal NUMERIC NOT NULL DEFAULT 50,
    unit_preference TEXT NOT NULL DEFAULT 'metric',
    theme TEXT NOT NULL DEFAULT 'light',
    
    -- Notifications
    daily_reminder BOOLEAN NOT NULL DEFAULT true,
    goal_alerts BOOLEAN NOT NULL DEFAULT true,
    weekly_summary BOOLEAN NOT NULL DEFAULT true,
    
    -- Privacy
    public_profile BOOLEAN NOT NULL DEFAULT false,
    data_retention INTEGER NOT NULL DEFAULT 90
);

-- Enable Row Level Security (RLS) but allow anonymous access for this prototype
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select user_settings" 
ON public.user_settings FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anonymous insert user_settings" 
ON public.user_settings FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Allow anonymous update user_settings" 
ON public.user_settings FOR UPDATE 
TO anon 
USING (true)
WITH CHECK (true);

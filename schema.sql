-- Create the logs table in Supabase
-- Paste this into your Supabase SQL Editor and hit "Run"

CREATE TABLE IF NOT EXISTS public.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    details TEXT
);

-- Enable Row Level Security (RLS) but allow anonymous inserts and selects for this prototype
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select" 
ON public.logs FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anonymous insert" 
ON public.logs FOR INSERT 
TO anon 
WITH CHECK (true);

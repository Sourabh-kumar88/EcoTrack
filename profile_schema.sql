-- Create the profiles table in Supabase
-- Paste this into your Supabase SQL Editor and hit "Run"

CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY, -- 'default-user' or auth uuid
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL DEFAULT 'Julian Arbor',
    bio TEXT NOT NULL DEFAULT 'Small actions quietly shape a better future.',
    role TEXT NOT NULL DEFAULT 'Mindful Explorer',
    avatar_url TEXT NOT NULL DEFAULT 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-a64pITLCtwy1KtFVsaGVoIBAxSvrQNLYW8eLilZX7ZCnOBYAvITSk94zTCeBx4f5I_f8-rZaqjY7paI67QIQJ7dPAv8DLeadb9yFumU1kxAvxUGrIIxlycoUAV0HcR3M6zSu1c2bBXqfFgMHMu2prCkpf03up_5ZUZjaDhbpQpBSH783dzAkc6k-dA3go8TNkAr0xweNYmcIoYYYdsJB-pX9m-qpmnLrVuP8zFFqNOaiG1R47sF00GHENBoGzoLy6GUcEuTtO-K4'
);

-- Enable Row Level Security (RLS) but allow anonymous inserts/selects/updates for this prototype
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select profiles" 
ON public.profiles FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anonymous insert profiles" 
ON public.profiles FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Allow anonymous update profiles" 
ON public.profiles FOR UPDATE 
TO anon 
USING (true)
WITH CHECK (true);

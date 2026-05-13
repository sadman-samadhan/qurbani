-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  security_question TEXT,
  security_answer TEXT, -- stored as lowercase trimmed text
  latitude FLOAT8,
  longitude FLOAT8,
  area_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. share_requests table
CREATE TABLE IF NOT EXISTS public.share_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  shares_wanted INT NOT NULL CHECK (shares_wanted >= 1 AND shares_wanted <= 6),
  budget INT,
  cow_price_min INT,
  cow_price_max INT,
  whatsapp_number TEXT,
  phone_number TEXT,
  area_name TEXT,
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id),
  request_id UUID REFERENCES public.share_requests(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- profiles
CREATE POLICY "Public can read basic profiles" ON public.profiles 
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- share_requests
CREATE POLICY "Anyone can read open requests" ON public.share_requests 
  FOR SELECT USING (status = 'open');

CREATE POLICY "Authenticated users can insert" ON public.share_requests 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests" ON public.share_requests 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own requests" ON public.share_requests 
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can do everything on requests" ON public.share_requests 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- messages
CREATE POLICY "Users can read own messages" ON public.messages 
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Authenticated users can send messages" ON public.messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- PostGIS function for nearby requests
CREATE OR REPLACE FUNCTION get_nearby_requests(
  user_lat float,
  user_lng float,
  radius_km float DEFAULT 2
)
RETURNS SETOF public.share_requests
LANGUAGE sql
STABLE
AS $$
  SELECT 
    sr.*,
    p.full_name
  FROM public.share_requests sr
  LEFT JOIN public.profiles p ON sr.user_id = p.id
  WHERE sr.status = 'open'
  AND ST_DWithin(
    ST_MakePoint(sr.longitude, sr.latitude)::geography,
    ST_MakePoint(user_lng, user_lat)::geography,
    radius_km * 1000
  )
  ORDER BY sr.created_at DESC;
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone)
  VALUES (new.id, new.raw_user_meta_data->>'phone');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Add reset token columns to profiles for forgot password flow
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

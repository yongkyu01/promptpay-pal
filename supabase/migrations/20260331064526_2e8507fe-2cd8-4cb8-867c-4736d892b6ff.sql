
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create slips table (uploaded slip images)
CREATE TABLE public.slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own slips" ON public.slips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own slips" ON public.slips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own slips" ON public.slips FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own slips" ON public.slips FOR UPDATE USING (auth.uid() = user_id);

-- Create expenses table (AI-extracted data)
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slip_id UUID REFERENCES public.slips(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  recipient TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  date DATE NOT NULL,
  time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for slip images
INSERT INTO storage.buckets (id, name, public) VALUES ('slips', 'slips', true);

CREATE POLICY "Users can upload slips" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'slips' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view slip images" ON storage.objects FOR SELECT
  USING (bucket_id = 'slips');

CREATE POLICY "Users can delete own slips storage" ON storage.objects FOR DELETE
  USING (bucket_id = 'slips' AND auth.uid()::text = (storage.foldername(name))[1]);

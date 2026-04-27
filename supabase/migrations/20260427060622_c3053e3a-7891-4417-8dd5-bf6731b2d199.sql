ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_agreed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS privacy_agreed_at timestamp with time zone;
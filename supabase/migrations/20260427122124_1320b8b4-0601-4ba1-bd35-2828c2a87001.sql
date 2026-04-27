ALTER TABLE public.splits
ADD COLUMN IF NOT EXISTS split_method text NOT NULL DEFAULT 'equal';
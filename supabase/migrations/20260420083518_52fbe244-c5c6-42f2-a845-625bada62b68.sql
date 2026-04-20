-- 판매자 모드 관련 테이블 제거
DROP TABLE IF EXISTS public.pending_payments CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.merchant_expenses CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- profiles 확장
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS promptpay_id TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- friends 테이블
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  linked_user_id UUID,
  avatar_color TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own friends" ON public.friends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own friends" ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own friends" ON public.friends FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own friends" ON public.friends FOR DELETE USING (auth.uid() = user_id);

-- splits 테이블
CREATE TABLE public.splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Dutch',
  place TEXT,
  receipt_image_url TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  vat NUMERIC NOT NULL DEFAULT 0,
  service_charge NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'THB',
  status TEXT NOT NULL DEFAULT 'open',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own splits" ON public.splits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own splits" ON public.splits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own splits" ON public.splits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own splits" ON public.splits FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_splits_updated
BEFORE UPDATE ON public.splits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- split_members
CREATE TABLE public.split_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  friend_id UUID,
  linked_user_id UUID,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  avatar_color TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.split_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own split_members" ON public.split_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own split_members" ON public.split_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own split_members" ON public.split_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own split_members" ON public.split_members FOR DELETE USING (auth.uid() = user_id);

-- split_items
CREATE TABLE public.split_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total NUMERIC NOT NULL DEFAULT 0,
  assigned_member_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.split_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own split_items" ON public.split_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own split_items" ON public.split_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own split_items" ON public.split_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own split_items" ON public.split_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_split_members_split_id ON public.split_members(split_id);
CREATE INDEX idx_split_items_split_id ON public.split_items(split_id);
CREATE INDEX idx_splits_user_id_created ON public.splits(user_id, created_at DESC);
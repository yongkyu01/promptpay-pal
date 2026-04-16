CREATE TABLE public.merchant_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own merchant_expenses" ON public.merchant_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own merchant_expenses" ON public.merchant_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own merchant_expenses" ON public.merchant_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own merchant_expenses" ON public.merchant_expenses FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_merchant_expenses_updated_at
  BEFORE UPDATE ON public.merchant_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
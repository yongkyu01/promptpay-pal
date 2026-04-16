CREATE TABLE public.pending_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  promptpay_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  matched_sale_id UUID REFERENCES public.sales(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending_payments" ON public.pending_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pending_payments" ON public.pending_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending_payments" ON public.pending_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pending_payments" ON public.pending_payments FOR DELETE USING (auth.uid() = user_id);
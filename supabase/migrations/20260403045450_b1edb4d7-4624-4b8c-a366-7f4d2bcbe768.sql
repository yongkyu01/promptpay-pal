-- Add expense_type and golf detail columns to expenses
ALTER TABLE public.expenses ADD COLUMN expense_type text NOT NULL DEFAULT 'personal';
ALTER TABLE public.expenses ADD COLUMN golf_green_fee numeric DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN golf_caddy_fee numeric DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN golf_tip numeric DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN golf_lesson_fee numeric DEFAULT 0;

-- Create budgets table
CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  category text NOT NULL,
  monthly_limit numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
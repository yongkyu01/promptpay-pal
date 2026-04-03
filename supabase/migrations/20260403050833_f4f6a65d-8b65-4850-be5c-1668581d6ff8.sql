ALTER TABLE public.expenses 
ADD COLUMN golf_bet_result text NOT NULL DEFAULT 'none',
ADD COLUMN golf_bet_amount numeric DEFAULT 0;
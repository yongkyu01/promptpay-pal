ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_board_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_board_check
  CHECK (board IN ('notice', 'support', 'terms'));
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;

CREATE POLICY "Public can view posts"
ON public.posts
FOR SELECT
TO anon, authenticated
USING (true);
-- Inquiries table
CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- SELECT: author, admin, or non-private (visible to all signed-in)
CREATE POLICY "View inquiries: own, admin, or public"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR is_private = false
  );

-- INSERT: any signed-in user, must own the row
CREATE POLICY "Users create own inquiries"
  ON public.inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: author or admin
CREATE POLICY "Update own inquiries or admin"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- DELETE: author or admin
CREATE POLICY "Delete own inquiries or admin"
  ON public.inquiries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_inquiries_user ON public.inquiries(user_id);
CREATE INDEX idx_inquiries_created ON public.inquiries(created_at DESC);

-- Inquiry replies table
CREATE TABLE public.inquiry_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiry_replies ENABLE ROW LEVEL SECURITY;

-- SELECT: admin sees all; otherwise must be allowed to see the parent inquiry,
-- AND if reply is private, only the inquiry author may see it.
CREATE POLICY "View replies based on inquiry visibility"
  ON public.inquiry_replies FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.inquiries i
      WHERE i.id = inquiry_replies.inquiry_id
        AND (
          -- Public reply: visible to anyone who can see the inquiry
          (inquiry_replies.is_private = false AND (
            i.is_private = false OR i.user_id = auth.uid()
          ))
          OR
          -- Private reply: only the inquiry author
          (inquiry_replies.is_private = true AND i.user_id = auth.uid())
        )
    )
  );

-- INSERT: admins only, and they must be the author
CREATE POLICY "Only admins can reply"
  ON public.inquiry_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND auth.uid() = author_id
  );

-- UPDATE: admins only
CREATE POLICY "Admins update replies"
  ON public.inquiry_replies FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- DELETE: admins only
CREATE POLICY "Admins delete replies"
  ON public.inquiry_replies FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_inquiry_replies_updated_at
  BEFORE UPDATE ON public.inquiry_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_replies_inquiry ON public.inquiry_replies(inquiry_id);
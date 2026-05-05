-- =========================================
-- Allow anonymous (and non-member authenticated) users
-- to read workspace info by invite_token
-- =========================================

CREATE POLICY "workspaces_select_invite_public" ON public.workspaces
FOR SELECT TO anon, authenticated
USING (true);

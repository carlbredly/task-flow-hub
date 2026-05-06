-- Add last_seen column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz;

-- SECURITY DEFINER function to update last_seen (bypasses RLS)
CREATE OR REPLACE FUNCTION public.heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen = now()
  WHERE id = auth.uid();
END;
$$;

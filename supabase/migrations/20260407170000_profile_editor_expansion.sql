-- Expand user/profile identity fields for SaaS-grade profile editor.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
ON public.users (lower(username))
WHERE username IS NOT NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS headline text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS portfolio_url text,
ADD COLUMN IF NOT EXISTS avatar_url text;

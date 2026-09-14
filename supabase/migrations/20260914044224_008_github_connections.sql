/*
# GitHub Connections Table

## Purpose
Stores the user's GitHub OAuth connection so they can import repos
and push project files back to GitHub.

## New Table
- `github_connections`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, references auth.users, defaults to auth.uid())
  - `github_username` (text, not null)
  - `github_access_token` (text, not null) — encrypted at app level before storing
  - `github_avatar_url` (text, nullable)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Security
- RLS enabled, owner-scoped CRUD.
- Only the owning user can read/insert/update/delete their connection.
- One connection per user (unique constraint on user_id).
*/

CREATE TABLE IF NOT EXISTS public.github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  github_access_token TEXT NOT NULL,
  github_avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_github_connection" ON public.github_connections;
CREATE POLICY "select_own_github_connection"
  ON public.github_connections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_github_connection" ON public.github_connections;
CREATE POLICY "insert_own_github_connection"
  ON public.github_connections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_github_connection" ON public.github_connections;
CREATE POLICY "update_own_github_connection"
  ON public.github_connections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_github_connection" ON public.github_connections;
CREATE POLICY "delete_own_github_connection"
  ON public.github_connections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_github_connections_updated_at ON public.github_connections;
CREATE TRIGGER update_github_connections_updated_at
  BEFORE UPDATE ON public.github_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

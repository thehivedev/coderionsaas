/*
# Projects and Project Files Tables

## Purpose
Replaces the chat-centric model with a project-centric model. A project is a web app
the user is building with the AI. Each project has a conversation (messages) and a set
of generated files (code). The AI generates complete project files using a system prompt
that instructs it to respond with filepath-tagged code blocks.

## New Tables
- `projects`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, references auth.users, defaults to auth.uid())
  - `title` (text, not null, default 'Nuevo proyecto')
  - `model_id` (text, nullable) — the AI model identifier used for this project
  - `status` (text, not null, default 'active') — 'active' | 'archived'
  - `messages` (jsonb, default '[]') — conversation history (array of {role, content, timestamp})
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

- `project_files`
  - `id` (uuid, primary key)
  - `project_id` (uuid, not null, references projects ON DELETE CASCADE)
  - `path` (text, not null) — file path within the project (e.g. "src/App.tsx")
  - `content` (text, not null) — full file content
  - `language` (text, nullable) — detected language (tsx, ts, css, json, etc.)
  - `version` (integer, not null, default 1) — incremented on each update
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Modified Tables
- `profiles` — adds `preferred_model_id` already exists from migration 006. No changes.

## Security
- RLS enabled on both tables.
- Owner-scoped CRUD: users can only access their own projects and files.
- `projects.user_id` defaults to `auth.uid()` so inserts work without explicit user_id.

## Indexes
- `idx_projects_user_id` for listing projects by user
- `idx_project_files_project_id` for listing files by project
- `uniq_project_files_project_path` unique constraint on (project_id, path) so
  re-generating a file updates the existing row instead of creating duplicates.
*/

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nuevo proyecto',
  model_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON public.projects;
CREATE POLICY "select_own_projects"
  ON public.projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON public.projects;
CREATE POLICY "insert_own_projects"
  ON public.projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON public.projects;
CREATE POLICY "update_own_projects"
  ON public.projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON public.projects;
CREATE POLICY "delete_own_projects"
  ON public.projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, path)
);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_project_files" ON public.project_files;
CREATE POLICY "select_own_project_files"
  ON public.project_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_project_files" ON public.project_files;
CREATE POLICY "insert_own_project_files"
  ON public.project_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_project_files" ON public.project_files;
CREATE POLICY "update_own_project_files"
  ON public.project_files FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_project_files" ON public.project_files;
CREATE POLICY "delete_own_files"
  ON public.project_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);

DROP TRIGGER IF EXISTS update_project_files_updated_at ON public.project_files;
CREATE TRIGGER update_project_files_updated_at
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

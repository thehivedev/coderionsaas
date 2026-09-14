/*
# Expand project_type to support 'slides' and 'prototype'

## Purpose
The landing page now offers four starter types: Website, Slides, App, Prototype.
Previously the projects table only allowed 'react-web' and 'expo'. This migration
adds 'slides' and 'prototype' as valid project_type values so the selected starter
flag is persisted on the project and the AI receives the correct instructions.

## Changes
- Drops the old `chk_project_type` constraint (which only allowed 'react-web' and 'expo')
- Recreates it with the expanded set: 'react-web', 'expo', 'slides', 'prototype'
- No new tables, no new columns, no policy changes

## Security
- No RLS changes. The column remains user-settable via the existing UPDATE policy.
*/

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS chk_project_type;

DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT chk_project_type
    CHECK (project_type IS NULL OR project_type IN ('react-web', 'expo', 'slides', 'prototype'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

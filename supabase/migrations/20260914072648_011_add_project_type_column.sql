/*
# Add project_type column to projects table

## Purpose
Support multiple project types (React Web, Expo/React Native) in the same platform.
The preview system uses this field to determine how to render the project in the browser.

## Changes
- Adds `project_type` column to `public.projects`
  - Type: text, nullable (null = auto-detect from files)
  - Allowed values: 'react-web', 'expo'
  - Default: null (auto-detect)

## Security
- No new tables. No policy changes needed.
- The column is user-settable via the existing UPDATE policy on projects.
*/

DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN project_type TEXT DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add check constraint for valid project types
DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT chk_project_type
    CHECK (project_type IS NULL OR project_type IN ('react-web', 'expo'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
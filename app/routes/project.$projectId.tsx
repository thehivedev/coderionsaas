import type { MetaFunction } from '@remix-run/node';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import { supabase } from '~/lib/supabaseClient';
import { APP_NAME } from '~/lib/constants';
import type { AIModel, ProjectFile, ProjectType } from '~/lib/types';
import MenuClient from '~/components/sidebar/Menu';
import ProjectWorkspace from '~/components/project/ProjectWorkspace';

export const meta: MetaFunction = () => [
  { title: `${APP_NAME} - Project` },
];

export async function loader({ params }: { params: { projectId: string } }) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Response(null, { status: 302, headers: { Location: '/auth/login' } });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Response(null, { status: 302, headers: { Location: '/auth/login' } });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (projectError || !project) {
    throw new Response(null, { status: 302, headers: { Location: '/' } });
  }

  const { data: files } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', params.projectId)
    .order('path', { ascending: true });

  const { data: models } = await supabase
    .from('ai_models')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return Response.json(
    {
      user: { id: user.id, email: user.email },
      profile,
      project,
      files: (files || []) as ProjectFile[],
      models: (models || []) as AIModel[],
    },
  );
}

export default function ProjectRoute() {
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';
  const planMode = searchParams.get('plan') === 'true';
  const source = searchParams.get('source') || '';
  const { user, profile, project, files, models } = useLoaderData<{
    user: { id: string; email: string };
    profile: {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      token_balance: number;
      preferred_model_id: string | null;
      created_at: string;
      updated_at: string;
    };
    project: {
      id: string;
      title: string;
      messages: { role: string; content: string; timestamp?: string }[];
      model_id: string | null;
      project_type: ProjectType | null;
      status: string;
    };
    files: ProjectFile[];
    models: AIModel[];
  }>();

  return (
    <ProjectWorkspace
      projectId={project.id}
      projectTitle={project.title}
      projectType={project.project_type}
      initialMessages={project.messages}
      initialFiles={files}
      models={models}
      initialPrompt={initialPrompt}
      planMode={planMode}
      source={source}
      user={user}
      profile={profile}
    />
  );
}

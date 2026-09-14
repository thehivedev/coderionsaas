import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { createSupabaseServerClient } from '~/lib/supabaseServer';
import { APP_NAME, APP_VERSION } from '~/lib/constants';
import type { AIModel, Project } from '~/lib/types';
import MenuClient from '~/components/sidebar/Menu.client';
import { useState } from 'react';
import { createProject } from '~/lib/database';
import { useNavigate } from '@remix-run/react';

export const meta: MetaFunction = () => {
  return [
    { title: `${APP_NAME} - Constructor de IA` },
    { name: 'description', content: 'Construye, entrena y despliega tu gemelo de IA con Coderion.' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/auth/login',
        ...headers,
      },
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/auth/login',
        ...headers,
      },
    });
  }

  const { data: models } = await supabase
    .from('ai_models')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const preferredModel = (models || []).find(
    (m: AIModel) => m.id === profile.preferred_model_id
  );
  const defaultModelName = preferredModel?.name || (models || [])[0]?.name || 'DeepSeek V4';

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(6);

  return Response.json(
    {
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      defaultModelName,
      recentProjects: (projects || []) as Project[],
    },
    { headers }
  );
}

export default function IndexRoute() {
  const { user, profile, defaultModelName, recentProjects } = useLoaderData<{
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
    defaultModelName: string;
    recentProjects: Project[];
  }>();

  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  async function handleNewProject() {
    if (isCreating) return;
    setIsCreating(true);
    const project = await createProject(user.id);
    if (project) {
      navigate(`/project/${project.id}`);
    }
    setIsCreating(false);
  }

  return (
    <div className="flex h-screen bg-[#171717]">
      <MenuClient user={user} profile={profile} />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-6 py-12">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#9E7FFF]/10 ring-1 ring-[#9E7FFF]/30 mb-6">
              <svg className="w-10 h-10 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              Coderion
            </h1>
            <p className="text-lg text-[#A3A3A3] mb-8">
              Describe un proyecto web y la IA genera todos los archivos por ti.
            </p>
            <button
              onClick={handleNewProject}
              disabled={isCreating}
              className="inline-flex items-center gap-2 bg-[#9E7FFF] text-white font-semibold rounded-xl px-6 py-3 hover:bg-[#8B6EE6] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 transition-all disabled:opacity-50"
            >
              {isCreating ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
              Crear nuevo proyecto
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <div className="bg-[#262626] rounded-2xl p-5 ring-1 ring-[#2F2F2F]">
              <h2 className="text-sm font-medium text-[#A3A3A3] mb-1">Tokens disponibles</h2>
              <p className="text-2xl font-bold text-white">{profile.token_balance.toLocaleString()}</p>
            </div>
            <div className="bg-[#262626] rounded-2xl p-5 ring-1 ring-[#2F2F2F]">
              <h2 className="text-sm font-medium text-[#A3A3A3] mb-1">Modelo</h2>
              <p className="text-2xl font-bold text-white">{defaultModelName}</p>
            </div>
            <div className="bg-[#262626] rounded-2xl p-5 ring-1 ring-[#2F2F2F]">
              <h2 className="text-sm font-medium text-[#A3A3A3] mb-1">Version</h2>
              <p className="text-2xl font-bold text-white">v{APP_VERSION}</p>
            </div>
          </div>

          {/* Recent projects */}
          {recentProjects.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#A3A3A3] mb-4">Proyectos recientes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="group bg-[#262626] rounded-2xl p-4 ring-1 ring-[#2F2F2F] hover:ring-[#9E7FFF]/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#9E7FFF]/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-[#9E7FFF] transition-colors">{project.title}</p>
                        <p className="text-xs text-[#A3A3A3]">
                          {new Date(project.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

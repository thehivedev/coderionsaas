import type { MetaFunction } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState } from 'react';
import { supabase } from '~/lib/supabaseClient';
import { APP_NAME } from '~/lib/constants';
import type { Project, Profile } from '~/lib/types';
import MenuClient from '~/components/sidebar/Menu';
import { createProject, deleteProject } from '~/lib/database';

export const meta: MetaFunction = () => [
  { title: `${APP_NAME} — Projects` },
];

export async function loader() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Response(null, { status: 302, headers: { Location: '/auth/login' } });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    throw new Response(null, { status: 302, headers: { Location: '/auth/login' } });
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return Response.json(
    {
      user: { id: user.id, email: user.email || '' },
      profile: profile as Profile,
      projects: (projects || []) as Project[],
    },
  );
}

function ProjectIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z" /></svg>;
}

export default function ProjectsRoute() {
  const { user, profile, projects } = useLoaderData<{
    user: { id: string; email: string };
    profile: Profile;
    projects: Project[];
  }>();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleNewProject() {
    if (isCreating) return;
    setIsCreating(true);
    const project = await createProject(user.id);
    if (project) {
      navigate(`/project/${project.id}`);
    }
    setIsCreating(false);
  }

  async function handleDelete(projectId: string) {
    if (await deleteProject(projectId)) {
      setLocalProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
    setConfirmDelete(null);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0e0e10]">
      <MenuClient user={user} profile={profile} />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 py-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Projects</h1>
              <p className="mt-1 text-sm text-[#858A94]">{localProjects.length} {localProjects.length === 1 ? 'project' : 'projects'}</p>
            </div>
            <button onClick={handleNewProject} disabled={isCreating} className="inline-flex items-center gap-2 rounded-lg bg-[#1688ee] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#3298ff] disabled:opacity-50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
              {isCreating ? 'Creating...' : 'New project'}
            </button>
          </div>

          {localProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#25272C] bg-[#151618] py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1C1F24] text-[#5FA9FF]">
                <ProjectIcon />
              </div>
              <h2 className="text-sm font-medium text-[#D4D6DB]">No projects yet</h2>
              <p className="mt-1 text-xs text-[#858A94]">Create your first project to get started.</p>
              <button onClick={handleNewProject} disabled={isCreating} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1688ee] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#3298ff] disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
                {isCreating ? 'Creating...' : 'New project'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {localProjects.map((project) => (
                <div key={project.id} className="group relative rounded-xl border border-[#25272C] bg-[#151618] p-5 transition-all hover:border-[#3A3D44] hover:bg-[#1A1D21]">
                  <button onClick={() => navigate(`/project/${project.id}`)} className="flex w-full flex-col items-start text-left">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1C1F24] text-[#5FA9FF]">
                      <ProjectIcon />
                    </div>
                    <h3 className="truncate text-sm font-medium text-white group-hover:text-[#78B7FF]">{project.title}</h3>
                    <p className="mt-1 text-xs text-[#858A94]">{new Date(project.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </button>
                  <button onClick={() => setConfirmDelete(project.id)} className="absolute right-3 top-3 rounded-md p-1.5 text-[#70757F] opacity-0 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100" aria-label="Delete project">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-7 0l.7 12h4.6L14 7m-4 3v6m4-6v6" /></svg>
                  </button>
                  {confirmDelete === project.id && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl border border-[#25272C] bg-[#151618] p-5 text-center">
                      <p className="mb-3 text-xs text-[#D4D6DB]">Delete this project?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDelete(null)} className="rounded-md border border-[#3A3D44] px-3 py-1.5 text-xs text-[#C9CBD1] transition hover:bg-[#25272C]">Cancel</button>
                        <button onClick={() => handleDelete(project.id)} className="rounded-md bg-red-500/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

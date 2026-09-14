import { useEffect, useRef, useState } from 'react';
import { Form, useLocation, useNavigate } from '@remix-run/react';
import { getProjects, createProject, deleteProject } from '~/lib/database';
import type { Project, Profile } from '~/lib/types';
import { APP_NAME } from '~/lib/constants';

interface MenuClientProps {
  user: { id: string; email: string };
  profile: Profile;
}

export default function MenuClient({ user, profile }: MenuClientProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [openMenu, setOpenMenu] = useState<'navigation' | 'project' | 'profile' | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    getProjects(user.id).then((data) => {
      if (mounted) {
        setProjects(data);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [user.id]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  async function handleNewProject() {
    if (isCreating) return;
    setIsCreating(true);
    const project = await createProject(user.id);
    if (project) {
      setProjects((prev) => [project, ...prev]);
      setOpenMenu(null);
      navigate(`/project/${project.id}`);
    }
    setIsCreating(false);
  }

  async function handleDeleteProject(projectId: string, event: React.MouseEvent) {
    event.stopPropagation();
    const success = await deleteProject(projectId);
    if (success) {
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      if (location.pathname === `/project/${projectId}`) navigate('/');
    }
  }

  function goTo(path: string) {
    setOpenMenu(null);
    navigate(path);
  }

  const currentProject = projects.find((project) => location.pathname === `/project/${project.id}`);
  const initials = (profile.full_name || user.email).charAt(0).toUpperCase();

  return (
    <header ref={menuRef} className="relative z-40 h-14 shrink-0 border-b border-[#292929] bg-[#151515]">
      <div className="flex h-full items-center justify-between px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setOpenMenu(openMenu === 'navigation' ? null : 'navigation')}
            className="group flex h-9 items-center gap-2 rounded-lg px-2 text-[#D4D4D4] transition hover:bg-[#242424] hover:text-white"
            aria-label="Open navigation"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#4F9CF9] to-[#2B63D9] text-[11px] font-bold text-white shadow-lg shadow-blue-500/20">C</span>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">{APP_NAME}</span>
            <svg className="h-3.5 w-3.5 text-[#737373] transition group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <span className="text-[#454545]">/</span>

          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'project' ? null : 'project')}
              className="flex max-w-[190px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-[#D4D4D4] transition hover:bg-[#242424] hover:text-white"
            >
              <svg className="h-4 w-4 shrink-0 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 016.5 3H12l2 2h3.5A2.5 2.5 0 0120 7.5v10a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5v-12z" />
              </svg>
              <span className="truncate">{currentProject?.title || 'Project'}</span>
              <svg className="h-3.5 w-3.5 shrink-0 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {openMenu === 'project' && (
              <div className="absolute left-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-[#333] bg-[#202020] p-1.5 shadow-2xl shadow-black/40">
                <div className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#737373]">Your projects</div>
                {isLoading ? (
                  <div className="px-2.5 py-4 text-xs text-[#8A8A8A]">Loading projects...</div>
                ) : projects.length === 0 ? (
                  <div className="px-2.5 py-4 text-xs text-[#8A8A8A]">No projects yet</div>
                ) : (
                  projects.map((project) => (
                    <div key={project.id} className="group flex items-center rounded-lg hover:bg-[#2B2B2B]">
                      <button onClick={() => goTo(`/project/${project.id}`)} className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left text-sm text-[#D4D4D4]">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#4F9CF9]" />
                        <span className="truncate">{project.title}</span>
                      </button>
                      <button onClick={(event) => handleDeleteProject(project.id, event)} className="mr-1 rounded p-1.5 text-[#737373] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100" aria-label="Delete project">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-7 0l.7 12h4.6L14 7m-4 3v6m4-6v6" /></svg>
                      </button>
                    </div>
                  ))
                )}
                <div className="my-1.5 border-t border-[#333]" />
                <button onClick={handleNewProject} disabled={isCreating} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[#8FB9FF] transition hover:bg-[#2B2B2B] disabled:opacity-50">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
                  {isCreating ? 'Creating...' : 'New project'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => goTo('/')} className="hidden rounded-lg px-3 py-1.5 text-xs text-[#8A8A8A] transition hover:bg-[#242424] hover:text-white sm:block">Dashboard</button>
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')} className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-[#242424]" aria-label="Open profile menu">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#304D78] text-xs font-semibold text-[#CFE1FF]">
                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name || user.email} className="h-full w-full object-cover" /> : initials}
              </span>
              <svg className="hidden h-3.5 w-3.5 text-[#737373] sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
            </button>
            {openMenu === 'profile' && (
              <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-[#333] bg-[#202020] p-1.5 shadow-2xl shadow-black/40">
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-medium text-white">{profile.full_name || 'Your account'}</p>
                  <p className="truncate text-xs text-[#808080]">{user.email}</p>
                </div>
                <div className="my-1 border-t border-[#333]" />
                <div className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-[#A3A3A3]"><span>Tokens remaining</span><span className="font-semibold text-[#8FB9FF]">{profile.token_balance.toLocaleString()}</span></div>
                <a href="/admin" className="block rounded-lg px-2.5 py-2 text-sm text-[#C7C7C7] transition hover:bg-[#2B2B2B] hover:text-white">Settings</a>
                <button onClick={() => goTo('/')} className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-[#C7C7C7] transition hover:bg-[#2B2B2B] hover:text-white">Buy tokens</button>
                <Form method="post" action="/auth/logout"><button type="submit" className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-[#C7C7C7] transition hover:bg-[#2B2B2B] hover:text-white">Log out</button></Form>
              </div>
            )}
          </div>
        </div>
      </div>

      {openMenu === 'navigation' && (
        <>
          <div className="fixed inset-0 -z-10 bg-black/20" />
          <div className="absolute left-3 top-full mt-2 w-72 overflow-hidden rounded-xl border border-[#333] bg-[#202020] p-1.5 shadow-2xl shadow-black/50">
            <div className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#737373]">Workspace</div>
            <button onClick={() => goTo('/')} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-[#D4D4D4] transition hover:bg-[#2B2B2B] hover:text-white"><svg className="h-4 w-4 text-[#8FB9FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v13a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 18.5v-13zM8 8h8M8 12h5" /></svg>All projects</button>
            <button onClick={handleNewProject} disabled={isCreating} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-[#D4D4D4] transition hover:bg-[#2B2B2B] hover:text-white disabled:opacity-50"><svg className="h-4 w-4 text-[#8FB9FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>{isCreating ? 'Creating...' : 'New project'}</button>
            <div className="my-1.5 border-t border-[#333]" />
            <div className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#737373]">Account</div>
            <a href="/admin" className="block rounded-lg px-2.5 py-2.5 text-sm text-[#D4D4D4] transition hover:bg-[#2B2B2B] hover:text-white">Admin settings</a>
          </div>
        </>
      )}
    </header>
  );
}

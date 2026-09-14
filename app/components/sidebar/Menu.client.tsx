import { useState, useEffect } from 'react';
import { Form, useNavigate, useLocation } from '@remix-run/react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    const data = await getProjects(user.id);
    setProjects(data);
    setIsLoading(false);
  }

  async function handleNewProject() {
    if (isCreating) return;
    setIsCreating(true);
    const project = await createProject(user.id);
    if (project) {
      setProjects((prev) => [project, ...prev]);
      navigate(`/project/${project.id}`);
    }
    setIsCreating(false);
  }

  async function handleDeleteProject(projectId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const success = await deleteProject(projectId);
    if (success) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (location.pathname === `/project/${projectId}`) {
        navigate('/');
      }
    }
  }

  async function handleBuyTokens(pkg: 'basic' | 'pro' | 'enterprise') {
    if (isRedirecting) return;
    setIsRedirecting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: pkg }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      console.error('Checkout redirect failed');
    } finally {
      setIsRedirecting(false);
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-[#1E1E1E] border-r border-[#2F2F2F] transform transition-transform duration-300 lg:transform-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-7 h-7 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-lg font-bold text-white">{APP_NAME}</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-[#A3A3A3] hover:text-white p-2 rounded-lg hover:bg-[#2F2F2F] transition-colors"
                aria-label="Cerrar menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* New project button */}
            <button
              onClick={handleNewProject}
              disabled={isCreating}
              className="w-full flex items-center justify-center gap-2 bg-[#9E7FFF] text-white font-semibold rounded-xl px-4 py-3 hover:bg-[#8B6EE6] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              Nuevo proyecto
            </button>
          </div>

          {/* Project list */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-6 h-6 text-[#A3A3A3] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 px-4">
                <svg className="w-12 h-12 text-[#3F3F3F] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-sm text-[#A3A3A3]">No hay proyectos todavia</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {projects.map((project) => (
                  <li key={project.id}>
                    <div
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        location.pathname === `/project/${project.id}`
                          ? 'bg-[#2F2F2F] text-white'
                          : 'text-[#A3A3A3] hover:bg-[#262626] hover:text-white'
                      }`}
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="flex-1 text-sm truncate">{project.title}</span>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-[#A3A3A3] hover:text-red-400 p-1 rounded transition-all"
                        aria-label="Eliminar proyecto"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* User info */}
          <div className="p-4 border-t border-[#2F2F2F]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#9E7FFF]/20 flex items-center justify-center flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || user.email}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-[#9E7FFF] font-semibold text-sm">
                    {(profile.full_name || user.email).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile.full_name || user.email}
                </p>
                <p className="text-xs text-[#A3A3A3] truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-[#262626] rounded-lg">
              <span className="text-xs text-[#A3A3A3]">Tokens</span>
              <span className="text-sm font-semibold text-[#9E7FFF]">
                {profile.token_balance.toLocaleString()}
              </span>
            </div>

            <a
              href="/admin/models"
              className="w-full flex items-center justify-center gap-2 text-sm text-[#A3A3A3] hover:text-white transition-colors bg-[#262626] border border-[#2F2F2F] rounded-lg px-4 py-2.5 hover:bg-[#2F2F2F] mb-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Gestionar modelos
            </a>

            <button
              onClick={() => handleBuyTokens('basic')}
              disabled={isRedirecting}
              className="w-full flex items-center justify-center gap-2 text-sm text-[#9E7FFF] hover:text-white transition-colors bg-[#9E7FFF]/10 border border-[#9E7FFF]/30 rounded-lg px-4 py-2.5 hover:bg-[#9E7FFF]/20 focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 disabled:opacity-50 mb-2"
            >
              {isRedirecting ? 'Redirigiendo...' : 'Comprar tokens'}
            </button>

            <Form method="post" action="/auth/logout">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 text-sm text-[#A3A3A3] hover:text-white transition-colors bg-[#262626] border border-[#2F2F2F] rounded-lg px-4 py-2.5 hover:bg-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesion
              </button>
            </Form>
          </div>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 left-4 z-10 lg:hidden bg-[#262626] border border-[#2F2F2F] rounded-lg p-2 text-white hover:bg-[#2F2F2F] transition-colors"
        aria-label="Abrir menu"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
}

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Form, useLocation, useNavigate } from '@remix-run/react';
import { getProjects, createProject, deleteProject } from '~/lib/database';
import type { Project, Profile } from '~/lib/types';
import { APP_NAME } from '~/lib/constants';

interface MenuClientProps {
  user: { id: string; email: string };
  profile: Profile;
  variant?: 'sidebar' | 'header';
}

type MenuIconName = 'home' | 'projects' | 'help' | 'release' | 'search' | 'collapse' | 'chevron' | 'settings' | 'subscription' | 'logout';

function MenuIcon({ name, className = 'h-4 w-4' }: { name: MenuIconName; className?: string }) {
  const paths: Record<MenuIconName, React.ReactNode> = {
    home: <path strokeLinecap="round" strokeLinejoin="round" d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Zm6 11v-6h6v6" />,
    projects: <><rect x="3" y="4" width="18" height="16" rx="2" /><path strokeLinecap="round" d="M8 8h8M8 12h5M8 16h3" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M9.7 9a2.4 2.4 0 1 1 3.8 1.9c-.9.6-1.5 1-1.5 2.1M12 16.5h.01" /></>,
    release: <><path strokeLinecap="round" strokeLinejoin="round" d="M5 19 19 5M7 7h.01M17 17h.01" /><circle cx="7" cy="7" r="2" /><circle cx="17" cy="17" r="2" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.3" /><path strokeLinecap="round" d="m16 16 4.5 4.5" /></>,
    collapse: <><path strokeLinecap="round" d="M9 5 2.5 12 9 19M15 5l6.5 7-6.5 7" /></>,
    chevron: <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />,
    settings: <><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.5V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.5h.1A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.1h2.5V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1V13h-.1A1.7 1.7 0 0 0 19.4 15Z" /></>,
    subscription: <><path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5h16M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" d="M7 15h4" /></>,
    logout: <><path strokeLinecap="round" d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9" /></>,
  };

  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>{paths[name]}</svg>;
}

export default function MenuClient({ user, profile, variant = 'sidebar' }: MenuClientProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const isHeader = variant === 'header';

  useEffect(() => {
    let mounted = true;
    getProjects(user.id).then((data) => {
      if (mounted) {
        setProjects(data);
        setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [user.id]);

  useEffect(() => {
    function closeMenus(event: globalThis.MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProjects(false);
        setShowProfile(false);
      }
    }
    function handleShortcut(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowSearch(true);
      }
    }
    document.addEventListener('mousedown', closeMenus);
    document.addEventListener('keydown', handleShortcut);
    return () => {
      document.removeEventListener('mousedown', closeMenus);
      document.removeEventListener('keydown', handleShortcut);
    };
  }, []);

  async function handleNewProject() {
    if (isCreating) return;
    setIsCreating(true);
    const project = await createProject(user.id);
    if (project) {
      setProjects((previous) => [project, ...previous]);
      navigate(`/project/${project.id}`);
    }
    setIsCreating(false);
  }

  async function handleDeleteProject(projectId: string, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (await deleteProject(projectId)) {
      setProjects((previous) => previous.filter((project) => project.id !== projectId));
      if (location.pathname === `/project/${projectId}`) navigate('/');
    }
  }

  function goTo(path: string) {
    setShowProjects(false);
    setShowProfile(false);
    navigate(path);
  }

  const initials = (profile.full_name || user.email).charAt(0).toUpperCase();
  const filteredProjects = projects.filter((project) => project.title.toLowerCase().includes(query.trim().toLowerCase()));
  const isHome = location.pathname === '/';

  const logo = (
    <button type="button" onClick={() => goTo('/')} className="flex min-w-0 items-center gap-2 rounded-lg text-left text-[#F3F4F6] transition hover:text-white" aria-label="Go home">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-bold text-[#111217]">C</span>
      {!isCollapsed && <span className="truncate text-[14px] font-bold tracking-[-0.04em]">{APP_NAME}<sup className="ml-0.5 text-[7px] font-semibold tracking-normal">.new</sup></span>}
    </button>
  );

  const accountMenu = showProfile && (
    <div className={`absolute z-40 mt-2 w-64 overflow-hidden rounded-xl border border-[#30333A] bg-[#202226] p-1.5 shadow-2xl shadow-black/40 ${isHeader ? 'right-0 top-full' : 'bottom-12 left-2'}`}>
      <div className="px-2.5 py-2">
        <p className="truncate text-sm font-medium text-white">{profile.full_name || 'Your account'}</p>
        <p className="truncate text-xs text-[#858A94]">{user.email}</p>
      </div>
      <div className="my-1 border-t border-[#30333A]" />
      <button type="button" onClick={() => goTo('/admin/settings')} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-[#C9CBD1] transition hover:bg-[#2C2F35] hover:text-white"><MenuIcon name="settings" className="h-4 w-4" />Settings</button>
      <button type="button" onClick={() => goTo('/admin/settings')} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-[#C9CBD1] transition hover:bg-[#2C2F35] hover:text-white"><MenuIcon name="subscription" className="h-4 w-4" />Subscriptions</button>
      <Form method="post" action="/auth/logout">
        <button type="submit" className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-[#C9CBD1] transition hover:bg-[#2C2F35] hover:text-white"><MenuIcon name="logout" className="h-4 w-4" />Sign out</button>
      </Form>
    </div>
  );

  const projectMenu = showProjects && (
    <div className={`absolute z-40 mt-2 w-72 overflow-hidden rounded-xl border border-[#30333A] bg-[#202226] p-1.5 shadow-2xl shadow-black/40 ${isHeader ? 'right-0 top-full' : 'left-2 top-20'}`}>
      <div className="flex items-center justify-between px-2.5 py-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#858A94]">Projects</span><button type="button" onClick={handleNewProject} disabled={isCreating} className="text-[11px] font-medium text-[#78B7FF] hover:text-white">{isCreating ? 'Creating...' : 'New project'}</button></div>
      <div className="max-h-72 overflow-y-auto">
        {isLoading ? <p className="px-2.5 py-4 text-xs text-[#858A94]">Loading projects...</p> : filteredProjects.length === 0 ? <p className="px-2.5 py-4 text-xs text-[#858A94]">No projects found</p> : filteredProjects.map((project) => (
          <div key={project.id} className="group flex items-center rounded-lg hover:bg-[#2C2F35]">
            <button type="button" onClick={() => goTo(`/project/${project.id}`)} className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left text-sm text-[#D4D6DB]"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5FA9FF]" /><span className="truncate">{project.title}</span></button>
            <button type="button" onClick={(event) => handleDeleteProject(project.id, event)} className="mr-1 rounded p-1.5 text-[#70757F] opacity-0 transition hover:text-red-300 group-hover:opacity-100" aria-label="Delete project"><span className="text-xs">×</span></button>
          </div>
        ))}
      </div>
    </div>
  );

  if (isHeader) {
    return (
      <div ref={menuRef} className="relative flex h-12 shrink-0 items-center justify-between border-b border-[#2B2D32] bg-[#1A1B1E] px-3">
        <div className="flex items-center gap-3">{logo}<button type="button" onClick={() => setShowSearch(true)} className="hidden items-center gap-2 rounded-md border border-[#30333A] bg-[#202226] px-2.5 py-1.5 text-[11px] text-[#858A94] transition hover:border-[#4A505A] hover:text-white sm:flex"><MenuIcon name="search" className="h-3.5 w-3.5" /><span>Search</span><kbd className="rounded border border-[#3A3D44] px-1 text-[9px]">⌘K</kbd></button></div>
        <div className="relative flex items-center gap-1"><button type="button" onClick={() => setShowProjects((current) => !current)} className="rounded-md p-2 text-[#858A94] transition hover:bg-[#282B31] hover:text-white" aria-label="Open projects"><MenuIcon name="projects" /></button><button type="button" onClick={() => setShowProfile((current) => !current)} className="rounded-md p-1 text-[#858A94] transition hover:bg-[#282B31] hover:text-white" aria-label="Open account"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E47AC7] text-[10px] font-bold text-[#30152A]">{initials}</span></button>{projectMenu}{accountMenu}</div>
        {showSearch && <SearchModal query={query} setQuery={setQuery} projects={filteredProjects} onClose={() => { setShowSearch(false); setQuery(''); }} onSelect={(id) => { setShowSearch(false); setQuery(''); navigate(`/project/${id}`); }} />}
      </div>
    );
  }

  return (
    <aside ref={menuRef} className={`relative flex h-full shrink-0 flex-col border-r border-[#27292E] bg-[#111214] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isCollapsed ? 'w-[64px]' : 'w-[224px]'}`}>
      <div className="flex h-14 items-center justify-between px-3">{logo}<button type="button" onClick={() => setIsCollapsed((current) => !current)} className="rounded-md p-1.5 text-[#777C86] transition hover:bg-[#24272C] hover:text-white" aria-label={isCollapsed ? 'Expand menu' : 'Collapse menu'}><MenuIcon name="collapse" className="h-4 w-4" /></button></div>
      <div className="px-2 pb-3"><button type="button" onClick={() => setShowSearch(true)} className={`flex h-8 w-full items-center rounded-md text-[11px] text-[#858A94] transition hover:bg-[#24272C] hover:text-white ${isCollapsed ? 'justify-center' : 'gap-2 px-2'}`}><MenuIcon name="search" className="h-3.5 w-3.5" />{!isCollapsed && <><span className="flex-1 text-left">Search</span><kbd className="rounded border border-[#363940] px-1 text-[9px]">⌘K</kbd></>}</button></div>
      <nav className="space-y-1 px-2">
        <NavItem icon="home" label="Home" collapsed={isCollapsed} active={isHome} onClick={() => goTo('/')} />
        <NavItem icon="projects" label="Projects" collapsed={isCollapsed} active={showProjects} onClick={() => setShowProjects((current) => !current)} />
      </nav>
      {projectMenu}
      <div className="mx-2 my-4 border-t border-[#27292E]" />
      <nav className="space-y-1 px-2"><NavItem icon="help" label="Help center" collapsed={isCollapsed} onClick={() => window.open('https://support.bolt.new', '_blank', 'noopener,noreferrer')} /><NavItem icon="release" label="Release notes" collapsed={isCollapsed} onClick={() => window.open('https://support.bolt.new', '_blank', 'noopener,noreferrer')} /></nav>
      <div className="mt-auto relative border-t border-[#27292E] p-2"><button type="button" onClick={() => setShowProfile((current) => !current)} className={`flex w-full items-center rounded-lg p-2 text-left transition hover:bg-[#24272C] ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E47AC7] text-[11px] font-bold text-[#30152A]">{initials}</span>{!isCollapsed && <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-white">{profile.full_name || user.email}</span><span className="block truncate text-[10px] text-[#858A94]">{user.email}</span></span>}{!isCollapsed && <MenuIcon name="chevron" className="h-3.5 w-3.5 text-[#777C86]" />}</button>{accountMenu}</div>
      {showSearch && <SearchModal query={query} setQuery={setQuery} projects={filteredProjects} onClose={() => { setShowSearch(false); setQuery(''); }} onSelect={(id) => { setShowSearch(false); setQuery(''); navigate(`/project/${id}`); }} />}
    </aside>
  );
}

function NavItem({ icon, label, collapsed, active = false, onClick }: { icon: MenuIconName; label: string; collapsed: boolean; active?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} title={collapsed ? label : undefined} className={`flex h-8 w-full items-center rounded-md text-[11px] transition ${collapsed ? 'justify-center' : 'gap-2.5 px-2'} ${active ? 'bg-[#24272C] text-white' : 'text-[#B1B4BB] hover:bg-[#202328] hover:text-white'}`}><MenuIcon name={icon} className="h-3.5 w-3.5" />{!collapsed && <span>{label}</span>}</button>;
}

function SearchModal({ query, setQuery, projects, onClose, onSelect }: { query: string; setQuery: (value: string) => void; projects: Project[]; onClose: () => void; onSelect: (id: string) => void }) {
  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[16vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Search projects" onMouseDown={onClose}><div className="w-full max-w-lg overflow-hidden rounded-xl border border-[#3A3D44] bg-[#202226] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-2 border-b border-[#30333A] px-4"><MenuIcon name="search" className="h-4 w-4 text-[#858A94]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" className="h-12 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#70757F]" /><kbd className="rounded border border-[#3A3D44] px-1.5 py-0.5 text-[10px] text-[#858A94]">ESC</kbd></div><div className="max-h-72 overflow-y-auto p-2">{projects.length === 0 ? <p className="px-3 py-5 text-center text-xs text-[#858A94]">No projects found</p> : projects.map((project) => <button type="button" key={project.id} onClick={() => onSelect(project.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#D4D6DB] transition hover:bg-[#2C2F35] hover:text-white"><MenuIcon name="projects" className="h-4 w-4 text-[#6CAFFF]" /><span className="truncate">{project.title}</span></button>)}</div></div></div>;
}

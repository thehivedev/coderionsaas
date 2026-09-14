import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { createSupabaseServerClient } from '~/lib/supabaseServer';
import { APP_NAME, APP_VERSION } from '~/lib/constants';
import type { AIModel, Project, Profile } from '~/lib/types';
import MenuClient from '~/components/sidebar/Menu';
import { createProject } from '~/lib/database';

export const meta: MetaFunction = () => [
  { title: `${APP_NAME} — Build with AI` },
  { name: 'description', content: 'Create complete web apps by chatting with AI.' },
];

interface AuthenticatedHomeData {
  authenticated: true;
  user: { id: string; email: string };
  profile: Profile;
  defaultModelName: string;
  recentProjects: Project[];
}

interface PublicHomeData {
  authenticated: false;
}

type HomeData = AuthenticatedHomeData | PublicHomeData;

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return Response.json<PublicHomeData>({ authenticated: false }, { headers });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) return Response.json<PublicHomeData>({ authenticated: false }, { headers });

  const { data: models } = await supabase
    .from('ai_models')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  const preferredModel = (models || []).find((model: AIModel) => model.id === profile.preferred_model_id);
  const defaultModelName = preferredModel?.name || (models || [])[0]?.name || 'DeepSeek V4';

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(6);

  return Response.json<AuthenticatedHomeData>(
    {
      authenticated: true,
      user: { id: user.id, email: user.email || '' },
      profile: profile as Profile,
      defaultModelName,
      recentProjects: (projects || []) as Project[],
    },
    { headers },
  );
}

function BoltMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M18.1 2.6 6.5 17.1h8.2l-1.5 12.3 12.3-16.8h-8.2l.8-10Z" fill="currentColor" />
    </svg>
  );
}

function ChevronIcon() {
  return <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ArrowIcon() {
  return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

function GlobeIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M3 12h18M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" /></svg>;
}

function SlidesIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="4" y="5" width="16" height="12" rx="1.5" /><path strokeLinecap="round" d="M8 20h8M12 17v3M8 9h8M8 12h5" /></svg>;
}

function AppIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="6" y="3.5" width="12" height="17" rx="2" /><path strokeLinecap="round" d="M10 6h4M11 17.5h2" /></svg>;
}

function FlaskIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6M10 3v6l-5.2 8.7A2.2 2.2 0 0 0 6.7 21h10.6a2.2 2.2 0 0 0 1.9-3.3L14 9V3M8 15h8" /></svg>;
}

function GitHubIcon() {
  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .7a11.3 11.3 0 0 0-3.6 22c.6.1.8-.3.8-.6v-2.2c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1.1.7.9 1.1.9 1.1.8 2.1.6 2.6.4.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.3-5.1-5.6 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 3.1 1.1a10.7 10.7 0 0 1 5.6 0c2.1-1.4 3-1.1 3-1.1.6 1.5.2 2.6.1 2.9.7.8 1.1 1.8 1.1 3 0 4.3-2.6 5.3-5.1 5.6.4.3.7 1 .7 1.9v2.8c0 .3.2.7.8.6A11.3 11.3 0 0 0 12 .7Z" /></svg>;
}

function PublicLanding() {
  const [prompt, setPrompt] = useState('');
  const [activeStarter, setActiveStarter] = useState('Website');
  const [selectedStarter, setSelectedStarter] = useState<string | null>(null);
  const [planMode, setPlanMode] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const starterToType: Record<string, string> = { Website: 'react-web', Slides: 'slides', App: 'expo', Prototype: 'prototype' };
  const starters = [
    { label: 'Website', icon: <GlobeIcon /> },
    { label: 'Slides', icon: <SlidesIcon />, badge: 'New' },
    { label: 'App', icon: <AppIcon /> },
    { label: 'Prototype', icon: <FlaskIcon /> },
  ];
  const selectedStarterItem = starters.find((starter) => starter.label === selectedStarter);

  return (
    <div className="public-landing min-h-screen overflow-hidden text-white">
      <div className="public-landing__glow public-landing__glow--left" />
      <div className="public-landing__glow public-landing__glow--right" />
      <div className="public-landing__grid" />

      <header className="relative z-10 mx-auto flex h-[68px] w-full max-w-[1160px] items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-1.5 text-white" aria-label={`${APP_NAME} home`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[#111217]"><BoltMark /></span>
          <span className="text-[15px] font-bold tracking-[-0.05em]">{APP_NAME}<sup className="ml-0.5 text-[7px] font-semibold tracking-normal">.new</sup></span>
        </Link>
        <nav className="hidden items-center gap-7 text-[11px] font-medium text-white/65 md:flex">
          <a href="#solutions" className="flex items-center gap-1 transition-colors hover:text-white">Solutions <ChevronIcon /></a>
          <a href="#resources" className="flex items-center gap-1 transition-colors hover:text-white">Resources <ChevronIcon /></a>
          <a href="#careers" className="transition-colors hover:text-white">Careers</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/auth/login" className="text-[11px] font-medium text-white/70 transition-colors hover:text-white">Sign in</Link>
          <Link to="/auth/register" className="rounded-[3px] bg-[#1688ee] px-3.5 py-2 text-[11px] font-semibold text-white shadow-[0_0_18px_rgba(22,136,238,0.25)] transition-all hover:bg-[#36a0ff] hover:shadow-[0_0_24px_rgba(22,136,238,0.4)]">Get Started</Link>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-68px)] flex-col items-center px-5 pt-[24vh] text-center sm:pt-[26vh]">
        <h1 className="text-[30px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[34px]">What will you build today?</h1>
        <p className="mt-3 text-[12px] text-white/80 sm:text-[13px]">Create stunning apps &amp; websites by chatting with AI.</p>

        <form onSubmit={(event) => { event.preventDefault(); setShowSignup(true); }} className={`mt-5 w-full max-w-[380px] rounded-[15px] border p-2.5 text-left shadow-[0_18px_55px_rgba(0,0,0,0.35)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:border-white/20 focus-within:shadow-[0_18px_65px_rgba(0,100,255,0.2)] sm:max-w-[380px] ${planMode ? 'border-[#3b8ac0]/50 bg-[#1d2024]' : 'border-white/[0.08] bg-[#1b1b1d]'}`}>
          <textarea name="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={2} placeholder="Let's build a" className="h-[35px] w-full resize-none bg-transparent px-1.5 py-0.5 text-[11px] leading-5 text-white outline-none placeholder:text-white/35" />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1.5">
              <button type="button" aria-label="Add context" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg></button>
              {selectedStarterItem && <span className="inline-flex max-w-[110px] items-center gap-1 rounded-full border border-[#2d75a5]/60 bg-[#123b59] px-1.5 py-1 text-[9px] font-medium text-[#9edbff]">
                <span className="shrink-0 text-[#65c5ff]">{selectedStarterItem.icon}</span>
                <span className="truncate">{selectedStarterItem.label}</span>
                <button type="button" onClick={() => setSelectedStarter(null)} aria-label={`Remove ${selectedStarterItem.label} flag`} className="ml-0.5 text-[#86b9d6] transition-colors hover:text-white">×</button>
              </span>}
            </div>
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => setPlanMode((current) => !current)} aria-pressed={planMode} className={`group flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${planMode ? 'bg-[#21415c] text-[#b8e4ff] shadow-[0_0_0_1px_rgba(88,180,239,0.22)]' : 'bg-[#1c3950] text-white/80 hover:bg-[#285879]'}`}><svg className="h-3 w-3 transition-transform duration-500 group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.1-6.9-2.1 2.1m-9.6 9.6-2.1 2.1m0-13.8 2.1 2.1m9.6 9.6 2.1 2.1M15 9l1.1 3-1.1 3-3 1.1-3-1.1L7.9 12 9 9l3-1.1L15 9Z" /></svg>Plan</button>
              <button type="submit" className={`group flex items-center gap-1.5 rounded-full bg-[#1688ee] px-3 py-1.5 text-[10px] font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#36a0ff] ${planMode ? 'px-5 shadow-[0_0_24px_rgba(22,136,238,0.4)]' : 'shadow-[0_0_14px_rgba(22,136,238,0.2)]'}`}>{planMode ? 'Generate plan' : 'Build now'} <ArrowIcon /></button>
            </div>
          </div>
        </form>

        <div className="mt-6 flex items-start justify-center gap-2 sm:gap-2.5">
          {starters.map((starter) => (
            <button key={starter.label} type="button" onClick={() => { setActiveStarter(starter.label); setSelectedStarter(starter.label); }} className={`relative flex w-[54px] flex-col items-center gap-1.5 rounded-[7px] px-1.5 py-2 text-[9px] transition-all sm:w-[58px] ${activeStarter === starter.label ? 'bg-[#075aa5] text-white shadow-[0_5px_18px_rgba(0,99,190,0.22)]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
              {starter.badge && <span className="absolute -right-1 -top-2 rounded bg-[#1594f5] px-1 py-0.5 text-[7px] font-semibold text-white">{starter.badge}</span>}
              <span className="text-white/90">{starter.icon}</span>
              {starter.label}
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-white/60">
          <span className="mr-1">or start from</span>
          <button type="button" onClick={() => setShowSignup(true)} className="inline-flex items-center gap-1 rounded-full bg-white/[0.09] px-2.5 py-1.5 transition-colors hover:bg-white/15 hover:text-white"><GitHubIcon /> <span className="font-semibold">GitHub</span> <ArrowIcon /></button>
        </div>
      </main>

      {showSignup && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="signup-title">
          <div className="relative w-full max-w-[315px] rounded-[7px] border border-white/[0.08] bg-[#151517] px-8 pb-8 pt-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:max-w-[325px]">
            <button type="button" onClick={() => setShowSignup(false)} aria-label="Close sign up dialog" className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded text-white/55 transition-colors hover:bg-white/10 hover:text-white"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg></button>
            <div className="mx-auto flex w-fit items-center gap-1.5 text-white"><span className="flex h-6 w-6 items-center justify-center rounded bg-white text-[#151517]"><BoltMark /></span><span className="text-[21px] font-bold italic tracking-[-0.08em]">{APP_NAME}</span></div>
            <h2 id="signup-title" className="mt-6 text-[11px] font-medium text-white/85">Create a new account using one of the options below</h2>
            <div className="mt-4 space-y-2">
              <Link to={`/auth/register?prompt=${encodeURIComponent(prompt)}&type=${selectedStarter ? starterToType[selectedStarter] || 'react-web' : 'react-web'}&plan=${planMode ? 'true' : 'false'}`} onClick={() => setShowSignup(false)} className="relative flex h-7 w-full items-center justify-center rounded-[3px] border border-white/[0.1] text-[10px] font-semibold text-white/85 transition-colors hover:bg-white/[0.07]"><svg className="absolute left-3 h-3 w-3" viewBox="0 0 24 24"><path fill="currentColor" d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.4Z" /><path fill="currentColor" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.6c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.9v2.7A10.1 10.1 0 0 0 12 22Z" /><path fill="currentColor" d="M6.2 13.6a6 6 0 0 1 0-3.2V7.7H2.9a10.1 10.1 0 0 0 0 8.6l3.3-2.7Z" /><path fill="currentColor" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3.1 14.7 2 12 2a10.1 10.1 0 0 0-9.1 5.7l3.3 2.7C7 7.9 9.3 6.1 12 6.1Z" /></svg>Sign up with Google<span className="absolute right-2 rounded bg-white/[0.08] px-1.5 py-0.5 text-[7px] text-white/55">Last used</span></Link>
              <Link to={`/auth/register?prompt=${encodeURIComponent(prompt)}&type=${selectedStarter ? starterToType[selectedStarter] || 'react-web' : 'react-web'}&plan=${planMode ? 'true' : 'false'}`} onClick={() => setShowSignup(false)} className="relative flex h-7 w-full items-center justify-center gap-1.5 rounded-[3px] border border-white/[0.1] text-[10px] font-semibold text-white/85 transition-colors hover:bg-white/[0.07]"><GitHubIcon />Sign up with GitHub</Link>
              <Link to={`/auth/register?prompt=${encodeURIComponent(prompt)}&type=${selectedStarter ? starterToType[selectedStarter] || 'react-web' : 'react-web'}&plan=${planMode ? 'true' : 'false'}`} onClick={() => setShowSignup(false)} className="flex h-7 w-full items-center justify-center rounded-[3px] border border-white/[0.1] text-[10px] font-semibold text-white/85 transition-colors hover:bg-white/[0.07]">Sign up with email and password</Link>
              <Link to={`/auth/register?prompt=${encodeURIComponent(prompt)}&type=${selectedStarter ? starterToType[selectedStarter] || 'react-web' : 'react-web'}&plan=${planMode ? 'true' : 'false'}`} onClick={() => setShowSignup(false)} className="flex h-7 w-full items-center justify-center rounded-[3px] border border-white/[0.1] text-[10px] font-semibold text-white/85 transition-colors hover:bg-white/[0.07]">Sign up with SSO</Link>
            </div>
            <p className="mt-4 text-[8px] leading-3 text-white/45">By signing up, you accept the <a href="#terms" className="underline underline-offset-2">Terms of Service</a> and<br /> acknowledge our <a href="#privacy" className="underline underline-offset-2">Privacy Policy</a>.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthenticatedHome({ data }: { data: AuthenticatedHomeData }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const initialPrompt = searchParams.get('prompt') || '';
  const projectType = searchParams.get('type') || '';
  const planMode = searchParams.get('plan') === 'true';

  async function handleNewProject(prompt?: string, source?: string) {
    if (isCreating) return;
    setIsCreating(true);
    const project = await createProject(data.user.id, projectType || undefined);
    if (project) {
      const params = new URLSearchParams();
      if (prompt) params.set('prompt', prompt);
      if (planMode) params.set('plan', 'true');
      if (source) params.set('source', source);
      navigate(`/project/${project.id}${params.toString() ? `?${params.toString()}` : ''}`);
    }
    setIsCreating(false);
  }

  useEffect(() => {
    if (initialPrompt) handleNewProject(initialPrompt);
  }, []);

  return (
    <div className="flex h-screen bg-[#171717]">
      <MenuClient user={data.user} profile={data.profile} />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-12">
          <div className="mb-12 text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[#1688ee]/10 ring-1 ring-[#1688ee]/30"><BoltMark /></div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">{APP_NAME}</h1>
            <p className="mb-8 text-lg text-[#A3A3A3]">Describe a web project and the AI generates all the files for you.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => handleNewProject()} disabled={isCreating} className="inline-flex items-center gap-2 rounded-xl bg-[#1688ee] px-6 py-3 font-semibold text-white transition-all hover:bg-[#3298ff] disabled:opacity-50">{isCreating ? 'Creating...' : 'Create new project'}{!isCreating && <ArrowIcon />}</button>
              <button onClick={() => handleNewProject(undefined, 'github')} disabled={isCreating} className="inline-flex items-center gap-2 rounded-xl bg-[#262626] px-5 py-3 text-sm font-medium text-white ring-1 ring-[#2F2F2F] transition-all hover:bg-[#2F2F2F] disabled:opacity-50"><GitHubIcon /> Start from GitHub</button>
            </div>
          </div>
          <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]"><h2 className="mb-1 text-sm font-medium text-[#A3A3A3]">Available tokens</h2><p className="text-2xl font-bold text-white">{data.profile.token_balance.toLocaleString()}</p></div>
            <div className="rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]"><h2 className="mb-1 text-sm font-medium text-[#A3A3A3]">Model</h2><p className="text-2xl font-bold text-white">{data.defaultModelName}</p></div>
            <div className="rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]"><h2 className="mb-1 text-sm font-medium text-[#A3A3A3]">Version</h2><p className="text-2xl font-bold text-white">v{APP_VERSION}</p></div>
          </div>
          {data.recentProjects.length > 0 && <div><h3 className="mb-4 text-sm font-medium text-[#A3A3A3]">Recent projects</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{data.recentProjects.map((project) => <button key={project.id} onClick={() => navigate(`/project/${project.id}`)} className="group rounded-2xl bg-[#262626] p-4 text-left ring-1 ring-[#2F2F2F] transition-all hover:ring-[#1688ee]/30"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1688ee]/10"><svg className="h-5 w-5 text-[#1688ee]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z" /></svg></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white transition-colors group-hover:text-[#1688ee]">{project.title}</p><p className="text-xs text-[#A3A3A3]">{new Date(project.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p></div></div></button>)}</div></div>}
        </div>
      </main>
    </div>
  );
}

export default function IndexRoute() {
  const data = useLoaderData<HomeData>();
  return data.authenticated ? <AuthenticatedHome data={data} /> : <PublicLanding />;
}

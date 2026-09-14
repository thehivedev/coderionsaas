import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { createSupabaseServerClient } from '~/lib/supabaseServer';
import { APP_NAME, APP_VERSION } from '~/lib/constants';
import type { AIModel, Project, Profile } from '~/lib/types';
import MenuClient from '~/components/sidebar/Menu.client';
import { createProject } from '~/lib/database';

export const meta: MetaFunction = () => [
  { title: `${APP_NAME} — Build with AI` },
  {
    name: 'description',
    content: 'Create complete web apps by chatting with AI.',
  },
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json<PublicHomeData>({ authenticated: false }, { headers });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return Response.json<PublicHomeData>({ authenticated: false }, { headers });
  }

  const { data: models } = await supabase
    .from('ai_models')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const preferredModel = (models || []).find(
    (model: AIModel) => model.id === profile.preferred_model_id
  );
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
    { headers }
  );
}

function BoltMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#0757d9] shadow-lg shadow-black/20">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L4 14h7l-1 8 10-13h-7l0-7z" />
      </svg>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />
    </svg>
  );
}

function PublicLanding() {
  const [prompt, setPrompt] = useState('');
  const [activeStarter, setActiveStarter] = useState('Website');

  const starters = [
    { label: 'Website', icon: 'globe' },
    { label: 'Dashboard', icon: 'chart' },
    { label: 'SaaS app', icon: 'layers' },
    { label: 'Prototype', icon: 'flask' },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#090d18] text-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-48 border-r border-white/10 bg-[#0b0d13]/95 px-3 py-4 lg:block">
        <div className="flex items-center gap-2 px-2">
          <BoltMark />
          <span className="text-sm font-bold tracking-tight">{APP_NAME}</span>
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/45">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="m20 20-4-4" /></svg>
          Search
          <span className="ml-auto rounded border border-white/10 px-1 text-[9px]">⌘ K</span>
        </div>
        <nav className="mt-5 space-y-1 text-xs">
          <div className="rounded-lg bg-white/10 px-3 py-2 font-medium text-white">Home</div>
          <Link to="/auth/register" className="block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white">Projects</Link>
          <Link to="/auth/register" className="block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white">Favorites</Link>
          <Link to="/auth/register" className="block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white">Recently viewed</Link>
        </nav>
        <div className="mt-7 border-t border-white/10 pt-5 text-xs">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Resources</p>
          <a href="#como-funciona" className="block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white">Help center</a>
          <a href="#caracteristicas" className="block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white">What's new</a>
          <a href="#precios" className="block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white">Status</a>
        </div>
        <div className="absolute bottom-4 left-3 right-3 rounded-xl border border-white/10 bg-gradient-to-br from-[#15284e] to-[#10131c] p-3">
          <p className="text-xs font-semibold text-white">Start for free</p>
          <p className="mt-1 text-[10px] leading-4 text-white/45">Build your first app with AI.</p>
          <Link to="/auth/register" className="mt-3 flex items-center justify-center rounded-lg bg-white py-2 text-[10px] font-semibold text-[#0757d9]">Create account</Link>
        </div>
      </aside>
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="landing-orb landing-orb-one pointer-events-none absolute -top-48 left-[12%] h-[34rem] w-[34rem] rounded-full bg-[#0575ff]/30 blur-[110px]" />
      <div className="landing-orb landing-orb-two pointer-events-none absolute -top-32 right-[7%] h-[27rem] w-[27rem] rounded-full bg-[#52d5ff]/20 blur-[100px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[54rem] bg-[radial-gradient(ellipse_at_50%_18%,rgba(11,128,255,0.62),transparent_58%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:pl-56 lg:pr-10">
        <Link to="/" className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
          <BoltMark />
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#como-funciona" className="transition-colors hover:text-white">How it works</a>
          <a href="#caracteristicas" className="transition-colors hover:text-white">Features</a>
          <a href="#precios" className="transition-colors hover:text-white">Pricing</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/auth/login" className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            Log in
          </Link>
          <Link to="/auth/register" className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0757d9] shadow-lg shadow-blue-950/20 transition-transform hover:-translate-y-0.5 sm:inline-flex">
            Get started free
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-5xl flex-col items-center px-5 pb-20 pt-24 text-center sm:px-8 sm:pt-32 lg:pl-56 lg:pt-36">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#67d8ff]" />
            Your new development companion
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-8xl">
            What are you going to
            <span className="block bg-gradient-to-r from-white via-[#b9eaff] to-[#54aaff] bg-clip-text text-transparent">create today?</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
            Create amazing apps and websites by chatting with AI. Describe your idea and watch it come to life.
          </p>

          <form
            action="/auth/register"
            method="get"
            className="mt-10 w-full max-w-2xl rounded-2xl border border-white/15 bg-[#101722]/90 p-3 text-left shadow-2xl shadow-[#001b55]/50 backdrop-blur-xl transition-all focus-within:border-[#69c9ff]/60 focus-within:shadow-[#087aff]/25"
          >
            <textarea
              name="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={2}
              placeholder="Tell me what you want to build..."
              className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/35"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-2 pt-3">
              <div className="flex items-center gap-1.5">
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/10 hover:text-white" aria-label="Add context">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                </button>
                <span className="hidden text-xs text-white/40 sm:block">Start by describing an idea</span>
              </div>
              <button type="submit" className="group flex items-center gap-2 rounded-lg bg-[#1687ff] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-950/40 transition-all hover:-translate-y-0.5 hover:bg-[#3298ff]">
                Build now
                <ArrowIcon />
              </button>
            </div>
          </form>

          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            {starters.map((starter) => (
              <button
                key={starter.label}
                type="button"
                onClick={() => setActiveStarter(starter.label)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs transition-all ${activeStarter === starter.label ? 'border-white/25 bg-white/15 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:bg-white/10 hover:text-white'}`}
              >
                <span className="text-sm">{starter.icon === 'globe' ? '◉' : starter.icon === 'chart' ? '◫' : starter.icon === 'layers' ? '▣' : '◇'}</span>
                {starter.label}
              </button>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-white/45">
            <span>or start from</span>
            <Link to="/auth/register" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 transition-colors hover:bg-white/12 hover:text-white">
              <span className="font-semibold text-white/70">GitHub</span>
              <ArrowIcon />
            </Link>
            <Link to="/auth/register" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 transition-colors hover:bg-white/12 hover:text-white">
              <span className="font-semibold text-white/70">A template</span>
              <ArrowIcon />
            </Link>
          </div>

          <div className="mt-24 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3" id="caracteristicas">
            {[
              { title: 'From idea to product', body: 'Describe what you imagine and get an app ready to explore.', icon: '✦' },
              { title: 'Edit freely', body: 'Open each file, change the code, and see results instantly.', icon: '⌁' },
              { title: 'Publish without friction', body: 'Connect GitHub, save your work, and share your projects.', icon: '↗' },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.09]">
                <span className="text-xl text-[#68cbff]">{feature.icon}</span>
                <h2 className="mt-4 text-sm font-semibold text-white">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-t border-white/10 px-5 py-6 text-xs text-white/35 sm:px-8 lg:pl-56 lg:pr-10">
        <span>© 2026 {APP_NAME}</span>
        <span>Build something extraordinary.</span>
      </footer>
    </div>
  );
}

function AuthenticatedHome({ data }: { data: AuthenticatedHomeData }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const initialPrompt = searchParams.get('prompt') || '';

  async function handleNewProject(prompt?: string) {
    if (isCreating) return;
    setIsCreating(true);
    const project = await createProject(data.user.id);
    if (project) {
      const dest = prompt
        ? `/project/${project.id}?prompt=${encodeURIComponent(prompt)}`
        : `/project/${project.id}`;
      navigate(dest);
    }
    setIsCreating(false);
  }

  useEffect(() => {
    if (initialPrompt) {
      handleNewProject(initialPrompt);
    }
  }, []);

  return (
    <div className="flex h-screen bg-[#171717]">
      <MenuClient user={data.user} profile={data.profile} />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-12">
          <div className="mb-12 text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[#9E7FFF]/10 ring-1 ring-[#9E7FFF]/30">
              <svg className="h-10 w-10 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">Coderion</h1>
            <p className="mb-8 text-lg text-[#A3A3A3]">Describe a web project and the AI generates all the files for you.</p>
            <button onClick={() => handleNewProject()} disabled={isCreating} className="inline-flex items-center gap-2 rounded-xl bg-[#9E7FFF] px-6 py-3 font-semibold text-white transition-all hover:bg-[#8B6EE6] disabled:opacity-50">
              {isCreating ? 'Creating...' : 'Create new project'}
              {!isCreating && <ArrowIcon />}
            </button>
          </div>
          <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]"><h2 className="mb-1 text-sm font-medium text-[#A3A3A3]">Available tokens</h2><p className="text-2xl font-bold text-white">{data.profile.token_balance.toLocaleString()}</p></div>
            <div className="rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]"><h2 className="mb-1 text-sm font-medium text-[#A3A3A3]">Model</h2><p className="text-2xl font-bold text-white">{data.defaultModelName}</p></div>
            <div className="rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]"><h2 className="mb-1 text-sm font-medium text-[#A3A3A3]">Version</h2><p className="text-2xl font-bold text-white">v{APP_VERSION}</p></div>
          </div>
          {data.recentProjects.length > 0 && <div><h3 className="mb-4 text-sm font-medium text-[#A3A3A3]">Recent projects</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{data.recentProjects.map((project) => <button key={project.id} onClick={() => navigate(`/project/${project.id}`)} className="group rounded-2xl bg-[#262626] p-4 text-left ring-1 ring-[#2F2F2F] transition-all hover:ring-[#9E7FFF]/30"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#9E7FFF]/10"><svg className="h-5 w-5 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white transition-colors group-hover:text-[#9E7FFF]">{project.title}</p><p className="text-xs text-[#A3A3A3]">{new Date(project.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p></div></div></button>)}</div></div>}
        </div>
      </main>
    </div>
  );
}

export default function IndexRoute() {
  const data = useLoaderData<HomeData>();
  return data.authenticated ? <AuthenticatedHome data={data} /> : <PublicLanding />;
}

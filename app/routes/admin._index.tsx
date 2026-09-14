import type { MetaFunction } from '@remix-run/node';
import { useLoaderData, Link, useNavigate } from '@remix-run/react';
import { supabase } from '~/lib/supabaseClient';
import { APP_NAME } from '~/lib/constants';
import AdminLayout from '~/components/admin/AdminLayout';

export const meta: MetaFunction = () => [
  { title: `${APP_NAME} - Admin` },
];

interface DashboardData {
  adminEmail: string;
  stats: {
    totalUsers: number;
    totalProjects: number;
    totalFiles: number;
    activeModels: number;
    totalTokensIssued: number;
    githubConnections: number;
  };
  recentUsers: { id: string; email: string; created_at: string; is_admin: boolean }[];
  settingsStatus: { configured: number; total: number; byCategory: { category: string; configured: number; total: number }[] };
}

export async function loader() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Response(null, { status: 302, headers: { Location: '/auth/login?redirectTo=/admin' } });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.is_admin) {
    throw new Response(null, { status: 302, headers: { Location: '/' } });
  }

  const [{ count: totalUsers }, { count: totalProjects }, { count: totalFiles }, { count: activeModels }, { data: profiles }, { count: githubConnections }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('project_files').select('*', { count: 'exact', head: true }),
    supabase.from('ai_models').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('id, email, created_at, is_admin').order('created_at', { ascending: false }).limit(5),
    supabase.from('github_connections').select('*', { count: 'exact', head: true }),
  ]);

  const { data: tokenData } = await supabase
    .from('profiles')
    .select('token_balance')
    .not('token_balance', 'is', null);

  const totalTokensIssued = (tokenData || []).reduce((sum: number, p: { token_balance: number }) => sum + (p.token_balance || 0), 0);

  const { data: allSettings } = await supabase
    .from('app_settings')
    .select('key, value, category')
    .order('category', { ascending: true });

  const settings = allSettings || [];
  const configured = settings.filter((s: { value: string | null }) => s.value && s.value.trim() !== '').length;
  const total = settings.length;

  const categories = ['ai', 'stripe', 'github', 'general'];
  const byCategory = categories.map((category) => {
    const catSettings = settings.filter((s: { category: string }) => s.category === category);
    return {
      category,
      configured: catSettings.filter((s: { value: string | null }) => s.value && s.value.trim() !== '').length,
      total: catSettings.length,
    };
  });

  return Response.json<DashboardData>({
    adminEmail: profile.email || user.email || '',
    stats: {
      totalUsers: totalUsers || 0,
      totalProjects: totalProjects || 0,
      totalFiles: totalFiles || 0,
      activeModels: activeModels || 0,
      totalTokensIssued,
      githubConnections: githubConnections || 0,
    },
    recentUsers: (profiles || []) as { id: string; email: string; created_at: string; is_admin: boolean }[],
    settingsStatus: { configured, total, byCategory },
  });
}

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wider">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const data = useLoaderData<DashboardData>();

  return (
    <AdminLayout adminEmail={data.adminEmail}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-[#A3A3A3] mt-1">Platform overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Users" value={data.stats.totalUsers} icon="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0z" accent="bg-blue-500/10 text-blue-400" />
        <StatCard label="Projects" value={data.stats.totalProjects} icon="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" accent="bg-purple-500/10 text-purple-400" />
        <StatCard label="Files" value={data.stats.totalFiles} icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" accent="bg-green-500/10 text-green-400" />
        <StatCard label="Active models" value={data.stats.activeModels} icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M3 13a2 2 0 00-2 2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2" accent="bg-orange-500/10 text-orange-400" />
        <StatCard label="Tokens issued" value={data.stats.totalTokensIssued.toLocaleString()} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.657 0 3 .895 3 2s-1.343 2-3 2m0-8c1.657 0 3 .895 3 2s-1.343 2-3 2m-9 2h2m2 0h2" accent="bg-cyan-500/10 text-cyan-400" />
        <StatCard label="GitHub connections" value={data.stats.githubConnections} icon="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" accent="bg-pink-500/10 text-pink-400" />
      </div>

      <div className="rounded-2xl bg-[#262626] p-6 ring-1 ring-[#2F2F2F] mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Configuration status</h2>
          <Link to="/admin/settings" className="text-xs text-[#9E7FFF] hover:underline">Configure →</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {data.settingsStatus.byCategory.map((cat) => (
            <div key={cat.category} className="rounded-lg bg-[#1E1E1E] p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#A3A3A3] capitalize">{cat.category}</span>
                <span className={`text-xs font-medium ${cat.configured === cat.total ? 'text-green-400' : 'text-yellow-400'}`}>
                  {cat.configured}/{cat.total}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#2F2F2F] overflow-hidden">
                <div
                  className={`h-full rounded-full ${cat.configured === cat.total ? 'bg-green-400' : 'bg-yellow-400'}`}
                  style={{ width: cat.total > 0 ? `${(cat.configured / cat.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2F2F2F]">
          <h2 className="text-sm font-semibold text-white">Recent users</h2>
          <Link to="/admin/users" className="text-xs text-[#9E7FFF] hover:underline">View all →</Link>
        </div>
        {data.recentUsers.length === 0 ? (
          <p className="text-sm text-[#A3A3A3] px-5 py-8 text-center">No registered users.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2F2F2F]">
                <th className="text-left text-xs font-medium text-[#A3A3A3] px-5 py-2.5">Email</th>
                <th className="text-left text-xs font-medium text-[#A3A3A3] px-5 py-2.5">Registered</th>
                <th className="text-center text-xs font-medium text-[#A3A3A3] px-5 py-2.5">Role</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-[#2F2F2F] last:border-0">
                  <td className="px-5 py-3 text-sm text-white">{user.email}</td>
                  <td className="px-5 py-3 text-xs text-[#A3A3A3]">{new Date(user.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-5 py-3 text-center">
                    {user.is_admin ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#9E7FFF]/20 text-[#9E7FFF]">Admin</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#3F3F3F] text-[#A3A3A3]">User</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}

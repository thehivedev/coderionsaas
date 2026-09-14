import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { requireAdmin } from '~/lib/admin.server';
import { createSupabaseServiceClient } from '~/lib/supabaseServer';
import { APP_NAME } from '~/lib/constants';
import AdminLayout from '~/components/admin/AdminLayout';

export const meta: MetaFunction = () => [
  { title: `${APP_NAME} - Admin · Proyectos` },
];

interface AdminProject {
  id: string;
  title: string;
  status: string;
  model_id: string | null;
  created_at: string;
  updated_at: string;
  user_email: string;
  file_count: number;
}

interface ProjectsData {
  adminEmail: string;
  projects: AdminProject[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const result = await requireAdmin(request);
  if ('redirect' in result) return result.redirect;

  const serviceClient = createSupabaseServiceClient();

  const { data: projects } = await serviceClient
    .from('projects')
    .select('id, title, status, model_id, created_at, updated_at, user_id')
    .order('updated_at', { ascending: false })
    .limit(100);

  const userIds = [...new Set((projects || []).map((p: { user_id: string }) => p.user_id))];

  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id, email')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

  const emailMap: Record<string, string> = {};
  for (const p of (profiles || [])) {
    emailMap[(p as { id: string }).id] = (p as { email: string }).email;
  }

  const { data: fileCounts } = await serviceClient
    .from('project_files')
    .select('project_id');

  const fileCountMap: Record<string, number> = {};
  for (const f of (fileCounts || [])) {
    const pid = (f as { project_id: string }).project_id;
    fileCountMap[pid] = (fileCountMap[pid] || 0) + 1;
  }

  const adminProjects: AdminProject[] = (projects || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    title: p.title as string,
    status: p.status as string,
    model_id: p.model_id as string | null,
    created_at: p.created_at as string,
    updated_at: p.updated_at as string,
    user_email: emailMap[p.user_id as string] || 'Desconocido',
    file_count: fileCountMap[p.id as string] || 0,
  }));

  return Response.json<ProjectsData>({
    adminEmail: result.admin.email,
    projects: adminProjects,
  });
}

export default function AdminProjects() {
  const data = useLoaderData<ProjectsData>();

  return (
    <AdminLayout adminEmail={data.adminEmail}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Proyectos</h1>
        <p className="text-sm text-[#A3A3A3] mt-1">{data.projects.length} proyectos en total.</p>
      </div>

      <div className="rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2F2F2F]">
              <th className="text-left text-xs font-medium text-[#A3A3A3] px-5 py-3">Título</th>
              <th className="text-left text-xs font-medium text-[#A3A3A3] px-5 py-3">Usuario</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-5 py-3">Archivos</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-5 py-3">Modelo</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-5 py-3">Estado</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-5 py-3">Actualizado</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.projects.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-sm text-[#A3A3A3] py-8">No hay proyectos.</td>
              </tr>
            ) : (
              data.projects.map((project) => (
                <tr key={project.id} className="border-b border-[#2F2F2F] last:border-0">
                  <td className="px-5 py-3">
                    <span className="text-sm text-white truncate max-w-[200px] block">{project.title}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-[#A3A3A3]">{project.user_email}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-sm text-[#A3A3A3]">{project.file_count}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs text-[#A3A3A3] font-mono truncate max-w-[150px] block">{project.model_id || '—'}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {project.status === 'active' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Activo</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#3F3F3F] text-[#A3A3A3]">Archivado</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs text-[#A3A3A3]">{new Date(project.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Link
                      to={`/project/${project.id}`}
                      className="text-xs text-[#9E7FFF] hover:underline"
                    >
                      Abrir →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData, useActionData, useNavigation, Form } from '@remix-run/react';
import { requireAdmin } from '~/lib/admin.server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '~/lib/supabaseServer';
import { APP_NAME } from '~/lib/constants';
import AdminLayout from '~/components/admin/AdminLayout';
import { useState } from 'react';

export const meta: MetaFunction = () => [
  { title: `${APP_NAME} - Admin · Usuarios` },
];

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  token_balance: number;
  is_admin: boolean;
  created_at: string;
  projectCount: number;
}

interface UsersData {
  adminEmail: string;
  users: AdminUser[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const result = await requireAdmin(request);
  if ('redirect' in result) return result.redirect;

  const serviceClient = createSupabaseServiceClient();

  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id, email, full_name, token_balance, is_admin, created_at')
    .order('created_at', { ascending: false });

  const { data: projectCounts } = await serviceClient
    .from('projects')
    .select('user_id')
    .order('user_id');

  const countMap: Record<string, number> = {};
  for (const p of (projectCounts || [])) {
    const uid = (p as { user_id: string }).user_id;
    countMap[uid] = (countMap[uid] || 0) + 1;
  }

  const users: AdminUser[] = (profiles || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    email: p.email as string,
    full_name: p.full_name as string | null,
    token_balance: p.token_balance as number,
    is_admin: p.is_admin as boolean,
    created_at: p.created_at as string,
    projectCount: countMap[p.id as string] || 0,
  }));

  return Response.json<UsersData>({
    adminEmail: result.admin.email,
    users,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const result = await requireAdmin(request);
  if ('redirect' in result) return result.redirect;

  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');
  const userId = String(formData.get('userId') || '');

  if (!userId) {
    return Response.json({ error: 'Falta el usuario' }, { status: 400, headers: result.headers });
  }

  const serviceClient = createSupabaseServiceClient();

  if (intent === 'toggle_admin') {
    const current = String(formData.get('current') || 'false');
    const newAdmin = current !== 'true';

    const { error } = await serviceClient
      .from('profiles')
      .update({ is_admin: newAdmin })
      .eq('id', userId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }

    return Response.json({ success: true }, { headers: result.headers });
  }

  if (intent === 'add_tokens') {
    const amount = parseInt(String(formData.get('amount') || '0'), 10);

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Cantidad inválida' }, { status: 400, headers: result.headers });
    }

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('token_balance')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      return Response.json({ error: 'Usuario no encontrado' }, { status: 404, headers: result.headers });
    }

    const newBalance = (profile.token_balance || 0) + amount;

    const { error } = await serviceClient
      .from('profiles')
      .update({ token_balance: newBalance })
      .eq('id', userId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }

    return Response.json({ success: true }, { headers: result.headers });
  }

  if (intent === 'set_tokens') {
    const amount = parseInt(String(formData.get('amount') || '0'), 10);

    if (amount < 0) {
      return Response.json({ error: 'Cantidad inválida' }, { status: 400, headers: result.headers });
    }

    const { error } = await serviceClient
      .from('profiles')
      .update({ token_balance: amount })
      .eq('id', userId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }

    return Response.json({ success: true }, { headers: result.headers });
  }

  return Response.json({ error: 'Acción no reconocida' }, { status: 400, headers: result.headers });
}

export default function AdminUsers() {
  const data = useLoaderData<UsersData>();
  const actionData = useActionData<{ error?: string; success?: boolean }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [tokenModal, setTokenModal] = useState<{ userId: string; email: string; mode: 'add' | 'set' } | null>(null);

  return (
    <AdminLayout adminEmail={data.adminEmail}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Usuarios</h1>
        <p className="text-sm text-[#A3A3A3] mt-1">{data.users.length} usuarios registrados.</p>
      </div>

      {actionData?.error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
          <p className="text-sm text-red-400">{actionData.error}</p>
        </div>
      )}
      {actionData?.success && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 p-3">
          <p className="text-sm text-green-400">Operación completada.</p>
        </div>
      )}

      <div className="rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2F2F2F]">
              <th className="text-left text-xs font-medium text-[#A3A3A3] px-5 py-3">Usuario</th>
              <th className="text-right text-xs font-medium text-[#A3A3A3] px-5 py-3">Tokens</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-5 py-3">Proyectos</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-5 py-3">Registrado</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-5 py-3">Rol</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-sm text-[#A3A3A3] py-8">No hay usuarios.</td>
              </tr>
            ) : (
              data.users.map((user) => (
                <tr key={user.id} className="border-b border-[#2F2F2F] last:border-0">
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm text-white">{user.email}</p>
                      {user.full_name && <p className="text-xs text-[#A3A3A3]">{user.full_name}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-sm text-white font-mono">{user.token_balance.toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-sm text-[#A3A3A3]">{user.projectCount}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs text-[#A3A3A3]">{new Date(user.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Form method="post" className="inline">
                      <input type="hidden" name="intent" value="toggle_admin" />
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="current" value={String(user.is_admin)} />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          user.is_admin
                            ? 'bg-[#9E7FFF]/20 text-[#9E7FFF] hover:bg-[#9E7FFF]/30'
                            : 'bg-[#3F3F3F] text-[#A3A3A3] hover:bg-[#4F4F4F]'
                        }`}
                      >
                        {user.is_admin ? 'Admin' : 'Usuario'}
                      </button>
                    </Form>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setTokenModal({ userId: user.id, email: user.email, mode: 'add' })}
                        className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                        title="Añadir tokens"
                      >
                        + Tokens
                      </button>
                      <button
                        onClick={() => setTokenModal({ userId: user.id, email: user.email, mode: 'set' })}
                        className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="Establecer tokens"
                      >
                        Set
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Token modal */}
      {tokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setTokenModal(null)}>
          <div className="rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">
              {tokenModal.mode === 'add' ? 'Añadir tokens' : 'Establecer tokens'}
            </h3>
            <p className="text-sm text-[#A3A3A3] mb-4">{tokenModal.email}</p>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value={tokenModal.mode === 'add' ? 'add_tokens' : 'set_tokens'} />
              <input type="hidden" name="userId" value={tokenModal.userId} />
              <div>
                <label className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                  {tokenModal.mode === 'add' ? 'Cantidad a añadir' : 'Nuevo balance total'}
                </label>
                <input
                  name="amount"
                  type="number"
                  required
                  min="0"
                  placeholder="100000"
                  className="w-full rounded-lg bg-[#1E1E1E] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#9E7FFF] text-white font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#8B6EE6] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  onClick={() => setTokenModal(null)}
                  className="text-[#A3A3A3] hover:text-white text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

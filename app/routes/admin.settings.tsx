import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData, useActionData, useNavigation, Form } from '@remix-run/react';
import { requireAdmin } from '~/lib/admin.server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '~/lib/supabaseServer';
import { APP_NAME } from '~/lib/constants';
import AdminLayout from '~/components/admin/AdminLayout';

export const meta: MetaFunction = () => [
  { title: `${APP_NAME} - Admin · API Keys` },
];

interface Setting {
  key: string;
  value: string | null;
  category: string;
  label: string;
  is_secret: boolean;
}

interface SettingsData {
  adminEmail: string;
  settings: Setting[];
}

const CATEGORY_LABELS: Record<string, string> = {
  ai: 'Artificial Intelligence',
  stripe: 'Payments (Stripe)',
  github: 'GitHub OAuth',
  general: 'General',
};

const CATEGORY_ORDER = ['ai', 'stripe', 'github', 'general'];

export async function loader({ request }: LoaderFunctionArgs) {
  const result = await requireAdmin(request);
  if ('redirect' in result) return result.redirect;

  const { supabase } = createSupabaseServerClient(request);

  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value, category, label, is_secret')
    .order('category', { ascending: true });

  return Response.json<SettingsData>({
    adminEmail: result.admin.email,
    settings: (settings || []) as Setting[],
  }, { headers: result.headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const result = await requireAdmin(request);
  if ('redirect' in result) return result.redirect;

  const { supabase, headers } = createSupabaseServerClient(request);

  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');

  if (intent === 'update') {
    const key = String(formData.get('key') || '');
    const value = String(formData.get('value') || '');

    if (!key) {
      return Response.json({ error: 'Missing the key' }, { status: 400, headers });
    }

    const { error } = await supabase
      .from('app_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers });
    }

    return Response.json({ success: true }, { headers });
  }

  if (intent === 'add') {
    const key = String(formData.get('key') || '');
    const value = String(formData.get('value') || '');
    const category = String(formData.get('category') || 'general');
    const label = String(formData.get('label') || key);
    const is_secret = formData.get('is_secret') === 'true';

    if (!key) {
      return Response.json({ error: 'Missing the key' }, { status: 400, headers });
    }

    const { error } = await supabase
      .from('app_settings')
      .insert({ key, value, category, label, is_secret });

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers });
    }

    return Response.json({ success: true }, { headers });
  }

  if (intent === 'delete') {
    const key = String(formData.get('key') || '');

    const { error } = await supabase
      .from('app_settings')
      .delete()
      .eq('key', key);

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers });
    }

    return Response.json({ success: true }, { headers });
  }

  return Response.json({ error: 'Unrecognized action' }, { status: 400, headers });
}

export default function AdminSettings() {
  const data = useLoaderData<SettingsData>();
  const actionData = useActionData<{ error?: string; success?: boolean }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const settingsByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: data.settings.filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <AdminLayout adminEmail={data.adminEmail}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">API Keys and Configuration</h1>
        <p className="text-sm text-[#A3A3A3] mt-1">
          Manage external service keys. Values are stored in the database.
        </p>
      </div>

      {actionData?.error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
          <p className="text-sm text-red-400">{actionData.error}</p>
        </div>
      )}
      {actionData?.success && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 p-3">
          <p className="text-sm text-green-400">Configuration saved successfully.</p>
        </div>
      )}

      {settingsByCategory.map((group) => (
        <div key={group.category} className="mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">{CATEGORY_LABELS[group.category] || group.category}</h2>
          <div className="rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden">
            {group.items.map((setting) => (
              <div key={setting.key} className="border-b border-[#2F2F2F] last:border-0 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-white font-medium">{setting.label}</span>
                      {setting.is_secret && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 uppercase tracking-wider">Secret</span>
                      )}
                      {setting.value && setting.value.trim() !== '' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Configured</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Missing</span>
                      )}
                    </div>
                    <p className="text-xs text-[#A3A3A3] font-mono">{setting.key}</p>
                    <p className="text-xs text-[#A3A3A3] mt-1 font-mono truncate">
                      {setting.is_secret && setting.value
                        ? `${setting.value.slice(0, 4)}${'•'.repeat(12)}${setting.value.slice(-4)}`
                        : setting.value || 'Not configured'}
                    </p>
                  </div>
                  <Form method="post" className="flex items-center gap-2 flex-shrink-0">
                    <input type="hidden" name="intent" value="update" />
                    <input type="hidden" name="key" value={setting.key} />
                    <input
                      name="value"
                      type={setting.is_secret ? 'password' : 'text'}
                      defaultValue={setting.value || ''}
                      placeholder={setting.is_secret ? '•••••••••' : 'Value'}
                      className="rounded-lg bg-[#1E1E1E] border border-[#2F2F2F] px-3 py-1.5 text-white text-xs font-mono focus:border-[#9E7FFF] focus:outline-none w-48"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg bg-[#9E7FFF] text-white text-xs font-medium px-3 py-1.5 hover:bg-[#8B6EE6] transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  </Form>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </AdminLayout>
  );
}

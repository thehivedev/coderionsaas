import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData, useActionData, useNavigation, Form } from '@remix-run/react';
import { requireAdmin } from '~/lib/admin.server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '~/lib/supabaseServer';
import { APP_NAME } from '~/lib/constants';
import type { AIModel } from '~/lib/types';
import AdminLayout from '~/components/admin/AdminLayout';
import { useState } from 'react';

export const meta: MetaFunction = () => [
  { title: `${APP_NAME} - Admin · Modelos de IA` },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const result = await requireAdmin(request);
  if ('redirect' in result) return result.redirect;

  const { supabase } = createSupabaseServerClient(request);

  const { data: models } = await supabase
    .from('ai_models')
    .select('*')
    .order('sort_order', { ascending: true });

  return Response.json(
    { adminEmail: result.admin.email, models: (models || []) as AIModel[] },
    { headers: result.headers }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const result = await requireAdmin(request);
  if ('redirect' in result) return result.redirect;

  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');

  const serviceClient = createSupabaseServiceClient();

  if (intent === 'create') {
    const name = String(formData.get('name') || '');
    const model_id = String(formData.get('model_id') || '');
    const provider = String(formData.get('provider') || 'openrouter');
    const input_price = parseFloat(String(formData.get('input_price_per_token') || '0'));
    const output_price = parseFloat(String(formData.get('output_price_per_token') || '0'));
    const markup = parseFloat(String(formData.get('markup_multiplier') || '1'));
    const token_cost = parseFloat(String(formData.get('token_cost_multiplier') || '1'));
    const badge = String(formData.get('badge') || '');
    const sort_order = parseInt(String(formData.get('sort_order') || '0'), 10);

    if (!name || !model_id) {
      return Response.json({ error: 'Nombre y model_id son obligatorios' }, { status: 400, headers: result.headers });
    }

    const { error } = await serviceClient.from('ai_models').insert({
      name, model_id, provider,
      input_price_per_token: input_price,
      output_price_per_token: output_price,
      markup_multiplier: markup,
      token_cost_multiplier: token_cost,
      badge: badge || null,
      sort_order,
      is_active: true,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }

    return Response.json({ success: true }, { headers: result.headers });
  }

  if (intent === 'update') {
    const id = String(formData.get('id') || '');
    const field = String(formData.get('field') || '');
    const value = String(formData.get('value') || '');

    if (!id || !field) {
      return Response.json({ error: 'Faltan parámetros' }, { status: 400, headers: result.headers });
    }

    let parsedValue: string | number | boolean = value;
    if (field === 'is_active') parsedValue = value === 'true';
    else if (field === 'sort_order') parsedValue = parseInt(value, 10);
    else if (['markup_multiplier', 'token_cost_multiplier', 'input_price_per_token', 'output_price_per_token'].includes(field)) {
      parsedValue = parseFloat(value);
    }

    const { error } = await serviceClient.from('ai_models').update({ [field]: parsedValue }).eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }

    return Response.json({ success: true }, { headers: result.headers });
  }

  if (intent === 'delete') {
    const id = String(formData.get('id') || '');

    const { error } = await serviceClient.from('ai_models').delete().eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }

    return Response.json({ success: true }, { headers: result.headers });
  }

  return Response.json({ error: 'Acción no reconocida' }, { status: 400, headers: result.headers });
}

export default function AdminModelsRoute() {
  const { adminEmail, models } = useLoaderData<{ adminEmail: string; models: AIModel[] }>();
  const actionData = useActionData<{ error?: string; success?: boolean }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [showForm, setShowForm] = useState(false);

  return (
    <AdminLayout adminEmail={adminEmail}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Modelos de IA</h1>
        <p className="text-sm text-[#A3A3A3] mt-1">
          Configura los modelos disponibles, precios y márgenes de ganancia.
        </p>
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

      <div className="bg-[#262626] rounded-2xl ring-1 ring-[#2F2F2F] overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2F2F2F]">
              <th className="text-left text-xs font-medium text-[#A3A3A3] px-4 py-3">Nombre</th>
              <th className="text-left text-xs font-medium text-[#A3A3A3] px-4 py-3">Model ID</th>
              <th className="text-right text-xs font-medium text-[#A3A3A3] px-4 py-3">Markup</th>
              <th className="text-right text-xs font-medium text-[#A3A3A3] px-4 py-3">Cost Mult.</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-4 py-3">Activo</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-4 py-3">Orden</th>
              <th className="text-center text-xs font-medium text-[#A3A3A3] px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-sm text-[#A3A3A3] py-8">
                  No hay modelos configurados.
                </td>
              </tr>
            ) : (
              models.map((model) => (
                <tr key={model.id} className="border-b border-[#2F2F2F] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">{model.name}</span>
                      {model.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#9E7FFF]/20 text-[#9E7FFF]">
                          {model.badge}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#A3A3A3] font-mono">{model.model_id}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-white">{model.markup_multiplier}x</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-white">{model.token_cost_multiplier}x</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <form method="post" className="inline">
                      <input type="hidden" name="intent" value="update" />
                      <input type="hidden" name="id" value={model.id} />
                      <input type="hidden" name="field" value="is_active" />
                      <input type="hidden" name="value" value={model.is_active ? 'false' : 'true'} />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          model.is_active
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-[#3F3F3F] text-[#A3A3A3] hover:bg-[#4F4F4F]'
                        }`}
                      >
                        {model.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-[#A3A3A3]">{model.sort_order}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <form method="post" className="inline"
                      onSubmit={(e) => { if (!confirm('¿Eliminar este modelo?')) e.preventDefault(); }}
                    >
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={model.id} />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="text-[#A3A3A3] hover:text-red-400 transition-colors p-1"
                        aria-label="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="bg-[#262626] rounded-2xl ring-1 ring-[#2F2F2F] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Nuevo modelo</h2>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="create" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#A3A3A3] mb-1">Nombre</label>
                <input name="name" required placeholder="Claude 3.5 Sonnet" className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A3A3A3] mb-1">Model ID</label>
                <input name="model_id" required placeholder="anthropic/claude-3.5-sonnet" className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm font-mono focus:border-[#9E7FFF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A3A3A3] mb-1">Provider</label>
                <input name="provider" defaultValue="openrouter" className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A3A3A3] mb-1">Badge (opcional)</label>
                <input name="badge" placeholder="Premium / Económico" className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A3A3A3] mb-1">Precio input / token (USD)</label>
                <input name="input_price_per_token" type="number" step="0.00000001" defaultValue="0" className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A3A3A3] mb-1">Precio output / token (USD)</label>
                <input name="output_price_per_token" type="number" step="0.00000001" defaultValue="0" className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A3A3A3] mb-1">Markup (1.5 = 50% ganancia)</label>
                <input name="markup_multiplier" type="number" step="0.1" defaultValue="1.0" className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A3A3A3] mb-1">Multiplicador de tokens (2.0 = cobra 2x tokens)</label>
                <input name="token_cost_multiplier" type="number" step="0.1" defaultValue="1.0" className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A3A3A3] mb-1">Orden</label>
                <input name="sort_order" type="number" defaultValue="0" className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={isSubmitting} className="bg-[#9E7FFF] text-white font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#8B6EE6] transition-colors disabled:opacity-50">
                {isSubmitting ? 'Guardando...' : 'Crear modelo'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-[#A3A3A3] hover:text-white text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </Form>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#9E7FFF]/10 border border-[#9E7FFF]/30 text-[#9E7FFF] rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#9E7FFF]/20 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar modelo
        </button>
      )}
    </AdminLayout>
  );
}

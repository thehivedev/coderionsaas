import type { LoaderFunctionArgs } from '@remix-run/node';
import { createSupabaseServerClient } from '~/lib/supabaseServer';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';

  const { supabase, headers } = createSupabaseServerClient(request);

  if (!code) {
    return new Response(
      JSON.stringify({ error: 'No se recibió el código de autenticación.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...headers },
      }
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...headers },
      }
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: next,
      ...headers,
    },
  });
}

export default function AuthCallback() {
  return (
    <div className="min-h-screen bg-[#171717] flex items-center justify-center">
      <div className="text-center">
        <svg className="w-12 h-12 text-[#9E7FFF] animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-[#A3A3A3]">Verificando autenticación...</p>
      </div>
    </div>
  );
}

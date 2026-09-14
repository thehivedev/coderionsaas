import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { createSupabaseServerClient } from '~/lib/supabaseServer';
import { APP_NAME, APP_VERSION } from '~/lib/constants';
import MenuClient from '~/components/sidebar/Menu.client';

export const meta: MetaFunction = () => {
  return [
    { title: `${APP_NAME} - Constructor de IA` },
    { name: 'description', content: 'Construye, entrena y despliega tu gemelo de IA con Coderion.' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/auth/login',
        ...headers,
      },
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/auth/login',
        ...headers,
      },
    });
  }

  return new Response(
    JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

export default function IndexRoute() {
  const { user, profile } = useLoaderData<{
    user: { id: string; email: string };
    profile: {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      token_balance: number;
      created_at: string;
      updated_at: string;
    };
  }>();

  return (
    <div className="flex h-screen bg-[#171717]">
      <MenuClient user={user} profile={profile} />
      <main className="flex-1 flex flex-col items-center justify-center min-w-0 p-8">
        <div className="text-center max-w-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#9E7FFF]/10 ring-1 ring-[#9E7FFF]/30 mb-6">
            <svg className="w-10 h-10 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Tu gemelo de IA
          </h1>
          <p className="text-lg text-[#A3A3A3] mb-8">
            Construye, entrena y despliega tu asistente inteligente personalizado.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#262626] rounded-2xl p-5 ring-1 ring-[#2F2F2F]">
              <h2 className="text-sm font-medium text-[#A3A3A3] mb-1">Tokens disponibles</h2>
              <p className="text-2xl font-bold text-white">{profile.token_balance.toLocaleString()}</p>
            </div>
            <div className="bg-[#262626] rounded-2xl p-5 ring-1 ring-[#2F2F2F]">
              <h2 className="text-sm font-medium text-[#A3A3A3] mb-1">Modelo</h2>
              <p className="text-2xl font-bold text-white">DeepSeek V4</p>
            </div>
            <div className="bg-[#262626] rounded-2xl p-5 ring-1 ring-[#2F2F2F]">
              <h2 className="text-sm font-medium text-[#A3A3A3] mb-1">Versión</h2>
              <p className="text-2xl font-bold text-white">v{APP_VERSION}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

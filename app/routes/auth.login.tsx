import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useNavigation, useSearchParams } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { createSupabaseServerClient } from '~/lib/supabaseServer';
import { APP_NAME } from '~/lib/constants';

export const meta: MetaFunction = () => {
  return [
    { title: `Iniciar sesión | ${APP_NAME}` },
    { name: 'description', content: 'Accede a tu cuenta de Coderion para continuar construyendo con IA.' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        ...headers,
      },
    });
  }

  return new Response(null, {
    headers,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const redirectTo = String(formData.get('redirectTo') || '/');

  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        Location: redirectTo,
        ...headers,
      },
    }
  );
}

export default function LoginRoute() {
  const actionData = useActionData<{ error?: string; success?: boolean }>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = navigation.state === 'submitting';

  useEffect(() => {
    if (actionData?.error) {
      setError(actionData.error);
    }

    if (actionData?.success) {
      window.location.href = redirectTo;
    }
  }, [actionData, redirectTo]);

  return (
    <div className="min-h-screen bg-[#171717] flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#9E7FFF] opacity-10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#38bdf8] opacity-10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <svg className="w-8 h-8 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-2xl font-bold text-white tracking-tight">{APP_NAME}</span>
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-white tracking-tight">Bienvenido de nuevo</h1>
          <p className="mt-2 text-sm text-[#A3A3A3]">Inicia sesión para continuar construyendo</p>
        </div>

        <div className="bg-[#262626] rounded-2xl p-8 shadow-xl ring-1 ring-[#2F2F2F]">
          <Form method="post" className="space-y-5">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            {error && (
              <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 p-3" role="alert">
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#A3A3A3] mb-1.5">
                Correo electrónico
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@ejemplo.com"
                className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#A3A3A3] mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#9E7FFF] py-2.5 px-4 text-white font-semibold hover:bg-[#8B6EE6] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </Form>
        </div>

        <p className="mt-6 text-center text-sm text-[#A3A3A3]">
          ¿No tienes una cuenta?{' '}
          <Link to={`/auth/register?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-[#9E7FFF] hover:text-[#B39DFF] transition-colors">
            Crear cuenta
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-[#A3A3A3]">
          <Link to="/" className="text-[#A3A3A3] hover:text-white transition-colors">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}

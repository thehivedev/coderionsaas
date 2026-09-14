import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useNavigation, useSearchParams } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { createSupabaseServerClient } from '~/lib/supabaseServer';
import { APP_NAME } from '~/lib/constants';

export const meta: MetaFunction = () => {
  return [
    { title: `Create account | ${APP_NAME}` },
    { name: 'description', content: 'Create your Coderion account and start building with AI.' },
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

  return new Response(null, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('fullName') || '');
  const redirectTo = String(formData.get('redirectTo') || '/');

  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 400, headers }
    );
  }

  return Response.json(
    {
      success: true,
      message: 'Account created. You can now log in.',
      redirectTo,
    },
    { status: 200, headers }
  );
}

export default function RegisterRoute() {
  const actionData = useActionData<{ error?: string; success?: boolean; message?: string; redirectTo?: string }>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const initialPrompt = searchParams.get('prompt') || '';
  const projectType = searchParams.get('type') || '';
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isSubmitting = navigation.state === 'submitting';

  useEffect(() => {
    if (actionData?.error) {
      setError(actionData.error);
    }

    if (actionData?.success) {
      setMessage(actionData.message || 'Account created successfully.');
      const dest = actionData.redirectTo || redirectTo;
      const typeParam = projectType ? `&type=${encodeURIComponent(projectType)}` : '';
      const loginUrl = initialPrompt
        ? `/auth/login?redirectTo=${encodeURIComponent(dest)}&prompt=${encodeURIComponent(initialPrompt)}${typeParam}`
        : `/auth/login?redirectTo=${encodeURIComponent(dest)}${typeParam}`;
      setTimeout(() => {
        window.location.href = loginUrl;
      }, 2000);
    }
  }, [actionData, redirectTo, initialPrompt]);

  return (
    <div className="min-h-screen bg-[#171717] flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#f472b6] opacity-10 rounded-full blur-3xl animate-pulse" />
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
          <h1 className="mt-6 text-3xl font-bold text-white tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-[#A3A3A3]">Start building with AI in minutes</p>
          {initialPrompt && (
            <div className="mt-4 rounded-xl border border-[#9E7FFF]/30 bg-[#9E7FFF]/10 px-4 py-3 text-left">
              <p className="text-xs font-medium text-[#9E7FFF] mb-1">Your idea:</p>
              <p className="text-sm text-white/80 line-clamp-3">{initialPrompt}</p>
            </div>
          )}
        </div>

        <div className="bg-[#262626] rounded-2xl p-8 shadow-xl ring-1 ring-[#2F2F2F]">
          <Form method="post" className="space-y-5">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            {error && (
              <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 p-3" role="alert">
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            )}

            {message && (
              <div className="rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 p-3" role="alert">
                <p className="text-sm text-[#10b981]">{message}</p>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[#A3A3A3] mb-1.5">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#A3A3A3] mb-1.5">
                Email
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
                placeholder="you@example.com"
                className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#A3A3A3] mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#9E7FFF] py-2.5 px-4 text-white font-semibold hover:bg-[#8B6EE6] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </Form>
        </div>

        <p className="mt-6 text-center text-sm text-[#A3A3A3]">
          Already have an account?{' '}
          <Link to={`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-[#9E7FFF] hover:text-[#B39DFF] transition-colors">
            Log in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-[#A3A3A3]">
          <Link to="/" className="text-[#A3A3A3] hover:text-white transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

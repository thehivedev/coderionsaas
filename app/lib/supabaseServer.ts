import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { parse, serialize } from 'cookie';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://thhfunhmylimhdhehipi.supabase.co';
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function createSupabaseServerClient(request: Request) {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const cookies = parse(cookieHeader);

  const responseHeaders = new Headers();

  const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(key: string) {
        return cookies[key];
      },
      set(key: string, value: string, options: { [k: string]: unknown }) {
        const serialized = serialize(key, value, {
          path: '/',
          sameSite: 'lax',
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 7,
          ...options,
        });
        responseHeaders.append('Set-Cookie', serialized);
      },
      remove(key: string, options: { [k: string]: unknown }) {
        const serialized = serialize(key, '', {
          path: '/',
          sameSite: 'lax',
          httpOnly: true,
          maxAge: 0,
          ...options,
        });
        responseHeaders.append('Set-Cookie', serialized);
      },
    },
  });

  return { supabase: serverClient, headers: responseHeaders };
}

export function createSupabaseServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createServiceClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

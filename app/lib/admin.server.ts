import { createSupabaseServerClient } from './supabaseServer';

export interface AdminContext {
  userId: string;
  email: string;
  isAdmin: boolean;
}

export async function requireAdmin(request: Request): Promise<{ admin: AdminContext; headers: Record<string, string> } | { redirect: Response }> {
  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: new Response(null, {
        status: 302,
        headers: { Location: '/auth/login?redirectTo=/admin', ...headers },
      }),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.is_admin) {
    return {
      redirect: new Response(null, {
        status: 302,
        headers: { Location: '/', ...headers },
      }),
    };
  }

  return {
    admin: {
      userId: user.id,
      email: profile.email || user.email || '',
      isAdmin: true,
    },
    headers,
  };
}

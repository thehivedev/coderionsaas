import type { ActionFunctionArgs } from '@remix-run/node';
import { createSupabaseServerClient } from '~/lib/supabaseServer';

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);

  await supabase.auth.signOut();

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/auth/login',
      ...headers,
    },
  });
}

export async function loader() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/auth/login',
    },
  });
}

export default function LogoutRoute() {
  return null;
}

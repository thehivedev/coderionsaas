import type { ActionFunctionArgs } from '@remix-run/node';
import { createSupabaseServerClient, createSupabaseServiceClient } from '~/lib/supabaseServer';
import { getSetting } from '~/lib/settings.server';

const GITHUB_OAUTH_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_OAUTH_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_API_USER = 'https://api.github.com/user';

function getRedirectUrl(request: Request): string {
  const url = new URL(request.url);
  const origin = url.origin;
  return `${origin}/api/github-connect`;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401, headers });
  }

  const clientId = await getSetting('github_client_id');
  if (!clientId) {
    return Response.json(
      { error: 'GitHub OAuth no esta configurado. Configura las credenciales en el panel de administración.' },
      { status: 503, headers }
    );
  }

  const redirectUrl = getRedirectUrl(request);
  const state = crypto.randomUUID();
  const scope = 'repo read:user user:email';

  const authUrl = `${GITHUB_OAUTH_AUTHORIZE}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${encodeURIComponent(scope)}&state=${state}`;

  return Response.json({ authUrl }, { headers });
}

export async function loader({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/auth/login', ...headers },
    });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/?github_error=no_code', ...headers },
    });
  }

  const clientId = await getSetting('github_client_id');
  const clientSecret = await getSetting('github_client_secret');

  if (!clientId || !clientSecret) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/?github_error=not_configured', ...headers },
    });
  }

  const redirectUrl = getRedirectUrl(request);

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(GITHUB_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUrl,
      }),
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: '/?github_error=token_failed', ...headers },
    });
  }

  const tokenData = await tokenResponse.json();
  const accessToken: string | undefined = tokenData.access_token;

  if (!accessToken) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/?github_error=no_token', ...headers },
    });
  }

  let userResponse: Response;
  try {
    userResponse = await fetch(GITHUB_API_USER, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: '/?github_error=user_failed', ...headers },
    });
  }

  const ghUser = await userResponse.json();
  const githubUsername: string = ghUser.login;
  const githubAvatarUrl: string | null = ghUser.avatar_url || null;

  if (!githubUsername) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/?github_error=no_username', ...headers },
    });
  }

  // Store the connection (upsert)
  const serviceClient = createSupabaseServiceClient();
  const { error: upsertError } = await serviceClient
    .from('github_connections')
    .upsert(
      {
        user_id: user.id,
        github_username: githubUsername,
        github_access_token: accessToken,
        github_avatar_url: githubAvatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (upsertError) {
    console.error('GitHub connection save failed:', upsertError);
    return new Response(null, {
      status: 302,
      headers: { Location: '/?github_error=save_failed', ...headers },
    });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: '/?github_connected=true', ...headers },
  });
}

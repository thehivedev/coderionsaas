import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { createSupabaseServerClient } from '~/lib/supabaseServer';
import { APP_NAME } from '~/lib/constants';
import MenuClient from '~/components/sidebar/Menu.client';
import ChatInterface from '~/components/chat/ChatInterface.client';

export const meta: MetaFunction = () => {
  return [
    { title: `${APP_NAME} - Chat` },
    { name: 'description', content: 'Chatea con tu asistente de IA.' },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
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

  // Verify chat belongs to user
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('id')
    .eq('id', params.chatId)
    .eq('user_id', user.id)
    .single();

  if (chatError || !chat) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
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
      chatId: params.chatId,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

export default function ChatRoute() {
  const { user, profile, chatId } = useLoaderData<{
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
    chatId: string;
  }>();

  return (
    <div className="flex h-screen bg-[#171717]">
      <MenuClient user={user} profile={profile} />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatInterface chatId={chatId} user={user} initialProfile={profile} />
      </main>
    </div>
  );
}

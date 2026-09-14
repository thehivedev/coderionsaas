import type { ActionFunctionArgs } from '@remix-run/node';
import { createSupabaseServerClient, createSupabaseServiceClient } from '~/lib/supabaseServer';
import type { ChatMessage } from '~/lib/types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL_ID = 'deepseek/deepseek-v4-pro-0813';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: 'No autenticado' },
      { status: 401, headers }
    );
  }

  let body: { chatId?: string; messages?: ChatMessage[]; modelId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Cuerpo de la petición inválido' },
      { status: 400, headers }
    );
  }

  const { chatId, messages, modelId } = body;

  if (!chatId || !messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: 'Faltan parámetros requeridos' },
      { status: 400, headers }
    );
  }

  // Verify chat belongs to the authenticated user
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('id, user_id')
    .eq('id', chatId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (chatError || !chat) {
    return Response.json(
      { error: 'Chat no encontrado' },
      { status: 404, headers }
    );
  }

  // Fetch current token balance and preferred model
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('token_balance, preferred_model_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return Response.json(
      { error: 'Perfil no encontrado' },
      { status: 404, headers }
    );
  }

  const tokenBalance = profile.token_balance;

  // Resolve which model to use: explicit modelId from request > user's preferred > default
  const targetModelId = modelId || profile.preferred_model_id;

  let apiModel = DEFAULT_MODEL_ID;
  let tokenCostMultiplier = 1.0;

  if (targetModelId) {
    const { data: aiModel } = await supabase
      .from('ai_models')
      .select('model_id, token_cost_multiplier, is_active')
      .eq('id', targetModelId)
      .maybeSingle();

    if (aiModel && aiModel.is_active) {
      apiModel = aiModel.model_id;
      tokenCostMultiplier = aiModel.token_cost_multiplier;
    }
  }

  // Estimate tokens: ~4 chars per token for input, 1.5x for output
  const lastMessage = messages[messages.length - 1];
  const estimatedInputTokens = Math.ceil(
    messages.reduce((sum, m) => sum + m.content.length, 0) / 4
  );
  const estimatedOutputTokens = Math.ceil(
    (lastMessage?.content.length ?? 0) * 1.5 / 4
  );
  const estimatedTotal = estimatedInputTokens + estimatedOutputTokens;

  if (estimatedTotal > tokenBalance) {
    return Response.json(
      {
        error: 'No tienes suficientes tokens para enviar este mensaje.',
        tokenBalance,
      },
      { status: 402, headers }
    );
  }

  // Save the selected model on the chat
  await supabase
    .from('chats')
    .update({ model: apiModel })
    .eq('id', chatId);

  // Call OpenRouter server-side
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not configured');
    return Response.json(
      { error: 'El servicio de IA no está configurado.' },
      { status: 503, headers }
    );
  }

  let openrouterResponse: Response;
  try {
    openrouterResponse = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: apiModel,
        messages: messages.map(({ role, content }) => ({ role, content })),
      }),
    });
  } catch {
    console.error('OpenRouter request failed');
    return Response.json(
      { error: 'Error al contactar el servicio de IA.' },
      { status: 502, headers }
    );
  }

  if (!openrouterResponse.ok) {
    console.error('OpenRouter error:', openrouterResponse.status);
    return Response.json(
      { error: 'El servicio de IA devolvió un error.' },
      { status: 502, headers }
    );
  }

  const data = await openrouterResponse.json();
  const assistantContent: string =
    data.choices?.[0]?.message?.content || 'No se pudo generar una respuesta.';

  const actualInputTokens: number = data.usage?.prompt_tokens || estimatedInputTokens;
  const actualOutputTokens: number =
    data.usage?.completion_tokens || estimatedOutputTokens;
  const actualTotalTokens = Math.ceil(
    (actualInputTokens + actualOutputTokens) * tokenCostMultiplier
  );

  // Deduct tokens via service role client (deduct_tokens is service-role only)
  const serviceClient = createSupabaseServiceClient();
  const { data: newBalance, error: deductError } = await serviceClient.rpc(
    'deduct_tokens',
    {
      p_user_id: user.id,
      p_amount: actualTotalTokens,
    }
  );

  if (deductError) {
    console.error('Token deduction failed:', deductError);
    return Response.json(
      { error: 'Error al descontar tokens.' },
      { status: 500, headers }
    );
  }

  // Build the assistant message
  const assistantMessage: ChatMessage = {
    role: 'assistant',
    content: assistantContent,
    timestamp: new Date().toISOString(),
  };

  const finalMessages = [...messages, assistantMessage];

  // Update chat in Supabase
  const updateData: Record<string, unknown> = {
    messages: finalMessages,
    updated_at: new Date().toISOString(),
  };

  // Set title from first user message if this is the first exchange
  if (messages.length === 1) {
    updateData.title = messages[0].content.slice(0, 50);
  }

  const { error: updateError } = await supabase
    .from('chats')
    .update(updateData)
    .eq('id', chatId);

  if (updateError) {
    console.error('Chat update failed:', updateError);
  }

  return Response.json(
    {
      message: assistantMessage,
      tokenBalance: newBalance,
      tokensUsed: actualTotalTokens,
      model: apiModel,
    },
    { headers }
  );
}

import type { ActionFunctionArgs } from '@remix-run/node';
import { createSupabaseServerClient, createSupabaseServiceClient } from '~/lib/supabaseServer';
import { parseGeneratedFiles, stripFileBlocks } from '~/lib/parser';
import type { ChatMessage } from '~/lib/types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL_ID = 'deepseek/deepseek-v4-pro-0813';

const SYSTEM_PROMPT = `Eres un generador de proyectos web. Cuando el usuario te pida crear o modificar un proyecto, respondes con archivos completos usando bloques de codigo con la ruta del archivo.

Formato obligatorio para cada archivo:

\`\`\`tsx filepath:src/App.tsx
import React from 'react';

export default function App() {
  return <div>Hola Mundo</div>;
}
\`\`\`

Reglas:
- Cada bloque de codigo debe empezar con el lenguaje seguido de "filepath:" y la ruta del archivo
- Incluye TODOS los archivos necesarios para que el proyecto funcione
- Usa rutas relativas desde la raiz del proyecto (ej: src/App.tsx, package.json, vite.config.ts)
- No abrevies el codigo ni uses comentarios como "// resto del codigo"
- Escribe cada archivo completo, listo para usar
- Despues de los bloques de codigo, puedes incluir una breve explicacion del proyecto
- Si el usuario pide modificar un archivo existente, envia el archivo completo con los cambios aplicados`;

function sseResponse() {
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          await streamChat(send, controller);
        } catch (err) {
          send({ type: 'error', error: 'Error inesperado en el servidor.' });
          console.error('Stream error:', err);
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    }
  );
}

let streamChat: (
  send: (data: Record<string, unknown>) => void,
  controller: ReadableStreamDefaultController
) => Promise<void>;

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

  let body: { projectId?: string; messages?: ChatMessage[]; modelId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Cuerpo de la peticion invalido' },
      { status: 400, headers }
    );
  }

  const { projectId, messages, modelId } = body;

  if (!projectId || !messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: 'Faltan parametros requeridos' },
      { status: 400, headers }
    );
  }

  // Verify project belongs to the authenticated user
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (projectError || !project) {
    return Response.json(
      { error: 'Proyecto no encontrado' },
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

  // Estimate tokens
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

  // Save the selected model on the project
  await supabase
    .from('projects')
    .update({ model_id: apiModel })
    .eq('id', projectId);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'El servicio de IA no esta configurado.' },
      { status: 503, headers }
    );
  }

  const apiMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...messages.map(({ role, content }) => ({ role, content })),
  ];

  // Capture variables for the stream closure
  const supabaseRef = supabase;
  const userId = user.id;
  const projectIdRef = projectId;
  const messagesRef = messages;
  const estimatedInputTokensRef = estimatedInputTokens;
  const estimatedOutputTokensRef = estimatedOutputTokens;
  const tokenCostMultiplierRef = tokenCostMultiplier;

  streamChat = async (send, _controller) => {
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
          messages: apiMessages,
          stream: true,
        }),
      });
    } catch {
      send({ type: 'error', error: 'Error al contactar el servicio de IA.' });
      return;
    }

    if (!openrouterResponse.ok) {
      send({ type: 'error', error: 'El servicio de IA devolvio un error.' });
      return;
    }

    // Read the SSE stream from OpenRouter
    const reader = openrouterResponse.body?.getReader();
    if (!reader) {
      send({ type: 'error', error: 'No se pudo leer el stream.' });
      return;
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const chunk = JSON.parse(jsonStr);
          const token: string = chunk.choices?.[0]?.delta?.content || '';
          if (token) {
            fullContent += token;
            send({ type: 'token', content: token });
          }
        } catch {
          // partial JSON, skip
        }
      }
    }

    // Process the complete response
    const assistantContent = fullContent || 'No se pudo generar una respuesta.';

    const parsedFiles = parseGeneratedFiles(assistantContent);
    const displayContent = parsedFiles.length > 0
      ? stripFileBlocks(assistantContent)
      : assistantContent;

    // Estimate token usage (OpenRouter streaming doesn't always return usage)
    const actualTotalTokens = Math.ceil(
      (estimatedInputTokensRef + estimatedOutputTokensRef) * tokenCostMultiplierRef
    );

    // Deduct tokens
    const serviceClient = createSupabaseServiceClient();
    const { data: newBalance, error: deductError } = await serviceClient.rpc(
      'deduct_tokens',
      {
        p_user_id: userId,
        p_amount: actualTotalTokens,
      }
    );

    if (deductError) {
      send({ type: 'error', error: 'Error al descontar tokens.' });
      return;
    }

    // Save parsed files
    let savedFilesCount = 0;
    if (parsedFiles.length > 0) {
      for (const file of parsedFiles) {
        const { data: existing } = await supabaseRef
          .from('project_files')
          .select('id, version')
          .eq('project_id', projectIdRef)
          .eq('path', file.path)
          .maybeSingle();

        if (existing) {
          const { error: updateErr } = await supabaseRef
            .from('project_files')
            .update({
              content: file.content,
              language: file.language,
              version: (existing.version || 1) + 1,
            })
            .eq('id', existing.id);

          if (!updateErr) savedFilesCount++;
        } else {
          const { error: insertErr } = await supabaseRef
            .from('project_files')
            .insert({
              project_id: projectIdRef,
              path: file.path,
              content: file.content,
              language: file.language,
            });

          if (!insertErr) savedFilesCount++;
        }
      }
    }

    // Build assistant message
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: displayContent,
      timestamp: new Date().toISOString(),
    };

    const finalMessages = [...messagesRef, assistantMessage];

    const updateData: Record<string, unknown> = {
      messages: finalMessages,
      updated_at: new Date().toISOString(),
    };

    if (messagesRef.length === 1) {
      updateData.title = messagesRef[0].content.slice(0, 50);
    }

    await supabaseRef
      .from('projects')
      .update(updateData)
      .eq('id', projectIdRef);

    // Send done event
    send({
      type: 'done',
      content: displayContent,
      filesGenerated: savedFilesCount,
      tokenBalance: newBalance,
      tokensUsed: actualTotalTokens,
    });
  };

  return sseResponse();
}

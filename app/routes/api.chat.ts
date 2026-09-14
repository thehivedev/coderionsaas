import type { ActionFunctionArgs } from '@remix-run/node';
import { createSupabaseServerClient, createSupabaseServiceClient } from '~/lib/supabaseServer';
import { getSetting } from '~/lib/settings.server';
import { parseGeneratedFiles, stripFileBlocks } from '~/lib/parser';
import type { ChatMessage } from '~/lib/types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL_ID = 'deepseek/deepseek-v4-pro-0813';

const SYSTEM_PROMPT = `You are a web project generator. When the user asks you to create or modify a project, respond with complete files using code blocks with the file path.

Required format for each file:

\`\`\`tsx filepath:src/App.tsx
import React from 'react';

export default function App() {
  return <div>Hello World</div>;
}
\`\`\`

Rules:
- Each code block must start with the language followed by "filepath:" and the file path
- Include ALL files needed for the project to work
- Use relative paths from the project root (e.g.: src/App.tsx, package.json, vite.config.ts)
- Do not abbreviate code or use comments like "// rest of the code"
- Write each file completely, ready to use
- After the code blocks, you can include a brief explanation of the project
- If the user asks to modify an existing file, send the complete file with the changes applied`;

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401, headers });
  }

  let body: { projectId?: string; messages?: ChatMessage[]; modelId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers });
  }

  const { projectId, messages, modelId } = body;

  if (!projectId || !messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Missing required parameters' }, { status: 400, headers });
  }

  // Verify project belongs to the authenticated user
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (projectError || !project) {
    return Response.json({ error: 'Project not found' }, { status: 404, headers });
  }

  // Fetch current token balance and preferred model
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('token_balance, preferred_model_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404, headers });
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
      { error: 'You do not have enough tokens to send this message.', tokenBalance },
      { status: 402, headers }
    );
  }

  // Save the selected model on the project
  await supabase.from('projects').update({ model_id: apiModel }).eq('id', projectId);

  const apiKey = await getSetting('openrouter_api_key');
  if (!apiKey) {
    return Response.json(
      { error: 'AI service is not configured. Set the OpenRouter API key in the admin panel.' },
      { status: 503, headers }
    );
  }

  const apiMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...messages.map(({ role, content }) => ({ role, content })),
  ];

  // Capture all variables needed inside the stream closure
  const supabaseRef = supabase;
  const userId = user.id;
  const projectIdRef = projectId;
  const messagesRef = messages;
  const tokenCostMultiplierRef = tokenCostMultiplier;
  const estimatedInputTokensRef = estimatedInputTokens;
  const estimatedOutputTokensRef = estimatedOutputTokens;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Call OpenRouter with streaming enabled
        let openrouterResponse: Response;
        try {
          openrouterResponse = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://coderion.app',
              'X-Title': 'Coderion',
            },
            body: JSON.stringify({
              model: apiModel,
              messages: apiMessages,
              stream: true,
            }),
          });
        } catch {
          send({ type: 'error', error: 'Error contacting AI service.' });
          controller.close();
          return;
        }

        if (!openrouterResponse.ok) {
          const errText = await openrouterResponse.text().catch(() => '');
          console.error('OpenRouter error:', openrouterResponse.status, errText);
          send({ type: 'error', error: 'AI service returned an error.' });
          controller.close();
          return;
        }

        const reader = openrouterResponse.body?.getReader();
        if (!reader) {
          send({ type: 'error', error: 'Could not read stream.' });
          controller.close();
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
        const assistantContent = fullContent || 'Could not generate a response.';

        const parsedFiles = parseGeneratedFiles(assistantContent);
        const displayContent = parsedFiles.length > 0
          ? stripFileBlocks(assistantContent)
          : assistantContent;

        const actualTotalTokens = Math.ceil(
          (estimatedInputTokensRef + estimatedOutputTokensRef) * tokenCostMultiplierRef
        );

        // Deduct tokens via service role client
        const serviceClient = createSupabaseServiceClient();
        const { data: newBalance, error: deductError } = await serviceClient.rpc(
          'deduct_tokens',
          { p_user_id: userId, p_amount: actualTotalTokens }
        );

        if (deductError) {
          console.error('Token deduction failed:', deductError);
          send({ type: 'error', error: 'Error deducting tokens.' });
          controller.close();
          return;
        }

        // Save parsed files to project_files (upsert by project_id + path)
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

        const { error: updateError } = await supabaseRef
          .from('projects')
          .update(updateData)
          .eq('id', projectIdRef);

        if (updateError) {
          console.error('Project update failed:', updateError);
        }

        send({
          type: 'done',
          content: displayContent,
          filesGenerated: savedFilesCount,
          tokenBalance: newBalance,
          tokensUsed: actualTotalTokens,
        });
      } catch (err) {
        console.error('Stream error:', err);
        send({ type: 'error', error: 'Unexpected server error.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

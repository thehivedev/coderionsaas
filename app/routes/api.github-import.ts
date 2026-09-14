import type { ActionFunctionArgs } from '@remix-run/node';
import { createSupabaseServerClient, createSupabaseServiceClient } from '~/lib/supabaseServer';

const GITHUB_API = 'https://api.github.com';

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    tsx: 'tsx', ts: 'ts', jsx: 'jsx', js: 'js', json: 'json',
    css: 'css', html: 'html', md: 'md', mdx: 'mdx', py: 'py',
    sh: 'sh', yaml: 'yaml', yml: 'yaml', sql: 'sql', toml: 'toml',
  };
  return map[ext] || ext || 'text';
}

async function getTreeBlobs(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<{ path: string; content: string }[]> {
  const treeRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  if (!treeRes.ok) throw new Error('No se pudo leer el arbol del repo');
  const treeData = await treeRes.json();
  const blobs = (treeData.tree || []).filter(
    (item: { type: string; path: string }) => item.type === 'blob' && item.path
  );

  const skipPatterns = [
    /\.git\//, /node_modules\//, /\.next\//, /dist\//, /build\//,
    /\.env/, /package-lock\.json/, /yarn\.lock/, /pnpm-lock\.yaml/,
  ];
  const filtered = blobs.filter(
    (b: { path: string }) => !skipPatterns.some((p) => p.test(b.path))
  );

  const maxFiles = 100;
  const toFetch = filtered.slice(0, maxFiles);

  const results: { path: string; content: string }[] = [];
  for (const item of toFetch) {
    try {
      const fileRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(item.path)}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
        }
      );
      if (!fileRes.ok) continue;
      const fileData = await fileRes.json();
      if (fileData.encoding === 'base64' && fileData.content) {
        const content = atob(fileData.content.replace(/\n/g, ''));
        results.push({ path: item.path, content });
      }
    } catch {
      // skip file on error
    }
  }

  return results;
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

  let body: { projectId?: string; repoUrl?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Cuerpo invalido' }, { status: 400, headers });
  }

  const { projectId, repoUrl } = body;

  if (!projectId || !repoUrl) {
    return Response.json({ error: 'Faltan parametros' }, { status: 400, headers });
  }

  // Verify project ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (projectError || !project) {
    return Response.json({ error: 'Proyecto no encontrado' }, { status: 404, headers });
  }

  // Get GitHub connection
  const serviceClient = createSupabaseServiceClient();
  const { data: ghConn, error: ghError } = await serviceClient
    .from('github_connections')
    .select('github_access_token, github_username')
    .eq('user_id', user.id)
    .maybeSingle();

  if (ghError || !ghConn) {
    return Response.json({ error: 'Cuenta de GitHub no conectada' }, { status: 403, headers });
  }

  const token: string = ghConn.github_access_token;

  // Parse repo URL: https://github.com/owner/repo or https://github.com/owner/repo.git
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+(?:\.git)?)$/);
  if (!match) {
    return Response.json({ error: 'URL de repo invalida' }, { status: 400, headers });
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, '');

  // Get repo info for default branch
  let repoInfo: Response;
  try {
    repoInfo = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
  } catch {
    return Response.json({ error: 'No se pudo acceder al repo' }, { status: 502, headers });
  }

  if (!repoInfo.ok) {
    if (repoInfo.status === 404) {
      return Response.json({ error: 'Repo no encontrado o sin acceso' }, { status: 404, headers });
    }
    return Response.json({ error: 'Error al acceder al repo' }, { status: 502, headers });
  }

  const repoData = await repoInfo.json();
  const branch: string = repoData.default_branch || 'main';

  // Fetch all files from the repo tree
  let files: { path: string; content: string }[];
  try {
    files = await getTreeBlobs(token, owner, repo, branch);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Error al leer archivos' },
      { status: 502, headers }
    );
  }

  if (files.length === 0) {
    return Response.json({ error: 'El repo no tiene archivos importables' }, { status: 400, headers });
  }

  // Insert files into project_files
  let importedCount = 0;
  for (const file of files) {
    const { data: existing } = await supabase
      .from('project_files')
      .select('id, version')
      .eq('project_id', projectId)
      .eq('path', file.path)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('project_files')
        .update({
          content: file.content,
          language: detectLanguage(file.path),
          version: (existing.version || 1) + 1,
        })
        .eq('id', existing.id);
      if (!updateErr) importedCount++;
    } else {
      const { error: insertErr } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          path: file.path,
          content: file.content,
          language: detectLanguage(file.path),
        });
      if (!insertErr) importedCount++;
    }
  }

  // Update project title
  await supabase
    .from('projects')
    .update({
      title: `${owner}/${repo}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  return Response.json(
    { imported: importedCount, repo: `${owner}/${repo}`, branch },
    { headers }
  );
}

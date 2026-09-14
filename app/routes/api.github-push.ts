import type { ActionFunctionArgs } from '@remix-run/node';
import { createSupabaseServerClient, createSupabaseServiceClient } from '~/lib/supabaseServer';
import type { ProjectFile } from '~/lib/types';

const GITHUB_API = 'https://api.github.com';

async function createBlob(
  token: string,
  owner: string,
  repo: string,
  content: string
): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, encoding: 'utf-8' }),
  });
  if (!res.ok) throw new Error('No se pudo crear blob');
  const data = await res.json();
  return data.sha;
}

async function getTreeSha(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<string | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/branches/${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.commit?.commit?.tree?.sha || null;
}

async function createTree(
  token: string,
  owner: string,
  repo: string,
  baseTreeSha: string | null,
  treeItems: { path: string; mode: string; type: string; sha?: string }[]
): Promise<string> {
  const body: Record<string, unknown> = { tree: treeItems };
  if (baseTreeSha) body.base_tree = baseTreeSha;

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('No se pudo crear el arbol');
  const data = await res.json();
  return data.sha;
}

async function createCommit(
  token: string,
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentSha?: string
): Promise<string> {
  const body: Record<string, unknown> = { message, tree: treeSha };
  if (parentSha) body.parents = [parentSha];

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('No se pudo crear el commit');
  const data = await res.json();
  return data.sha;
}

async function updateRef(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  sha: string
): Promise<void> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sha, force: false }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'No se pudo actualizar la rama');
  }
}

async function createBranch(
  token: string,
  owner: string,
  repo: string,
  newBranch: string,
  fromSha: string
): Promise<void> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: fromSha }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'No se pudo crear la rama');
  }
}

async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string
): Promise<string | null> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, head, base }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.html_url || null;
}

async function createRepo(
  token: string,
  name: string,
  isPrivate: boolean
): Promise<{ owner: string; repo: string; defaultBranch: string }> {
  const res = await fetch(`${GITHUB_API}/user/repos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, private: isPrivate, auto_init: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'No se pudo crear el repo');
  }
  const data = await res.json();
  return {
    owner: data.owner.login,
    repo: data.name,
    defaultBranch: data.default_branch || 'main',
  };
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

  let body: {
    projectId?: string;
    repoUrl?: string;
    newRepoName?: string;
    branch?: string;
    newBranch?: string;
    commitMessage?: string;
    openPR?: boolean;
    isPrivate?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Cuerpo invalido' }, { status: 400, headers });
  }

  const { projectId, repoUrl, newRepoName, branch, newBranch, commitMessage, openPR, isPrivate } = body;

  if (!projectId) {
    return Response.json({ error: 'Falta projectId' }, { status: 400, headers });
  }

  if (!repoUrl && !newRepoName) {
    return Response.json({ error: 'Especifica un repo o un nombre para crear uno nuevo' }, { status: 400, headers });
  }

  // Verify project ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, title')
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
  const ghUsername: string = ghConn.github_username;

  // Get project files
  const { data: dbFiles, error: filesError } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .order('path', { ascending: true });

  if (filesError || !dbFiles || dbFiles.length === 0) {
    return Response.json({ error: 'No hay archivos para exportar' }, { status: 400, headers });
  }

  const files = dbFiles as ProjectFile[];

  let owner: string;
  let repo: string;
  let targetBranch: string;
  let needsNewBranch = false;
  let baseBranchForPR: string | null = null;

  if (newRepoName) {
    // Create a new repo
    try {
      const created = await createRepo(token, newRepoName, isPrivate ?? false);
      owner = created.owner;
      repo = created.repo;
      targetBranch = created.defaultBranch;
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'Error al crear repo' },
        { status: 502, headers }
      );
    }
  } else {
    // Push to existing repo
    const match = repoUrl!.match(/github\.com\/([^/]+)\/([^/.]+(?:\.git)?)$/);
    if (!match) {
      return Response.json({ error: 'URL de repo invalida' }, { status: 400, headers });
    }
    owner = match[1];
    repo = match[2].replace(/\.git$/, '');
    targetBranch = branch || 'main';

    if (newBranch) {
      needsNewBranch = true;
      baseBranchForPR = targetBranch;
      targetBranch = newBranch;
    }
  }

  try {
    // Create blobs for all files
    const treeItems: { path: string; mode: string; type: string; sha?: string }[] = [];
    for (const file of files) {
      const blobSha = await createBlob(token, owner, repo, file.content);
      treeItems.push({ path: file.path, mode: '100644', type: 'blob', sha: blobSha });
    }

    // Get base tree (if repo has commits)
    let baseTreeSha: string | null = null;
    let parentSha: string | null = null;

    if (!newRepoName) {
      baseTreeSha = await getTreeSha(token, owner, repo, needsNewBranch ? baseBranchForPR! : targetBranch);

      const branchRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/branches/${needsNewBranch ? baseBranchForPR! : targetBranch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
        }
      );
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        parentSha = branchData.commit?.sha || null;
      }
    }

    // Create new branch if needed
    if (needsNewBranch && parentSha) {
      await createBranch(token, owner, repo, targetBranch, parentSha);
    }

    // Create tree
    const treeSha = await createTree(token, owner, repo, baseTreeSha, treeItems);

    // Create commit
    const msg = commitMessage || `Update project files from Coderion`;
    const commitSha = await createCommit(token, owner, repo, msg, treeSha, parentSha || undefined);

    // Update ref
    await updateRef(token, owner, repo, targetBranch, commitSha);

    let prUrl: string | null = null;
    if (openPR && needsNewBranch && baseBranchForPR) {
      prUrl = await createPullRequest(
        token,
        owner,
        repo,
        targetBranch,
        baseBranchForPR,
        `Update from Coderion: ${project.title}`,
        `Archivos actualizados desde Coderion.\n\n${files.length} archivos subidos.`
      );
    }

    return Response.json(
      {
        success: true,
        repo: `${owner}/${repo}`,
        branch: targetBranch,
        filesPushed: files.length,
        prUrl,
        url: `https://github.com/${owner}/${repo}/tree/${targetBranch}`,
      },
      { headers }
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Error al subir archivos' },
      { status: 502, headers }
    );
  }
}

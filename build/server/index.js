import { jsx, jsxs } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer, Outlet, Meta, Links, ScrollRestoration, Scripts, useSearchParams, useLoaderData, useLocation, Link, useActionData, useNavigation, Form, useNavigate } from "@remix-run/react";
import * as isbotModule from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { parse, serialize } from "cookie";
import { useRef, useState, useEffect } from "react";
import Stripe from "stripe";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  let prohibitOutOfOrderStreaming = isBotRequest(request.headers.get("user-agent")) || remixContext.isSpaMode;
  return prohibitOutOfOrderStreaming ? handleBotRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  ) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function isBotRequest(userAgent) {
  if (!userAgent) {
    return false;
  }
  if ("isbot" in isbotModule && typeof isbotModule.isbot === "function") {
    return isbotModule.isbot(userAgent);
  }
  if ("default" in isbotModule && typeof isbotModule.default === "function") {
    return isbotModule.default(userAgent);
  }
  return false;
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const stylesheet = "/assets/tailwind-7vRIZmil.css";
const links = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous"
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  }
];
function Layout({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "es", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { className: "bg-[#171717] text-white antialiased", children: [
      children,
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function App() {
  return /* @__PURE__ */ jsx(Outlet, {});
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Layout,
  default: App,
  links
}, Symbol.toStringTag, { value: "Module" }));
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://thhfunhmylimhdhehipi.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
function createSupabaseServerClient(request) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const cookies = parse(cookieHeader);
  const setCookieHeaders = [];
  const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(key) {
        return cookies[key];
      },
      set(key, value, options) {
        setCookieHeaders.push(
          serialize(key, value, {
            path: "/",
            sameSite: "lax",
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7,
            ...options
          })
        );
      },
      remove(key, options) {
        setCookieHeaders.push(
          serialize(key, "", {
            path: "/",
            sameSite: "lax",
            httpOnly: true,
            maxAge: 0,
            ...options
          })
        );
      }
    }
  });
  const headers = {};
  if (setCookieHeaders.length === 1) {
    headers["Set-Cookie"] = setCookieHeaders[0];
  } else if (setCookieHeaders.length > 1) {
    headers["Set-Cookie"] = setCookieHeaders.join(", ");
  }
  return { supabase: serverClient, headers };
}
function createSupabaseServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
async function getSetting(key) {
  const envValue = process.env[key.toUpperCase()] || process.env[key];
  if (envValue && envValue.trim() !== "" && !envValue.includes("your-")) {
    return envValue;
  }
  try {
    const serviceClient = createSupabaseServiceClient();
    const { data } = await serviceClient.from("app_settings").select("value").eq("key", key).maybeSingle();
    if ((data == null ? void 0 : data.value) && data.value.trim() !== "") {
      return data.value;
    }
  } catch {
  }
  return null;
}
const GITHUB_OAUTH_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_OAUTH_TOKEN = "https://github.com/login/oauth/access_token";
const GITHUB_API_USER = "https://api.github.com/user";
function getRedirectUrl(request) {
  const url = new URL(request.url);
  const origin = url.origin;
  return `${origin}/api/github-connect`;
}
async function action$b({ request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401, headers });
  }
  const clientId = await getSetting("github_client_id");
  if (!clientId) {
    return Response.json(
      { error: "GitHub OAuth no esta configurado. Configura las credenciales en el panel de administración." },
      { status: 503, headers }
    );
  }
  const redirectUrl = getRedirectUrl(request);
  const state = crypto.randomUUID();
  const scope = "repo read:user user:email";
  const authUrl = `${GITHUB_OAUTH_AUTHORIZE}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  return Response.json({ authUrl }, { headers });
}
async function loader$b({ request }) {
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/auth/login", ...headers }
    });
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/?github_error=no_code", ...headers }
    });
  }
  const clientId = await getSetting("github_client_id");
  const clientSecret = await getSetting("github_client_secret");
  if (!clientId || !clientSecret) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/?github_error=not_configured", ...headers }
    });
  }
  const redirectUrl = getRedirectUrl(request);
  let tokenResponse;
  try {
    tokenResponse = await fetch(GITHUB_OAUTH_TOKEN, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUrl
      })
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: "/?github_error=token_failed", ...headers }
    });
  }
  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/?github_error=no_token", ...headers }
    });
  }
  let userResponse;
  try {
    userResponse = await fetch(GITHUB_API_USER, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json"
      }
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: "/?github_error=user_failed", ...headers }
    });
  }
  const ghUser = await userResponse.json();
  const githubUsername = ghUser.login;
  const githubAvatarUrl = ghUser.avatar_url || null;
  if (!githubUsername) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/?github_error=no_username", ...headers }
    });
  }
  const serviceClient = createSupabaseServiceClient();
  const { error: upsertError } = await serviceClient.from("github_connections").upsert(
    {
      user_id: user.id,
      github_username: githubUsername,
      github_access_token: accessToken,
      github_avatar_url: githubAvatarUrl,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    { onConflict: "user_id" }
  );
  if (upsertError) {
    console.error("GitHub connection save failed:", upsertError);
    return new Response(null, {
      status: 302,
      headers: { Location: "/?github_error=save_failed", ...headers }
    });
  }
  return new Response(null, {
    status: 302,
    headers: { Location: "/?github_connected=true", ...headers }
  });
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$b,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
const SUPABASE_URL = "https://thhfunhmylimhdhehipi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoaGZ1bmhteWxpbWhkaGVoaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMzQzOTksImV4cCI6MjEwNDkxMDM5OX0.Fy3eE0yzhdp4APT4XQJ_nfpipeMP93hwO1A3wZ8xzCI";
const APP_NAME = "Coderion";
const APP_VERSION = "2.0.0";
const MenuClient = void 0;
const ProjectWorkspace = void 0;
const meta$8 = () => [
  { title: `${APP_NAME} - Proyecto` }
];
async function loader$a({ request, params }) {
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/auth/login", ...headers }
    });
  }
  const { data: profile, error: profileError } = await supabase2.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profileError || !profile) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/auth/login", ...headers }
    });
  }
  const { data: project, error: projectError } = await supabase2.from("projects").select("*").eq("id", params.projectId).eq("user_id", user.id).maybeSingle();
  if (projectError || !project) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/", ...headers }
    });
  }
  const { data: files } = await supabase2.from("project_files").select("*").eq("project_id", params.projectId).order("path", { ascending: true });
  const { data: models } = await supabase2.from("ai_models").select("*").eq("is_active", true).order("sort_order", { ascending: true });
  return Response.json(
    {
      user: { id: user.id, email: user.email },
      profile,
      project,
      files: files || [],
      models: models || []
    },
    { headers }
  );
}
function ProjectRoute() {
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";
  const { user, profile, project, files, models } = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-[#171717]", children: [
    /* @__PURE__ */ jsx(MenuClient, { user, profile }),
    /* @__PURE__ */ jsx("main", { className: "flex-1 flex flex-col min-w-0", children: /* @__PURE__ */ jsx(
      ProjectWorkspace,
      {
        projectId: project.id,
        projectTitle: project.title,
        initialMessages: project.messages,
        initialFiles: files,
        models,
        initialPrompt
      }
    ) })
  ] });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ProjectRoute,
  loader: loader$a,
  meta: meta$8
}, Symbol.toStringTag, { value: "Module" }));
const GITHUB_API$1 = "https://api.github.com";
function detectLanguage$1(path) {
  var _a;
  const ext = ((_a = path.split(".").pop()) == null ? void 0 : _a.toLowerCase()) || "";
  const map = {
    tsx: "tsx",
    ts: "ts",
    jsx: "jsx",
    js: "js",
    json: "json",
    css: "css",
    html: "html",
    md: "md",
    mdx: "mdx",
    py: "py",
    sh: "sh",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    toml: "toml"
  };
  return map[ext] || ext || "text";
}
async function getTreeBlobs(token, owner, repo, branch) {
  const treeRes = await fetch(
    `${GITHUB_API$1}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    }
  );
  if (!treeRes.ok) throw new Error("No se pudo leer el arbol del repo");
  const treeData = await treeRes.json();
  const blobs = (treeData.tree || []).filter(
    (item) => item.type === "blob" && item.path
  );
  const skipPatterns = [
    /\.git\//,
    /node_modules\//,
    /\.next\//,
    /dist\//,
    /build\//,
    /\.env/,
    /package-lock\.json/,
    /yarn\.lock/,
    /pnpm-lock\.yaml/
  ];
  const filtered = blobs.filter(
    (b) => !skipPatterns.some((p) => p.test(b.path))
  );
  const maxFiles = 100;
  const toFetch = filtered.slice(0, maxFiles);
  const results = [];
  for (const item of toFetch) {
    try {
      const fileRes = await fetch(
        `${GITHUB_API$1}/repos/${owner}/${repo}/contents/${encodeURIComponent(item.path)}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json"
          }
        }
      );
      if (!fileRes.ok) continue;
      const fileData = await fileRes.json();
      if (fileData.encoding === "base64" && fileData.content) {
        const content = atob(fileData.content.replace(/\n/g, ""));
        results.push({ path: item.path, content });
      }
    } catch {
    }
  }
  return results;
}
async function action$a({ request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401, headers });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo invalido" }, { status: 400, headers });
  }
  const { projectId, repoUrl } = body;
  if (!projectId || !repoUrl) {
    return Response.json({ error: "Faltan parametros" }, { status: 400, headers });
  }
  const { data: project, error: projectError } = await supabase2.from("projects").select("id, user_id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  if (projectError || !project) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404, headers });
  }
  const serviceClient = createSupabaseServiceClient();
  const { data: ghConn, error: ghError } = await serviceClient.from("github_connections").select("github_access_token, github_username").eq("user_id", user.id).maybeSingle();
  if (ghError || !ghConn) {
    return Response.json({ error: "Cuenta de GitHub no conectada" }, { status: 403, headers });
  }
  const token = ghConn.github_access_token;
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+(?:\.git)?)$/);
  if (!match) {
    return Response.json({ error: "URL de repo invalida" }, { status: 400, headers });
  }
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  let repoInfo;
  try {
    repoInfo = await fetch(`${GITHUB_API$1}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    });
  } catch {
    return Response.json({ error: "No se pudo acceder al repo" }, { status: 502, headers });
  }
  if (!repoInfo.ok) {
    if (repoInfo.status === 404) {
      return Response.json({ error: "Repo no encontrado o sin acceso" }, { status: 404, headers });
    }
    return Response.json({ error: "Error al acceder al repo" }, { status: 502, headers });
  }
  const repoData = await repoInfo.json();
  const branch = repoData.default_branch || "main";
  let files;
  try {
    files = await getTreeBlobs(token, owner, repo, branch);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error al leer archivos" },
      { status: 502, headers }
    );
  }
  if (files.length === 0) {
    return Response.json({ error: "El repo no tiene archivos importables" }, { status: 400, headers });
  }
  let importedCount = 0;
  for (const file of files) {
    const { data: existing } = await supabase2.from("project_files").select("id, version").eq("project_id", projectId).eq("path", file.path).maybeSingle();
    if (existing) {
      const { error: updateErr } = await supabase2.from("project_files").update({
        content: file.content,
        language: detectLanguage$1(file.path),
        version: (existing.version || 1) + 1
      }).eq("id", existing.id);
      if (!updateErr) importedCount++;
    } else {
      const { error: insertErr } = await supabase2.from("project_files").insert({
        project_id: projectId,
        path: file.path,
        content: file.content,
        language: detectLanguage$1(file.path)
      });
      if (!insertErr) importedCount++;
    }
  }
  await supabase2.from("projects").update({
    title: `${owner}/${repo}`,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", projectId);
  return Response.json(
    { imported: importedCount, repo: `${owner}/${repo}`, branch },
    { headers }
  );
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$a
}, Symbol.toStringTag, { value: "Module" }));
const GITHUB_API = "https://api.github.com";
async function createBlob(token, owner, repo, content) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content, encoding: "utf-8" })
  });
  if (!res.ok) throw new Error("No se pudo crear blob");
  const data = await res.json();
  return data.sha;
}
async function getTreeSha(token, owner, repo, branch) {
  var _a, _b, _c;
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/branches/${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return ((_c = (_b = (_a = data.commit) == null ? void 0 : _a.commit) == null ? void 0 : _b.tree) == null ? void 0 : _c.sha) || null;
}
async function createTree(token, owner, repo, baseTreeSha, treeItems) {
  const body = { tree: treeItems };
  if (baseTreeSha) body.base_tree = baseTreeSha;
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("No se pudo crear el arbol");
  const data = await res.json();
  return data.sha;
}
async function createCommit(token, owner, repo, message, treeSha, parentSha) {
  const body = { message, tree: treeSha };
  if (parentSha) body.parents = [parentSha];
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("No se pudo crear el commit");
  const data = await res.json();
  return data.sha;
}
async function updateRef(token, owner, repo, branch, sha) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sha, force: false })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "No se pudo actualizar la rama");
  }
}
async function createBranch(token, owner, repo, newBranch, fromSha) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: fromSha })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "No se pudo crear la rama");
  }
}
async function createPullRequest(token, owner, repo, head, base, title, body) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, body, head, base })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.html_url || null;
}
async function createRepo(token, name, isPrivate) {
  const res = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, private: isPrivate, auto_init: true })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "No se pudo crear el repo");
  }
  const data = await res.json();
  return {
    owner: data.owner.login,
    repo: data.name,
    defaultBranch: data.default_branch || "main"
  };
}
async function action$9({ request }) {
  var _a;
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401, headers });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo invalido" }, { status: 400, headers });
  }
  const { projectId, repoUrl, newRepoName, branch, newBranch, commitMessage, openPR, isPrivate } = body;
  if (!projectId) {
    return Response.json({ error: "Falta projectId" }, { status: 400, headers });
  }
  if (!repoUrl && !newRepoName) {
    return Response.json({ error: "Especifica un repo o un nombre para crear uno nuevo" }, { status: 400, headers });
  }
  const { data: project, error: projectError } = await supabase2.from("projects").select("id, user_id, title").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  if (projectError || !project) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404, headers });
  }
  const serviceClient = createSupabaseServiceClient();
  const { data: ghConn, error: ghError } = await serviceClient.from("github_connections").select("github_access_token, github_username").eq("user_id", user.id).maybeSingle();
  if (ghError || !ghConn) {
    return Response.json({ error: "Cuenta de GitHub no conectada" }, { status: 403, headers });
  }
  const token = ghConn.github_access_token;
  ghConn.github_username;
  const { data: dbFiles, error: filesError } = await supabase2.from("project_files").select("*").eq("project_id", projectId).order("path", { ascending: true });
  if (filesError || !dbFiles || dbFiles.length === 0) {
    return Response.json({ error: "No hay archivos para exportar" }, { status: 400, headers });
  }
  const files = dbFiles;
  let owner;
  let repo;
  let targetBranch;
  let needsNewBranch = false;
  let baseBranchForPR = null;
  if (newRepoName) {
    try {
      const created = await createRepo(token, newRepoName, isPrivate ?? false);
      owner = created.owner;
      repo = created.repo;
      targetBranch = created.defaultBranch;
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Error al crear repo" },
        { status: 502, headers }
      );
    }
  } else {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+(?:\.git)?)$/);
    if (!match) {
      return Response.json({ error: "URL de repo invalida" }, { status: 400, headers });
    }
    owner = match[1];
    repo = match[2].replace(/\.git$/, "");
    targetBranch = branch || "main";
    if (newBranch) {
      needsNewBranch = true;
      baseBranchForPR = targetBranch;
      targetBranch = newBranch;
    }
  }
  try {
    const treeItems = [];
    for (const file of files) {
      const blobSha = await createBlob(token, owner, repo, file.content);
      treeItems.push({ path: file.path, mode: "100644", type: "blob", sha: blobSha });
    }
    let baseTreeSha = null;
    let parentSha = null;
    if (!newRepoName) {
      baseTreeSha = await getTreeSha(token, owner, repo, needsNewBranch ? baseBranchForPR : targetBranch);
      const branchRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/branches/${needsNewBranch ? baseBranchForPR : targetBranch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json"
          }
        }
      );
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        parentSha = ((_a = branchData.commit) == null ? void 0 : _a.sha) || null;
      }
    }
    if (needsNewBranch && parentSha) {
      await createBranch(token, owner, repo, targetBranch, parentSha);
    }
    const treeSha = await createTree(token, owner, repo, baseTreeSha, treeItems);
    const msg = commitMessage || `Update project files from Coderion`;
    const commitSha = await createCommit(token, owner, repo, msg, treeSha, parentSha || void 0);
    await updateRef(token, owner, repo, targetBranch, commitSha);
    let prUrl = null;
    if (openPR && needsNewBranch && baseBranchForPR) {
      prUrl = await createPullRequest(
        token,
        owner,
        repo,
        targetBranch,
        baseBranchForPR,
        `Update from Coderion: ${project.title}`,
        `Archivos actualizados desde Coderion.

${files.length} archivos subidos.`
      );
    }
    return Response.json(
      {
        success: true,
        repo: `${owner}/${repo}`,
        branch: targetBranch,
        filesPushed: files.length,
        prUrl,
        url: `https://github.com/${owner}/${repo}/tree/${targetBranch}`
      },
      { headers }
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error al subir archivos" },
      { status: 502, headers }
    );
  }
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$9
}, Symbol.toStringTag, { value: "Module" }));
async function requireAdmin(request) {
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (!user) {
    return {
      redirect: new Response(null, {
        status: 302,
        headers: { Location: "/auth/login?redirectTo=/admin", ...headers }
      })
    };
  }
  const { data: profile } = await supabase2.from("profiles").select("id, email, is_admin").eq("id", user.id).maybeSingle();
  if (!profile || !profile.is_admin) {
    return {
      redirect: new Response(null, {
        status: 302,
        headers: { Location: "/", ...headers }
      })
    };
  }
  return {
    admin: {
      userId: user.id,
      email: profile.email || user.email || "",
      isAdmin: true
    },
    headers
  };
}
const NAV_ITEMS = [
  { path: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { path: "/admin/settings", label: "API Keys", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-4.07a1 1 0 01.49-.86l5.07-2.93A6 6 0 1121 9z" },
  { path: "/admin/models", label: "Modelos IA", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M3 13a2 2 0 00-2 2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2M3 13a2 2 0 002 2h14a2 2 0 002-2" },
  { path: "/admin/users", label: "Usuarios", icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" },
  { path: "/admin/projects", label: "Proyectos", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" }
];
function AdminLayout({ children, adminEmail }) {
  const location = useLocation();
  const currentPath = location.pathname;
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-[#171717] flex", children: [
    /* @__PURE__ */ jsxs("aside", { className: "w-60 border-r border-[#2F2F2F] bg-[#1E1E1E] flex flex-col flex-shrink-0", children: [
      /* @__PURE__ */ jsx("div", { className: "px-4 py-5 border-b border-[#2F2F2F]", children: /* @__PURE__ */ jsxs(Link, { to: "/admin", className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-[#9E7FFF]/20", children: /* @__PURE__ */ jsx("svg", { className: "h-4 w-4 text-[#9E7FFF]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 10V3L4 14h7v7l9-11h-7z" }) }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-white", children: APP_NAME }),
          /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-[#A3A3A3] uppercase tracking-wider", children: "Admin Panel" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("nav", { className: "flex-1 px-2 py-4 space-y-1", children: NAV_ITEMS.map((item) => {
        const isActive = currentPath === item.path || item.path !== "/admin" && currentPath.startsWith(item.path);
        return /* @__PURE__ */ jsxs(
          Link,
          {
            to: item.path,
            className: `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-[#9E7FFF]/10 text-[#9E7FFF] font-medium" : "text-[#A3A3A3] hover:bg-[#262626] hover:text-white"}`,
            children: [
              /* @__PURE__ */ jsx("svg", { className: "h-4 w-4 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: item.icon }) }),
              item.label
            ]
          },
          item.path
        );
      }) }),
      /* @__PURE__ */ jsxs("div", { className: "border-t border-[#2F2F2F] px-3 py-4 space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-[#262626] px-3 py-2", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3] truncate", children: adminEmail }),
          /* @__PURE__ */ jsx("p", { className: "text-[10px] text-green-400 mt-0.5", children: "Administrador" })
        ] }),
        /* @__PURE__ */ jsxs(
          Link,
          {
            to: "/",
            className: "flex items-center gap-2 text-xs text-[#A3A3A3] hover:text-white transition-colors px-3 py-1.5",
            children: [
              /* @__PURE__ */ jsx("svg", { className: "h-3.5 w-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10 19l-7-7m0 0l7-7m-7 7h18" }) }),
              "Volver a la app"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("main", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsx("div", { className: "max-w-5xl mx-auto px-6 py-8", children }) })
  ] });
}
const meta$7 = () => [
  { title: `${APP_NAME} - Admin · Proyectos` }
];
async function loader$9({ request }) {
  const result = await requireAdmin(request);
  if ("redirect" in result) return result.redirect;
  const serviceClient = createSupabaseServiceClient();
  const { data: projects } = await serviceClient.from("projects").select("id, title, status, model_id, created_at, updated_at, user_id").order("updated_at", { ascending: false }).limit(100);
  const userIds = [...new Set((projects || []).map((p) => p.user_id))];
  const { data: profiles } = await serviceClient.from("profiles").select("id, email").in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const emailMap = {};
  for (const p of profiles || []) {
    emailMap[p.id] = p.email;
  }
  const { data: fileCounts } = await serviceClient.from("project_files").select("project_id");
  const fileCountMap = {};
  for (const f of fileCounts || []) {
    const pid = f.project_id;
    fileCountMap[pid] = (fileCountMap[pid] || 0) + 1;
  }
  const adminProjects = (projects || []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    model_id: p.model_id,
    created_at: p.created_at,
    updated_at: p.updated_at,
    user_email: emailMap[p.user_id] || "Desconocido",
    file_count: fileCountMap[p.id] || 0
  }));
  return Response.json({
    adminEmail: result.admin.email,
    projects: adminProjects
  });
}
function AdminProjects() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs(AdminLayout, { adminEmail: data.adminEmail, children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white", children: "Proyectos" }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-[#A3A3A3] mt-1", children: [
        data.projects.length,
        " proyectos en total."
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F]", children: [
        /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Título" }),
        /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Usuario" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Archivos" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Modelo" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Estado" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Actualizado" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.projects.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 7, className: "text-center text-sm text-[#A3A3A3] py-8", children: "No hay proyectos." }) }) : data.projects.map((project) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F] last:border-0", children: [
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-white truncate max-w-[200px] block", children: project.title }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3]", children: project.user_email }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-[#A3A3A3]", children: project.file_count }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3] font-mono truncate max-w-[150px] block", children: project.model_id || "—" }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: project.status === "active" ? /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400", children: "Activo" }) : /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-[#3F3F3F] text-[#A3A3A3]", children: "Archivado" }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3]", children: new Date(project.updated_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx(
          Link,
          {
            to: `/project/${project.id}`,
            className: "text-xs text-[#9E7FFF] hover:underline",
            children: "Abrir →"
          }
        ) })
      ] }, project.id)) })
    ] }) })
  ] });
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminProjects,
  loader: loader$9,
  meta: meta$7
}, Symbol.toStringTag, { value: "Module" }));
const meta$6 = () => [
  { title: `${APP_NAME} - Admin · API Keys` }
];
const CATEGORY_LABELS = {
  ai: "Inteligencia Artificial",
  stripe: "Pagos (Stripe)",
  github: "GitHub OAuth",
  general: "General"
};
const CATEGORY_ORDER = ["ai", "stripe", "github", "general"];
async function loader$8({ request }) {
  const result = await requireAdmin(request);
  if ("redirect" in result) return result.redirect;
  const { supabase: supabase2 } = createSupabaseServerClient(request);
  const { data: settings } = await supabase2.from("app_settings").select("key, value, category, label, is_secret").order("category", { ascending: true });
  return Response.json({
    adminEmail: result.admin.email,
    settings: settings || []
  }, { headers: result.headers });
}
async function action$8({ request }) {
  const result = await requireAdmin(request);
  if ("redirect" in result) return result.redirect;
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  if (intent === "update") {
    const key = String(formData.get("key") || "");
    const value = String(formData.get("value") || "");
    if (!key) {
      return Response.json({ error: "Falta la clave" }, { status: 400, headers });
    }
    const { error } = await supabase2.from("app_settings").update({ value, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("key", key);
    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers });
    }
    return Response.json({ success: true }, { headers });
  }
  if (intent === "add") {
    const key = String(formData.get("key") || "");
    const value = String(formData.get("value") || "");
    const category = String(formData.get("category") || "general");
    const label = String(formData.get("label") || key);
    const is_secret = formData.get("is_secret") === "true";
    if (!key) {
      return Response.json({ error: "Falta la clave" }, { status: 400, headers });
    }
    const { error } = await supabase2.from("app_settings").insert({ key, value, category, label, is_secret });
    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers });
    }
    return Response.json({ success: true }, { headers });
  }
  if (intent === "delete") {
    const key = String(formData.get("key") || "");
    const { error } = await supabase2.from("app_settings").delete().eq("key", key);
    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers });
    }
    return Response.json({ success: true }, { headers });
  }
  return Response.json({ error: "Acción no reconocida" }, { status: 400, headers });
}
function AdminSettings() {
  const data = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const settingsByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: data.settings.filter((s) => s.category === cat)
  })).filter((g) => g.items.length > 0);
  return /* @__PURE__ */ jsxs(AdminLayout, { adminEmail: data.adminEmail, children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white", children: "API Keys y Configuración" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3] mt-1", children: "Gestiona las claves de los servicios externos. Los valores se guardan en la base de datos." })
    ] }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-red-400", children: actionData.error }) }),
    (actionData == null ? void 0 : actionData.success) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-green-500/10 border border-green-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-green-400", children: "Configuración guardada correctamente." }) }),
    settingsByCategory.map((group) => /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-white mb-3", children: CATEGORY_LABELS[group.category] || group.category }),
      /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden", children: group.items.map((setting) => /* @__PURE__ */ jsx("div", { className: "border-b border-[#2F2F2F] last:border-0 px-5 py-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm text-white font-medium", children: setting.label }),
            setting.is_secret && /* @__PURE__ */ jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 uppercase tracking-wider", children: "Secreto" }),
            setting.value && setting.value.trim() !== "" ? /* @__PURE__ */ jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400", children: "Configurado" }) : /* @__PURE__ */ jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400", children: "Falta" })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3] font-mono", children: setting.key }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3] mt-1 font-mono truncate", children: setting.is_secret && setting.value ? `${setting.value.slice(0, 4)}${"•".repeat(12)}${setting.value.slice(-4)}` : setting.value || "Sin configurar" })
        ] }),
        /* @__PURE__ */ jsxs(Form, { method: "post", className: "flex items-center gap-2 flex-shrink-0", children: [
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "update" }),
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "key", value: setting.key }),
          /* @__PURE__ */ jsx(
            "input",
            {
              name: "value",
              type: setting.is_secret ? "password" : "text",
              defaultValue: setting.value || "",
              placeholder: setting.is_secret ? "••••••••" : "Valor",
              className: "rounded-lg bg-[#1E1E1E] border border-[#2F2F2F] px-3 py-1.5 text-white text-xs font-mono focus:border-[#9E7FFF] focus:outline-none w-48"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: isSubmitting,
              className: "rounded-lg bg-[#9E7FFF] text-white text-xs font-medium px-3 py-1.5 hover:bg-[#8B6EE6] transition-colors disabled:opacity-50",
              children: "Guardar"
            }
          )
        ] })
      ] }) }, setting.key)) })
    ] }, group.category))
  ] });
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$8,
  default: AdminSettings,
  loader: loader$8,
  meta: meta$6
}, Symbol.toStringTag, { value: "Module" }));
async function loader$7({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  if (!code) {
    return new Response(
      JSON.stringify({ error: "No se recibió el código de autenticación." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...headers }
      }
    );
  }
  const { error } = await supabase2.auth.exchangeCodeForSession(code);
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...headers }
      }
    );
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: next,
      ...headers
    }
  });
}
function AuthCallback() {
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-[#171717] flex items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
    /* @__PURE__ */ jsxs("svg", { className: "w-12 h-12 text-[#9E7FFF] animate-spin mx-auto", fill: "none", viewBox: "0 0 24 24", children: [
      /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
      /* @__PURE__ */ jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "mt-4 text-[#A3A3A3]", children: "Verificando autenticación..." })
  ] }) });
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AuthCallback,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const meta$5 = () => {
  return [
    { title: `Crear cuenta | ${APP_NAME}` },
    { name: "description", content: "Crea tu cuenta de Coderion y comienza a construir con IA." }
  ];
};
async function loader$6({ request }) {
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (user) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        ...headers
      }
    });
  }
  return new Response(null, { headers });
}
async function action$7({ request }) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "");
  const redirectTo = String(formData.get("redirectTo") || "/");
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const { error } = await supabase2.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });
  if (error) {
    return Response.json(
      { error: error.message },
      { status: 400, headers }
    );
  }
  return Response.json(
    {
      success: true,
      message: "Cuenta creada. Ya puedes iniciar sesión.",
      redirectTo
    },
    { status: 200, headers }
  );
}
function RegisterRoute() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const initialPrompt = searchParams.get("prompt") || "";
  const emailRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const isSubmitting = navigation.state === "submitting";
  useEffect(() => {
    if (actionData == null ? void 0 : actionData.error) {
      setError(actionData.error);
    }
    if (actionData == null ? void 0 : actionData.success) {
      setMessage(actionData.message || "Cuenta creada correctamente.");
      const dest = actionData.redirectTo || redirectTo;
      const loginUrl = initialPrompt ? `/auth/login?redirectTo=${encodeURIComponent(dest)}&prompt=${encodeURIComponent(initialPrompt)}` : `/auth/login?redirectTo=${encodeURIComponent(dest)}`;
      setTimeout(() => {
        window.location.href = loginUrl;
      }, 2e3);
    }
  }, [actionData, redirectTo, initialPrompt]);
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-[#171717] flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 pointer-events-none", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-1/4 w-96 h-96 bg-[#f472b6] opacity-10 rounded-full blur-3xl animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 right-1/4 w-96 h-96 bg-[#38bdf8] opacity-10 rounded-full blur-3xl animate-pulse" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative max-w-md w-full mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/", className: "inline-flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("svg", { className: "w-8 h-8 text-[#9E7FFF]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 10V3L4 14h7v7l9-11h-7z" }) }),
          /* @__PURE__ */ jsx("span", { className: "text-2xl font-bold text-white tracking-tight", children: APP_NAME })
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "mt-6 text-3xl font-bold text-white tracking-tight", children: "Crea tu cuenta" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-[#A3A3A3]", children: "Comienza a construir con IA en minutos" }),
        initialPrompt && /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-xl border border-[#9E7FFF]/30 bg-[#9E7FFF]/10 px-4 py-3 text-left", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-medium text-[#9E7FFF] mb-1", children: "Tu idea:" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-white/80 line-clamp-3", children: initialPrompt })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-[#262626] rounded-2xl p-8 shadow-xl ring-1 ring-[#2F2F2F]", children: /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-5", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "redirectTo", value: redirectTo }),
        error && /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 p-3", role: "alert", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-[#ef4444]", children: error }) }),
        message && /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 p-3", role: "alert", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-[#10b981]", children: message }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "fullName", className: "block text-sm font-medium text-[#A3A3A3] mb-1.5", children: "Nombre completo" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: "fullName",
              name: "fullName",
              type: "text",
              autoComplete: "name",
              value: fullName,
              onChange: (e) => setFullName(e.target.value),
              placeholder: "Tu nombre",
              className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-[#A3A3A3] mb-1.5", children: "Correo electrónico" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              ref: emailRef,
              id: "email",
              name: "email",
              type: "email",
              autoComplete: "email",
              required: true,
              value: email,
              onChange: (e) => setEmail(e.target.value),
              placeholder: "tu@ejemplo.com",
              className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-[#A3A3A3] mb-1.5", children: "Contraseña" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: "password",
              name: "password",
              type: "password",
              autoComplete: "new-password",
              required: true,
              minLength: 8,
              value: password,
              onChange: (e) => setPassword(e.target.value),
              placeholder: "Mínimo 8 caracteres",
              className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: isSubmitting,
            className: "w-full rounded-lg bg-[#9E7FFF] py-2.5 px-4 text-white font-semibold hover:bg-[#8B6EE6] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all",
            children: isSubmitting ? "Creando cuenta..." : "Crear cuenta"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxs("p", { className: "mt-6 text-center text-sm text-[#A3A3A3]", children: [
        "¿Ya tienes una cuenta?",
        " ",
        /* @__PURE__ */ jsx(Link, { to: `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`, className: "font-semibold text-[#9E7FFF] hover:text-[#B39DFF] transition-colors", children: "Iniciar sesión" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-center text-sm text-[#A3A3A3]", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "text-[#A3A3A3] hover:text-white transition-colors", children: "← Volver al inicio" }) })
    ] })
  ] });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7,
  default: RegisterRoute,
  loader: loader$6,
  meta: meta$5
}, Symbol.toStringTag, { value: "Module" }));
const meta$4 = () => [
  { title: `${APP_NAME} - Admin` }
];
async function loader$5({ request }) {
  const result = await requireAdmin(request);
  if ("redirect" in result) return result.redirect;
  const serviceClient = createSupabaseServiceClient();
  const [{ count: totalUsers }, { count: totalProjects }, { count: totalFiles }, { count: activeModels }, { data: profiles }, { count: githubConnections }] = await Promise.all([
    serviceClient.from("profiles").select("*", { count: "exact", head: true }),
    serviceClient.from("projects").select("*", { count: "exact", head: true }),
    serviceClient.from("project_files").select("*", { count: "exact", head: true }),
    serviceClient.from("ai_models").select("*", { count: "exact", head: true }).eq("is_active", true),
    serviceClient.from("profiles").select("id, email, created_at, is_admin").order("created_at", { ascending: false }).limit(5),
    serviceClient.from("github_connections").select("*", { count: "exact", head: true })
  ]);
  const { data: tokenData } = await serviceClient.from("profiles").select("token_balance").not("token_balance", "is", null);
  const totalTokensIssued = (tokenData || []).reduce((sum, p) => sum + (p.token_balance || 0), 0);
  const { data: allSettings } = await serviceClient.from("app_settings").select("key, value, category").order("category", { ascending: true });
  const settings = allSettings || [];
  const configured = settings.filter((s) => s.value && s.value.trim() !== "").length;
  const total = settings.length;
  const categories = ["ai", "stripe", "github", "general"];
  const byCategory = categories.map((category) => {
    const catSettings = settings.filter((s) => s.category === category);
    return {
      category,
      configured: catSettings.filter((s) => s.value && s.value.trim() !== "").length,
      total: catSettings.length
    };
  });
  return Response.json({
    adminEmail: result.admin.email,
    stats: {
      totalUsers: totalUsers || 0,
      totalProjects: totalProjects || 0,
      totalFiles: totalFiles || 0,
      activeModels: activeModels || 0,
      totalTokensIssued,
      githubConnections: githubConnections || 0
    },
    recentUsers: profiles || [],
    settingsStatus: { configured, total, byCategory }
  });
}
function StatCard({ label, value, icon, accent }) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-[#A3A3A3] uppercase tracking-wider", children: label }),
      /* @__PURE__ */ jsx("div", { className: `flex h-8 w-8 items-center justify-center rounded-lg ${accent}`, children: /* @__PURE__ */ jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: icon }) }) })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-white", children: value })
  ] });
}
function AdminDashboard() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs(AdminLayout, { adminEmail: data.adminEmail, children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white", children: "Dashboard" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3] mt-1", children: "Resumen general de la plataforma." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Usuarios", value: data.stats.totalUsers, icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0z", accent: "bg-blue-500/10 text-blue-400" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Proyectos", value: data.stats.totalProjects, icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z", accent: "bg-purple-500/10 text-purple-400" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Archivos", value: data.stats.totalFiles, icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", accent: "bg-green-500/10 text-green-400" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Modelos activos", value: data.stats.activeModels, icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M3 13a2 2 0 00-2 2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2", accent: "bg-orange-500/10 text-orange-400" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Tokens emitidos", value: data.stats.totalTokensIssued.toLocaleString(), icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.657 0 3 .895 3 2s-1.343 2-3 2m0-8c1.657 0 3 .895 3 2s-1.343 2-3 2m-9 2h2m2 0h2", accent: "bg-cyan-500/10 text-cyan-400" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Conexiones GitHub", value: data.stats.githubConnections, icon: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12", accent: "bg-pink-500/10 text-pink-400" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] p-6 ring-1 ring-[#2F2F2F] mb-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-white", children: "Estado de configuración" }),
        /* @__PURE__ */ jsx(Link, { to: "/admin/settings", className: "text-xs text-[#9E7FFF] hover:underline", children: "Configurar →" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3", children: data.settingsStatus.byCategory.map((cat) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-[#1E1E1E] p-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-1", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3] capitalize", children: cat.category }),
          /* @__PURE__ */ jsxs("span", { className: `text-xs font-medium ${cat.configured === cat.total ? "text-green-400" : "text-yellow-400"}`, children: [
            cat.configured,
            "/",
            cat.total
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "h-1.5 rounded-full bg-[#2F2F2F] overflow-hidden", children: /* @__PURE__ */ jsx(
          "div",
          {
            className: `h-full rounded-full ${cat.configured === cat.total ? "bg-green-400" : "bg-yellow-400"}`,
            style: { width: cat.total > 0 ? `${cat.configured / cat.total * 100}%` : "0%" }
          }
        ) })
      ] }, cat.category)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b border-[#2F2F2F]", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-white", children: "Usuarios recientes" }),
        /* @__PURE__ */ jsx(Link, { to: "/admin/users", className: "text-xs text-[#9E7FFF] hover:underline", children: "Ver todos →" })
      ] }),
      data.recentUsers.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3] px-5 py-8 text-center", children: "No hay usuarios registrados." }) : /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F]", children: [
          /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-5 py-2.5", children: "Email" }),
          /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-5 py-2.5", children: "Registrado" }),
          /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-2.5", children: "Rol" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: data.recentUsers.map((user) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F] last:border-0", children: [
          /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-sm text-white", children: user.email }),
          /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-xs text-[#A3A3A3]", children: new Date(user.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) }),
          /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: user.is_admin ? /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-[#9E7FFF]/20 text-[#9E7FFF]", children: "Admin" }) : /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-[#3F3F3F] text-[#A3A3A3]", children: "Usuario" }) })
        ] }, user.id)) })
      ] })
    ] })
  ] });
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminDashboard,
  loader: loader$5,
  meta: meta$4
}, Symbol.toStringTag, { value: "Module" }));
const meta$3 = () => [
  { title: `${APP_NAME} - Admin · Modelos de IA` }
];
async function loader$4({ request }) {
  const result = await requireAdmin(request);
  if ("redirect" in result) return result.redirect;
  const { supabase: supabase2 } = createSupabaseServerClient(request);
  const { data: models } = await supabase2.from("ai_models").select("*").order("sort_order", { ascending: true });
  return Response.json(
    { adminEmail: result.admin.email, models: models || [] },
    { headers: result.headers }
  );
}
async function action$6({ request }) {
  const result = await requireAdmin(request);
  if ("redirect" in result) return result.redirect;
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const serviceClient = createSupabaseServiceClient();
  if (intent === "create") {
    const name = String(formData.get("name") || "");
    const model_id = String(formData.get("model_id") || "");
    const provider = String(formData.get("provider") || "openrouter");
    const input_price = parseFloat(String(formData.get("input_price_per_token") || "0"));
    const output_price = parseFloat(String(formData.get("output_price_per_token") || "0"));
    const markup = parseFloat(String(formData.get("markup_multiplier") || "1"));
    const token_cost = parseFloat(String(formData.get("token_cost_multiplier") || "1"));
    const badge = String(formData.get("badge") || "");
    const sort_order = parseInt(String(formData.get("sort_order") || "0"), 10);
    if (!name || !model_id) {
      return Response.json({ error: "Nombre y model_id son obligatorios" }, { status: 400, headers: result.headers });
    }
    const { error } = await serviceClient.from("ai_models").insert({
      name,
      model_id,
      provider,
      input_price_per_token: input_price,
      output_price_per_token: output_price,
      markup_multiplier: markup,
      token_cost_multiplier: token_cost,
      badge: badge || null,
      sort_order,
      is_active: true
    });
    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }
    return Response.json({ success: true }, { headers: result.headers });
  }
  if (intent === "update") {
    const id = String(formData.get("id") || "");
    const field = String(formData.get("field") || "");
    const value = String(formData.get("value") || "");
    if (!id || !field) {
      return Response.json({ error: "Faltan parámetros" }, { status: 400, headers: result.headers });
    }
    let parsedValue = value;
    if (field === "is_active") parsedValue = value === "true";
    else if (field === "sort_order") parsedValue = parseInt(value, 10);
    else if (["markup_multiplier", "token_cost_multiplier", "input_price_per_token", "output_price_per_token"].includes(field)) {
      parsedValue = parseFloat(value);
    }
    const { error } = await serviceClient.from("ai_models").update({ [field]: parsedValue }).eq("id", id);
    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }
    return Response.json({ success: true }, { headers: result.headers });
  }
  if (intent === "delete") {
    const id = String(formData.get("id") || "");
    const { error } = await serviceClient.from("ai_models").delete().eq("id", id);
    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }
    return Response.json({ success: true }, { headers: result.headers });
  }
  return Response.json({ error: "Acción no reconocida" }, { status: 400, headers: result.headers });
}
function AdminModelsRoute() {
  const { adminEmail, models } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showForm, setShowForm] = useState(false);
  return /* @__PURE__ */ jsxs(AdminLayout, { adminEmail, children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white", children: "Modelos de IA" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3] mt-1", children: "Configura los modelos disponibles, precios y márgenes de ganancia." })
    ] }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-red-400", children: actionData.error }) }),
    (actionData == null ? void 0 : actionData.success) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-green-500/10 border border-green-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-green-400", children: "Operación completada." }) }),
    /* @__PURE__ */ jsx("div", { className: "bg-[#262626] rounded-2xl ring-1 ring-[#2F2F2F] overflow-hidden mb-6", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F]", children: [
        /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Nombre" }),
        /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Model ID" }),
        /* @__PURE__ */ jsx("th", { className: "text-right text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Markup" }),
        /* @__PURE__ */ jsx("th", { className: "text-right text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Cost Mult." }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Activo" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Orden" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-4 py-3" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: models.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 7, className: "text-center text-sm text-[#A3A3A3] py-8", children: "No hay modelos configurados." }) }) : models.map((model) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F] last:border-0", children: [
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-sm text-white font-medium", children: model.name }),
          model.badge && /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-[#9E7FFF]/20 text-[#9E7FFF]", children: model.badge })
        ] }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3] font-mono", children: model.model_id }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsxs("span", { className: "text-sm text-white", children: [
          model.markup_multiplier,
          "x"
        ] }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsxs("span", { className: "text-sm text-white", children: [
          model.token_cost_multiplier,
          "x"
        ] }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-center", children: /* @__PURE__ */ jsxs("form", { method: "post", className: "inline", children: [
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "update" }),
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "id", value: model.id }),
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "field", value: "is_active" }),
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "value", value: model.is_active ? "false" : "true" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: isSubmitting,
              className: `text-xs px-2 py-1 rounded-full transition-colors ${model.is_active ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-[#3F3F3F] text-[#A3A3A3] hover:bg-[#4F4F4F]"}`,
              children: model.is_active ? "Activo" : "Inactivo"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-[#A3A3A3]", children: model.sort_order }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-center", children: /* @__PURE__ */ jsxs(
          "form",
          {
            method: "post",
            className: "inline",
            onSubmit: (e) => {
              if (!confirm("¿Eliminar este modelo?")) e.preventDefault();
            },
            children: [
              /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "delete" }),
              /* @__PURE__ */ jsx("input", { type: "hidden", name: "id", value: model.id }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "submit",
                  disabled: isSubmitting,
                  className: "text-[#A3A3A3] hover:text-red-400 transition-colors p-1",
                  "aria-label": "Eliminar",
                  children: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) })
                }
              )
            ]
          }
        ) })
      ] }, model.id)) })
    ] }) }),
    showForm ? /* @__PURE__ */ jsxs("div", { className: "bg-[#262626] rounded-2xl ring-1 ring-[#2F2F2F] p-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold text-white mb-4", children: "Nuevo modelo" }),
      /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-4", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "create" }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Nombre" }),
            /* @__PURE__ */ jsx("input", { name: "name", required: true, placeholder: "Claude 3.5 Sonnet", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Model ID" }),
            /* @__PURE__ */ jsx("input", { name: "model_id", required: true, placeholder: "anthropic/claude-3.5-sonnet", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm font-mono focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Provider" }),
            /* @__PURE__ */ jsx("input", { name: "provider", defaultValue: "openrouter", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Badge (opcional)" }),
            /* @__PURE__ */ jsx("input", { name: "badge", placeholder: "Premium / Económico", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Precio input / token (USD)" }),
            /* @__PURE__ */ jsx("input", { name: "input_price_per_token", type: "number", step: "0.00000001", defaultValue: "0", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Precio output / token (USD)" }),
            /* @__PURE__ */ jsx("input", { name: "output_price_per_token", type: "number", step: "0.00000001", defaultValue: "0", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Markup (1.5 = 50% ganancia)" }),
            /* @__PURE__ */ jsx("input", { name: "markup_multiplier", type: "number", step: "0.1", defaultValue: "1.0", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Multiplicador de tokens (2.0 = cobra 2x tokens)" }),
            /* @__PURE__ */ jsx("input", { name: "token_cost_multiplier", type: "number", step: "0.1", defaultValue: "1.0", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Orden" }),
            /* @__PURE__ */ jsx("input", { name: "sort_order", type: "number", defaultValue: "0", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("button", { type: "submit", disabled: isSubmitting, className: "bg-[#9E7FFF] text-white font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#8B6EE6] transition-colors disabled:opacity-50", children: isSubmitting ? "Guardando..." : "Crear modelo" }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowForm(false), className: "text-[#A3A3A3] hover:text-white text-sm transition-colors", children: "Cancelar" })
        ] })
      ] })
    ] }) : /* @__PURE__ */ jsxs("button", { onClick: () => setShowForm(true), className: "flex items-center gap-2 bg-[#9E7FFF]/10 border border-[#9E7FFF]/30 text-[#9E7FFF] rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#9E7FFF]/20 transition-colors", children: [
      /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 4v16m8-8H4" }) }),
      "Agregar modelo"
    ] })
  ] });
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6,
  default: AdminModelsRoute,
  loader: loader$4,
  meta: meta$3
}, Symbol.toStringTag, { value: "Module" }));
const TOKEN_PACKAGES$1 = {
  basic: { name: "Básico", tokens: 5e5, price: 10, settingKey: "stripe_price_basic" },
  pro: { name: "Pro", tokens: 2e6, price: 25, settingKey: "stripe_price_pro" },
  enterprise: { name: "Empresarial", tokens: 1e7, price: 99, settingKey: "stripe_price_enterprise" }
};
async function action$5({ request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (!user || !user.email) {
    return Response.json({ error: "No autenticado" }, { status: 401, headers });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400, headers });
  }
  const packageKey = body.package;
  if (!packageKey || !(packageKey in TOKEN_PACKAGES$1)) {
    return Response.json({ error: "Paquete inválido" }, { status: 400, headers });
  }
  const pkg = TOKEN_PACKAGES$1[packageKey];
  const priceId = await getSetting(pkg.settingKey);
  if (!priceId) {
    return Response.json(
      { error: "Este paquete no está configurado. Configúralo en el panel de administración." },
      { status: 503, headers }
    );
  }
  const stripeSecretKey = await getSetting("stripe_secret_key");
  if (!stripeSecretKey) {
    return Response.json(
      { error: "Stripe no está configurado. Configúralo en el panel de administración." },
      { status: 503, headers }
    );
  }
  const stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true
  });
  const origin = request.headers.get("Origin") || "http://localhost:3000";
  let session;
  try {
    session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`
    });
  } catch (err) {
    console.error("Stripe checkout session creation failed:", err);
    return Response.json({ error: "No se pudo crear la sesión de pago." }, { status: 502, headers });
  }
  return Response.json({ url: session.url }, { headers });
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5
}, Symbol.toStringTag, { value: "Module" }));
const meta$2 = () => [
  { title: `${APP_NAME} - Admin · Usuarios` }
];
async function loader$3({ request }) {
  const result = await requireAdmin(request);
  if ("redirect" in result) return result.redirect;
  const serviceClient = createSupabaseServiceClient();
  const { data: profiles } = await serviceClient.from("profiles").select("id, email, full_name, token_balance, is_admin, created_at").order("created_at", { ascending: false });
  const { data: projectCounts } = await serviceClient.from("projects").select("user_id").order("user_id");
  const countMap = {};
  for (const p of projectCounts || []) {
    const uid = p.user_id;
    countMap[uid] = (countMap[uid] || 0) + 1;
  }
  const users = (profiles || []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    token_balance: p.token_balance,
    is_admin: p.is_admin,
    created_at: p.created_at,
    projectCount: countMap[p.id] || 0
  }));
  return Response.json({
    adminEmail: result.admin.email,
    users
  });
}
async function action$4({ request }) {
  const result = await requireAdmin(request);
  if ("redirect" in result) return result.redirect;
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const userId = String(formData.get("userId") || "");
  if (!userId) {
    return Response.json({ error: "Falta el usuario" }, { status: 400, headers: result.headers });
  }
  const serviceClient = createSupabaseServiceClient();
  if (intent === "toggle_admin") {
    const current = String(formData.get("current") || "false");
    const newAdmin = current !== "true";
    const { error } = await serviceClient.from("profiles").update({ is_admin: newAdmin }).eq("id", userId);
    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }
    return Response.json({ success: true }, { headers: result.headers });
  }
  if (intent === "add_tokens") {
    const amount = parseInt(String(formData.get("amount") || "0"), 10);
    if (!amount || amount <= 0) {
      return Response.json({ error: "Cantidad inválida" }, { status: 400, headers: result.headers });
    }
    const { data: profile } = await serviceClient.from("profiles").select("token_balance").eq("id", userId).maybeSingle();
    if (!profile) {
      return Response.json({ error: "Usuario no encontrado" }, { status: 404, headers: result.headers });
    }
    const newBalance = (profile.token_balance || 0) + amount;
    const { error } = await serviceClient.from("profiles").update({ token_balance: newBalance }).eq("id", userId);
    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }
    return Response.json({ success: true }, { headers: result.headers });
  }
  if (intent === "set_tokens") {
    const amount = parseInt(String(formData.get("amount") || "0"), 10);
    if (amount < 0) {
      return Response.json({ error: "Cantidad inválida" }, { status: 400, headers: result.headers });
    }
    const { error } = await serviceClient.from("profiles").update({ token_balance: amount }).eq("id", userId);
    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }
    return Response.json({ success: true }, { headers: result.headers });
  }
  return Response.json({ error: "Acción no reconocida" }, { status: 400, headers: result.headers });
}
function AdminUsers() {
  const data = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [tokenModal, setTokenModal] = useState(null);
  return /* @__PURE__ */ jsxs(AdminLayout, { adminEmail: data.adminEmail, children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white", children: "Usuarios" }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-[#A3A3A3] mt-1", children: [
        data.users.length,
        " usuarios registrados."
      ] })
    ] }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-red-400", children: actionData.error }) }),
    (actionData == null ? void 0 : actionData.success) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-green-500/10 border border-green-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-green-400", children: "Operación completada." }) }),
    /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F]", children: [
        /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Usuario" }),
        /* @__PURE__ */ jsx("th", { className: "text-right text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Tokens" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Proyectos" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Registrado" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Rol" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Acciones" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.users.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 6, className: "text-center text-sm text-[#A3A3A3] py-8", children: "No hay usuarios." }) }) : data.users.map((user) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F] last:border-0", children: [
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3", children: /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-white", children: user.email }),
          user.full_name && /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3]", children: user.full_name })
        ] }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-right", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-white font-mono", children: user.token_balance.toLocaleString() }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-[#A3A3A3]", children: user.projectCount }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3]", children: new Date(user.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsxs(Form, { method: "post", className: "inline", children: [
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "toggle_admin" }),
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "userId", value: user.id }),
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "current", value: String(user.is_admin) }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: isSubmitting,
              className: `text-xs px-2 py-1 rounded-full transition-colors ${user.is_admin ? "bg-[#9E7FFF]/20 text-[#9E7FFF] hover:bg-[#9E7FFF]/30" : "bg-[#3F3F3F] text-[#A3A3A3] hover:bg-[#4F4F4F]"}`,
              children: user.is_admin ? "Admin" : "Usuario"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-1.5", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setTokenModal({ userId: user.id, email: user.email, mode: "add" }),
              className: "text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors",
              title: "Añadir tokens",
              children: "+ Tokens"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setTokenModal({ userId: user.id, email: user.email, mode: "set" }),
              className: "text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors",
              title: "Establecer tokens",
              children: "Set"
            }
          )
        ] }) })
      ] }, user.id)) })
    ] }) }),
    tokenModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm", onClick: () => setTokenModal(null), children: /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] p-6 w-full max-w-md mx-4", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-white mb-2", children: tokenModal.mode === "add" ? "Añadir tokens" : "Establecer tokens" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3] mb-4", children: tokenModal.email }),
      /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-4", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: tokenModal.mode === "add" ? "add_tokens" : "set_tokens" }),
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "userId", value: tokenModal.userId }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1.5", children: tokenModal.mode === "add" ? "Cantidad a añadir" : "Nuevo balance total" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              name: "amount",
              type: "number",
              required: true,
              min: "0",
              placeholder: "100000",
              className: "w-full rounded-lg bg-[#1E1E1E] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none",
              autoFocus: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: isSubmitting,
              className: "bg-[#9E7FFF] text-white font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#8B6EE6] transition-colors disabled:opacity-50",
              children: isSubmitting ? "Guardando..." : "Confirmar"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setTokenModal(null),
              className: "text-[#A3A3A3] hover:text-white text-sm transition-colors",
              children: "Cancelar"
            }
          )
        ] })
      ] })
    ] }) })
  ] });
}
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: AdminUsers,
  loader: loader$3,
  meta: meta$2
}, Symbol.toStringTag, { value: "Module" }));
const TOKEN_PACKAGES = {
  basic: { tokens: 5e5, settingKey: "stripe_price_basic" },
  pro: { tokens: 2e6, settingKey: "stripe_price_pro" },
  enterprise: { tokens: 1e7, settingKey: "stripe_price_enterprise" }
};
async function action$3({ request }) {
  var _a, _b, _c;
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }
  const stripeSecretKey = await getSetting("stripe_secret_key");
  const webhookSecret = await getSetting("stripe_webhook_secret");
  if (!stripeSecretKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 503 });
  }
  const stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true
  });
  let event;
  try {
    const payload = await request.text();
    event = stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerEmail = session.customer_email || ((_a = session.customer_details) == null ? void 0 : _a.email);
    if (!customerEmail) {
      console.error("No customer email found in session:", session.id);
      return new Response("No email found", { status: 400 });
    }
    const expandedSession = await stripeClient.checkout.sessions.retrieve(
      session.id,
      { expand: ["line_items"] }
    );
    const lineItems = ((_b = expandedSession.line_items) == null ? void 0 : _b.data) || [];
    let tokensToAdd = 0;
    for (const item of lineItems) {
      const priceId = ((_c = item.price) == null ? void 0 : _c.id) || "";
      for (const key of Object.keys(TOKEN_PACKAGES)) {
        const pkgPriceId = await getSetting(TOKEN_PACKAGES[key].settingKey);
        if (pkgPriceId && pkgPriceId === priceId) {
          tokensToAdd += TOKEN_PACKAGES[key].tokens * (item.quantity || 1);
          break;
        }
      }
    }
    if (tokensToAdd === 0) {
      console.error("Unknown price ID in line items for session:", session.id);
      return new Response("Unknown price", { status: 400 });
    }
    const supabase2 = createSupabaseServiceClient();
    const { data: userData, error: userError } = await supabase2.from("profiles").select("id").eq("email", customerEmail).maybeSingle();
    if (userError || !userData) {
      console.error("User not found for email:", customerEmail);
      return new Response("User not found", { status: 404 });
    }
    const { data: newBalance, error: addError } = await supabase2.rpc("add_tokens", {
      p_user_id: userData.id,
      p_amount: tokensToAdd
    });
    if (addError || newBalance === null) {
      console.error("Failed to add tokens for user:", userData.id, addError);
      return new Response("Failed to add tokens", { status: 500 });
    }
    console.log(`Added ${tokensToAdd} tokens to user ${userData.id}. New balance: ${newBalance}`);
    return Response.json({ received: true, newBalance });
  }
  return Response.json({ received: true });
}
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3
}, Symbol.toStringTag, { value: "Module" }));
async function action$2({ request }) {
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  await supabase2.auth.signOut();
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/auth/login",
      ...headers
    }
  });
}
async function loader$2() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/auth/login"
    }
  });
}
function LogoutRoute() {
  return null;
}
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: LogoutRoute,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const meta$1 = () => {
  return [
    { title: `Iniciar sesión | ${APP_NAME}` },
    { name: "description", content: "Accede a tu cuenta de Coderion para continuar construyendo con IA." }
  ];
};
async function loader$1({ request }) {
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (user) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        ...headers
      }
    });
  }
  return new Response(null, { headers });
}
async function action$1({ request }) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/");
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const { error } = await supabase2.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    return Response.json(
      { error: error.message },
      { status: 400, headers }
    );
  }
  return Response.json(
    { success: true, redirectTo },
    { status: 200, headers }
  );
}
function LoginRoute() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const initialPrompt = searchParams.get("prompt") || "";
  const emailRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const isSubmitting = navigation.state === "submitting";
  useEffect(() => {
    if (actionData == null ? void 0 : actionData.error) {
      setError(actionData.error);
    }
    if (actionData == null ? void 0 : actionData.success) {
      const dest = actionData.redirectTo || redirectTo;
      window.location.href = initialPrompt ? `${dest}${dest.includes("?") ? "&" : "?"}prompt=${encodeURIComponent(initialPrompt)}` : dest;
    }
  }, [actionData, redirectTo, initialPrompt]);
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-[#171717] flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 pointer-events-none", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-1/4 w-96 h-96 bg-[#9E7FFF] opacity-10 rounded-full blur-3xl animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 right-1/4 w-96 h-96 bg-[#38bdf8] opacity-10 rounded-full blur-3xl animate-pulse" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative max-w-md w-full mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/", className: "inline-flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("svg", { className: "w-8 h-8 text-[#9E7FFF]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 10V3L4 14h7v7l9-11h-7z" }) }),
          /* @__PURE__ */ jsx("span", { className: "text-2xl font-bold text-white tracking-tight", children: APP_NAME })
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "mt-6 text-3xl font-bold text-white tracking-tight", children: "Bienvenido de nuevo" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-[#A3A3A3]", children: "Inicia sesión para continuar construyendo" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-[#262626] rounded-2xl p-8 shadow-xl ring-1 ring-[#2F2F2F]", children: /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-5", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "redirectTo", value: redirectTo }),
        error && /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 p-3", role: "alert", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-[#ef4444]", children: error }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-[#A3A3A3] mb-1.5", children: "Correo electrónico" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              ref: emailRef,
              id: "email",
              name: "email",
              type: "email",
              autoComplete: "email",
              required: true,
              value: email,
              onChange: (e) => setEmail(e.target.value),
              placeholder: "tu@ejemplo.com",
              className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-[#A3A3A3] mb-1.5", children: "Contraseña" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: "password",
              name: "password",
              type: "password",
              autoComplete: "current-password",
              required: true,
              value: password,
              onChange: (e) => setPassword(e.target.value),
              placeholder: "••••••••",
              className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: isSubmitting,
            className: "w-full rounded-lg bg-[#9E7FFF] py-2.5 px-4 text-white font-semibold hover:bg-[#8B6EE6] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all",
            children: isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxs("p", { className: "mt-6 text-center text-sm text-[#A3A3A3]", children: [
        "¿No tienes una cuenta?",
        " ",
        /* @__PURE__ */ jsx(Link, { to: `/auth/register?redirectTo=${encodeURIComponent(redirectTo)}`, className: "font-semibold text-[#9E7FFF] hover:text-[#B39DFF] transition-colors", children: "Crear cuenta" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-center text-sm text-[#A3A3A3]", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "text-[#A3A3A3] hover:text-white transition-colors", children: "← Volver al inicio" }) })
    ] })
  ] });
}
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: LoginRoute,
  loader: loader$1,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
const LANGUAGE_MAP = {
  tsx: "tsx",
  ts: "ts",
  jsx: "jsx",
  js: "js",
  json: "json",
  css: "css",
  html: "html",
  md: "md",
  mdx: "mdx",
  py: "py",
  sh: "sh",
  yaml: "yaml",
  yml: "yaml",
  sql: "sql",
  toml: "toml",
  env: "env"
};
function detectLanguage(path) {
  var _a;
  const ext = ((_a = path.split(".").pop()) == null ? void 0 : _a.toLowerCase()) || "";
  return LANGUAGE_MAP[ext] || ext || "text";
}
function extractPath(line) {
  const trimmed = line.trim();
  const directMatch = trimmed.match(/^(?:filepath|file|path)[:=]\s*[`"']?(.+?)[`"']?\s*$/i);
  if (directMatch) return directMatch[1].replace(/[`"']/g, "").trim();
  const commentMatch = trimmed.match(/(?:\/\/|#|<!--)\s*(?:filepath|file|path)[:=]\s*(.+?)\s*(?:-->|$)/i);
  if (commentMatch) return commentMatch[1].replace(/[`"']/g, "").trim();
  return null;
}
function parseGeneratedFiles(response) {
  const files = [];
  const lines = response.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim().startsWith("```")) {
      i++;
      continue;
    }
    const fenceMatch = line.match(/^```(\w*)\s+(.*)/);
    let path = null;
    let language = "";
    let contentStartIdx = i + 1;
    if (fenceMatch) {
      language = fenceMatch[1] || "";
      const afterLang = fenceMatch[2].trim();
      const pathFromFence = extractPath(afterLang);
      if (pathFromFence) {
        path = pathFromFence;
      }
    }
    if (!path && contentStartIdx < lines.length) {
      const pathFromNext = extractPath(lines[contentStartIdx]);
      if (pathFromNext) {
        path = pathFromNext;
        contentStartIdx++;
      }
    }
    if (!path) {
      i++;
      continue;
    }
    const contentLines = [];
    let foundClose = false;
    for (let j = contentStartIdx; j < lines.length; j++) {
      if (lines[j].trim() === "```") {
        foundClose = true;
        i = j + 1;
        break;
      }
      contentLines.push(lines[j]);
    }
    if (!foundClose) {
      i++;
      continue;
    }
    let content = contentLines.join("\n");
    content = content.replace(/^\n+/, "").replace(/\s+$/, "");
    const detectedLang = language || detectLanguage(path);
    files.push({ path, content, language: detectedLang });
  }
  return files;
}
function stripFileBlocks(response) {
  const files = parseGeneratedFiles(response);
  let cleaned = response;
  for (const file of files) {
    const escapedPath = file.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blockRegex = new RegExp(
      "```\\w*\\s*(?://\\s*)?(?:filepath|file|path)[:=]\\s*" + escapedPath + "[^\\n]*\\n[\\s\\S]*?```\\n?",
      "g"
    );
    cleaned = cleaned.replace(blockRegex, "");
  }
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned || "Proyecto generado correctamente.";
}
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL_ID = "deepseek/deepseek-v4-pro-0813";
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
async function action({ request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401, headers });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo de la peticion invalido" }, { status: 400, headers });
  }
  const { projectId, messages, modelId } = body;
  if (!projectId || !messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Faltan parametros requeridos" }, { status: 400, headers });
  }
  const { data: project, error: projectError } = await supabase2.from("projects").select("id, user_id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  if (projectError || !project) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404, headers });
  }
  const { data: profile, error: profileError } = await supabase2.from("profiles").select("token_balance, preferred_model_id").eq("id", user.id).maybeSingle();
  if (profileError || !profile) {
    return Response.json({ error: "Perfil no encontrado" }, { status: 404, headers });
  }
  const tokenBalance = profile.token_balance;
  const targetModelId = modelId || profile.preferred_model_id;
  let apiModel = DEFAULT_MODEL_ID;
  let tokenCostMultiplier = 1;
  if (targetModelId) {
    const { data: aiModel } = await supabase2.from("ai_models").select("model_id, token_cost_multiplier, is_active").eq("id", targetModelId).maybeSingle();
    if (aiModel && aiModel.is_active) {
      apiModel = aiModel.model_id;
      tokenCostMultiplier = aiModel.token_cost_multiplier;
    }
  }
  const lastMessage = messages[messages.length - 1];
  const estimatedInputTokens = Math.ceil(
    messages.reduce((sum, m) => sum + m.content.length, 0) / 4
  );
  const estimatedOutputTokens = Math.ceil(
    ((lastMessage == null ? void 0 : lastMessage.content.length) ?? 0) * 1.5 / 4
  );
  const estimatedTotal = estimatedInputTokens + estimatedOutputTokens;
  if (estimatedTotal > tokenBalance) {
    return Response.json(
      { error: "No tienes suficientes tokens para enviar este mensaje.", tokenBalance },
      { status: 402, headers }
    );
  }
  await supabase2.from("projects").update({ model_id: apiModel }).eq("id", projectId);
  const apiKey = await getSetting("openrouter_api_key");
  if (!apiKey) {
    return Response.json(
      { error: "El servicio de IA no esta configurado. Configura la API key de OpenRouter en el panel de administración." },
      { status: 503, headers }
    );
  }
  const apiMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map(({ role, content }) => ({ role, content }))
  ];
  const supabaseRef = supabase2;
  const userId = user.id;
  const projectIdRef = projectId;
  const messagesRef = messages;
  const tokenCostMultiplierRef = tokenCostMultiplier;
  const estimatedInputTokensRef = estimatedInputTokens;
  const estimatedOutputTokensRef = estimatedOutputTokens;
  const stream = new ReadableStream({
    async start(controller) {
      var _a, _b, _c, _d;
      const encoder = new TextEncoder();
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}

`));
      };
      try {
        let openrouterResponse;
        try {
          openrouterResponse = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://coderion.app",
              "X-Title": "Coderion"
            },
            body: JSON.stringify({
              model: apiModel,
              messages: apiMessages,
              stream: true
            })
          });
        } catch {
          send({ type: "error", error: "Error al contactar el servicio de IA." });
          controller.close();
          return;
        }
        if (!openrouterResponse.ok) {
          const errText = await openrouterResponse.text().catch(() => "");
          console.error("OpenRouter error:", openrouterResponse.status, errText);
          send({ type: "error", error: "El servicio de IA devolvio un error." });
          controller.close();
          return;
        }
        const reader = (_a = openrouterResponse.body) == null ? void 0 : _a.getReader();
        if (!reader) {
          send({ type: "error", error: "No se pudo leer el stream." });
          controller.close();
          return;
        }
        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const chunk = JSON.parse(jsonStr);
              const token = ((_d = (_c = (_b = chunk.choices) == null ? void 0 : _b[0]) == null ? void 0 : _c.delta) == null ? void 0 : _d.content) || "";
              if (token) {
                fullContent += token;
                send({ type: "token", content: token });
              }
            } catch {
            }
          }
        }
        const assistantContent = fullContent || "No se pudo generar una respuesta.";
        const parsedFiles = parseGeneratedFiles(assistantContent);
        const displayContent = parsedFiles.length > 0 ? stripFileBlocks(assistantContent) : assistantContent;
        const actualTotalTokens = Math.ceil(
          (estimatedInputTokensRef + estimatedOutputTokensRef) * tokenCostMultiplierRef
        );
        const serviceClient = createSupabaseServiceClient();
        const { data: newBalance, error: deductError } = await serviceClient.rpc(
          "deduct_tokens",
          { p_user_id: userId, p_amount: actualTotalTokens }
        );
        if (deductError) {
          console.error("Token deduction failed:", deductError);
          send({ type: "error", error: "Error al descontar tokens." });
          controller.close();
          return;
        }
        let savedFilesCount = 0;
        if (parsedFiles.length > 0) {
          for (const file of parsedFiles) {
            const { data: existing } = await supabaseRef.from("project_files").select("id, version").eq("project_id", projectIdRef).eq("path", file.path).maybeSingle();
            if (existing) {
              const { error: updateErr } = await supabaseRef.from("project_files").update({
                content: file.content,
                language: file.language,
                version: (existing.version || 1) + 1
              }).eq("id", existing.id);
              if (!updateErr) savedFilesCount++;
            } else {
              const { error: insertErr } = await supabaseRef.from("project_files").insert({
                project_id: projectIdRef,
                path: file.path,
                content: file.content,
                language: file.language
              });
              if (!insertErr) savedFilesCount++;
            }
          }
        }
        const assistantMessage = {
          role: "assistant",
          content: displayContent,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        const finalMessages = [...messagesRef, assistantMessage];
        const updateData = {
          messages: finalMessages,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (messagesRef.length === 1) {
          updateData.title = messagesRef[0].content.slice(0, 50);
        }
        const { error: updateError } = await supabaseRef.from("projects").update(updateData).eq("id", projectIdRef);
        if (updateError) {
          console.error("Project update failed:", updateError);
        }
        send({
          type: "done",
          content: displayContent,
          filesGenerated: savedFilesCount,
          tokenBalance: newBalance,
          tokensUsed: actualTotalTokens
        });
      } catch (err) {
        console.error("Stream error:", err);
        send({ type: "error", error: "Error inesperado en el servidor." });
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action
}, Symbol.toStringTag, { value: "Module" }));
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
async function createProject(userId) {
  const { data, error } = await supabase.from("projects").insert({
    user_id: userId,
    title: "Nuevo proyecto",
    messages: []
  }).select().maybeSingle();
  if (error) {
    console.error("Error creating project:", error);
    return null;
  }
  return data;
}
const meta = () => [
  { title: `${APP_NAME} — Construye con IA` },
  {
    name: "description",
    content: "Crea aplicaciones web completas conversando con inteligencia artificial."
  }
];
async function loader({ request }) {
  var _a;
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (!user) {
    return Response.json({ authenticated: false }, { headers });
  }
  const { data: profile, error: profileError } = await supabase2.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profileError || !profile) {
    return Response.json({ authenticated: false }, { headers });
  }
  const { data: models } = await supabase2.from("ai_models").select("*").eq("is_active", true).order("sort_order", { ascending: true });
  const preferredModel = (models || []).find(
    (model) => model.id === profile.preferred_model_id
  );
  const defaultModelName = (preferredModel == null ? void 0 : preferredModel.name) || ((_a = (models || [])[0]) == null ? void 0 : _a.name) || "DeepSeek V4";
  const { data: projects } = await supabase2.from("projects").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(6);
  return Response.json(
    {
      authenticated: true,
      user: { id: user.id, email: user.email || "" },
      profile,
      defaultModelName,
      recentProjects: projects || []
    },
    { headers }
  );
}
function BoltMark() {
  return /* @__PURE__ */ jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#0757d9] shadow-lg shadow-black/20", children: /* @__PURE__ */ jsx("svg", { className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 2L4 14h7l-1 8 10-13h-7l0-7z" }) }) });
}
function ArrowIcon() {
  return /* @__PURE__ */ jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 12h14m-6-6l6 6-6 6" }) });
}
function PublicLanding() {
  const [prompt, setPrompt] = useState("");
  const [activeStarter, setActiveStarter] = useState("Website");
  const starters = [
    { label: "Website", icon: "globe" },
    { label: "Dashboard", icon: "chart" },
    { label: "SaaS app", icon: "layers" },
    { label: "Prototype", icon: "flask" }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen overflow-hidden bg-[#090d18] text-white", children: [
    /* @__PURE__ */ jsxs("aside", { className: "fixed inset-y-0 left-0 z-20 hidden w-48 border-r border-white/10 bg-[#0b0d13]/95 px-3 py-4 lg:block", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-2", children: [
        /* @__PURE__ */ jsx(BoltMark, {}),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-bold tracking-tight", children: APP_NAME })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/45", children: [
        /* @__PURE__ */ jsxs("svg", { className: "h-3.5 w-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [
          /* @__PURE__ */ jsx("circle", { cx: "11", cy: "11", r: "7" }),
          /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "m20 20-4-4" })
        ] }),
        "Buscar",
        /* @__PURE__ */ jsx("span", { className: "ml-auto rounded border border-white/10 px-1 text-[9px]", children: "⌘ K" })
      ] }),
      /* @__PURE__ */ jsxs("nav", { className: "mt-5 space-y-1 text-xs", children: [
        /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-white/10 px-3 py-2 font-medium text-white", children: "Inicio" }),
        /* @__PURE__ */ jsx(Link, { to: "/auth/register", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Proyectos" }),
        /* @__PURE__ */ jsx(Link, { to: "/auth/register", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Favoritos" }),
        /* @__PURE__ */ jsx(Link, { to: "/auth/register", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Vistos recientemente" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-7 border-t border-white/10 pt-5 text-xs", children: [
        /* @__PURE__ */ jsx("p", { className: "px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30", children: "Recursos" }),
        /* @__PURE__ */ jsx("a", { href: "#como-funciona", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Centro de ayuda" }),
        /* @__PURE__ */ jsx("a", { href: "#caracteristicas", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Novedades" }),
        /* @__PURE__ */ jsx("a", { href: "#precios", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Estado" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "absolute bottom-4 left-3 right-3 rounded-xl border border-white/10 bg-gradient-to-br from-[#15284e] to-[#10131c] p-3", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-white", children: "Empieza gratis" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-[10px] leading-4 text-white/45", children: "Construye tu primera app con IA." }),
        /* @__PURE__ */ jsx(Link, { to: "/auth/register", className: "mt-3 flex items-center justify-center rounded-lg bg-white py-2 text-[10px] font-semibold text-[#0757d9]", children: "Crear cuenta" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "landing-grid pointer-events-none absolute inset-0 opacity-40" }),
    /* @__PURE__ */ jsx("div", { className: "landing-orb landing-orb-one pointer-events-none absolute -top-48 left-[12%] h-[34rem] w-[34rem] rounded-full bg-[#0575ff]/30 blur-[110px]" }),
    /* @__PURE__ */ jsx("div", { className: "landing-orb landing-orb-two pointer-events-none absolute -top-32 right-[7%] h-[27rem] w-[27rem] rounded-full bg-[#52d5ff]/20 blur-[100px]" }),
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-x-0 top-0 h-[54rem] bg-[radial-gradient(ellipse_at_50%_18%,rgba(11,128,255,0.62),transparent_58%)]" }),
    /* @__PURE__ */ jsxs("header", { className: "relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:pl-56 lg:pr-10", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2.5", "aria-label": `${APP_NAME} inicio`, children: [
        /* @__PURE__ */ jsx(BoltMark, {}),
        /* @__PURE__ */ jsx("span", { className: "text-lg font-bold tracking-tight", children: APP_NAME })
      ] }),
      /* @__PURE__ */ jsxs("nav", { className: "hidden items-center gap-8 text-sm text-white/70 md:flex", children: [
        /* @__PURE__ */ jsx("a", { href: "#como-funciona", className: "transition-colors hover:text-white", children: "Cómo funciona" }),
        /* @__PURE__ */ jsx("a", { href: "#caracteristicas", className: "transition-colors hover:text-white", children: "Características" }),
        /* @__PURE__ */ jsx("a", { href: "#precios", className: "transition-colors hover:text-white", children: "Precios" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Link, { to: "/auth/login", className: "rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white", children: "Iniciar sesión" }),
        /* @__PURE__ */ jsx(Link, { to: "/auth/register", className: "hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0757d9] shadow-lg shadow-blue-950/20 transition-transform hover:-translate-y-0.5 sm:inline-flex", children: "Empezar gratis" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("main", { className: "relative z-10", children: /* @__PURE__ */ jsxs("section", { className: "mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-5xl flex-col items-center px-5 pb-20 pt-24 text-center sm:px-8 sm:pt-32 lg:pl-56 lg:pt-36", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md", children: [
        /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 animate-pulse rounded-full bg-[#67d8ff]" }),
        "Tu nuevo compañero de desarrollo"
      ] }),
      /* @__PURE__ */ jsxs("h1", { className: "max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-8xl", children: [
        "¿Qué vas a",
        /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-white via-[#b9eaff] to-[#54aaff] bg-clip-text text-transparent", children: "crear hoy?" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg", children: "Crea aplicaciones y sitios web increíbles conversando con IA. Describe tu idea y mira cómo cobra vida." }),
      /* @__PURE__ */ jsxs(
        "form",
        {
          action: "/auth/register",
          method: "get",
          className: "mt-10 w-full max-w-2xl rounded-2xl border border-white/15 bg-[#101722]/90 p-3 text-left shadow-2xl shadow-[#001b55]/50 backdrop-blur-xl transition-all focus-within:border-[#69c9ff]/60 focus-within:shadow-[#087aff]/25",
          children: [
            /* @__PURE__ */ jsx(
              "textarea",
              {
                name: "prompt",
                value: prompt,
                onChange: (event) => setPrompt(event.target.value),
                rows: 2,
                placeholder: "Cuéntame qué quieres construir...",
                className: "w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/35"
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-2 pt-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsx("button", { type: "button", className: "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/10 hover:text-white", "aria-label": "Añadir contexto", children: /* @__PURE__ */ jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 5v14m-7-7h14" }) }) }),
                /* @__PURE__ */ jsx("span", { className: "hidden text-xs text-white/40 sm:block", children: "Empieza describiendo una idea" })
              ] }),
              /* @__PURE__ */ jsxs("button", { type: "submit", className: "group flex items-center gap-2 rounded-lg bg-[#1687ff] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-950/40 transition-all hover:-translate-y-0.5 hover:bg-[#3298ff]", children: [
                "Construir ahora",
                /* @__PURE__ */ jsx(ArrowIcon, {})
              ] })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsx("div", { className: "mt-7 flex flex-wrap justify-center gap-2.5", children: starters.map((starter) => /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => setActiveStarter(starter.label),
          className: `flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs transition-all ${activeStarter === starter.label ? "border-white/25 bg-white/15 text-white" : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:bg-white/10 hover:text-white"}`,
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm", children: starter.icon === "globe" ? "◉" : starter.icon === "chart" ? "◫" : starter.icon === "layers" ? "▣" : "◇" }),
            starter.label
          ]
        },
        starter.label
      )) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-white/45", children: [
        /* @__PURE__ */ jsx("span", { children: "o empieza desde" }),
        /* @__PURE__ */ jsxs(Link, { to: "/auth/register", className: "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 transition-colors hover:bg-white/12 hover:text-white", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-white/70", children: "GitHub" }),
          /* @__PURE__ */ jsx(ArrowIcon, {})
        ] }),
        /* @__PURE__ */ jsxs(Link, { to: "/auth/register", className: "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 transition-colors hover:bg-white/12 hover:text-white", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-white/70", children: "Una plantilla" }),
          /* @__PURE__ */ jsx(ArrowIcon, {})
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-24 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3", id: "caracteristicas", children: [
        { title: "De idea a producto", body: "Describe lo que imaginas y recibe una aplicación lista para explorar.", icon: "✦" },
        { title: "Edita con libertad", body: "Abre cada archivo, cambia el código y ve los resultados al instante.", icon: "⌁" },
        { title: "Publica sin fricción", body: "Conecta GitHub, guarda tu trabajo y comparte tus proyectos.", icon: "↗" }
      ].map((feature) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.09]", children: [
        /* @__PURE__ */ jsx("span", { className: "text-xl text-[#68cbff]", children: feature.icon }),
        /* @__PURE__ */ jsx("h2", { className: "mt-4 text-sm font-semibold text-white", children: feature.title }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm leading-6 text-white/50", children: feature.body })
      ] }, feature.title)) })
    ] }) }),
    /* @__PURE__ */ jsxs("footer", { className: "relative z-10 mx-auto flex max-w-7xl items-center justify-between border-t border-white/10 px-5 py-6 text-xs text-white/35 sm:px-8 lg:pl-56 lg:pr-10", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        "© 2026 ",
        APP_NAME
      ] }),
      /* @__PURE__ */ jsx("span", { children: "Construye algo extraordinario." })
    ] })
  ] });
}
function AuthenticatedHome({ data }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const initialPrompt = searchParams.get("prompt") || "";
  async function handleNewProject(prompt) {
    if (isCreating) return;
    setIsCreating(true);
    const project = await createProject(data.user.id);
    if (project) {
      const dest = prompt ? `/project/${project.id}?prompt=${encodeURIComponent(prompt)}` : `/project/${project.id}`;
      navigate(dest);
    }
    setIsCreating(false);
  }
  useEffect(() => {
    if (initialPrompt) {
      handleNewProject(initialPrompt);
    }
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-[#171717]", children: [
    /* @__PURE__ */ jsx(MenuClient, { user: data.user, profile: data.profile }),
    /* @__PURE__ */ jsx("main", { className: "flex min-w-0 flex-1 flex-col overflow-y-auto", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto w-full max-w-4xl px-6 py-12", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-12 text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[#9E7FFF]/10 ring-1 ring-[#9E7FFF]/30", children: /* @__PURE__ */ jsx("svg", { className: "h-10 w-10 text-[#9E7FFF]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 10V3L4 14h7v7l9-11h-7z" }) }) }),
        /* @__PURE__ */ jsx("h1", { className: "mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl", children: "Coderion" }),
        /* @__PURE__ */ jsx("p", { className: "mb-8 text-lg text-[#A3A3A3]", children: "Describe un proyecto web y la IA genera todos los archivos por ti." }),
        /* @__PURE__ */ jsxs("button", { onClick: () => handleNewProject(), disabled: isCreating, className: "inline-flex items-center gap-2 rounded-xl bg-[#9E7FFF] px-6 py-3 font-semibold text-white transition-all hover:bg-[#8B6EE6] disabled:opacity-50", children: [
          isCreating ? "Creando..." : "Crear nuevo proyecto",
          !isCreating && /* @__PURE__ */ jsx(ArrowIcon, {})
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]", children: [
          /* @__PURE__ */ jsx("h2", { className: "mb-1 text-sm font-medium text-[#A3A3A3]", children: "Tokens disponibles" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-white", children: data.profile.token_balance.toLocaleString() })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]", children: [
          /* @__PURE__ */ jsx("h2", { className: "mb-1 text-sm font-medium text-[#A3A3A3]", children: "Modelo" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-white", children: data.defaultModelName })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]", children: [
          /* @__PURE__ */ jsx("h2", { className: "mb-1 text-sm font-medium text-[#A3A3A3]", children: "Versión" }),
          /* @__PURE__ */ jsxs("p", { className: "text-2xl font-bold text-white", children: [
            "v",
            APP_VERSION
          ] })
        ] })
      ] }),
      data.recentProjects.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "mb-4 text-sm font-medium text-[#A3A3A3]", children: "Proyectos recientes" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: data.recentProjects.map((project) => /* @__PURE__ */ jsx("button", { onClick: () => navigate(`/project/${project.id}`), className: "group rounded-2xl bg-[#262626] p-4 text-left ring-1 ring-[#2F2F2F] transition-all hover:ring-[#9E7FFF]/30", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg bg-[#9E7FFF]/10", children: /* @__PURE__ */ jsx("svg", { className: "h-5 w-5 text-[#9E7FFF]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" }) }) }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium text-white transition-colors group-hover:text-[#9E7FFF]", children: project.title }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3]", children: new Date(project.updated_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) })
          ] })
        ] }) }, project.id)) })
      ] })
    ] }) })
  ] });
}
function IndexRoute() {
  const data = useLoaderData();
  return data.authenticated ? /* @__PURE__ */ jsx(AuthenticatedHome, { data }) : /* @__PURE__ */ jsx(PublicLanding, {});
}
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: IndexRoute,
  loader,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-CQJDeDiO.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/components-CWQyJQ-f.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-Brq5PtCq.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/components-CWQyJQ-f.js"], "css": [] }, "routes/api.github-connect": { "id": "routes/api.github-connect", "parentId": "root", "path": "api/github-connect", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.github-connect-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/project.$projectId": { "id": "routes/project.$projectId", "parentId": "root", "path": "project/:projectId", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/project._projectId-Ca-FXgYy.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/Menu.client-yZ0-NnL-.js", "/assets/components-CWQyJQ-f.js"], "css": [] }, "routes/api.github-import": { "id": "routes/api.github-import", "parentId": "root", "path": "api/github-import", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.github-import-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.github-push": { "id": "routes/api.github-push", "parentId": "root", "path": "api/github-push", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.github-push-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/admin.projects": { "id": "routes/admin.projects", "parentId": "root", "path": "admin/projects", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.projects-DkNQsQbG.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/AdminLayout-BJfWQ44v.js", "/assets/components-CWQyJQ-f.js"], "css": [] }, "routes/admin.settings": { "id": "routes/admin.settings", "parentId": "root", "path": "admin/settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.settings-JvZZ6THA.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/AdminLayout-BJfWQ44v.js", "/assets/components-CWQyJQ-f.js"], "css": [] }, "routes/auth.callback": { "id": "routes/auth.callback", "parentId": "root", "path": "auth/callback", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.callback-DVYmPPln.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js"], "css": [] }, "routes/auth.register": { "id": "routes/auth.register", "parentId": "root", "path": "auth/register", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.register-BKznXjQW.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/components-CWQyJQ-f.js"], "css": [] }, "routes/admin._index": { "id": "routes/admin._index", "parentId": "root", "path": "admin", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin._index-DiR-xFjU.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/AdminLayout-BJfWQ44v.js", "/assets/components-CWQyJQ-f.js"], "css": [] }, "routes/admin.models": { "id": "routes/admin.models", "parentId": "root", "path": "admin/models", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.models-DEtf6x2d.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/AdminLayout-BJfWQ44v.js", "/assets/components-CWQyJQ-f.js"], "css": [] }, "routes/api.checkout": { "id": "routes/api.checkout", "parentId": "root", "path": "api/checkout", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.checkout-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/admin.users": { "id": "routes/admin.users", "parentId": "root", "path": "admin/users", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.users-BZU-2-b1.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/AdminLayout-BJfWQ44v.js", "/assets/components-CWQyJQ-f.js"], "css": [] }, "routes/api.webhook": { "id": "routes/api.webhook", "parentId": "root", "path": "api/webhook", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.webhook-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.logout": { "id": "routes/auth.logout", "parentId": "root", "path": "auth/logout", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.logout-CSxRPO1x.js", "imports": [], "css": [] }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.login-Bn-mGRPG.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/components-CWQyJQ-f.js"], "css": [] }, "routes/api.chat": { "id": "routes/api.chat", "parentId": "root", "path": "api/chat", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.chat-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-q4aIdlHv.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/Menu.client-yZ0-NnL-.js", "/assets/components-CWQyJQ-f.js"], "css": [] } }, "url": "/assets/manifest-f4f1f893.js", "version": "f4f1f893" };
const mode = "production";
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": false, "v3_singleFetch": true, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/api.github-connect": {
    id: "routes/api.github-connect",
    parentId: "root",
    path: "api/github-connect",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/project.$projectId": {
    id: "routes/project.$projectId",
    parentId: "root",
    path: "project/:projectId",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/api.github-import": {
    id: "routes/api.github-import",
    parentId: "root",
    path: "api/github-import",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/api.github-push": {
    id: "routes/api.github-push",
    parentId: "root",
    path: "api/github-push",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/admin.projects": {
    id: "routes/admin.projects",
    parentId: "root",
    path: "admin/projects",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/admin.settings": {
    id: "routes/admin.settings",
    parentId: "root",
    path: "admin/settings",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/auth.callback": {
    id: "routes/auth.callback",
    parentId: "root",
    path: "auth/callback",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/auth.register": {
    id: "routes/auth.register",
    parentId: "root",
    path: "auth/register",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/admin._index": {
    id: "routes/admin._index",
    parentId: "root",
    path: "admin",
    index: true,
    caseSensitive: void 0,
    module: route9
  },
  "routes/admin.models": {
    id: "routes/admin.models",
    parentId: "root",
    path: "admin/models",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/api.checkout": {
    id: "routes/api.checkout",
    parentId: "root",
    path: "api/checkout",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/admin.users": {
    id: "routes/admin.users",
    parentId: "root",
    path: "admin/users",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/api.webhook": {
    id: "routes/api.webhook",
    parentId: "root",
    path: "api/webhook",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/auth.logout": {
    id: "routes/auth.logout",
    parentId: "root",
    path: "auth/logout",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/api.chat": {
    id: "routes/api.chat",
    parentId: "root",
    path: "api/chat",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route17
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};

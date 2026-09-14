import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer, Outlet, useRouteError, isRouteErrorResponse, Meta, Links, ScrollRestoration, Scripts, useNavigate, useLocation, Form, useSearchParams, useLoaderData, Link, useActionData, useNavigation } from "@remix-run/react";
import * as isbotModule from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { createServerClient, createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { parse, serialize } from "cookie";
import { useState, useEffect, useMemo, Suspense, lazy, useRef, useCallback } from "react";
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
const stylesheet = "/assets/tailwind-DhuwZEYR.css";
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
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
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
function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}: ${error.data}` : error instanceof Error ? error.message : String(error);
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-[#171717] text-white flex items-center justify-center p-8", children: /* @__PURE__ */ jsxs("div", { className: "max-w-lg w-full", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold mb-4", children: "Something went wrong" }),
    /* @__PURE__ */ jsx("pre", { className: "text-sm text-red-400 bg-[#262626] rounded-lg p-4 overflow-auto whitespace-pre-wrap", children: message }),
    /* @__PURE__ */ jsx("a", { href: "/", className: "inline-block mt-4 text-[#9E7FFF] hover:underline", children: "Go home" })
  ] }) });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
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
  const headers = {};
  function syncSetCookie(value) {
    if (headers["Set-Cookie"]) {
      headers["Set-Cookie"] = headers["Set-Cookie"] + ", " + value;
    } else {
      headers["Set-Cookie"] = value;
    }
  }
  const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(key) {
        return cookies[key];
      },
      set(key, value, options) {
        syncSetCookie(
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
        syncSetCookie(
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
    return Response.json({ error: "Not authenticated" }, { status: 401, headers });
  }
  const clientId = await getSetting("github_client_id");
  if (!clientId) {
    return Response.json(
      { error: "GitHub OAuth is not configured. Set the credentials in the admin panel." },
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
const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function getProjects(userId) {
  const { data, error } = await supabase.from("projects").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
  return data || [];
}
async function createProject(userId) {
  const { data, error } = await supabase.from("projects").insert({
    user_id: userId,
    title: "New project",
    messages: []
  }).select().maybeSingle();
  if (error) {
    console.error("Error creating project:", error);
    return null;
  }
  return data;
}
async function deleteProject(projectId) {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    console.error("Error deleting project:", error);
    return false;
  }
  return true;
}
async function getProjectFiles(projectId) {
  const { data, error } = await supabase.from("project_files").select("*").eq("project_id", projectId).order("path", { ascending: true });
  if (error) {
    console.error("Error fetching project files:", error);
    return [];
  }
  return data || [];
}
async function deleteProjectFile(fileId) {
  const { error } = await supabase.from("project_files").delete().eq("id", fileId);
  if (error) {
    console.error("Error deleting project file:", error);
    return false;
  }
  return true;
}
function MenuClient({ user, profile }) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    loadProjects();
  }, []);
  async function loadProjects() {
    setIsLoading(true);
    const data = await getProjects(user.id);
    setProjects(data);
    setIsLoading(false);
  }
  async function handleNewProject() {
    if (isCreating) return;
    setIsCreating(true);
    const project = await createProject(user.id);
    if (project) {
      setProjects((prev) => [project, ...prev]);
      navigate(`/project/${project.id}`);
    }
    setIsCreating(false);
  }
  async function handleDeleteProject(projectId, e) {
    e.stopPropagation();
    const success = await deleteProject(projectId);
    if (success) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (location.pathname === `/project/${projectId}`) {
        navigate("/");
      }
    }
  }
  async function handleBuyTokens(pkg) {
    if (isRedirecting) return;
    setIsRedirecting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      console.error("Checkout redirect failed");
    } finally {
      setIsRedirecting(false);
    }
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    isSidebarOpen && /* @__PURE__ */ jsx(
      "div",
      {
        className: "fixed inset-0 bg-black/50 z-20 lg:hidden",
        onClick: () => setIsSidebarOpen(false)
      }
    ),
    /* @__PURE__ */ jsx(
      "aside",
      {
        className: `fixed lg:static inset-y-0 left-0 z-30 w-72 bg-[#1E1E1E] border-r border-[#2F2F2F] transform transition-transform duration-300 lg:transform-none ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`,
        children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full", children: [
          /* @__PURE__ */ jsxs("div", { className: "p-4 border-b border-[#2F2F2F]", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("svg", { className: "w-7 h-7 text-[#9E7FFF]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 10V3L4 14h7v7l9-11h-7z" }) }),
                /* @__PURE__ */ jsx("span", { className: "text-lg font-bold text-white", children: APP_NAME })
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setIsSidebarOpen(false),
                  className: "lg:hidden text-[#A3A3A3] hover:text-white p-2 rounded-lg hover:bg-[#2F2F2F] transition-colors",
                  "aria-label": "Close menu",
                  children: /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) })
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleNewProject,
                disabled: isCreating,
                className: "w-full flex items-center justify-center gap-2 bg-[#9E7FFF] text-white font-semibold rounded-xl px-4 py-3 hover:bg-[#8B6EE6] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                children: [
                  isCreating ? /* @__PURE__ */ jsxs("svg", { className: "w-5 h-5 animate-spin", fill: "none", viewBox: "0 0 24 24", children: [
                    /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
                    /* @__PURE__ */ jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
                  ] }) : /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 4v16m8-8H4" }) }),
                  "New project"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto p-2", children: isLoading ? /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center py-8", children: /* @__PURE__ */ jsxs("svg", { className: "w-6 h-6 text-[#A3A3A3] animate-spin", fill: "none", viewBox: "0 0 24 24", children: [
            /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
            /* @__PURE__ */ jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
          ] }) }) : projects.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center py-8 px-4", children: [
            /* @__PURE__ */ jsx("svg", { className: "w-12 h-12 text-[#3F3F3F] mx-auto mb-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" }) }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3]", children: "No projects yet" })
          ] }) : /* @__PURE__ */ jsx("ul", { className: "space-y-1", children: projects.map((project) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
            "div",
            {
              className: `group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${location.pathname === `/project/${project.id}` ? "bg-[#2F2F2F] text-white" : "text-[#A3A3A3] hover:bg-[#262626] hover:text-white"}`,
              onClick: () => navigate(`/project/${project.id}`),
              children: [
                /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" }) }),
                /* @__PURE__ */ jsx("span", { className: "flex-1 text-sm truncate", children: project.title }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: (e) => handleDeleteProject(project.id, e),
                    className: "opacity-0 group-hover:opacity-100 text-[#A3A3A3] hover:text-red-400 p-1 rounded transition-all",
                    "aria-label": "Delete project",
                    children: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) })
                  }
                )
              ]
            }
          ) }, project.id)) }) }),
          /* @__PURE__ */ jsxs("div", { className: "p-4 border-t border-[#2F2F2F]", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-3", children: [
              /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full bg-[#9E7FFF]/20 flex items-center justify-center flex-shrink-0", children: profile.avatar_url ? /* @__PURE__ */ jsx(
                "img",
                {
                  src: profile.avatar_url,
                  alt: profile.full_name || user.email,
                  className: "w-10 h-10 rounded-full object-cover"
                }
              ) : /* @__PURE__ */ jsx("span", { className: "text-[#9E7FFF] font-semibold text-sm", children: (profile.full_name || user.email).charAt(0).toUpperCase() }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-white truncate", children: profile.full_name || user.email }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3] truncate", children: user.email })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-3 px-3 py-2 bg-[#262626] rounded-lg", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3]", children: "Tokens" }),
              /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-[#9E7FFF]", children: profile.token_balance.toLocaleString() })
            ] }),
            /* @__PURE__ */ jsxs(
              "a",
              {
                href: "/admin",
                className: "w-full flex items-center justify-center gap-2 text-sm text-[#A3A3A3] hover:text-white transition-colors bg-[#262626] border border-[#2F2F2F] rounded-lg px-4 py-2.5 hover:bg-[#2F2F2F] mb-2",
                children: [
                  /* @__PURE__ */ jsxs("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [
                    /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }),
                    /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })
                  ] }),
                  "Admin panel"
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => handleBuyTokens("basic"),
                disabled: isRedirecting,
                className: "w-full flex items-center justify-center gap-2 text-sm text-[#9E7FFF] hover:text-white transition-colors bg-[#9E7FFF]/10 border border-[#9E7FFF]/30 rounded-lg px-4 py-2.5 hover:bg-[#9E7FFF]/20 focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 disabled:opacity-50 mb-2",
                children: isRedirecting ? "Redirecting..." : "Buy tokens"
              }
            ),
            /* @__PURE__ */ jsx(Form, { method: "post", action: "/auth/logout", children: /* @__PURE__ */ jsxs(
              "button",
              {
                type: "submit",
                className: "w-full flex items-center justify-center gap-2 text-sm text-[#A3A3A3] hover:text-white transition-colors bg-[#262626] border border-[#2F2F2F] rounded-lg px-4 py-2.5 hover:bg-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40",
                children: [
                  /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" }) }),
                  "Log out"
                ]
              }
            ) })
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setIsSidebarOpen(true),
        className: "fixed top-4 left-4 z-10 lg:hidden bg-[#262626] border border-[#2F2F2F] rounded-lg p-2 text-white hover:bg-[#2F2F2F] transition-colors",
        "aria-label": "Open menu",
        children: /* @__PURE__ */ jsx("svg", { className: "w-6 h-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 6h16M4 12h16M4 18h16" }) })
      }
    )
  ] });
}
function buildTree(files) {
  const root = { name: "", path: "", isFolder: true, children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");
      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: fullPath,
          isFolder: !isLast,
          children: [],
          file: isLast ? file : void 0
        };
        current.children.push(child);
      }
      current = child;
    }
  }
  sortTree(root);
  return root;
}
function sortTree(node) {
  node.children.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(sortTree);
}
function getIcon(name, isFolder) {
  var _a;
  const ext = ((_a = name.split(".").pop()) == null ? void 0 : _a.toLowerCase()) || "";
  const iconMap = {
    tsx: "react",
    jsx: "react",
    ts: "ts",
    js: "js",
    json: "json",
    css: "css",
    html: "html",
    md: "md"
  };
  return iconMap[ext] || "file";
}
function Icon({ type }) {
  const icons = {
    folder: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-[#9E7FFF]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" }) }),
    react: /* @__PURE__ */ jsxs("svg", { className: "w-4 h-4 text-[#61DAFB]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: [
      /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "2" }),
      /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "12", rx: "10", ry: "4" }),
      /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "12", rx: "10", ry: "4", transform: "rotate(60 12 12)" }),
      /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "12", rx: "10", ry: "4", transform: "rotate(120 12 12)" })
    ] }),
    ts: /* @__PURE__ */ jsxs("svg", { className: "w-4 h-4 text-[#3178C6]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [
      /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
      /* @__PURE__ */ jsx("path", { d: "M9 17V9h6" }),
      /* @__PURE__ */ jsx("path", { d: "M15 17v-4" })
    ] }),
    js: /* @__PURE__ */ jsxs("svg", { className: "w-4 h-4 text-[#F7DF1E]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [
      /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
      /* @__PURE__ */ jsx("path", { d: "M9 17v-5M15 17v-3a2 2 0 00-2-2" })
    ] }),
    json: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-[#A3A3A3]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { d: "M8 6c-2 0-3 1-3 3s1 3 3 3 3 1 3 3-1 3-3 3M16 6c2 0 3 1 3 3s-1 3-3 3-3 1-3 3 1 3 3 3" }) }),
    css: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-[#1572B6]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { d: "M5 4l1 16 6 2 6-2 1-16M8 8h8l-1 8-5 2-5-2" }) }),
    html: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-[#E34F26]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { d: "M4 4l2 16 6 2 6-2 2-16M7 8h10l-1 10-4 2-4-2" }) }),
    md: /* @__PURE__ */ jsxs("svg", { className: "w-4 h-4 text-[#A3A3A3]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [
      /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
      /* @__PURE__ */ jsx("path", { d: "M8 12h8M8 8h8M8 16h4" })
    ] }),
    file: /* @__PURE__ */ jsxs("svg", { className: "w-4 h-4 text-[#A3A3A3]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [
      /* @__PURE__ */ jsx("path", { d: "M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9l-6-6z" }),
      /* @__PURE__ */ jsx("path", { d: "M13 3v6h6" })
    ] })
  };
  return icons[type] || icons.file;
}
function TreeItem({
  node,
  depth,
  selectedFile,
  onSelectFile,
  onDeleteFile
}) {
  const paddingLeft = depth * 12 + 8;
  if (node.isFolder && node.path) {
    return /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: "flex items-center gap-1.5 px-2 py-1 text-xs text-[#A3A3A3] cursor-default",
          style: { paddingLeft },
          children: [
            /* @__PURE__ */ jsx(Icon, { type: "folder" }),
            /* @__PURE__ */ jsx("span", { className: "truncate", children: node.name })
          ]
        }
      ),
      node.children.map((child) => /* @__PURE__ */ jsx(
        TreeItem,
        {
          node: child,
          depth: depth + 1,
          selectedFile,
          onSelectFile,
          onDeleteFile
        },
        child.path
      ))
    ] });
  }
  if (!node.file) {
    return /* @__PURE__ */ jsx(Fragment, { children: node.children.map((child) => /* @__PURE__ */ jsx(
      TreeItem,
      {
        node: child,
        depth,
        selectedFile,
        onSelectFile,
        onDeleteFile
      },
      child.path
    )) });
  }
  const isSelected = (selectedFile == null ? void 0 : selectedFile.id) === node.file.id;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `group flex items-center gap-1.5 px-2 py-1 cursor-pointer transition-colors ${isSelected ? "bg-[#9E7FFF]/10 text-white" : "text-[#A3A3A3] hover:bg-[#262626] hover:text-white"}`,
      style: { paddingLeft },
      onClick: () => onSelectFile(node.file),
      children: [
        /* @__PURE__ */ jsx(Icon, { type: getIcon(node.name) }),
        /* @__PURE__ */ jsx("span", { className: "text-xs truncate flex-1", children: node.name }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              onDeleteFile(node.file.id);
            },
            className: "opacity-0 group-hover:opacity-100 text-[#A3A3A3] hover:text-red-400 transition-all",
            "aria-label": "Delete file",
            children: /* @__PURE__ */ jsx("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) })
          }
        )
      ]
    }
  );
}
function FileTree({ files, selectedFile, onSelectFile, onDeleteFile }) {
  const tree = useMemo(() => buildTree(files), [files]);
  if (files.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "p-4 text-center", children: [
      /* @__PURE__ */ jsx("svg", { className: "w-10 h-10 text-[#3F3F3F] mx-auto mb-2", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" }) }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3]", children: "No files generated" })
    ] });
  }
  return /* @__PURE__ */ jsx("div", { className: "py-2 overflow-y-auto h-full", children: /* @__PURE__ */ jsx(
    TreeItem,
    {
      node: tree,
      depth: 0,
      selectedFile,
      onSelectFile,
      onDeleteFile
    }
  ) });
}
const Editor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.default })));
function mapLanguage(lang) {
  const map = {
    tsx: "typescript",
    ts: "typescript",
    jsx: "javascript",
    js: "javascript",
    json: "json",
    css: "css",
    html: "html",
    md: "markdown",
    mdx: "markdown",
    py: "python",
    sh: "shell",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    toml: "ini"
  };
  return map[lang] || "plaintext";
}
function CodeEditor({ file, onContentChange }) {
  const [content, setContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  useEffect(() => {
    if (file) {
      setContent(file.content);
      setHasUnsavedChanges(false);
    }
  }, [file == null ? void 0 : file.id, file == null ? void 0 : file.version]);
  if (!file) {
    return /* @__PURE__ */ jsx("div", { className: "flex-1 flex items-center justify-center bg-[#171717]", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxs("svg", { className: "w-12 h-12 text-[#3F3F3F] mx-auto mb-2", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: [
        /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9l-6-6z" }),
        /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 3v6h6" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3]", children: "Select a file to edit" })
    ] }) });
  }
  const handleMount = (editor) => {
    editor.focus();
  };
  function handleEditorChange(value) {
    const newValue = value || "";
    setContent(newValue);
    if (file && newValue !== file.content) {
      setHasUnsavedChanges(true);
      onContentChange(file.id, newValue);
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between bg-[#1E1E1E] border-b border-[#2F2F2F] px-3 py-1.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: "text-xs font-mono text-[#A3A3A3]", children: file.path }),
        hasUnsavedChanges && /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-[#9E7FFF]", title: "Unsaved changes" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: "text-xs px-1.5 py-0.5 rounded bg-[#262626] text-[#A3A3A3]", children: file.language }),
        /* @__PURE__ */ jsxs("span", { className: "text-xs text-[#A3A3A3]", children: [
          "v",
          file.version
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => navigator.clipboard.writeText(content),
            className: "text-xs text-[#A3A3A3] hover:text-white transition-colors flex items-center gap-1",
            children: [
              /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" }) }),
              "Copy"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-hidden", children: /* @__PURE__ */ jsx(
      Suspense,
      {
        fallback: /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-full bg-[#1E1E1E]", children: /* @__PURE__ */ jsxs("svg", { className: "w-6 h-6 text-[#A3A3A3] animate-spin", fill: "none", viewBox: "0 0 24 24", children: [
          /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
          /* @__PURE__ */ jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })
        ] }) }),
        children: /* @__PURE__ */ jsx(
          Editor,
          {
            height: "100%",
            language: mapLanguage(file.language),
            value: content,
            onMount: handleMount,
            onChange: handleEditorChange,
            theme: "vs-dark",
            options: {
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
              lineNumbers: "on",
              renderLineHighlight: "all",
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              tabSize: 2,
              automaticLayout: true
            }
          }
        )
      }
    ) })
  ] });
}
function findFile(files, path) {
  return files.find((f) => f.path === path || f.path.endsWith("/" + path));
}
function buildPreview(files) {
  const htmlFile = findFile(files, "index.html") || findFile(files, "index.htm");
  const cssFiles = files.filter((f) => f.language === "css" || f.path.endsWith(".css"));
  const jsFiles = files.filter(
    (f) => f.language === "js" || f.language === "javascript" || f.path.endsWith(".js")
  );
  let html = (htmlFile == null ? void 0 : htmlFile.content) || '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n</body>\n</html>';
  const styleTags = cssFiles.map((f) => `<style data-path="${f.path}">
${f.content}
</style>`).join("\n");
  if (styleTags) {
    html = html.replace("</head>", `${styleTags}
</head>`);
  }
  const scriptTags = jsFiles.map((f) => `<script data-path="${f.path}">
${f.content}
<\/script>`).join("\n");
  if (scriptTags) {
    html = html.replace("</body>", `${scriptTags}
</body>`);
  }
  return html;
}
function LivePreview({ files }) {
  const [iframeKey, setIframeKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const previewHtml = useMemo(() => buildPreview(files), [files]);
  useEffect(() => {
    if (autoRefresh) {
      const timer = setTimeout(() => {
        setIframeKey((k) => k + 1);
        setLastRefresh(Date.now());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [previewHtml, autoRefresh]);
  const hasHtml = files.some(
    (f) => f.path.endsWith(".html") || f.path.endsWith(".htm")
  );
  if (!hasHtml) {
    return /* @__PURE__ */ jsx("div", { className: "flex-1 flex items-center justify-center bg-[#171717]", children: /* @__PURE__ */ jsxs("div", { className: "text-center px-6", children: [
      /* @__PURE__ */ jsxs("svg", { className: "w-12 h-12 text-[#3F3F3F] mx-auto mb-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: [
        /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" }),
        /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" })
      ] }),
      /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-white mb-1", children: "Preview not available" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3] max-w-xs", children: "Live preview appears when the project has an index.html file. For React projects, add an HTML file with the entry point." })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between bg-[#1E1E1E] border-b border-[#2F2F2F] px-3 py-1.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-red-500/60" }),
          /* @__PURE__ */ jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-yellow-500/60" }),
          /* @__PURE__ */ jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-green-500/60" })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3] ml-2", children: "preview" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setAutoRefresh(!autoRefresh),
            className: `text-xs px-2 py-1 rounded transition-colors ${autoRefresh ? "text-[#9E7FFF] bg-[#9E7FFF]/10" : "text-[#A3A3A3] hover:text-white"}`,
            children: autoRefresh ? "Auto" : "Manual"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              setIframeKey((k) => k + 1);
              setLastRefresh(Date.now());
            },
            className: "text-[#A3A3A3] hover:text-white transition-colors p-1",
            "aria-label": "Refresh",
            children: /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.582m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" }) })
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3]", children: new Date(lastRefresh).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 bg-white overflow-hidden", children: /* @__PURE__ */ jsx(
      "iframe",
      {
        srcDoc: previewHtml,
        title: "preview",
        sandbox: "allow-scripts allow-modals allow-forms allow-popups",
        className: "w-full h-full border-0"
      },
      iframeKey
    ) })
  ] });
}
function GitHubPanel({ projectId, onImported }) {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showPush, setShowPush] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [newRepoName, setNewRepoName] = useState("");
  const [branch, setBranch] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [openPR, setOpenPR] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  useEffect(() => {
    loadConnection();
  }, []);
  async function loadConnection() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!(session == null ? void 0 : session.user)) {
      setLoading(false);
      return;
    }
    const { data, error: error2 } = await supabase.from("github_connections").select("*").eq("user_id", session.user.id).maybeSingle();
    if (!error2) {
      setConnection(data);
    }
    setLoading(false);
  }
  async function handleConnect() {
    try {
      const res = await fetch("/api/github-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      setError("Error connecting to GitHub");
    }
  }
  async function handleDisconnect() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!(session == null ? void 0 : session.user)) return;
    const { error: error2 } = await supabase.from("github_connections").delete().eq("user_id", session.user.id);
    if (!error2) {
      setConnection(null);
    }
  }
  async function handleImport() {
    if (!repoUrl.trim() || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/github-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, repoUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import error");
        return;
      }
      setSuccess(`Imported ${data.imported} files from ${data.repo} (branch: ${data.branch})`);
      setShowImport(false);
      setRepoUrl("");
      onImported == null ? void 0 : onImported();
    } catch {
      setError("Connection error");
    } finally {
      setBusy(false);
    }
  }
  async function handlePush() {
    if (busy) return;
    if (!newRepoName.trim() && !repoUrl.trim()) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/github-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          repoUrl: repoUrl.trim() || void 0,
          newRepoName: newRepoName.trim() || void 0,
          branch: branch.trim() || void 0,
          newBranch: newBranch.trim() || void 0,
          commitMessage: commitMessage.trim() || void 0,
          openPR,
          isPrivate
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Push error");
        return;
      }
      let msg = `Pushed ${data.filesPushed} files to ${data.repo} (branch: ${data.branch})`;
      if (data.prUrl) {
        msg += ` — Pull Request created: ${data.prUrl}`;
      }
      setSuccess(msg);
      setShowPush(false);
      setRepoUrl("");
      setNewRepoName("");
      setNewBranch("");
      setCommitMessage("");
      setOpenPR(false);
    } catch {
      setError("Connection error");
    } finally {
      setBusy(false);
    }
  }
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center py-4", children: /* @__PURE__ */ jsxs("svg", { className: "w-5 h-5 text-[#A3A3A3] animate-spin", fill: "none", viewBox: "0 0 24 24", children: [
      /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
      /* @__PURE__ */ jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })
    ] }) });
  }
  if (!connection) {
    return /* @__PURE__ */ jsxs("div", { className: "px-3 py-2", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: handleConnect,
          className: "w-full flex items-center justify-center gap-2 text-xs text-white bg-[#262626] border border-[#2F2F2F] rounded-lg px-3 py-2 hover:bg-[#2F2F2F] transition-colors",
          children: [
            /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { d: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" }) }),
            "Connect GitHub"
          ]
        }
      ),
      error && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-400 mt-2", children: error })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "px-3 py-2 space-y-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 bg-[#262626] rounded-lg px-3 py-2", children: [
      connection.github_avatar_url ? /* @__PURE__ */ jsx(
        "img",
        {
          src: connection.github_avatar_url,
          alt: connection.github_username,
          className: "w-5 h-5 rounded-full"
        }
      ) : /* @__PURE__ */ jsx("div", { className: "w-5 h-5 rounded-full bg-[#9E7FFF]/20 flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#9E7FFF] font-semibold", children: connection.github_username.charAt(0).toUpperCase() }) }),
      /* @__PURE__ */ jsx("span", { className: "text-xs text-white truncate flex-1", children: connection.github_username }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleDisconnect,
          className: "text-xs text-[#A3A3A3] hover:text-red-400 transition-colors",
          title: "Disconnect",
          children: /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => {
          setShowImport(!showImport);
          setShowPush(false);
          setError(null);
          setSuccess(null);
        },
        className: "w-full flex items-center gap-2 text-xs text-[#A3A3A3] hover:text-white bg-[#262626] border border-[#2F2F2F] rounded-lg px-3 py-2 hover:bg-[#2F2F2F] transition-colors",
        children: [
          /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" }) }),
          "Import from GitHub"
        ]
      }
    ),
    showImport && /* @__PURE__ */ jsxs("div", { className: "bg-[#262626] rounded-lg p-3 space-y-2 border border-[#2F2F2F]", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: repoUrl,
          onChange: (e) => setRepoUrl(e.target.value),
          placeholder: "https://github.com/user/repo",
          className: "w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleImport,
          disabled: !repoUrl.trim() || busy,
          className: "w-full bg-[#9E7FFF] text-white text-xs font-medium rounded-md px-3 py-2 hover:bg-[#8B6EE6] transition-colors disabled:opacity-50",
          children: busy ? "Importing..." : "Import files"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => {
          setShowPush(!showPush);
          setShowImport(false);
          setError(null);
          setSuccess(null);
        },
        className: "w-full flex items-center gap-2 text-xs text-[#A3A3A3] hover:text-white bg-[#262626] border border-[#2F2F2F] rounded-lg px-3 py-2 hover:bg-[#2F2F2F] transition-colors",
        children: [
          /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 12l4 4 12-12M4 20h16" }) }),
          "Push to GitHub"
        ]
      }
    ),
    showPush && /* @__PURE__ */ jsxs("div", { className: "bg-[#262626] rounded-lg p-3 space-y-2 border border-[#2F2F2F]", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-[#A3A3A3]", children: "Existing repo (optional)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: repoUrl,
            onChange: (e) => setRepoUrl(e.target.value),
            placeholder: "https://github.com/user/repo",
            className: "w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-[#A3A3A3]", children: "Or create new repo" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: newRepoName,
            onChange: (e) => setNewRepoName(e.target.value),
            placeholder: "my-project",
            className: "w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
          }
        )
      ] }),
      repoUrl.trim() && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-[#A3A3A3]", children: "Branch (default: main)" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: branch,
              onChange: (e) => setBranch(e.target.value),
              placeholder: "main",
              className: "w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-[#A3A3A3]", children: "New branch (optional)" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: newBranch,
              onChange: (e) => setNewBranch(e.target.value),
              placeholder: "feature/my-change",
              className: "w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-[#A3A3A3]", children: "Commit message" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: commitMessage,
            onChange: (e) => setCommitMessage(e.target.value),
            placeholder: "Update from Coderion",
            className: "w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
          }
        )
      ] }),
      newBranch.trim() && /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-xs text-[#A3A3A3] cursor-pointer", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: openPR,
            onChange: (e) => setOpenPR(e.target.checked),
            className: "accent-[#9E7FFF]"
          }
        ),
        "Open Pull Request"
      ] }),
      newRepoName.trim() && !repoUrl.trim() && /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-xs text-[#A3A3A3] cursor-pointer", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: isPrivate,
            onChange: (e) => setIsPrivate(e.target.checked),
            className: "accent-[#9E7FFF]"
          }
        ),
        "Private repo"
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handlePush,
          disabled: busy || !repoUrl.trim() && !newRepoName.trim(),
          className: "w-full bg-[#9E7FFF] text-white text-xs font-medium rounded-md px-3 py-2 hover:bg-[#8B6EE6] transition-colors disabled:opacity-50",
          children: busy ? "Pushing..." : "Push files"
        }
      )
    ] }),
    error && /* @__PURE__ */ jsx("div", { className: "bg-red-500/10 border border-red-500/30 text-red-400 rounded-md px-3 py-2 text-xs", children: error }),
    success && /* @__PURE__ */ jsx("div", { className: "bg-green-500/10 border border-green-500/30 text-green-400 rounded-md px-3 py-2 text-xs", children: success })
  ] });
}
function ProjectWorkspace({
  projectId,
  projectTitle,
  initialMessages,
  initialFiles,
  models,
  initialPrompt
}) {
  var _a;
  const [messages, setMessages] = useState(initialMessages || []);
  const [files, setFiles] = useState(initialFiles || []);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(
    ((_a = models[0]) == null ? void 0 : _a.id) || ""
  );
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [panelView, setPanelView] = useState("split");
  const [showChat, setShowChat] = useState(true);
  const messagesEndRef = useRef(null);
  useEffect(() => {
    var _a2;
    (_a2 = messagesEndRef.current) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      setSelectedFile(files[0]);
    }
  }, [files, selectedFile]);
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim() && messages.length === 0 && !isSending) {
      setInput(initialPrompt);
      const timer = setTimeout(() => {
        handleSendMessage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt]);
  const refreshFiles = useCallback(async () => {
    const freshFiles = await getProjectFiles(projectId);
    setFiles(freshFiles);
    if (freshFiles.length > 0) {
      const current = freshFiles.find((f) => f.id === (selectedFile == null ? void 0 : selectedFile.id));
      if (current) setSelectedFile(current);
      else if (!selectedFile) setSelectedFile(freshFiles[0]);
    }
  }, [projectId, selectedFile]);
  async function handleSendMessage(e) {
    var _a2;
    e == null ? void 0 : e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    const userMessage = {
      role: "user",
      content: trimmed,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    setInput("");
    setIsSending(true);
    setError(null);
    setStreamingContent("");
    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          messages: optimisticMessages,
          modelId: selectedModelId || void 0
        })
      });
      if (!response.ok) {
        const data = await response.json();
        setError((data == null ? void 0 : data.error) || "Error sending message.");
        setMessages(messages);
        return;
      }
      const reader = (_a2 = response.body) == null ? void 0 : _a2.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let filesGenerated = 0;
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (!jsonStr.trim()) continue;
            try {
              const data = JSON.parse(jsonStr);
              if (data.type === "token") {
                accumulated += data.content;
                setStreamingContent(accumulated);
              } else if (data.type === "done") {
                const assistantMessage = {
                  role: "assistant",
                  content: data.content || accumulated,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                };
                setMessages([...optimisticMessages, assistantMessage]);
                setStreamingContent("");
                filesGenerated = data.filesGenerated || 0;
                if (filesGenerated > 0) {
                  await refreshFiles();
                }
              } else if (data.type === "error") {
                setError(data.error || "AI service error.");
                setMessages(messages);
              }
            } catch {
            }
          }
        }
      }
    } catch {
      setError("Connection error. Try again.");
      setMessages(messages);
    } finally {
      setIsSending(false);
      setStreamingContent("");
    }
  }
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }
  async function handleDeleteFile(fileId) {
    const success = await deleteProjectFile(fileId);
    if (success) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      if ((selectedFile == null ? void 0 : selectedFile.id) === fileId) {
        setSelectedFile(null);
      }
    }
  }
  function handleContentChange(fileId, content) {
    setFiles(
      (prev) => prev.map((f) => f.id === fileId ? { ...f, content } : f)
    );
    if ((selectedFile == null ? void 0 : selectedFile.id) === fileId) {
      setSelectedFile((prev) => prev ? { ...prev, content } : prev);
    }
  }
  const selectedModel = models.find((m) => m.id === selectedModelId);
  return /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col h-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "border-b border-[#2F2F2F] px-4 py-2.5 flex items-center justify-between flex-shrink-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-white truncate max-w-[200px]", children: projectTitle }),
        files.length > 0 && /* @__PURE__ */ jsxs("span", { className: "text-xs px-2 py-0.5 rounded-full bg-[#9E7FFF]/20 text-[#9E7FFF]", children: [
          files.length,
          " ",
          files.length === 1 ? "file" : "files"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex bg-[#262626] rounded-lg p-0.5", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setPanelView("editor"),
              className: `text-xs px-2.5 py-1 rounded-md transition-colors ${panelView === "editor" ? "bg-[#3F3F3F] text-white" : "text-[#A3A3A3] hover:text-white"}`,
              title: "Editor only",
              children: /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 17V7h6v10H9z" }) })
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setPanelView("split"),
              className: `text-xs px-2.5 py-1 rounded-md transition-colors ${panelView === "split" ? "bg-[#3F3F3F] text-white" : "text-[#A3A3A3] hover:text-white"}`,
              title: "Editor + preview",
              children: /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 17V7H3v10h6zM21 17V7h-6v10h6z" }) })
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setPanelView("preview"),
              className: `text-xs px-2.5 py-1 rounded-md transition-colors ${panelView === "preview" ? "bg-[#3F3F3F] text-white" : "text-[#A3A3A3] hover:text-white"}`,
              title: "Preview only",
              children: /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" }) })
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setShowChat(!showChat),
            className: `text-xs px-2.5 py-1.5 rounded-lg transition-colors ${showChat ? "bg-[#9E7FFF]/10 text-[#9E7FFF]" : "bg-[#262626] text-[#A3A3A3] hover:text-white"}`,
            title: "Show/hide chat",
            children: /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" }) })
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setShowModelDropdown(!showModelDropdown),
              className: "flex items-center gap-1.5 text-xs text-white bg-[#262626] rounded-lg px-2.5 py-1.5 hover:bg-[#2F2F2F] transition-colors",
              children: [
                /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5 text-[#9E7FFF]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M3 13a2 2 0 00-2 2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2M3 13a2 2 0 002 2h14a2 2 0 002-2" }) }),
                (selectedModel == null ? void 0 : selectedModel.name) || "Model",
                /* @__PURE__ */ jsx("svg", { className: "w-3 h-3 text-[#A3A3A3]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 9l-7 7-7-7" }) })
              ]
            }
          ),
          showModelDropdown && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-10", onClick: () => setShowModelDropdown(false) }),
            /* @__PURE__ */ jsx("div", { className: "absolute top-full right-0 mt-1 z-20 w-56 bg-[#262626] rounded-lg ring-1 ring-[#2F2F2F] shadow-xl py-1", children: models.map((model) => /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => {
                  setSelectedModelId(model.id);
                  setShowModelDropdown(false);
                },
                className: `w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${model.id === selectedModelId ? "bg-[#9E7FFF]/10 text-white" : "text-[#A3A3A3] hover:bg-[#2F2F2F] hover:text-white"}`,
                children: [
                  /* @__PURE__ */ jsx("span", { children: model.name }),
                  model.badge && /* @__PURE__ */ jsx("span", { className: "text-xs px-1.5 py-0.5 rounded-full bg-[#9E7FFF]/20 text-[#9E7FFF]", children: model.badge })
                ]
              },
              model.id
            )) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 flex overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "w-56 border-r border-[#2F2F2F] bg-[#1E1E1E] flex-shrink-0 overflow-hidden flex flex-col", children: [
        /* @__PURE__ */ jsx("div", { className: "px-3 py-2 border-b border-[#2F2F2F]", children: /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-[#A3A3A3] uppercase tracking-wider", children: "Files" }) }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsx(
          FileTree,
          {
            files,
            selectedFile,
            onSelectFile: setSelectedFile,
            onDeleteFile: handleDeleteFile
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: "border-t border-[#2F2F2F]", children: [
          /* @__PURE__ */ jsx("div", { className: "px-3 py-2", children: /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-[#A3A3A3] uppercase tracking-wider", children: "GitHub" }) }),
          /* @__PURE__ */ jsx(GitHubPanel, { projectId, onImported: refreshFiles })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 flex overflow-hidden", children: [
        panelView !== "preview" && /* @__PURE__ */ jsx("div", { className: `${panelView === "split" ? "w-1/2" : "w-full"} flex flex-col overflow-hidden border-r border-[#2F2F2F]`, children: /* @__PURE__ */ jsx(CodeEditor, { file: selectedFile, onContentChange: handleContentChange }) }),
        panelView !== "editor" && /* @__PURE__ */ jsx("div", { className: `${panelView === "split" ? "w-1/2" : "w-full"} flex flex-col overflow-hidden`, children: /* @__PURE__ */ jsx(LivePreview, { files }) })
      ] }),
      showChat && /* @__PURE__ */ jsxs("div", { className: "w-80 border-l border-[#2F2F2F] bg-[#1E1E1E] flex-shrink-0 flex flex-col overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "px-3 py-2 border-b border-[#2F2F2F]", children: /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-[#A3A3A3] uppercase tracking-wider", children: "AI Chat" }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto px-3 py-3 space-y-3", children: [
          messages.length === 0 && !streamingContent && /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center h-full text-center px-2", children: [
            /* @__PURE__ */ jsx("svg", { className: "w-10 h-10 text-[#3F3F3F] mb-2", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" }) }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3]", children: "Describe the project you want to create" })
          ] }),
          messages.map((message, index) => /* @__PURE__ */ jsx(
            "div",
            {
              className: `flex ${message.role === "user" ? "justify-end" : "justify-start"}`,
              children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: `max-w-[90%] rounded-xl px-3 py-2 ${message.role === "user" ? "bg-[#9E7FFF] text-white" : "bg-[#262626] text-white ring-1 ring-[#2F2F2F]"}`,
                  children: /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-xs leading-relaxed", children: message.content })
                }
              )
            },
            index
          )),
          streamingContent && /* @__PURE__ */ jsx("div", { className: "flex justify-start", children: /* @__PURE__ */ jsx("div", { className: "max-w-[90%] rounded-xl px-3 py-2 bg-[#262626] text-white ring-1 ring-[#2F2F2F]", children: /* @__PURE__ */ jsxs("p", { className: "whitespace-pre-wrap text-xs leading-relaxed", children: [
            streamingContent,
            /* @__PURE__ */ jsx("span", { className: "inline-block w-1 h-3 bg-[#9E7FFF] ml-0.5 animate-pulse" })
          ] }) }) }),
          isSending && !streamingContent && /* @__PURE__ */ jsx("div", { className: "flex justify-start", children: /* @__PURE__ */ jsx("div", { className: "bg-[#262626] rounded-xl px-3 py-2 ring-1 ring-[#2F2F2F]", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx("div", { className: "w-1.5 h-1.5 bg-[#9E7FFF] rounded-full animate-bounce" }),
            /* @__PURE__ */ jsx("div", { className: "w-1.5 h-1.5 bg-[#9E7FFF] rounded-full animate-bounce", style: { animationDelay: "0.1s" } }),
            /* @__PURE__ */ jsx("div", { className: "w-1.5 h-1.5 bg-[#9E7FFF] rounded-full animate-bounce", style: { animationDelay: "0.2s" } })
          ] }) }) }),
          /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
        ] }),
        error && /* @__PURE__ */ jsx("div", { className: "px-3 pb-2", children: /* @__PURE__ */ jsx("div", { className: "bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-xs", children: error }) }),
        /* @__PURE__ */ jsx("div", { className: "border-t border-[#2F2F2F] p-3", children: /* @__PURE__ */ jsx("form", { onSubmit: handleSendMessage, children: /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-2 bg-[#262626] rounded-xl ring-1 ring-[#2F2F2F] p-2 focus-within:ring-[#9E7FFF]/50 transition-all", children: [
          /* @__PURE__ */ jsx(
            "textarea",
            {
              value: input,
              onChange: (e) => setInput(e.target.value),
              onKeyDown: handleKeyDown,
              placeholder: "Describe your project...",
              disabled: isSending,
              rows: 1,
              className: "flex-1 bg-transparent text-white placeholder-[#A3A3A3] resize-none focus:outline-none disabled:opacity-50 text-xs leading-relaxed",
              style: { minHeight: "20px", maxHeight: "80px" }
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: !input.trim() || isSending,
              className: "flex-shrink-0 bg-[#9E7FFF] text-white rounded-lg p-1.5 hover:bg-[#8B6EE6] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed",
              "aria-label": "Send",
              children: isSending ? /* @__PURE__ */ jsxs("svg", { className: "w-3.5 h-3.5 animate-spin", fill: "none", viewBox: "0 0 24 24", children: [
                /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
                /* @__PURE__ */ jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
              ] }) : /* @__PURE__ */ jsx("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8" }) })
            }
          )
        ] }) }) })
      ] })
    ] })
  ] });
}
const meta$8 = () => [
  { title: `${APP_NAME} - Project` }
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
  if (!treeRes.ok) throw new Error("Could not read repo tree");
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
    return Response.json({ error: "Not authenticated" }, { status: 401, headers });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400, headers });
  }
  const { projectId, repoUrl } = body;
  if (!projectId || !repoUrl) {
    return Response.json({ error: "Missing parameters" }, { status: 400, headers });
  }
  const { data: project, error: projectError } = await supabase2.from("projects").select("id, user_id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  if (projectError || !project) {
    return Response.json({ error: "Project not found" }, { status: 404, headers });
  }
  const serviceClient = createSupabaseServiceClient();
  const { data: ghConn, error: ghError } = await serviceClient.from("github_connections").select("github_access_token, github_username").eq("user_id", user.id).maybeSingle();
  if (ghError || !ghConn) {
    return Response.json({ error: "GitHub account not connected" }, { status: 403, headers });
  }
  const token = ghConn.github_access_token;
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+(?:\.git)?)$/);
  if (!match) {
    return Response.json({ error: "Invalid repo URL" }, { status: 400, headers });
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
    return Response.json({ error: "Could not access repo" }, { status: 502, headers });
  }
  if (!repoInfo.ok) {
    if (repoInfo.status === 404) {
      return Response.json({ error: "Repo not found or no access" }, { status: 404, headers });
    }
    return Response.json({ error: "Error accessing repo" }, { status: 502, headers });
  }
  const repoData = await repoInfo.json();
  const branch = repoData.default_branch || "main";
  let files;
  try {
    files = await getTreeBlobs(token, owner, repo, branch);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error reading files" },
      { status: 502, headers }
    );
  }
  if (files.length === 0) {
    return Response.json({ error: "Repo has no importable files" }, { status: 400, headers });
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
  if (!res.ok) throw new Error("Could not create blob");
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
  if (!res.ok) throw new Error("Could not create tree");
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
  if (!res.ok) throw new Error("Could not create commit");
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
    throw new Error(err.message || "Could not update branch");
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
    throw new Error(err.message || "Could not create branch");
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
    throw new Error(err.message || "Could not create repo");
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
    return Response.json({ error: "Not authenticated" }, { status: 401, headers });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400, headers });
  }
  const { projectId, repoUrl, newRepoName, branch, newBranch, commitMessage, openPR, isPrivate } = body;
  if (!projectId) {
    return Response.json({ error: "Missing projectId" }, { status: 400, headers });
  }
  if (!repoUrl && !newRepoName) {
    return Response.json({ error: "Specify a repo or a name to create a new one" }, { status: 400, headers });
  }
  const { data: project, error: projectError } = await supabase2.from("projects").select("id, user_id, title").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  if (projectError || !project) {
    return Response.json({ error: "Project not found" }, { status: 404, headers });
  }
  const serviceClient = createSupabaseServiceClient();
  const { data: ghConn, error: ghError } = await serviceClient.from("github_connections").select("github_access_token, github_username").eq("user_id", user.id).maybeSingle();
  if (ghError || !ghConn) {
    return Response.json({ error: "GitHub account not connected" }, { status: 403, headers });
  }
  const token = ghConn.github_access_token;
  ghConn.github_username;
  const { data: dbFiles, error: filesError } = await supabase2.from("project_files").select("*").eq("project_id", projectId).order("path", { ascending: true });
  if (filesError || !dbFiles || dbFiles.length === 0) {
    return Response.json({ error: "No files to export" }, { status: 400, headers });
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
        { error: err instanceof Error ? err.message : "Error creating repo" },
        { status: 502, headers }
      );
    }
  } else {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+(?:\.git)?)$/);
    if (!match) {
      return Response.json({ error: "Invalid repo URL" }, { status: 400, headers });
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
        `Files updated from Coderion.

${files.length} files pushed.`
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
      { error: err instanceof Error ? err.message : "Error pushing files" },
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
  { path: "/admin/models", label: "AI Models", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M3 13a2 2 0 00-2 2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2M3 13a2 2 0 002 2h14a2 2 0 002-2" },
  { path: "/admin/users", label: "Users", icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" },
  { path: "/admin/projects", label: "Projects", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" }
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
          /* @__PURE__ */ jsx("p", { className: "text-[10px] text-green-400 mt-0.5", children: "Administrator" })
        ] }),
        /* @__PURE__ */ jsxs(
          Link,
          {
            to: "/",
            className: "flex items-center gap-2 text-xs text-[#A3A3A3] hover:text-white transition-colors px-3 py-1.5",
            children: [
              /* @__PURE__ */ jsx("svg", { className: "h-3.5 w-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10 19l-7-7m0 0l7-7m-7 7h18" }) }),
              "Back to app"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("main", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsx("div", { className: "max-w-5xl mx-auto px-6 py-8", children }) })
  ] });
}
const meta$7 = () => [
  { title: `${APP_NAME} - Admin · Projects` }
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
    user_email: emailMap[p.user_id] || "Unknown",
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
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white", children: "Projects" }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-[#A3A3A3] mt-1", children: [
        data.projects.length,
        " projects in total."
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F]", children: [
        /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Title" }),
        /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "User" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Files" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Model" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Status" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Updated" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.projects.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 7, className: "text-center text-sm text-[#A3A3A3] py-8", children: "No projects." }) }) : data.projects.map((project) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F] last:border-0", children: [
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-white truncate max-w-[200px] block", children: project.title }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3]", children: project.user_email }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-[#A3A3A3]", children: project.file_count }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3] font-mono truncate max-w-[150px] block", children: project.model_id || "—" }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: project.status === "active" ? /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400", children: "Active" }) : /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-[#3F3F3F] text-[#A3A3A3]", children: "Archived" }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3]", children: new Date(project.updated_at).toLocaleDateString("en-US", { day: "numeric", month: "short" }) }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx(
          Link,
          {
            to: `/project/${project.id}`,
            className: "text-xs text-[#9E7FFF] hover:underline",
            children: "Open →"
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
  ai: "Artificial Intelligence",
  stripe: "Payments (Stripe)",
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
      return Response.json({ error: "Missing the key" }, { status: 400, headers });
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
      return Response.json({ error: "Missing the key" }, { status: 400, headers });
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
  return Response.json({ error: "Unrecognized action" }, { status: 400, headers });
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
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white", children: "API Keys and Configuration" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3] mt-1", children: "Manage external service keys. Values are stored in the database." })
    ] }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-red-400", children: actionData.error }) }),
    (actionData == null ? void 0 : actionData.success) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-green-500/10 border border-green-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-green-400", children: "Configuration saved successfully." }) }),
    settingsByCategory.map((group) => /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-white mb-3", children: CATEGORY_LABELS[group.category] || group.category }),
      /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden", children: group.items.map((setting) => /* @__PURE__ */ jsx("div", { className: "border-b border-[#2F2F2F] last:border-0 px-5 py-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm text-white font-medium", children: setting.label }),
            setting.is_secret && /* @__PURE__ */ jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 uppercase tracking-wider", children: "Secret" }),
            setting.value && setting.value.trim() !== "" ? /* @__PURE__ */ jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400", children: "Configured" }) : /* @__PURE__ */ jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400", children: "Missing" })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3] font-mono", children: setting.key }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3] mt-1 font-mono truncate", children: setting.is_secret && setting.value ? `${setting.value.slice(0, 4)}${"•".repeat(12)}${setting.value.slice(-4)}` : setting.value || "Not configured" })
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
              placeholder: setting.is_secret ? "•••••••••" : "Value",
              className: "rounded-lg bg-[#1E1E1E] border border-[#2F2F2F] px-3 py-1.5 text-white text-xs font-mono focus:border-[#9E7FFF] focus:outline-none w-48"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: isSubmitting,
              className: "rounded-lg bg-[#9E7FFF] text-white text-xs font-medium px-3 py-1.5 hover:bg-[#8B6EE6] transition-colors disabled:opacity-50",
              children: "Save"
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
      JSON.stringify({ error: "Authentication code not received." }),
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
    /* @__PURE__ */ jsx("p", { className: "mt-4 text-[#A3A3A3]", children: "Verifying authentication..." })
  ] }) });
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AuthCallback,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const meta$5 = () => {
  return [
    { title: `Create account | ${APP_NAME}` },
    { name: "description", content: "Create your Coderion account and start building with AI." }
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
      message: "Account created. You can now log in.",
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
      setMessage(actionData.message || "Account created successfully.");
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
        /* @__PURE__ */ jsx("h1", { className: "mt-6 text-3xl font-bold text-white tracking-tight", children: "Create your account" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-[#A3A3A3]", children: "Start building with AI in minutes" }),
        initialPrompt && /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-xl border border-[#9E7FFF]/30 bg-[#9E7FFF]/10 px-4 py-3 text-left", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-medium text-[#9E7FFF] mb-1", children: "Your idea:" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-white/80 line-clamp-3", children: initialPrompt })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-[#262626] rounded-2xl p-8 shadow-xl ring-1 ring-[#2F2F2F]", children: /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-5", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "redirectTo", value: redirectTo }),
        error && /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 p-3", role: "alert", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-[#ef4444]", children: error }) }),
        message && /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 p-3", role: "alert", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-[#10b981]", children: message }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "fullName", className: "block text-sm font-medium text-[#A3A3A3] mb-1.5", children: "Full name" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: "fullName",
              name: "fullName",
              type: "text",
              autoComplete: "name",
              value: fullName,
              onChange: (e) => setFullName(e.target.value),
              placeholder: "Your name",
              className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-[#A3A3A3] mb-1.5", children: "Email" }),
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
              placeholder: "you@example.com",
              className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-[#A3A3A3] mb-1.5", children: "Password" }),
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
              placeholder: "Minimum 8 characters",
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
            children: isSubmitting ? "Creating account..." : "Create account"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxs("p", { className: "mt-6 text-center text-sm text-[#A3A3A3]", children: [
        "Already have an account?",
        " ",
        /* @__PURE__ */ jsx(Link, { to: `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`, className: "font-semibold text-[#9E7FFF] hover:text-[#B39DFF] transition-colors", children: "Log in" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-center text-sm text-[#A3A3A3]", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "text-[#A3A3A3] hover:text-white transition-colors", children: "← Back to home" }) })
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
      /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3] mt-1", children: "Platform overview." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Users", value: data.stats.totalUsers, icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0z", accent: "bg-blue-500/10 text-blue-400" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Projects", value: data.stats.totalProjects, icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z", accent: "bg-purple-500/10 text-purple-400" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Files", value: data.stats.totalFiles, icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", accent: "bg-green-500/10 text-green-400" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Active models", value: data.stats.activeModels, icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M3 13a2 2 0 00-2 2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2", accent: "bg-orange-500/10 text-orange-400" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Tokens issued", value: data.stats.totalTokensIssued.toLocaleString(), icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.657 0 3 .895 3 2s-1.343 2-3 2m0-8c1.657 0 3 .895 3 2s-1.343 2-3 2m-9 2h2m2 0h2", accent: "bg-cyan-500/10 text-cyan-400" }),
      /* @__PURE__ */ jsx(StatCard, { label: "GitHub connections", value: data.stats.githubConnections, icon: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12", accent: "bg-pink-500/10 text-pink-400" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] p-6 ring-1 ring-[#2F2F2F] mb-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-white", children: "Configuration status" }),
        /* @__PURE__ */ jsx(Link, { to: "/admin/settings", className: "text-xs text-[#9E7FFF] hover:underline", children: "Configure →" })
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
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-white", children: "Recent users" }),
        /* @__PURE__ */ jsx(Link, { to: "/admin/users", className: "text-xs text-[#9E7FFF] hover:underline", children: "View all →" })
      ] }),
      data.recentUsers.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3] px-5 py-8 text-center", children: "No registered users." }) : /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F]", children: [
          /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-5 py-2.5", children: "Email" }),
          /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-5 py-2.5", children: "Registered" }),
          /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-2.5", children: "Role" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: data.recentUsers.map((user) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F] last:border-0", children: [
          /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-sm text-white", children: user.email }),
          /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-xs text-[#A3A3A3]", children: new Date(user.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) }),
          /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: user.is_admin ? /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-[#9E7FFF]/20 text-[#9E7FFF]", children: "Admin" }) : /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-[#3F3F3F] text-[#A3A3A3]", children: "User" }) })
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
  { title: `${APP_NAME} - Admin · AI Models` }
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
      return Response.json({ error: "Name and model_id are required" }, { status: 400, headers: result.headers });
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
      return Response.json({ error: "Missing parameters" }, { status: 400, headers: result.headers });
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
  return Response.json({ error: "Unrecognized action" }, { status: 400, headers: result.headers });
}
function AdminModelsRoute() {
  const { adminEmail, models } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showForm, setShowForm] = useState(false);
  return /* @__PURE__ */ jsxs(AdminLayout, { adminEmail, children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white", children: "AI Models" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3] mt-1", children: "Configure available models, prices, and profit margins." })
    ] }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-red-400", children: actionData.error }) }),
    (actionData == null ? void 0 : actionData.success) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-green-500/10 border border-green-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-green-400", children: "Operation completed." }) }),
    /* @__PURE__ */ jsx("div", { className: "bg-[#262626] rounded-2xl ring-1 ring-[#2F2F2F] overflow-hidden mb-6", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F]", children: [
        /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Name" }),
        /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Model ID" }),
        /* @__PURE__ */ jsx("th", { className: "text-right text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Markup" }),
        /* @__PURE__ */ jsx("th", { className: "text-right text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Cost Mult." }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Active" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-4 py-3", children: "Order" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-4 py-3" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: models.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 7, className: "text-center text-sm text-[#A3A3A3] py-8", children: "No models configured." }) }) : models.map((model) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F] last:border-0", children: [
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
              children: model.is_active ? "Active" : "Inactive"
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
              if (!confirm("Delete this model?")) e.preventDefault();
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
                  "aria-label": "Delete",
                  children: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) })
                }
              )
            ]
          }
        ) })
      ] }, model.id)) })
    ] }) }),
    showForm ? /* @__PURE__ */ jsxs("div", { className: "bg-[#262626] rounded-2xl ring-1 ring-[#2F2F2F] p-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold text-white mb-4", children: "New model" }),
      /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-4", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "create" }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Name" }),
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
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Badge (optional)" }),
            /* @__PURE__ */ jsx("input", { name: "badge", placeholder: "Premium / Budget", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Input price / token (USD)" }),
            /* @__PURE__ */ jsx("input", { name: "input_price_per_token", type: "number", step: "0.00000001", defaultValue: "0", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Output price / token (USD)" }),
            /* @__PURE__ */ jsx("input", { name: "output_price_per_token", type: "number", step: "0.00000001", defaultValue: "0", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Markup (1.5 = 50% profit)" }),
            /* @__PURE__ */ jsx("input", { name: "markup_multiplier", type: "number", step: "0.1", defaultValue: "1.0", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Token multiplier (2.0 = charges 2x tokens)" }),
            /* @__PURE__ */ jsx("input", { name: "token_cost_multiplier", type: "number", step: "0.1", defaultValue: "1.0", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1", children: "Order" }),
            /* @__PURE__ */ jsx("input", { name: "sort_order", type: "number", defaultValue: "0", className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-3 py-2 text-white text-sm focus:border-[#9E7FFF] focus:outline-none" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("button", { type: "submit", disabled: isSubmitting, className: "bg-[#9E7FFF] text-white font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#8B6EE6] transition-colors disabled:opacity-50", children: isSubmitting ? "Saving..." : "Create model" }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowForm(false), className: "text-[#A3A3A3] hover:text-white text-sm transition-colors", children: "Cancel" })
        ] })
      ] })
    ] }) : /* @__PURE__ */ jsxs("button", { onClick: () => setShowForm(true), className: "flex items-center gap-2 bg-[#9E7FFF]/10 border border-[#9E7FFF]/30 text-[#9E7FFF] rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#9E7FFF]/20 transition-colors", children: [
      /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 4v16m8-8H4" }) }),
      "Add model"
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
  basic: { name: "Basic", tokens: 5e5, price: 10, settingKey: "stripe_price_basic" },
  pro: { name: "Pro", tokens: 2e6, price: 25, settingKey: "stripe_price_pro" },
  enterprise: { name: "Enterprise", tokens: 1e7, price: 99, settingKey: "stripe_price_enterprise" }
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
    return Response.json({ error: "Not authenticated" }, { status: 401, headers });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400, headers });
  }
  const packageKey = body.package;
  if (!packageKey || !(packageKey in TOKEN_PACKAGES$1)) {
    return Response.json({ error: "Invalid package" }, { status: 400, headers });
  }
  const pkg = TOKEN_PACKAGES$1[packageKey];
  const priceId = await getSetting(pkg.settingKey);
  if (!priceId) {
    return Response.json(
      { error: "This package is not configured. Configure it in the admin panel." },
      { status: 503, headers }
    );
  }
  const stripeSecretKey = await getSetting("stripe_secret_key");
  if (!stripeSecretKey) {
    return Response.json(
      { error: "Stripe is not configured. Configure it in the admin panel." },
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
    return Response.json({ error: "Could not create payment session." }, { status: 502, headers });
  }
  return Response.json({ url: session.url }, { headers });
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5
}, Symbol.toStringTag, { value: "Module" }));
const meta$2 = () => [
  { title: `${APP_NAME} - Admin · Users` }
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
    return Response.json({ error: "Missing user" }, { status: 400, headers: result.headers });
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
      return Response.json({ error: "Invalid amount" }, { status: 400, headers: result.headers });
    }
    const { data: profile } = await serviceClient.from("profiles").select("token_balance").eq("id", userId).maybeSingle();
    if (!profile) {
      return Response.json({ error: "User not found" }, { status: 404, headers: result.headers });
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
      return Response.json({ error: "Invalid amount" }, { status: 400, headers: result.headers });
    }
    const { error } = await serviceClient.from("profiles").update({ token_balance: amount }).eq("id", userId);
    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: result.headers });
    }
    return Response.json({ success: true }, { headers: result.headers });
  }
  return Response.json({ error: "Unrecognized action" }, { status: 400, headers: result.headers });
}
function AdminUsers() {
  const data = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [tokenModal, setTokenModal] = useState(null);
  return /* @__PURE__ */ jsxs(AdminLayout, { adminEmail: data.adminEmail, children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white", children: "Users" }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-[#A3A3A3] mt-1", children: [
        data.users.length,
        " registered users."
      ] })
    ] }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-red-400", children: actionData.error }) }),
    (actionData == null ? void 0 : actionData.success) && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-green-500/10 border border-green-500/30 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-green-400", children: "Operation completed." }) }),
    /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] overflow-hidden", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F]", children: [
        /* @__PURE__ */ jsx("th", { className: "text-left text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "User" }),
        /* @__PURE__ */ jsx("th", { className: "text-right text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Tokens" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Projects" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Registered" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Role" }),
        /* @__PURE__ */ jsx("th", { className: "text-center text-xs font-medium text-[#A3A3A3] px-5 py-3", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.users.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 6, className: "text-center text-sm text-[#A3A3A3] py-8", children: "No users." }) }) : data.users.map((user) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#2F2F2F] last:border-0", children: [
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3", children: /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-white", children: user.email }),
          user.full_name && /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3]", children: user.full_name })
        ] }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-right", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-white font-mono", children: user.token_balance.toLocaleString() }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-[#A3A3A3]", children: user.projectCount }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-[#A3A3A3]", children: new Date(user.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short" }) }) }),
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
              children: user.is_admin ? "Admin" : "User"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx("td", { className: "px-5 py-3 text-center", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-1.5", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setTokenModal({ userId: user.id, email: user.email, mode: "add" }),
              className: "text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors",
              title: "Add tokens",
              children: "+ Tokens"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setTokenModal({ userId: user.id, email: user.email, mode: "set" }),
              className: "text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors",
              title: "Set tokens",
              children: "Set"
            }
          )
        ] }) })
      ] }, user.id)) })
    ] }) }),
    tokenModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm", onClick: () => setTokenModal(null), children: /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] ring-1 ring-[#2F2F2F] p-6 w-full max-w-md mx-4", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-white mb-2", children: tokenModal.mode === "add" ? "Add tokens" : "Set tokens" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-[#A3A3A3] mb-4", children: tokenModal.email }),
      /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-4", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: tokenModal.mode === "add" ? "add_tokens" : "set_tokens" }),
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "userId", value: tokenModal.userId }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-[#A3A3A3] mb-1.5", children: tokenModal.mode === "add" ? "Amount to add" : "New total balance" }),
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
              children: isSubmitting ? "Saving..." : "Confirm"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setTokenModal(null),
              className: "text-[#A3A3A3] hover:text-white text-sm transition-colors",
              children: "Cancel"
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
    { title: `Log in | ${APP_NAME}` },
    { name: "description", content: "Access your Coderion account to continue building with AI." }
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
        /* @__PURE__ */ jsx("h1", { className: "mt-6 text-3xl font-bold text-white tracking-tight", children: "Welcome back" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-[#A3A3A3]", children: "Log in to continue building" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-[#262626] rounded-2xl p-8 shadow-xl ring-1 ring-[#2F2F2F]", children: /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-5", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "redirectTo", value: redirectTo }),
        error && /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 p-3", role: "alert", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-[#ef4444]", children: error }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-[#A3A3A3] mb-1.5", children: "Email" }),
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
              placeholder: "you@example.com",
              className: "w-full rounded-lg bg-[#171717] border border-[#2F2F2F] px-4 py-2.5 text-white placeholder-[#A3A3A3] focus:border-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20 focus:outline-none transition-colors"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-[#A3A3A3] mb-1.5", children: "Password" }),
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
            children: isSubmitting ? "Logging in..." : "Log in"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxs("p", { className: "mt-6 text-center text-sm text-[#A3A3A3]", children: [
        "Don't have an account?",
        " ",
        /* @__PURE__ */ jsx(Link, { to: `/auth/register?redirectTo=${encodeURIComponent(redirectTo)}`, className: "font-semibold text-[#9E7FFF] hover:text-[#B39DFF] transition-colors", children: "Create account" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-center text-sm text-[#A3A3A3]", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "text-[#A3A3A3] hover:text-white transition-colors", children: "← Back to home" }) })
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
  return cleaned || "Project generated successfully.";
}
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL_ID = "deepseek/deepseek-v4-pro-0813";
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
async function action({ request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const { supabase: supabase2, headers } = createSupabaseServerClient(request);
  const {
    data: { user }
  } = await supabase2.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401, headers });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400, headers });
  }
  const { projectId, messages, modelId } = body;
  if (!projectId || !messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Missing required parameters" }, { status: 400, headers });
  }
  const { data: project, error: projectError } = await supabase2.from("projects").select("id, user_id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  if (projectError || !project) {
    return Response.json({ error: "Project not found" }, { status: 404, headers });
  }
  const { data: profile, error: profileError } = await supabase2.from("profiles").select("token_balance, preferred_model_id").eq("id", user.id).maybeSingle();
  if (profileError || !profile) {
    return Response.json({ error: "Profile not found" }, { status: 404, headers });
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
      { error: "You do not have enough tokens to send this message.", tokenBalance },
      { status: 402, headers }
    );
  }
  await supabase2.from("projects").update({ model_id: apiModel }).eq("id", projectId);
  const apiKey = await getSetting("openrouter_api_key");
  if (!apiKey) {
    return Response.json(
      { error: "AI service is not configured. Set the OpenRouter API key in the admin panel." },
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
          send({ type: "error", error: "Error contacting AI service." });
          controller.close();
          return;
        }
        if (!openrouterResponse.ok) {
          const errText = await openrouterResponse.text().catch(() => "");
          console.error("OpenRouter error:", openrouterResponse.status, errText);
          send({ type: "error", error: "AI service returned an error." });
          controller.close();
          return;
        }
        const reader = (_a = openrouterResponse.body) == null ? void 0 : _a.getReader();
        if (!reader) {
          send({ type: "error", error: "Could not read stream." });
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
        const assistantContent = fullContent || "Could not generate a response.";
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
          send({ type: "error", error: "Error deducting tokens." });
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
        send({ type: "error", error: "Unexpected server error." });
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
const meta = () => [
  { title: `${APP_NAME} — Build with AI` },
  {
    name: "description",
    content: "Create complete web apps by chatting with AI."
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
        "Search",
        /* @__PURE__ */ jsx("span", { className: "ml-auto rounded border border-white/10 px-1 text-[9px]", children: "⌘ K" })
      ] }),
      /* @__PURE__ */ jsxs("nav", { className: "mt-5 space-y-1 text-xs", children: [
        /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-white/10 px-3 py-2 font-medium text-white", children: "Home" }),
        /* @__PURE__ */ jsx(Link, { to: "/auth/register", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Projects" }),
        /* @__PURE__ */ jsx(Link, { to: "/auth/register", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Favorites" }),
        /* @__PURE__ */ jsx(Link, { to: "/auth/register", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Recently viewed" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-7 border-t border-white/10 pt-5 text-xs", children: [
        /* @__PURE__ */ jsx("p", { className: "px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30", children: "Resources" }),
        /* @__PURE__ */ jsx("a", { href: "#como-funciona", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Help center" }),
        /* @__PURE__ */ jsx("a", { href: "#caracteristicas", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "What's new" }),
        /* @__PURE__ */ jsx("a", { href: "#precios", className: "block rounded-lg px-3 py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white", children: "Status" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "absolute bottom-4 left-3 right-3 rounded-xl border border-white/10 bg-gradient-to-br from-[#15284e] to-[#10131c] p-3", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-white", children: "Start for free" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-[10px] leading-4 text-white/45", children: "Build your first app with AI." }),
        /* @__PURE__ */ jsx(Link, { to: "/auth/register", className: "mt-3 flex items-center justify-center rounded-lg bg-white py-2 text-[10px] font-semibold text-[#0757d9]", children: "Create account" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "landing-grid pointer-events-none absolute inset-0 opacity-40" }),
    /* @__PURE__ */ jsx("div", { className: "landing-orb landing-orb-one pointer-events-none absolute -top-48 left-[12%] h-[34rem] w-[34rem] rounded-full bg-[#0575ff]/30 blur-[110px]" }),
    /* @__PURE__ */ jsx("div", { className: "landing-orb landing-orb-two pointer-events-none absolute -top-32 right-[7%] h-[27rem] w-[27rem] rounded-full bg-[#52d5ff]/20 blur-[100px]" }),
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-x-0 top-0 h-[54rem] bg-[radial-gradient(ellipse_at_50%_18%,rgba(11,128,255,0.62),transparent_58%)]" }),
    /* @__PURE__ */ jsxs("header", { className: "relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:pl-56 lg:pr-10", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2.5", "aria-label": `${APP_NAME} home`, children: [
        /* @__PURE__ */ jsx(BoltMark, {}),
        /* @__PURE__ */ jsx("span", { className: "text-lg font-bold tracking-tight", children: APP_NAME })
      ] }),
      /* @__PURE__ */ jsxs("nav", { className: "hidden items-center gap-8 text-sm text-white/70 md:flex", children: [
        /* @__PURE__ */ jsx("a", { href: "#como-funciona", className: "transition-colors hover:text-white", children: "How it works" }),
        /* @__PURE__ */ jsx("a", { href: "#caracteristicas", className: "transition-colors hover:text-white", children: "Features" }),
        /* @__PURE__ */ jsx("a", { href: "#precios", className: "transition-colors hover:text-white", children: "Pricing" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Link, { to: "/auth/login", className: "rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white", children: "Log in" }),
        /* @__PURE__ */ jsx(Link, { to: "/auth/register", className: "hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0757d9] shadow-lg shadow-blue-950/20 transition-transform hover:-translate-y-0.5 sm:inline-flex", children: "Get started free" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("main", { className: "relative z-10", children: /* @__PURE__ */ jsxs("section", { className: "mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-5xl flex-col items-center px-5 pb-20 pt-24 text-center sm:px-8 sm:pt-32 lg:pl-56 lg:pt-36", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md", children: [
        /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 animate-pulse rounded-full bg-[#67d8ff]" }),
        "Your new development companion"
      ] }),
      /* @__PURE__ */ jsxs("h1", { className: "max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-8xl", children: [
        "What are you going to",
        /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-white via-[#b9eaff] to-[#54aaff] bg-clip-text text-transparent", children: "create today?" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg", children: "Create amazing apps and websites by chatting with AI. Describe your idea and watch it come to life." }),
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
                placeholder: "Tell me what you want to build...",
                className: "w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/35"
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-2 pt-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsx("button", { type: "button", className: "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/10 hover:text-white", "aria-label": "Add context", children: /* @__PURE__ */ jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 5v14m-7-7h14" }) }) }),
                /* @__PURE__ */ jsx("span", { className: "hidden text-xs text-white/40 sm:block", children: "Start by describing an idea" })
              ] }),
              /* @__PURE__ */ jsxs("button", { type: "submit", className: "group flex items-center gap-2 rounded-lg bg-[#1687ff] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-950/40 transition-all hover:-translate-y-0.5 hover:bg-[#3298ff]", children: [
                "Build now",
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
        /* @__PURE__ */ jsx("span", { children: "or start from" }),
        /* @__PURE__ */ jsxs(Link, { to: "/auth/register", className: "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 transition-colors hover:bg-white/12 hover:text-white", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-white/70", children: "GitHub" }),
          /* @__PURE__ */ jsx(ArrowIcon, {})
        ] }),
        /* @__PURE__ */ jsxs(Link, { to: "/auth/register", className: "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 transition-colors hover:bg-white/12 hover:text-white", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-white/70", children: "A template" }),
          /* @__PURE__ */ jsx(ArrowIcon, {})
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-24 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3", id: "caracteristicas", children: [
        { title: "From idea to product", body: "Describe what you imagine and get an app ready to explore.", icon: "✦" },
        { title: "Edit freely", body: "Open each file, change the code, and see results instantly.", icon: "⌁" },
        { title: "Publish without friction", body: "Connect GitHub, save your work, and share your projects.", icon: "↗" }
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
      /* @__PURE__ */ jsx("span", { children: "Build something extraordinary." })
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
        /* @__PURE__ */ jsx("p", { className: "mb-8 text-lg text-[#A3A3A3]", children: "Describe a web project and the AI generates all the files for you." }),
        /* @__PURE__ */ jsxs("button", { onClick: () => handleNewProject(), disabled: isCreating, className: "inline-flex items-center gap-2 rounded-xl bg-[#9E7FFF] px-6 py-3 font-semibold text-white transition-all hover:bg-[#8B6EE6] disabled:opacity-50", children: [
          isCreating ? "Creating..." : "Create new project",
          !isCreating && /* @__PURE__ */ jsx(ArrowIcon, {})
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]", children: [
          /* @__PURE__ */ jsx("h2", { className: "mb-1 text-sm font-medium text-[#A3A3A3]", children: "Available tokens" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-white", children: data.profile.token_balance.toLocaleString() })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]", children: [
          /* @__PURE__ */ jsx("h2", { className: "mb-1 text-sm font-medium text-[#A3A3A3]", children: "Model" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-white", children: data.defaultModelName })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-[#262626] p-5 ring-1 ring-[#2F2F2F]", children: [
          /* @__PURE__ */ jsx("h2", { className: "mb-1 text-sm font-medium text-[#A3A3A3]", children: "Version" }),
          /* @__PURE__ */ jsxs("p", { className: "text-2xl font-bold text-white", children: [
            "v",
            APP_VERSION
          ] })
        ] })
      ] }),
      data.recentProjects.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "mb-4 text-sm font-medium text-[#A3A3A3]", children: "Recent projects" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: data.recentProjects.map((project) => /* @__PURE__ */ jsx("button", { onClick: () => navigate(`/project/${project.id}`), className: "group rounded-2xl bg-[#262626] p-4 text-left ring-1 ring-[#2F2F2F] transition-all hover:ring-[#9E7FFF]/30", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg bg-[#9E7FFF]/10", children: /* @__PURE__ */ jsx("svg", { className: "h-5 w-5 text-[#9E7FFF]", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" }) }) }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium text-white transition-colors group-hover:text-[#9E7FFF]", children: project.title }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-[#A3A3A3]", children: new Date(project.updated_at).toLocaleDateString("en-US", { day: "numeric", month: "short" }) })
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
const serverManifest = { "entry": { "module": "/assets/entry.client-plGWgkDl.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/components-eubqvS0L.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/root-DS9dbWZp.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/components-eubqvS0L.js"], "css": [] }, "routes/api.github-connect": { "id": "routes/api.github-connect", "parentId": "root", "path": "api/github-connect", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.github-connect-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/project.$projectId": { "id": "routes/project.$projectId", "parentId": "root", "path": "project/:projectId", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/project._projectId-BfLbkxfm.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/Menu-SVJnweYH.js", "/assets/components-eubqvS0L.js"], "css": [] }, "routes/api.github-import": { "id": "routes/api.github-import", "parentId": "root", "path": "api/github-import", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.github-import-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.github-push": { "id": "routes/api.github-push", "parentId": "root", "path": "api/github-push", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.github-push-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/admin.projects": { "id": "routes/admin.projects", "parentId": "root", "path": "admin/projects", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.projects-CAH7kjV4.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/AdminLayout-ft2HuqKg.js", "/assets/components-eubqvS0L.js"], "css": [] }, "routes/admin.settings": { "id": "routes/admin.settings", "parentId": "root", "path": "admin/settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.settings-BJbEp5Wo.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/AdminLayout-ft2HuqKg.js", "/assets/components-eubqvS0L.js"], "css": [] }, "routes/auth.callback": { "id": "routes/auth.callback", "parentId": "root", "path": "auth/callback", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.callback-Den1N3aN.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js"], "css": [] }, "routes/auth.register": { "id": "routes/auth.register", "parentId": "root", "path": "auth/register", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.register-pKkbcwoZ.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/components-eubqvS0L.js"], "css": [] }, "routes/admin._index": { "id": "routes/admin._index", "parentId": "root", "path": "admin", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin._index-BWYjHd5e.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/AdminLayout-ft2HuqKg.js", "/assets/components-eubqvS0L.js"], "css": [] }, "routes/admin.models": { "id": "routes/admin.models", "parentId": "root", "path": "admin/models", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.models-BgGjQSsV.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/AdminLayout-ft2HuqKg.js", "/assets/components-eubqvS0L.js"], "css": [] }, "routes/api.checkout": { "id": "routes/api.checkout", "parentId": "root", "path": "api/checkout", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.checkout-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/admin.users": { "id": "routes/admin.users", "parentId": "root", "path": "admin/users", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.users-B0opajOG.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/AdminLayout-ft2HuqKg.js", "/assets/components-eubqvS0L.js"], "css": [] }, "routes/api.webhook": { "id": "routes/api.webhook", "parentId": "root", "path": "api/webhook", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.webhook-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.logout": { "id": "routes/auth.logout", "parentId": "root", "path": "auth/logout", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.logout-CSxRPO1x.js", "imports": [], "css": [] }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.login-A7jMIUAk.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/components-eubqvS0L.js"], "css": [] }, "routes/api.chat": { "id": "routes/api.chat", "parentId": "root", "path": "api/chat", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.chat-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-B2dEn2xq.js", "imports": ["/assets/jsx-runtime-BNRJbmTP.js", "/assets/constants-BG7SmB-l.js", "/assets/Menu-SVJnweYH.js", "/assets/components-eubqvS0L.js"], "css": [] } }, "url": "/assets/manifest-22a99b3c.js", "version": "22a99b3c" };
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

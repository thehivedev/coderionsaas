import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import stylesheet from "~/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-[#171717] text-white antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}: ${error.data}`
    : error instanceof Error
      ? error.message
      : String(error);

  return (
    <div className="min-h-screen bg-[#171717] text-white flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <pre className="text-sm text-red-400 bg-[#262626] rounded-lg p-4 overflow-auto whitespace-pre-wrap">
          {message}
        </pre>
        <a href="/" className="inline-block mt-4 text-[#9E7FFF] hover:underline">
          Go home
        </a>
      </div>
    </div>
  );
}

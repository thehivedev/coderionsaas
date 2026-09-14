import { Link, useLocation } from '@remix-run/react';
import { APP_NAME } from '~/lib/constants';
import type { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  adminEmail: string;
}

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/admin/settings', label: 'API Keys', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-4.07a1 1 0 01.49-.86l5.07-2.93A6 6 0 1121 9z' },
  { path: '/admin/models', label: 'Modelos IA', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M3 13a2 2 0 00-2 2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2M3 13a2 2 0 002 2h14a2 2 0 002-2' },
  { path: '/admin/users', label: 'Usuarios', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z' },
  { path: '/admin/projects', label: 'Proyectos', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
];

export default function AdminLayout({ children, adminEmail }: AdminLayoutProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-[#171717] flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-[#2F2F2F] bg-[#1E1E1E] flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-[#2F2F2F]">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9E7FFF]/20">
              <svg className="h-4 w-4 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold text-white">{APP_NAME}</span>
              <span className="block text-[10px] text-[#A3A3A3] uppercase tracking-wider">Admin Panel</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/admin' && currentPath.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#9E7FFF]/10 text-[#9E7FFF] font-medium'
                    : 'text-[#A3A3A3] hover:bg-[#262626] hover:text-white'
                }`}
              >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#2F2F2F] px-3 py-4 space-y-2">
          <div className="rounded-lg bg-[#262626] px-3 py-2">
            <p className="text-xs text-[#A3A3A3] truncate">{adminEmail}</p>
            <p className="text-[10px] text-green-400 mt-0.5">Administrador</p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 text-xs text-[#A3A3A3] hover:text-white transition-colors px-3 py-1.5"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a la app
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

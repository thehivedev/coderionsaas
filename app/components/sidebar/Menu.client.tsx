import { useState, useEffect } from 'react';
import { Form, useNavigate, useLocation } from '@remix-run/react';
import { getChats, createChat, deleteChat } from '~/lib/database';
import type { Chat, Profile } from '~/lib/types';
import { APP_NAME } from '~/lib/constants';

interface MenuClientProps {
  user: { id: string; email: string };
  profile: Profile;
}

export default function MenuClient({ user, profile }: MenuClientProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    setIsLoading(true);
    const data = await getChats(user.id);
    setChats(data);
    setIsLoading(false);
  }

  async function handleNewChat() {
    if (isCreating) return;
    setIsCreating(true);
    const chat = await createChat(user.id);
    if (chat) {
      setChats((prev) => [chat, ...prev]);
      navigate(`/chat/${chat.id}`);
    }
    setIsCreating(false);
  }

  async function handleDeleteChat(chatId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const success = await deleteChat(chatId);
    if (success) {
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (location.pathname === `/chat/${chatId}`) {
        navigate('/');
      }
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-[#1E1E1E] border-r border-[#2F2F2F] transform transition-transform duration-300 lg:transform-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-7 h-7 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-lg font-bold text-white">{APP_NAME}</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-[#A3A3A3] hover:text-white p-2 rounded-lg hover:bg-[#2F2F2F] transition-colors"
                aria-label="Cerrar menú"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* New chat button */}
            <button
              onClick={handleNewChat}
              disabled={isCreating}
              className="w-full flex items-center justify-center gap-2 bg-[#9E7FFF] text-white font-semibold rounded-xl px-4 py-3 hover:bg-[#8B6EE6] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
              Nuevo chat
            </button>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-6 h-6 text-[#A3A3A3] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-8 px-4">
                <svg className="w-12 h-12 text-[#3F3F3F] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="text-sm text-[#A3A3A3]">No hay chats todavía</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <div
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        location.pathname === `/chat/${chat.id}`
                          ? 'bg-[#2F2F2F] text-white'
                          : 'text-[#A3A3A3] hover:bg-[#262626] hover:text-white'
                      }`}
                      onClick={() => navigate(`/chat/${chat.id}`)}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className="flex-1 text-sm truncate">{chat.title}</span>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-[#A3A3A3] hover:text-red-400 p-1 rounded transition-all"
                        aria-label="Eliminar chat"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* User info */}
          <div className="p-4 border-t border-[#2F2F2F]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#9E7FFF]/20 flex items-center justify-center flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || user.email}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-[#9E7FFF] font-semibold text-sm">
                    {(profile.full_name || user.email).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile.full_name || user.email}
                </p>
                <p className="text-xs text-[#A3A3A3] truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-[#262626] rounded-lg">
              <span className="text-xs text-[#A3A3A3]">Tokens</span>
              <span className="text-sm font-semibold text-[#9E7FFF]">
                {profile.token_balance.toLocaleString()}
              </span>
            </div>

            <Form method="post" action="/auth/logout">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 text-sm text-[#A3A3A3] hover:text-white transition-colors bg-[#262626] border border-[#2F2F2F] rounded-lg px-4 py-2.5 hover:bg-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
              </button>
            </Form>
          </div>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 left-4 z-10 lg:hidden bg-[#262626] border border-[#2F2F2F] rounded-lg p-2 text-white hover:bg-[#2F2F2F] transition-colors"
        aria-label="Abrir menú"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
}

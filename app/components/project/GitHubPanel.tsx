import { useState, useEffect } from 'react';
import type { GitHubConnection } from '~/lib/types';
import { supabase } from '~/lib/supabaseClient';

interface GitHubPanelProps {
  projectId: string;
  onImported?: () => void;
}

export default function GitHubPanel({ projectId, onImported }: GitHubPanelProps) {
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showPush, setShowPush] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [branch, setBranch] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [openPR, setOpenPR] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConnection();
  }, []);

  async function loadConnection() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('github_connections')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (!error) {
      setConnection(data as GitHubConnection | null);
    }
    setLoading(false);
  }

  async function handleConnect() {
    try {
      const res = await fetch('/api/github-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      setError('Error al conectar con GitHub');
    }
  }

  async function handleDisconnect() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { error } = await supabase
      .from('github_connections')
      .delete()
      .eq('user_id', session.user.id);
    if (!error) {
      setConnection(null);
    }
  }

  async function handleImport() {
    if (!repoUrl.trim() || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/github-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, repoUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al importar');
        return;
      }

      setSuccess(`Importados ${data.imported} archivos de ${data.repo} (rama: ${data.branch})`);
      setShowImport(false);
      setRepoUrl('');
      onImported?.();
    } catch {
      setError('Error de conexion');
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
      const res = await fetch('/api/github-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          repoUrl: repoUrl.trim() || undefined,
          newRepoName: newRepoName.trim() || undefined,
          branch: branch.trim() || undefined,
          newBranch: newBranch.trim() || undefined,
          commitMessage: commitMessage.trim() || undefined,
          openPR,
          isPrivate,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al subir');
        return;
      }

      let msg = `Subidos ${data.filesPushed} archivos a ${data.repo} (rama: ${data.branch})`;
      if (data.prUrl) {
        msg += ` — Pull Request creado: ${data.prUrl}`;
      }
      setSuccess(msg);
      setShowPush(false);
      setRepoUrl('');
      setNewRepoName('');
      setNewBranch('');
      setCommitMessage('');
      setOpenPR(false);
    } catch {
      setError('Error de conexion');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <svg className="w-5 h-5 text-[#A3A3A3] animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="px-3 py-2">
        <button
          onClick={handleConnect}
          className="w-full flex items-center justify-center gap-2 text-xs text-white bg-[#262626] border border-[#2F2F2F] rounded-lg px-3 py-2 hover:bg-[#2F2F2F] transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          Conectar GitHub
        </button>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-2">
      {/* Connection status */}
      <div className="flex items-center gap-2 bg-[#262626] rounded-lg px-3 py-2">
        {connection.github_avatar_url ? (
          <img
            src={connection.github_avatar_url}
            alt={connection.github_username}
            className="w-5 h-5 rounded-full"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-[#9E7FFF]/20 flex items-center justify-center">
            <span className="text-[10px] text-[#9E7FFF] font-semibold">
              {connection.github_username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="text-xs text-white truncate flex-1">{connection.github_username}</span>
        <button
          onClick={handleDisconnect}
          className="text-xs text-[#A3A3A3] hover:text-red-400 transition-colors"
          title="Desconectar"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Import button */}
      <button
        onClick={() => { setShowImport(!showImport); setShowPush(false); setError(null); setSuccess(null); }}
        className="w-full flex items-center gap-2 text-xs text-[#A3A3A3] hover:text-white bg-[#262626] border border-[#2F2F2F] rounded-lg px-3 py-2 hover:bg-[#2F2F2F] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Importar desde GitHub
      </button>

      {showImport && (
        <div className="bg-[#262626] rounded-lg p-3 space-y-2 border border-[#2F2F2F]">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/usuario/repo"
            className="w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
          />
          <button
            onClick={handleImport}
            disabled={!repoUrl.trim() || busy}
            className="w-full bg-[#9E7FFF] text-white text-xs font-medium rounded-md px-3 py-2 hover:bg-[#8B6EE6] transition-colors disabled:opacity-50"
          >
            {busy ? 'Importando...' : 'Importar archivos'}
          </button>
        </div>
      )}

      {/* Push button */}
      <button
        onClick={() => { setShowPush(!showPush); setShowImport(false); setError(null); setSuccess(null); }}
        className="w-full flex items-center gap-2 text-xs text-[#A3A3A3] hover:text-white bg-[#262626] border border-[#2F2F2F] rounded-lg px-3 py-2 hover:bg-[#2F2F2F] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l4 4 12-12M4 20h16" />
        </svg>
        Push a GitHub
      </button>

      {showPush && (
        <div className="bg-[#262626] rounded-lg p-3 space-y-2 border border-[#2F2F2F]">
          <div className="space-y-1">
            <label className="text-xs text-[#A3A3A3]">Repo existente (opcional)</label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/usuario/repo"
              className="w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#A3A3A3]">O crear repo nuevo</label>
            <input
              type="text"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              placeholder="mi-proyecto"
              className="w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
            />
          </div>

          {repoUrl.trim() && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-[#A3A3A3]">Rama (default: main)</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#A3A3A3]">Nueva rama (opcional)</label>
                <input
                  type="text"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder="feature/mi-cambio"
                  className="w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs text-[#A3A3A3]">Mensaje del commit</label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Update from Coderion"
              className="w-full bg-[#1E1E1E] text-white text-xs rounded-md px-3 py-2 border border-[#2F2F2F] focus:outline-none focus:border-[#9E7FFF]/50"
            />
          </div>

          {newBranch.trim() && (
            <label className="flex items-center gap-2 text-xs text-[#A3A3A3] cursor-pointer">
              <input
                type="checkbox"
                checked={openPR}
                onChange={(e) => setOpenPR(e.target.checked)}
                className="accent-[#9E7FFF]"
              />
              Abrir Pull Request
            </label>
          )}

          {newRepoName.trim() && !repoUrl.trim() && (
            <label className="flex items-center gap-2 text-xs text-[#A3A3A3] cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="accent-[#9E7FFF]"
              />
              Repo privado
            </label>
          )}

          <button
            onClick={handlePush}
            disabled={busy || (!repoUrl.trim() && !newRepoName.trim())}
            className="w-full bg-[#9E7FFF] text-white text-xs font-medium rounded-md px-3 py-2 hover:bg-[#8B6EE6] transition-colors disabled:opacity-50"
          >
            {busy ? 'Subiendo...' : 'Subir archivos'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-md px-3 py-2 text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-md px-3 py-2 text-xs">
          {success}
        </div>
      )}
    </div>
  );
}

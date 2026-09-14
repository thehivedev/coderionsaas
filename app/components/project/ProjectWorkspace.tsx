import { useState, useEffect, useRef, useCallback } from 'react';
import type { AIModel, ChatMessage, ProjectFile, Profile, ProjectType } from '~/lib/types';
import { getProjectFiles, deleteProjectFile } from '~/lib/database';
import FileTree from './FileTree';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';
import GitHubPanel from './GitHubPanel';
import MenuClient from '~/components/sidebar/Menu';

interface ProjectWorkspaceProps {
  projectId: string;
  projectTitle: string;
  projectType: ProjectType | null;
  initialMessages: ChatMessage[];
  initialFiles: ProjectFile[];
  models: AIModel[];
  initialPrompt?: string;
  planMode?: boolean;
  source?: string;
  user: { id: string; email: string };
  profile: Profile;
}

function Icon({ name, className = 'h-4 w-4' }: { name: 'send' | 'code' | 'eye' | 'folder' | 'sparkle' | 'chevron' | 'close' | 'files'; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    send: <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />,
    code: <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3m8-6l4 3-4 3m-3-9l-2 12" />,
    eye: <><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
    folder: <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
    sparkle: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3zM19 16l.5 2.5L22 19l-2.5.5L19 22l-.5-2.5L16 19l2.5-.5L19 16z" />,
    chevron: <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />,
    close: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    files: <><path strokeLinecap="round" strokeLinejoin="round" d="M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9l-6-6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 3v6h6" /></>,
  };
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>{paths[name]}</svg>;
}

export default function ProjectWorkspace({ projectId, projectTitle, projectType, initialMessages, initialFiles, models, initialPrompt, planMode, source, user, profile }: ProjectWorkspaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles || []);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || '');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isPlanMode, setIsPlanMode] = useState(planMode ?? false);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [showFilePanel, setShowFilePanel] = useState(false);
  const [editingFile, setEditingFile] = useState<ProjectFile | null>(null);
  const [expandedToolbar, setExpandedToolbar] = useState<'files' | 'preview' | 'github'>(source === 'github' ? 'github' : 'preview');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent]);
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim() && messages.length === 0 && !isSending) {
      setInput(initialPrompt);
      const timer = setTimeout(() => handleSendMessage(), 100);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt]);

  const refreshFiles = useCallback(async () => {
    const freshFiles = await getProjectFiles(projectId);
    setFiles(freshFiles);
    if (editingFile) {
      const updated = freshFiles.find((file) => file.id === editingFile.id);
      if (updated) setEditingFile(updated);
    }
  }, [projectId, editingFile]);

  async function handleSendMessage(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    const userMessage: ChatMessage = { role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    setInput(''); setIsSending(true); setError(null); setStreamingContent('');
    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, messages: optimisticMessages, modelId: selectedModelId || undefined, planMode: isPlanMode }) });
      if (!response.ok) { const data = await response.json(); setError(data?.error || 'Error sending message.'); setMessages(messages); return; }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ') || !line.slice(6).trim()) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token') { accumulated += data.content; setStreamingContent(accumulated); }
            else if (data.type === 'done') {
              setMessages([...optimisticMessages, { role: 'assistant', content: data.content || accumulated, timestamp: new Date().toISOString() }]);
              setStreamingContent('');
              if (data.filesGenerated > 0) await refreshFiles();
            } else if (data.type === 'error') { setError(data.error || 'AI service error.'); setMessages(messages); }
          } catch { /* incomplete stream chunk */ }
        }
      }
    } catch { setError('Connection error. Try again.'); setMessages(messages); }
    finally { setIsSending(false); setStreamingContent(''); }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendMessage(); }
  }

  async function handleDeleteFile(fileId: string) {
    if (await deleteProjectFile(fileId)) {
      setFiles((prev) => prev.filter((file) => file.id !== fileId));
      if (selectedFile?.id === fileId) setSelectedFile(null);
      if (editingFile?.id === fileId) setEditingFile(null);
    }
  }

  function handleSelectFile(file: ProjectFile) {
    setSelectedFile(file);
    setEditingFile(file);
  }

  function handleContentChange(fileId: string, content: string) {
    setFiles((prev) => prev.map((file) => file.id === fileId ? { ...file, content } : file));
    if (editingFile?.id === fileId) setEditingFile((prev) => prev ? { ...prev, content } : prev);
  }

  function handleCloseEditor() {
    setEditingFile(null);
  }

  const selectedModel = models.find((model) => model.id === selectedModelId);

  return (
    <div className="flex h-screen bg-[#171717]">
      {/* Left sidebar: logo + nav + chat */}
      <aside className="flex w-full max-w-none shrink-0 flex-col border-b border-[#2B2B2B] bg-[#1B1B1B] lg:w-[360px] lg:border-b-0 lg:border-r">
        <MenuClient user={user} profile={profile} />

        {/* Chat section */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-10 shrink-0 items-center justify-between px-4">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">
              <Icon name="sparkle" className="h-3.5 w-3.5 text-[#6C9DE8]" />
              AI Chat
            </span>
            <div className="relative">
              <button onClick={() => setShowModelDropdown(!showModelDropdown)} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#9D9D9D] transition hover:bg-[#292929] hover:text-white">
                <span>{selectedModel?.name || 'Model'}</span>
                <Icon name="chevron" className="h-3 w-3" />
              </button>
              {showModelDropdown && (
                <>
                  <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowModelDropdown(false)} aria-label="Close model menu" />
                  <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-[#333] bg-[#242424] p-1 shadow-2xl">
                    {models.map((model) => (
                      <button key={model.id} onClick={() => { setSelectedModelId(model.id); setShowModelDropdown(false); }} className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs ${model.id === selectedModelId ? 'bg-[#314A70] text-white' : 'text-[#B5B5B5] hover:bg-[#2D2D2D] hover:text-white'}`}>
                        <span>{model.name}</span>
                        {model.badge && <span className="rounded bg-[#3C5D8D] px-1.5 py-0.5 text-[10px] text-[#CFE1FF]">{model.badge}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && !streamingContent && (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#303030] bg-[#242424] text-[#6C9DE8]">
                  <Icon name="sparkle" className="h-6 w-6" />
                </div>
                <h2 className="text-sm font-medium text-[#E5E5E5]">What do you want to build?</h2>
                <p className="mt-2 text-xs leading-5 text-[#858585]">Describe an idea and Coderion will create the files and preview for you.</p>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className="space-y-1.5">
                  <div className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${message.role === 'user' ? 'text-[#7EAFF2]' : 'text-[#777]'}`}>
                    {message.role === 'user' ? 'You' : 'Coderion'}
                  </div>
                  <div className={`rounded-xl px-3.5 py-3 text-xs leading-5 ${message.role === 'user' ? 'bg-[#2A4772] text-[#EAF3FF]' : 'bg-[#242424] text-[#D2D2D2]'}`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {streamingContent && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777]">Coderion</div>
                  <div className="rounded-xl bg-[#242424] px-3.5 py-3 text-xs leading-5 text-[#D2D2D2]">
                    <p className="whitespace-pre-wrap">{streamingContent}<span className="ml-1 inline-block h-3 w-1 animate-pulse bg-[#6C9DE8]" /></p>
                  </div>
                </div>
              )}
              {isSending && !streamingContent && (
                <div className="flex items-center gap-1.5 px-1 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6C9DE8]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6C9DE8] [animation-delay:100ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6C9DE8] [animation-delay:200ms]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {error && <div className="px-4 pb-2"><div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div></div>}

          <div className="shrink-0 border-t border-[#2B2B2B] p-3">
            <form onSubmit={handleSendMessage}>
              <div className="rounded-xl border border-[#3A3A3A] bg-[#242424] p-2.5 transition focus-within:border-[#5A7EAE] focus-within:ring-2 focus-within:ring-[#385A85]/20">
                <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask Coderion to build..." disabled={isSending} rows={3} className="w-full resize-none bg-transparent text-xs leading-5 text-white outline-none placeholder:text-[#777] disabled:opacity-50" />
                <div className="mt-2 flex items-center justify-between">
                  <button type="button" onClick={() => setIsPlanMode((v) => !v)} aria-pressed={isPlanMode} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isPlanMode ? 'bg-[#21415c] text-[#b8e4ff] shadow-[0_0_0_1px_rgba(88,180,239,0.22)]' : 'text-[#707070] hover:bg-[#2A2A2A] hover:text-[#aaa]'}`}><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>Plan</button>
                  <button type="submit" disabled={!input.trim() || isSending} className={`flex items-center gap-1.5 rounded-lg bg-[#4B82D1] py-1.5 text-[10px] font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#5B91E0] disabled:cursor-not-allowed disabled:opacity-40 ${isPlanMode ? 'px-4 shadow-[0_0_16px_rgba(75,130,209,0.4)]' : 'px-2.5'}`} aria-label={isPlanMode ? 'Generate plan' : 'Send message'}>
                    {isPlanMode ? 'Generate plan' : <Icon name="send" className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </aside>

      {/* Right side: preview area with floating file panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar: Files | Preview on left, GitHub on right */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#2B2B2B] bg-[#1A1A1A] px-3 py-2">
          <div className="flex items-center gap-1 rounded-full border border-[#303030] bg-[#202020] p-1 shadow-inner shadow-black/20">
            <button
              onClick={() => { setExpandedToolbar('files'); setShowFilePanel(!showFilePanel); }}
              className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-200 ${expandedToolbar === 'files' ? 'bg-[#304B73] text-[#CFE1FF] shadow-sm' : 'text-[#777] hover:bg-[#2A2A2A] hover:text-white'}`}
              title="Files"
            >
              <Icon name="files" className="h-3.5 w-3.5" />
              {expandedToolbar === 'files' && <span>Files</span>}
              {expandedToolbar === 'files' && files.length > 0 && <span className="rounded-full bg-[#3C5D8D] px-1.5 py-0.5 text-[10px] text-[#CFE1FF]">{files.length}</span>}
            </button>
            <button
              onClick={() => { setExpandedToolbar('preview'); setEditingFile(null); }}
              className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-200 ${expandedToolbar === 'preview' ? 'bg-[#304B73] text-[#CFE1FF] shadow-sm' : 'text-[#777] hover:bg-[#2A2A2A] hover:text-white'}`}
              title="Preview"
            >
              <Icon name="eye" className="h-3.5 w-3.5" />
              {expandedToolbar === 'preview' && <span>Preview</span>}
            </button>
          </div>

          <GitHubPanel projectId={projectId} onImported={refreshFiles} compact expanded={expandedToolbar === 'github'} onOpen={() => setExpandedToolbar('github')} autoOpen={source === 'github'} />
        </div>

        {/* Expandable file explorer + main content */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className={`shrink-0 overflow-hidden border-r border-[#2B2B2B] bg-[#171717] transition-all duration-200 ${showFilePanel ? 'w-[280px]' : 'w-0 border-r-0'}`}>
            <div className="flex h-full w-[280px] flex-col">
              <div className="flex h-10 shrink-0 items-center border-b border-[#2B2B2B] px-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">Files</span>
                <span className="ml-2 rounded bg-[#292929] px-1.5 py-0.5 text-[10px] text-[#777]">{files.length}</span>
              </div>
              <div className="border-b border-[#2B2B2B] px-2 py-2">
                <div className="flex items-center gap-2 rounded-md border border-[#2D2D2D] bg-[#202020] px-2 py-1.5 text-xs text-[#777]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m20 20-4-4" /></svg>
                  <span>Search files</span>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <FileTree files={files} selectedFile={selectedFile} onSelectFile={handleSelectFile} onDeleteFile={handleDeleteFile} />
              </div>
              <div className="shrink-0 border-t border-[#2B2B2B]">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">GitHub</div>
                <GitHubPanel projectId={projectId} onImported={refreshFiles} />
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#101010]">
            {editingFile ? (
              <CodeEditor file={editingFile} onContentChange={handleContentChange} onClose={handleCloseEditor} />
            ) : (
              <LivePreview files={files} projectType={projectType} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

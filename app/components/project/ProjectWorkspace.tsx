import { useState, useEffect, useRef, useCallback } from 'react';
import type { AIModel, ChatMessage, ProjectFile, Profile } from '~/lib/types';
import { getProjectFiles, deleteProjectFile } from '~/lib/database';
import FileTree from './FileTree';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';
import GitHubPanel from './GitHubPanel';
import MenuClient from '~/components/sidebar/Menu';

interface ProjectWorkspaceProps {
  projectId: string;
  projectTitle: string;
  initialMessages: ChatMessage[];
  initialFiles: ProjectFile[];
  models: AIModel[];
  initialPrompt?: string;
  user: { id: string; email: string };
  profile: Profile;
}

type PanelView = 'editor' | 'preview' | 'split';

function Icon({ name, className = 'h-4 w-4' }: { name: 'send' | 'code' | 'eye' | 'folder' | 'sparkle' | 'chevron' | 'panel'; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    send: <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />,
    code: <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3m8-6l4 3-4 3m-3-9l-2 12" />,
    eye: <><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
    folder: <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
    sparkle: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3zM19 16l.5 2.5L22 19l-2.5.5L19 22l-.5-2.5L16 19l2.5-.5L19 16z" />,
    chevron: <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />,
    panel: <><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4z" /><path strokeLinecap="round" d="M15 5v14" /></>,
  };
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>{paths[name]}</svg>;
}

export default function ProjectWorkspace({ projectId, projectTitle, initialMessages, initialFiles, models, initialPrompt, user, profile }: ProjectWorkspaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles || []);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || '');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [panelView, setPanelView] = useState<PanelView>('preview');
  const [showFiles, setShowFiles] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent]);
  useEffect(() => { if (files.length > 0 && !selectedFile) setSelectedFile(files[0]); }, [files, selectedFile]);
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
    if (freshFiles.length > 0) {
      const current = freshFiles.find((file) => file.id === selectedFile?.id);
      if (current) setSelectedFile(current);
      else if (!selectedFile) setSelectedFile(freshFiles[0]);
    }
  }, [projectId, selectedFile]);

  async function handleSendMessage(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    const userMessage: ChatMessage = { role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    setInput(''); setIsSending(true); setError(null); setStreamingContent('');
    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, messages: optimisticMessages, modelId: selectedModelId || undefined }) });
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
    if (await deleteProjectFile(fileId)) { setFiles((prev) => prev.filter((file) => file.id !== fileId)); if (selectedFile?.id === fileId) setSelectedFile(null); }
  }

  function handleContentChange(fileId: string, content: string) {
    setFiles((prev) => prev.map((file) => file.id === fileId ? { ...file, content } : file));
    if (selectedFile?.id === fileId) setSelectedFile((prev) => prev ? { ...prev, content } : prev);
  }

  const selectedModel = models.find((model) => model.id === selectedModelId);

  return (
    <div className="flex h-screen bg-[#171717]">
      {/* Left sidebar: logo + nav + chat */}
      <aside className="flex w-full max-w-none shrink-0 flex-col border-b border-[#2B2B2B] bg-[#1B1B1B] lg:w-[360px] lg:border-b-0 lg:border-r">
        <MenuClient user={user} profile={profile} />

        {/* Chat section */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Model selector bar */}
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

          {/* Messages */}
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

          {/* Input */}
          <div className="shrink-0 border-t border-[#2B2B2B] p-3">
            <form onSubmit={handleSendMessage}>
              <div className="rounded-xl border border-[#3A3A3A] bg-[#242424] p-2.5 transition focus-within:border-[#5A7EAE] focus-within:ring-2 focus-within:ring-[#385A85]/20">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Coderion to build..."
                  disabled={isSending}
                  rows={3}
                  className="w-full resize-none bg-transparent text-xs leading-5 text-white outline-none placeholder:text-[#777] disabled:opacity-50"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-[#707070]">Enter to send</span>
                  <button type="submit" disabled={!input.trim() || isSending} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4B82D1] text-white transition hover:bg-[#5B91E0] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
                    <Icon name="send" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </aside>

      {/* Right side: files + editor + preview */}
      <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
        {/* File tree + editor panel */}
        <section className="hidden w-[300px] shrink-0 flex-col border-r border-[#2B2B2B] bg-[#1D1D1D] lg:flex">
          <div className="flex h-10 items-center justify-between border-b border-[#2B2B2B] px-3">
            <button onClick={() => setShowFiles(!showFiles)} className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A9A9A] transition hover:text-white">
              <Icon name="folder" className="h-3.5 w-3.5" />
              Files
              <span className="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[10px] font-normal text-[#777]">{files.length}</span>
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => setPanelView('editor')} className={`rounded p-1.5 ${panelView === 'editor' ? 'bg-[#304B73] text-[#CFE1FF]' : 'text-[#777] hover:bg-[#292929] hover:text-white'}`} title="Show editor"><Icon name="code" className="h-3.5 w-3.5" /></button>
              <button onClick={() => setPanelView('preview')} className={`rounded p-1.5 ${panelView === 'preview' ? 'bg-[#304B73] text-[#CFE1FF]' : 'text-[#777] hover:bg-[#292929] hover:text-white'}`} title="Show preview"><Icon name="eye" className="h-3.5 w-3.5" /></button>
              <button onClick={() => setPanelView('split')} className={`rounded p-1.5 ${panelView === 'split' ? 'bg-[#304B73] text-[#CFE1FF]' : 'text-[#777] hover:bg-[#292929] hover:text-white'}`} title="Show both"><Icon name="panel" className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          {showFiles && (
            <div className={`${panelView === 'preview' ? 'flex-1' : 'h-[38%]'} min-h-0 overflow-y-auto border-b border-[#2B2B2B]`}>
              <FileTree files={files} selectedFile={selectedFile} onSelectFile={setSelectedFile} onDeleteFile={handleDeleteFile} />
            </div>
          )}
          {panelView !== 'preview' && (
            <div className="min-h-0 flex-1 overflow-hidden">
              <CodeEditor file={selectedFile} onContentChange={handleContentChange} />
            </div>
          )}
          <div className="shrink-0 border-t border-[#2B2B2B]">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">GitHub</div>
            <GitHubPanel projectId={projectId} onImported={refreshFiles} />
          </div>
        </section>

        {/* Preview area */}
        <main className="min-w-0 flex-1 bg-[#101010]">
          <LivePreview files={files} />
        </main>
      </div>
    </div>
  );
}

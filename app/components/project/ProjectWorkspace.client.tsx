import { useState, useEffect, useRef, useCallback } from 'react';
import type { AIModel, ChatMessage, ProjectFile } from '~/lib/types';
import { getProjectFiles, deleteProjectFile } from '~/lib/database';
import FileTree from './FileTree';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';

interface ProjectWorkspaceProps {
  projectId: string;
  projectTitle: string;
  initialMessages: ChatMessage[];
  initialFiles: ProjectFile[];
  models: AIModel[];
}

type PanelView = 'editor' | 'preview' | 'split';

export default function ProjectWorkspace({
  projectId,
  projectTitle,
  initialMessages,
  initialFiles,
  models,
}: ProjectWorkspaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles || []);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models[0]?.id || ''
  );
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [panelView, setPanelView] = useState<PanelView>('split');
  const [showChat, setShowChat] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      setSelectedFile(files[0]);
    }
  }, [files, selectedFile]);

  const refreshFiles = useCallback(async () => {
    const freshFiles = await getProjectFiles(projectId);
    setFiles(freshFiles);
    if (freshFiles.length > 0) {
      const current = freshFiles.find((f) => f.id === selectedFile?.id);
      if (current) setSelectedFile(current);
      else if (!selectedFile) setSelectedFile(freshFiles[0]);
    }
  }, [projectId, selectedFile]);

  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setInput('');
    setIsSending(true);
    setError(null);
    setStreamingContent('');

    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messages: optimisticMessages,
          modelId: selectedModelId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data?.error || 'Error al enviar el mensaje.');
        setMessages(messages);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let filesGenerated = 0;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (!jsonStr.trim()) continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.type === 'token') {
                accumulated += data.content;
                setStreamingContent(accumulated);
              } else if (data.type === 'done') {
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: data.content || accumulated,
                  timestamp: new Date().toISOString(),
                };
                setMessages([...optimisticMessages, assistantMessage]);
                setStreamingContent('');
                filesGenerated = data.filesGenerated || 0;

                if (filesGenerated > 0) {
                  await refreshFiles();
                }
              } else if (data.type === 'error') {
                setError(data.error || 'Error del servicio de IA.');
                setMessages(messages);
              }
            } catch {
              // partial JSON, skip
            }
          }
        }
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.');
      setMessages(messages);
    } finally {
      setIsSending(false);
      setStreamingContent('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  async function handleDeleteFile(fileId: string) {
    const success = await deleteProjectFile(fileId);
    if (success) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
    }
  }

  function handleContentChange(fileId: string, content: string) {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content } : f))
    );
    if (selectedFile?.id === fileId) {
      setSelectedFile((prev) => (prev ? { ...prev, content } : prev));
    }
  }

  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[#2F2F2F] px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white truncate max-w-[200px]">{projectTitle}</h2>
          {files.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#9E7FFF]/20 text-[#9E7FFF]">
              {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Panel view toggle */}
          <div className="flex bg-[#262626] rounded-lg p-0.5">
            <button
              onClick={() => setPanelView('editor')}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                panelView === 'editor' ? 'bg-[#3F3F3F] text-white' : 'text-[#A3A3A3] hover:text-white'
              }`}
              title="Solo editor"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7h6v10H9z" />
              </svg>
            </button>
            <button
              onClick={() => setPanelView('split')}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                panelView === 'split' ? 'bg-[#3F3F3F] text-white' : 'text-[#A3A3A3] hover:text-white'
              }`}
              title="Editor + preview"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7H3v10h6zM21 17V7h-6v10h6z" />
              </svg>
            </button>
            <button
              onClick={() => setPanelView('preview')}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                panelView === 'preview' ? 'bg-[#3F3F3F] text-white' : 'text-[#A3A3A3] hover:text-white'
              }`}
              title="Solo preview"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
              </svg>
            </button>
          </div>

          {/* Chat toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              showChat ? 'bg-[#9E7FFF]/10 text-[#9E7FFF]' : 'bg-[#262626] text-[#A3A3A3] hover:text-white'
            }`}
            title="Mostrar/ocultar chat"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>

          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-1.5 text-xs text-white bg-[#262626] rounded-lg px-2.5 py-1.5 hover:bg-[#2F2F2F] transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M3 13a2 2 0 00-2 2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2M3 13a2 2 0 002 2h14a2 2 0 002-2" />
              </svg>
              {selectedModel?.name || 'Modelo'}
              <svg className="w-3 h-3 text-[#A3A3A3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showModelDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowModelDropdown(false)} />
                <div className="absolute top-full right-0 mt-1 z-20 w-56 bg-[#262626] rounded-lg ring-1 ring-[#2F2F2F] shadow-xl py-1">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModelId(model.id);
                        setShowModelDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                        model.id === selectedModelId
                          ? 'bg-[#9E7FFF]/10 text-white'
                          : 'text-[#A3A3A3] hover:bg-[#2F2F2F] hover:text-white'
                      }`}
                    >
                      <span>{model.name}</span>
                      {model.badge && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#9E7FFF]/20 text-[#9E7FFF]">
                          {model.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main IDE layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        <div className="w-56 border-r border-[#2F2F2F] bg-[#1E1E1E] flex-shrink-0 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-[#2F2F2F]">
            <span className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wider">Archivos</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileTree
              files={files}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              onDeleteFile={handleDeleteFile}
            />
          </div>
        </div>

        {/* Editor + Preview area */}
        <div className="flex-1 flex overflow-hidden">
          {panelView !== 'preview' && (
            <div className={`${panelView === 'split' ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden border-r border-[#2F2F2F]`}>
              <CodeEditor file={selectedFile} onContentChange={handleContentChange} />
            </div>
          )}

          {panelView !== 'editor' && (
            <div className={`${panelView === 'split' ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden`}>
              <LivePreview files={files} />
            </div>
          )}
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="w-80 border-l border-[#2F2F2F] bg-[#1E1E1E] flex-shrink-0 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-[#2F2F2F]">
              <span className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wider">Chat IA</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.length === 0 && !streamingContent && (
                <div className="flex flex-col items-center justify-center h-full text-center px-2">
                  <svg className="w-10 h-10 text-[#3F3F3F] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-xs text-[#A3A3A3]">
                    Describe el proyecto que quieres crear
                  </p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-[#9E7FFF] text-white'
                        : 'bg-[#262626] text-white ring-1 ring-[#2F2F2F]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}

              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-xl px-3 py-2 bg-[#262626] text-white ring-1 ring-[#2F2F2F]">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">
                      {streamingContent}
                      <span className="inline-block w-1 h-3 bg-[#9E7FFF] ml-0.5 animate-pulse" />
                    </p>
                  </div>
                </div>
              )}

              {isSending && !streamingContent && (
                <div className="flex justify-start">
                  <div className="bg-[#262626] rounded-xl px-3 py-2 ring-1 ring-[#2F2F2F]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-[#9E7FFF] rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[#9E7FFF] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-1.5 h-1.5 bg-[#9E7FFF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div className="px-3 pb-2">
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-xs">
                  {error}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-[#2F2F2F] p-3">
              <form onSubmit={handleSendMessage}>
                <div className="flex items-end gap-2 bg-[#262626] rounded-xl ring-1 ring-[#2F2F2F] p-2 focus-within:ring-[#9E7FFF]/50 transition-all">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe tu proyecto..."
                    disabled={isSending}
                    rows={1}
                    className="flex-1 bg-transparent text-white placeholder-[#A3A3A3] resize-none focus:outline-none disabled:opacity-50 text-xs leading-relaxed"
                    style={{ minHeight: '20px', maxHeight: '80px' }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isSending}
                    className="flex-shrink-0 bg-[#9E7FFF] text-white rounded-lg p-1.5 hover:bg-[#8B6EE6] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Enviar"
                  >
                    {isSending ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import type { AIModel, ChatMessage, ProjectFile } from '~/lib/types';
import { getProjectFiles, deleteProjectFile } from '~/lib/database';

interface ProjectWorkspaceProps {
  projectId: string;
  projectTitle: string;
  initialMessages: ChatMessage[];
  initialFiles: ProjectFile[];
  models: AIModel[];
}

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
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models[0]?.id || ''
  );
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeTab === 'files' && files.length > 0 && !selectedFile) {
      setSelectedFile(files[0]);
    }
  }, [activeTab, files, selectedFile]);

  async function refreshFiles() {
    const freshFiles = await getProjectFiles(projectId);
    setFiles(freshFiles);
    if (freshFiles.length > 0 && !selectedFile) {
      setSelectedFile(freshFiles[0]);
    }
  }

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

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Error al enviar el mensaje.');
        setMessages(messages);
        return;
      }

      const assistantMessage: ChatMessage = data.message;
      setMessages([...optimisticMessages, assistantMessage]);

      if (data.filesGenerated > 0) {
        await refreshFiles();
        setActiveTab('files');
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.');
      setMessages(messages);
    } finally {
      setIsSending(false);
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

  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[#2F2F2F] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white truncate">{projectTitle}</h2>
          {files.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#9E7FFF]/20 text-[#9E7FFF]">
              {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-[#262626] rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'chat'
                  ? 'bg-[#9E7FFF] text-white'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'files'
                  ? 'bg-[#9E7FFF] text-white'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              Archivos
            </button>
          </div>

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

      {/* Content area */}
      {activeTab === 'chat' ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <svg className="w-16 h-16 text-[#3F3F3F] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h3 className="text-xl font-semibold text-white mb-2">Describe tu proyecto</h3>
                <p className="text-[#A3A3A3] max-w-md">
                  Pide algo como "Crea una app de tareas con React" y la IA generara todos los archivos del proyecto.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-[#9E7FFF] text-white rounded-br-sm'
                        : 'bg-[#262626] text-white rounded-bl-sm ring-1 ring-[#2F2F2F]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    {message.timestamp && (
                      <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-[#A3A3A3]'}`}>
                        {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {isSending && (
              <div className="flex justify-start">
                <div className="bg-[#262626] rounded-2xl rounded-bl-sm px-4 py-3 ring-1 ring-[#2F2F2F]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#9E7FFF] rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-[#9E7FFF] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-[#9E7FFF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="px-4 pb-2">
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[#2F2F2F] p-4">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3 bg-[#262626] rounded-2xl ring-1 ring-[#2F2F2F] p-3 focus-within:ring-[#9E7FFF]/50 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe el proyecto que quieres crear..."
                  disabled={isSending}
                  rows={1}
                  className="flex-1 bg-transparent text-white placeholder-[#A3A3A3] resize-none focus:outline-none disabled:opacity-50 text-sm leading-relaxed"
                  style={{ minHeight: '24px', maxHeight: '120px' }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isSending}
                  className="flex-shrink-0 bg-[#9E7FFF] text-white rounded-xl p-2.5 hover:bg-[#8B6EE6] focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Enviar mensaje"
                >
                  {isSending ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        /* Files tab */
        <div className="flex-1 flex overflow-hidden">
          {/* File tree */}
          <div className="w-64 border-r border-[#2F2F2F] overflow-y-auto bg-[#1E1E1E]">
            {files.length === 0 ? (
              <div className="p-4 text-center">
                <svg className="w-10 h-10 text-[#3F3F3F] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-xs text-[#A3A3A3]">No hay archivos generados aun</p>
              </div>
            ) : (
              <ul className="py-2">
                {files.map((file) => (
                  <li key={file.id}>
                    <div
                      className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                        selectedFile?.id === file.id
                          ? 'bg-[#2F2F2F] text-white'
                          : 'text-[#A3A3A3] hover:bg-[#262626] hover:text-white'
                      }`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span className="text-xs truncate flex-1 font-mono">{file.path}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[#A3A3A3] hover:text-red-400 transition-all"
                        aria-label="Eliminar archivo"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* File content viewer */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedFile ? (
              <>
                <div className="border-b border-[#2F2F2F] px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-mono text-[#A3A3A3]">{selectedFile.path}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#262626] text-[#A3A3A3]">
                      {selectedFile.language}
                    </span>
                    <span className="text-xs text-[#A3A3A3]">v{selectedFile.version}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedFile.content);
                      }}
                      className="text-xs text-[#A3A3A3] hover:text-white transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar
                    </button>
                  </div>
                </div>
                <pre className="flex-1 overflow-auto p-4 text-xs text-[#E5E5E5] font-mono leading-relaxed bg-[#171717]">
                  <code>{selectedFile.content}</code>
                </pre>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#A3A3A3] text-sm">
                Selecciona un archivo para ver su contenido
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

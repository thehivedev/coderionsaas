import { useState, useEffect, useRef } from 'react';
import { getChat } from '~/lib/database';
import type { Chat, ChatMessage, Profile } from '~/lib/types';

interface ChatInterfaceProps {
  chatId: string;
  user: { id: string; email: string };
  initialProfile: Profile;
}

export default function ChatInterface({ chatId, user, initialProfile }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(initialProfile.token_balance);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChat();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChat() {
    setIsLoading(true);
    setError(null);
    const chat = await getChat(chatId);
    if (chat) {
      setMessages(chat.messages || []);
    } else {
      setError('No se pudo cargar el chat.');
    }
    setIsLoading(false);
  }

  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending || tokenBalance <= 0) return;

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
          chatId,
          messages: optimisticMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error || 'Error al enviar el mensaje.';
        if (response.status === 402 && data?.tokenBalance !== undefined) {
          setTokenBalance(data.tokenBalance);
        }
        setError(errorMsg);
        setMessages(messages);
        return;
      }

      const assistantMessage: ChatMessage = data.message;
      const finalMessages = [...optimisticMessages, assistantMessage];
      setMessages(finalMessages);

      if (data.tokenBalance !== undefined) {
        setTokenBalance(data.tokenBalance);
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <svg className="w-8 h-8 text-[#9E7FFF] animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  const isOutOfTokens = tokenBalance <= 0;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-16 h-16 text-[#3F3F3F] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">Comienza la conversación</h3>
            <p className="text-[#A3A3A3] max-w-md">
              Envía un mensaje para comenzar a chatear con tu asistente de IA.
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

      {/* Error message */}
      {error && (
        <div className="px-4 pb-2">
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[#2F2F2F] p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3 bg-[#262626] rounded-2xl ring-1 ring-[#2F2F2F] p-3 focus-within:ring-[#9E7FFF]/50 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isOutOfTokens ? 'Sin tokens disponibles. Recarga tu saldo.' : 'Escribe un mensaje...'}
              disabled={isOutOfTokens || isSending}
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-[#A3A3A3] resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm leading-relaxed"
              style={{ minHeight: '24px', maxHeight: '120px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending || isOutOfTokens}
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
          <p className="text-xs text-[#A3A3A3] mt-2 text-center">
            {tokenBalance > 0
              ? `Tokens disponibles: ${tokenBalance.toLocaleString()}`
              : 'Has agotado tus tokens. Recarga para continuar.'}
          </p>
        </form>
      </div>
    </div>
  );
}

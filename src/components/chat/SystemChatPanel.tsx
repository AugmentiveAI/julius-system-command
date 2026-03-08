import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Trash2, Square } from 'lucide-react';
import { ChatMessage, useSystemChat } from '@/hooks/useSystemChat';

interface SystemChatPanelProps {
  buildContext: () => any;
}

function MarkdownContent({ content }: { content: string }) {
  // Lightweight inline markdown: bold, italic, bullets, headers
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-bold text-xs text-primary mt-2">{line.slice(4)}</h4>;
        if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-sm text-primary mt-2">{line.slice(3)}</h3>;
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-sm text-primary mt-2">{line.slice(2)}</h2>;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <p key={i} className="pl-3 text-xs leading-relaxed">• {renderInline(line.slice(2))}</p>;
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i} className="text-xs leading-relaxed">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  // Bold and italic
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-primary font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="text-secondary italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function SystemChatPanel({ buildContext }: SystemChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isStreaming, isLoading, sendMessage, clearChat, stopStreaming } = useSystemChat(buildContext);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    sendMessage(trimmed);
  }, [input, isStreaming, sendMessage]);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, hsl(187 100% 50% / 0.2), hsl(263 91% 66% / 0.2))',
            border: '1px solid hsl(187 100% 50% / 0.4)',
            boxShadow: '0 0 25px hsl(187 100% 50% / 0.3), 0 0 50px hsl(263 91% 66% / 0.15)',
          }}
        >
          <MessageSquare className="w-6 h-6 text-primary" />
          {/* Pulse ring */}
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              border: '1px solid hsl(187 100% 50% / 0.3)',
              animationDuration: '3s',
            }}
          />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            background: 'hsl(240 20% 4% / 0.97)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: 'hsl(187 100% 50% / 0.2)',
              paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(187 100% 50% / 0.2), hsl(263 91% 66% / 0.2))',
                  border: '1px solid hsl(187 100% 50% / 0.3)',
                }}
              >
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">System Interface</p>
                <p className="font-mono text-[9px] text-muted-foreground">
                  {isStreaming ? 'Processing...' : 'Awaiting input'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 space-y-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, hsl(187 100% 50% / 0.1), hsl(263 91% 66% / 0.1))',
                    border: '1px solid hsl(187 100% 50% / 0.2)',
                  }}
                >
                  <MessageSquare className="w-8 h-8 text-primary/50" />
                </div>
                <p className="font-mono text-[10px] tracking-widest text-primary/60 uppercase">System Interface Active</p>
                <p className="font-mono text-xs text-muted-foreground/60 max-w-xs">
                  Ask me anything. Strategy. Tactics. Analysis. What you should focus on. What you're avoiding.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-xs mt-2">
                  {[
                    'What should I focus on today?',
                    'Analyze my weakest areas',
                    'What patterns am I not seeing?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(''); sendMessage(q); }}
                      className="text-left px-3 py-2 rounded-lg font-mono text-[10px] text-muted-foreground/80 transition-all hover:text-primary"
                      style={{
                        border: '1px solid hsl(187 100% 50% / 0.15)',
                        background: 'hsl(187 100% 50% / 0.03)',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2.5 ${
                    msg.role === 'user' ? '' : ''
                  }`}
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'linear-gradient(135deg, hsl(187 100% 50% / 0.15), hsl(263 91% 66% / 0.1))',
                          border: '1px solid hsl(187 100% 50% / 0.25)',
                        }
                      : {
                          background: 'hsl(240 15% 8%)',
                          border: '1px solid hsl(240 15% 15%)',
                        }
                  }
                >
                  {msg.role === 'user' ? (
                    <p className="text-xs font-mono text-foreground/90">{msg.content}</p>
                  ) : (
                    <MarkdownContent content={msg.content} />
                  )}
                </div>
              </div>
            ))}

            {/* Streaming indicator */}
            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    background: 'hsl(240 15% 8%)',
                    border: '1px solid hsl(240 15% 15%)',
                  }}
                >
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div
            className="px-4 py-3 border-t"
            style={{
              borderColor: 'hsl(187 100% 50% / 0.15)',
              paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{
                background: 'hsl(240 15% 8%)',
                border: '1px solid hsl(187 100% 50% / 0.2)',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Talk to the System..."
                className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground/40 outline-none"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    input.trim() ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground/30'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Send, Trash2, Square } from 'lucide-react';
import { ChatMessage, useSystemChat } from '@/hooks/useSystemChat';

interface SystemChatPanelProps {
  buildContext: () => any;
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-bold text-xs text-primary mt-2">{line.slice(4)}</h4>;
        if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-sm text-primary mt-2">{line.slice(3)}</h3>;
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-sm text-primary mt-2">{line.slice(2)}</h2>;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <p key={i} className="pl-3 text-xs leading-relaxed font-mono">• {renderInline(line.slice(2))}</p>;
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i} className="text-xs leading-relaxed font-mono">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    sendMessage(trimmed);
  }, [input, isStreaming, sendMessage]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setIsOpen(false);
  };

  return (
    <>
      {/* Floating terminal button — visible on all screens */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-50 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border border-primary/30 bg-background/90 backdrop-blur-sm"
          style={{ boxShadow: '0 0 15px hsl(263 91% 66% / 0.2)' }}
        >
          <Terminal className="w-5 h-5 text-primary" />
        </button>
      )}

      {/* Half-screen slide-up panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Panel */}
          <div
            className="relative w-full max-h-[60vh] flex flex-col rounded-t-2xl animate-in slide-in-from-bottom duration-300"
            style={{
              background: 'hsl(240 20% 4% / 0.98)',
              borderTop: '1px solid hsl(187 100% 50% / 0.2)',
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
                  SYSTEM INTERFACE
                </span>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button onClick={clearChat} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-[200px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="font-mono text-[10px] tracking-widest text-primary/60 uppercase">Awaiting input</p>
                  <div className="grid gap-2 max-w-xs mx-auto">
                    {['What should I focus on?', 'Analyze my weak points', 'What am I avoiding?'].map(q => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-left px-3 py-2 rounded-lg font-mono text-[10px] text-muted-foreground/80 border border-primary/15 hover:text-primary transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((msg, i) => (
                <div key={i} className="font-mono text-xs leading-relaxed">
                  <span className="text-muted-foreground/60">
                    {msg.role === 'user' ? '> HUNTER: ' : '> SYSTEM: '}
                  </span>
                  {msg.role === 'user' ? (
                    <span className="text-foreground/90">{msg.content}</span>
                  ) : (
                    <MarkdownContent content={msg.content} />
                  )}
                </div>
              ))}

              {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="font-mono text-xs text-muted-foreground/60">
                  > SYSTEM: <span className="animate-pulse">▊</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div
              className="px-4 py-3 border-t border-primary/10"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/20 border border-primary/15">
                <span className="font-mono text-[10px] text-primary/40 shrink-0">{'>'}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                  placeholder="..."
                  className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground/30 outline-none"
                  disabled={isStreaming}
                />
                {isStreaming ? (
                  <button onClick={stopStreaming} className="p-1 text-destructive">
                    <Square className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className={`p-1 ${input.trim() ? 'text-primary' : 'text-muted-foreground/20'}`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

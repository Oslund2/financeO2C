import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Send, X, Minimize2, Maximize2,
  Sparkles, Loader2, Bot, User, Trash2, AlertCircle,
} from 'lucide-react';
import { ChatMessage, sendChatMessage } from '../lib/claude';

interface AIChatbotProps {
  context?: string;
}

const SUGGESTED_QUESTIONS = [
  "What's the biggest time savings opportunity in our O2C workflow?",
  "How does AI cash application matching work?",
  "What are the risks of automating dispute resolution?",
  "Draft a phased rollout plan for our finance meeting",
  "How do we maintain data fidelity with AI automation?",
  "Explain how collections outreach automation works",
];

export function AIChatbot({ context }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    if (!message || loading) return;

    setInput('');
    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: message };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await sendChatMessage(newMessages, context);
      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-brand-600 text-white rounded-full
                   shadow-lg hover:bg-brand-700 hover:shadow-xl transition-all
                   flex items-center justify-center group"
        title="AI Assistant"
      >
        <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-6 right-6 z-40 bg-brand-600 text-white rounded-full
                   shadow-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-brand-700 transition-colors"
        onClick={() => setIsMinimized(false)}
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-sm font-medium">AI Assistant</span>
        {messages.length > 0 && (
          <span className="bg-white text-brand-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {messages.filter(m => m.role === 'assistant').length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 max-h-[600px] bg-white rounded-xl shadow-2xl border border-surface-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold text-sm">O2C AI Assistant</span>
          <span className="text-xs opacity-75">Claude</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={clearChat} className="p-1 hover:bg-white/20 rounded" title="Clear chat">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/20 rounded" title="Minimize">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-brand-600" />
              </div>
              <div className="bg-surface-50 rounded-lg p-3 text-sm text-surface-700">
                I'm your O2C automation assistant. Ask me about workflow optimization,
                time savings estimates, dispute resolution, collections strategies, or
                anything related to your Orders-to-Cash process.
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-surface-400 font-medium">Try asking:</p>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-surface-200
                           text-surface-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700
                           transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-surface-200' : 'bg-brand-100'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-surface-600" />
                : <Bot className="w-4 h-4 text-brand-600" />
              }
            </div>
            <div className={`rounded-lg p-3 text-sm max-w-[80%] ${
              msg.role === 'user'
                ? 'bg-brand-600 text-white'
                : 'bg-surface-50 text-surface-700'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-brand-600" />
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-surface-200">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="input flex-1 text-sm"
            placeholder="Ask about O2C automation..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="btn-primary px-3 disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

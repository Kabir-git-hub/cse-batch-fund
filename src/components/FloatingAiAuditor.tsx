import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Loader2, User, RefreshCw, X, MessageSquare, ChevronDown, Minimize2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const FloatingAiAuditor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'আসসালামু আলাইকুম! আমি **SEC CSE Batch-17 Fund AI Auditor**। ফান্ড সম্পর্কিত যেকোনো তথ্য (বর্তমান ব্যালেন্স, মোট জমা, বকেয়া বা খরচের ভাউচার) জানতে আমাকে প্রশ্ন করতে পারো।',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const presetQuestions = [
    'বর্তমান ব্যালেন্স ও মোট কত টাকা জমা আছে?',
    'কার কার বকেয়া বেশি আছে?',
    'ইভেন্ট বা আইফতার খরচের হিসাব দাও',
    'ফান্ডের সার্বিক সামারি রিপোর্ট দাও',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (userPrompt?: string) => {
    const promptToSend = userPrompt || query;
    if (!promptToSend.trim() || loading) return;

    const userMsg: Message = {
      sender: 'user',
      text: promptToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!userPrompt) setQuery('');
    setLoading(true);

    try {
      const response = await fetch(`/api/fund/ai-query?t=${new Date().getTime()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: promptToSend }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to query AI');
      }

      const aiMsg: Message = {
        sender: 'ai',
        text: data.answer || 'No response received from AI.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ **AI Error:** ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) - Compact Circular on all screens */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-emerald-500/30 cursor-pointer"
            aria-label="Open Fund AI Auditor Chatbot"
            title="Fund AI Auditor (Ask Questions)"
          >
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>
          </button>
        )}
      </div>

      {/* Floating Chatbot Popup Window */}
      {isOpen && (
        <div className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 z-50 w-[94vw] sm:w-[440px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-xs sm:text-sm flex items-center gap-1.5 text-white">
                  Fund AI Auditor <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h3>
                <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Gemini Intelligent Batch Assistant
                </p>
              </div>
            </div>

            {/* Header controls: Reset and Close */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      sender: 'ai',
                      text: 'আসসালামু আলাইকুম! আমি **SEC CSE Batch-17 Fund AI Auditor**। ফান্ড সম্পর্কিত যেকোনো তথ্য জানতে প্রশ্ন করুন।',
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                title="Minimize chatbot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 max-w-[88%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-900 text-emerald-400 shadow-2xs'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`p-3 rounded-2xl text-xs sm:text-[13px] border transition-all ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 border-emerald-600 text-white rounded-tr-xs'
                      : 'bg-white border-slate-200/80 text-slate-800 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  <div className="markdown-body leading-relaxed font-medium">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                  <div
                    className={`text-[9px] mt-1 font-mono text-right ${
                      msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-2xl border border-emerald-200/80 w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Auditing live fund records...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Ask Suggestion Chips */}
          <div className="p-2.5 bg-slate-100/90 border-t border-slate-200/70 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Quick:
            </span>
            {presetQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                disabled={loading}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200/80 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200/80 whitespace-nowrap transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-2.5 bg-white border-t border-slate-200/80 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about batch funds, dues, or expenses..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-40 shrink-0 shadow-xs cursor-pointer flex items-center justify-center gap-1 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask</span>
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
};

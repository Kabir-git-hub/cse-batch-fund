import React, { useState } from 'react';
import { Bot, Send, Sparkles, Loader2, User, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const AiAssistantView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'আসসালামু আলাইকুম! আমি **SEC CSE Batch-17 Fund AI Auditor**। ফান্ড সম্পর্কিত যেকোনো হিসাব যেমন—মোট জমা, বর্তমান ব্যালেন্স, বকেয়ার তালিকা বা খরচের খাত জানতে আমাকে প্রশ্ন করতে পারো।',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const presetQuestions = [
    'বর্তমান মোট ফান্ডে কত টাকা জমা ও কতো ব্যালেন্স আছে?',
    'কার কার বকেয়া ৩ মাসের বেশি আছে লিস্ট দাও',
    'ইভেন্ট ও আইফতার পার্টির খরচ কত হয়েছে?',
    'SEC CSE Batch-17 এর ফান্ডের সামারি দাও',
  ];

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
      const response = await fetch('/api/fund/ai-query', {
        method: 'POST',
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[620px]">
      
      {/* Header */}
      <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm flex items-center gap-2">
              SEC CSE Batch-17 Fund AI Auditor <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Powered by Gemini AI • Real-time Financial Analysis</p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                sender: 'ai',
                text: 'আসসালামু আলাইকুম! আমি **SEC CSE Batch-17 Fund AI Auditor**। ফান্ড সম্পর্কিত যেকোনো তথ্য জানতে প্রশ্ন করুন।',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
          className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
          title="Reset Conversation"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/40">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 max-w-[85%] ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-900 text-emerald-400 shadow-2xs'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-3.5 rounded-2xl text-xs sm:text-sm border transition-all ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 border-emerald-600 text-white rounded-tr-xs'
                  : 'bg-white border-slate-200/80 text-slate-800 rounded-tl-xs shadow-2xs'
              }`}
            >
              <div className="markdown-body leading-relaxed font-medium">
                <Markdown>{msg.text}</Markdown>
              </div>
              <div
                className={`text-[10px] mt-1.5 font-mono text-right ${
                  msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                }`}
              >
                {msg.time}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-2xl border border-emerald-200/80 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Analyzing real-time batch fund database...
          </div>
        )}
      </div>

      {/* Preset Suggested Questions */}
      <div className="p-3 bg-slate-100/80 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick Ask:
        </span>
        {presetQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200/80 text-slate-700 rounded-xl text-xs font-bold border border-slate-200/80 whitespace-nowrap transition-all shrink-0 cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div className="p-3 bg-white border-t border-slate-200/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask AI about SEC CSE Batch-17 fund balance, dues, or expenses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 shrink-0 shadow-xs cursor-pointer flex items-center justify-center gap-1.5 text-xs"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

    </div>
  );
};


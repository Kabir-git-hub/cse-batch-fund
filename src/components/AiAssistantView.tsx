import React, { useState } from 'react';
import { Bot, Send, Sparkles, MessageSquare, Loader2, User, RefreshCw } from 'lucide-react';
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
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-[600px]">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm flex items-center gap-2">
              SEC CSE Batch-17 Fund AI Auditor <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h2>
            <p className="text-[11px] text-slate-400">Powered by Gemini AI • Real-time Financial Analysis</p>
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
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs transition"
          title="Reset Conversation"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 max-w-[85%] ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-purple-600 text-white'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-3.5 rounded-2xl text-xs sm:text-sm shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              }`}
            >
              <div className="markdown-body leading-relaxed">
                <Markdown>{msg.text}</Markdown>
              </div>
              <div
                className={`text-[10px] mt-1.5 text-right ${
                  msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                }`}
              >
                {msg.time}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 p-3 rounded-xl border border-purple-100 w-fit">
            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing real-time batch fund database...
          </div>
        )}
      </div>

      {/* Preset Suggested Questions */}
      <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Quick Ask:
        </span>
        {presetQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="px-3 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium border border-slate-200 whitespace-nowrap transition shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div className="p-3 bg-white border-t border-slate-200">
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
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition disabled:opacity-50 shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};

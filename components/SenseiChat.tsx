
import React, { useState, useRef, useEffect } from 'react';
import * as gemini from '../services/geminiService';

const SenseiChat: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Hello. I am the AcademiSync AI Assistant. How can I help you with your studies or curriculum today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const response = await gemini.askSenseiQuestion(userMsg, messages);
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: "An error occurred. Please retry your inquiry." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[70vh] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl">
      <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl">🤖</div>
          <div>
            <h2 className="font-bold text-base">AcademiSync AI</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Academic Intelligence Agent</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-[9px] tracking-widest font-black uppercase border border-green-500/30">System Active</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-5 rounded-2xl shadow-sm border ${
              msg.role === 'user' ? 'bg-blue-600 text-white border-blue-700 rounded-tr-none' : 'bg-white border-slate-200 text-slate-800 rounded-tl-none font-medium'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl animate-pulse flex gap-1.5 items-center shadow-sm">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-200">
        <div className="relative flex items-center gap-3">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Input inquiry..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium" />
          <button onClick={handleSend} disabled={loading} className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SenseiChat;

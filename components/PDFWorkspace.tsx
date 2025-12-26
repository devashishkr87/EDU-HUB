
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AcademicMaterial, Flashcard, QuizQuestion } from '../types';
import * as gemini from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';
import Fuse from 'fuse.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

interface PDFWorkspaceProps {
  material: AcademicMaterial;
  onClose: () => void;
}

interface SearchResult {
  text: string;
  page: number;
  score?: number;
  matches?: any[];
}

const PDFWorkspace: React.FC<PDFWorkspaceProps> = ({ material, onClose }) => {
  const [activeTool, setActiveTool] = useState<'intro' | 'description' | 'flashcards' | 'quiz' | 'chat' | 'search'>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [fullTextLines, setFullTextLines] = useState<{ text: string; page: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Focus Timer Logic
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let currentBlobUrl = '';
    if (material.fileUrl.startsWith('data:')) {
      const fetchPdf = async () => {
        const response = await fetch(material.fileUrl);
        const blob = await response.blob();
        currentBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(currentBlobUrl);
      };
      fetchPdf();
    } else {
      setBlobUrl(material.fileUrl);
    }
    return () => {
      if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [material.fileUrl]);

  useEffect(() => {
    const extractText = async (dataUrl: string) => {
      try {
        const loadingTask = pdfjsLib.getDocument(dataUrl);
        const pdf = await loadingTask.promise;
        const linesWithContext: { text: string; page: number }[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          const sentences = pageText.split(/[.!?]\s+/);
          sentences.forEach(s => {
            if (s.trim().length > 10) linesWithContext.push({ text: s.trim(), page: i });
          });
        }
        setFullTextLines(linesWithContext);
      } catch (err) {
        console.error("Extraction error:", err);
      }
    };

    if (material.fileUrl.startsWith('data:')) {
      const base64Parts = material.fileUrl.split(',');
      if (base64Parts.length > 1) {
        setPdfBase64(base64Parts[1]);
        extractText(material.fileUrl);
      }
    }
  }, [material]);

  const fuse = useMemo(() => {
    return new Fuse(fullTextLines, {
      keys: ['text'],
      includeScore: true,
      includeMatches: true,
      threshold: 0.35, 
    });
  }, [fullTextLines]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim() || fullTextLines.length === 0) {
      setSearchResults([]);
      return;
    }
    const results = fuse.search(term);
    setSearchResults(results.map(r => ({
      text: r.item.text,
      page: r.item.page,
      score: r.score,
      matches: r.matches
    })).slice(0, 15));
  };

  const handleAction = async (tool: typeof activeTool) => {
    if (!pdfBase64) return;
    setActiveTool(tool);
    if (tool === 'search') return;
    setIsLoading(true);
    setResult(null);
    try {
      switch (tool) {
        case 'intro': setResult(await gemini.getBriefIntro(pdfBase64)); break;
        case 'description': setResult(await gemini.getBriefDescription(pdfBase64)); break;
        case 'flashcards': setResult(await gemini.generateFlashcards(pdfBase64)); break;
        case 'quiz': setResult(await gemini.generateQuiz(pdfBase64)); break;
      }
    } catch (e) {
      setResult("Internal AI error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isLoading) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatLog(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);
    try {
      const response = await gemini.askPdfQuestion(pdfBase64, userMsg, chatLog);
      setChatLog(prev => [...prev, { role: 'bot', text: response }]);
    } catch (e) {
      setChatLog(prev => [...prev, { role: 'bot', text: "Service temporarily unavailable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = { title: material.title, text: `Review: ${material.title}`, url: window.location.href };
    if (navigator.share) await navigator.share(shareData);
    else alert("Link copied to clipboard.");
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = material.fileUrl;
    link.download = material.fileName || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col md:flex-row overflow-hidden">
      {/* PDF Side */}
      <div className="w-full md:w-1/2 h-64 md:h-full bg-slate-50 flex flex-col relative border-r border-slate-200">
        <div className="absolute top-4 left-4 z-30 flex gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-bold shadow-sm hover:bg-slate-50">Back</button>
          <button onClick={handleDownload} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2">
            <span>📥</span> Download
          </button>
          <button onClick={handleShare} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700">Share</button>
        </div>
        
        {/* Modern Productivity Tracker */}
        <div className="absolute top-4 right-4 z-30">
          <div className={`bg-white border border-slate-200 p-4 rounded-2xl shadow-lg flex items-center gap-4 transition-all duration-300 ${isActive ? 'ring-2 ring-blue-500 shadow-blue-100' : ''}`}>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Focus Session</span>
              <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">{formatTime(seconds)}</span>
            </div>
            <button 
              onClick={() => setIsActive(!isActive)} 
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                isActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isActive ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button 
              onClick={() => { setIsActive(false); setSeconds(0); }} 
              className="text-[9px] font-bold text-slate-300 hover:text-red-500 uppercase tracking-widest ml-2"
              title="Reset Timer"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex-1 w-full h-full">
           {blobUrl ? <iframe src={`${blobUrl}#page=${currentPage}`} className="w-full h-full border-none" title={material.title} /> : <div className="flex items-center justify-center h-full">Loading Document...</div>}
        </div>
      </div>

      {/* AI Panel */}
      <div className="w-full md:w-1/2 h-full flex flex-col bg-white">
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          <TabBtn active={activeTool === 'intro'} onClick={() => handleAction('intro')} label="Summary" icon="📝" />
          <TabBtn active={activeTool === 'description'} onClick={() => handleAction('description')} label="Outline" icon="📊" />
          <TabBtn active={activeTool === 'flashcards'} onClick={() => handleAction('flashcards')} label="Flashcards" icon="🗂️" />
          <TabBtn active={activeTool === 'quiz'} onClick={() => handleAction('quiz')} label="Assessment" icon="✅" />
          <TabBtn active={activeTool === 'search'} onClick={() => handleAction('search')} label="Deep Search" icon="🔍" />
          <TabBtn active={activeTool === 'chat'} onClick={() => setActiveTool('chat')} label="AI Chat" icon="💬" />
        </div>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 font-bold text-slate-400 text-xs uppercase tracking-widest">AI Processing...</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-8">
              {activeTool === 'search' && (
                <div className="space-y-6">
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Document Intelligence Search</h3>
                     <input type="text" placeholder="Search keywords..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                   </div>
                   <div className="space-y-4">
                     {searchResults.map((res, i) => (
                       <div key={i} className="p-5 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all group">
                          <div className="flex justify-between mb-2">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Page {res.page}</span>
                            <button onClick={() => setCurrentPage(res.page)} className="text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase">View Page</button>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed italic">"...{res.text}..."</p>
                       </div>
                     ))}
                   </div>
                </div>
              )}
              {activeTool === 'intro' && (
                <div className="bg-blue-50/30 p-10 rounded-3xl border border-blue-100">
                   <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">Executive Summary</h3>
                   <p className="text-slate-800 text-lg font-semibold leading-relaxed">{result || "Request a summary to generate content."}</p>
                </div>
              )}
              {activeTool === 'description' && (
                <div className="bg-slate-50 p-10 rounded-3xl border border-slate-200">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Content Breakdown</h3>
                   <div className="text-slate-700 space-y-4 leading-relaxed whitespace-pre-wrap">{result || "Request an outline to visualize document structure."}</div>
                </div>
              )}
              {activeTool === 'flashcards' && (
                <div className="grid gap-6">
                  {result?.map((card: any, idx: number) => <FlashcardView key={idx} card={card} />)}
                  {!result && <p className="text-center text-slate-400 py-10">Click the tool button to generate cards.</p>}
                </div>
              )}
              {activeTool === 'quiz' && (
                <div className="space-y-8">
                  {result?.map((q: any, idx: number) => <QuizQuestionView key={idx} question={q} index={idx} />)}
                  {!result && <p className="text-center text-slate-400 py-10">Click the tool button to generate an assessment.</p>}
                </div>
              )}
              {activeTool === 'chat' && (
                <div className="flex flex-col h-[calc(100vh-280px)]">
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                    {chatLog.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{msg.text}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()} placeholder="Ask the AI Assistant..." className="flex-1 bg-transparent px-4 py-2 outline-none text-sm" />
                    <button onClick={sendChatMessage} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">Send</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${active ? 'bg-white border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-400 hover:bg-slate-100'}`}>
    <span className="text-lg">{icon}</span>
    <span className="text-xs uppercase tracking-widest">{label}</span>
  </button>
);

const FlashcardView = ({ card }: { card: Flashcard }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <div onClick={() => setFlipped(!flipped)} className="relative h-48 cursor-pointer perspective-1000">
      <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
        <div className="absolute inset-0 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-8 backface-hidden shadow-sm">
          <p className="text-center font-bold text-slate-800 text-lg">{card.question}</p>
        </div>
        <div className="absolute inset-0 bg-blue-600 text-white rounded-2xl flex items-center justify-center p-8 rotate-y-180 backface-hidden shadow-lg">
          <p className="text-center italic">{card.answer}</p>
        </div>
      </div>
    </div>
  );
};

const QuizQuestionView = ({ question, index }: { question: QuizQuestion; index: number }) => {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
      <span className="text-[10px] font-bold text-slate-400 uppercase mb-4 block">Question {index + 1}</span>
      <p className="font-bold text-slate-900 text-lg mb-6 leading-tight">{question.question}</p>
      <div className="space-y-3">
        {question.options.map((opt, i) => (
          <button key={i} onClick={() => setSelected(i)} className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-medium text-sm ${selected === i ? (i === question.correctAnswer ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700') : 'bg-slate-50 border-transparent hover:border-slate-300'}`}>
            {opt}
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className="mt-6 p-4 bg-slate-50 rounded-xl text-xs text-slate-600 italic border-l-4 border-blue-600">
          <p className="font-bold text-slate-900 uppercase tracking-widest text-[9px] mb-2">Explanation</p>
          {question.explanation}
        </div>
      )}
    </div>
  );
};

export default PDFWorkspace;

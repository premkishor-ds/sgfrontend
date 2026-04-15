"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Source {
  content: string;
  metadata: {
    original_title: string;
    source: string;
  };
}

interface Message {
  query: string;
  answer: string;
  sources: Source[];
  followup: string[];
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the LATEST query bubble
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = document.getElementById(`message-${messages.length - 1}`);
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [messages]);

  const cleanSourceContent = (content: string) => {
    if (!content) return "";
    let cleaned = content;
    const tags = ["filename:", "title:", "description:", "metadata:", "content:", "heading:"];
    tags.forEach(tag => {
      if (cleaned.toLowerCase().startsWith(tag)) cleaned = cleaned.substring(tag.length);
    });
    cleaned = cleaned.replace(/\\n/g, "\n").trim();
    return cleaned.length > 200 ? cleaned.substring(0, 200) + "..." : cleaned;
  };

  const resetSearch = () => {
    setMessages([]);
    setQuery("");
  };

  const handleSearch = async (e?: React.FormEvent, forcedQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = forcedQuery || query;
    if (!activeQuery.trim()) return;

    setLoading(true);
    setQuery("");

    try {
      const response = await fetch("http://localhost:3001/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: activeQuery }),
      });
      if (!response.ok) throw new Error("Erreur serveur");
      const data = await response.json();
      
      setMessages((prev) => [...prev, {
        query: activeQuery,
        answer: data.answer || "Désolé, je n'ai pas pu générer de réponse.",
        sources: data.sources || [],
        followup: data.followup || []
      }]);
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copié dans le presse-papier !");
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex flex-col font-sans text-gray-800">
      {/* Dynamic Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 py-4">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="flex flex-col border-l-4 border-[#C8102E] pl-4">
                <span className="text-[#253662] font-black text-xl uppercase italic">
                  France <span className="text-[#C8102E] not-italic">Pare-Brise</span>
                </span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  Trusted Knowledge Source
                </span>
             </div>
          </div>
          {messages.length > 0 && (
            <button 
              onClick={resetSearch}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-[11px] font-bold text-gray-600 hover:bg-gray-100 transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              NEW SEARCH
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col">
        {/* Landing Hero */}
        {messages.length === 0 && !loading && (
          <section className="mt-20 text-center animate-slide-up">
            <div className="mb-10 inline-flex items-center justify-center w-16 h-16 bg-[#253662] rounded-2xl shadow-lg">
               <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
            </div>
            <h2 className="text-3xl font-bold text-[#253662] mb-4">France Pare-Brise Assistant</h2>
            <p className="text-gray-500 max-w-lg mx-auto mb-10 font-medium">
              Posez une question sur le vitrage automobile pour obtenir une réponse basée sur nos sources officielles.
            </p>
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-16">
              <div className="flex bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 overflow-hidden focus-within:ring-2 focus-within:ring-[#C8102E]/20 transition-all">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Posez une question..."
                  className="flex-1 px-8 py-5 outline-none text-lg text-[#253662] font-medium"
                />
                <button type="submit" className="bg-[#C8102E] text-white px-10 font-bold uppercase rounded-xl hover:bg-[#a50d26] transition-all">
                  Démarrer
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Conversation Area */}
        <div className="space-y-16 pb-40">
          {messages.map((msg, idx) => (
            <div key={idx} id={`message-${idx}`} className="space-y-8 animate-slide-up scroll-mt-28">
              {/* User Query Bubble (Right Aligned) */}
              <div className="flex justify-end">
                <div className="bg-[#253662] text-white px-8 py-4 rounded-2xl shadow-xl max-w-[70%]">
                  <p className="text-lg font-bold">{msg.query}</p>
                </div>
              </div>

              {/* AI Response Card */}
              <div className="bg-[#F8F9FA] rounded-[32px] border border-gray-100 p-10 relative shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-2 h-2 bg-[#C8102E] rounded-full"></div>
                  <span className="text-gray-400 font-bold uppercase text-[10px] tracking-tight">Expert France Pare-Brise</span>
                </div>
                
                <button 
                  onClick={() => copyToClipboard(msg.answer)}
                  className="absolute right-8 top-8 w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#253662] hover:shadow-md transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 8h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                </button>
                
                <div className="text-[17px] leading-[1.8] text-gray-700 expert-answer">
                  <ReactMarkdown>{msg.answer}</ReactMarkdown>
                </div>

                {/* Verified Sources */}
                {msg.sources.length > 0 && (
                  <div className="mt-16">
                    <div className="flex items-center gap-4 mb-8">
                       <div className="h-[1px] flex-1 bg-gray-200"></div>
                       <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Verified Sources</span>
                       <div className="h-[1px] flex-1 bg-gray-200"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {msg.sources.map((s, si) => (
                        <div key={si} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                             <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider">Document</span>
                             <span className="text-[9px] font-bold text-gray-300">#{si + 1}</span>
                          </div>
                          <p className="text-xs text-gray-500 font-medium leading-relaxed mb-1 capitalize">{s.metadata.original_title}</p>
                          <p className="text-xs text-gray-400 italic">"{cleanSourceContent(s.content)}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Follow-up Questions - back inside for better layout safety */}
                {msg.followup && msg.followup.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-gray-100">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Questions suggérées</p>
                    <div className="flex flex-wrap gap-3">
                      {msg.followup.map((fQ, fIdx) => (
                        <button 
                          key={fIdx} 
                          onClick={() => handleSearch(undefined, fQ)}
                          className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#253662] hover:border-[#C8102E] hover:text-[#C8102E] shadow-sm transition-all"
                        >
                          {fQ}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-4 animate-pulse pt-8">
              <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
              <div className="flex-1 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed BOTTOM Search Bar - specifically requested to move back */}
      {(messages.length > 0 || loading) && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#F4F7F9] via-[#F4F7F9] to-transparent z-40">
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
            <div className="flex bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 p-2 overflow-hidden">
              <input
                type="text"
                disabled={loading}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Posez une question de suivi..."
                className="flex-1 px-8 py-4 outline-none text-[#253662] font-medium"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="bg-[#253662] text-white w-14 h-14 rounded-xl flex items-center justify-center hover:bg-black transition-all disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

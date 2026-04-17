"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const [placeholder, setPlaceholder] = useState("");
  const typingSpeed = 100;
  const deletingSpeed = 50;
  const pauseTime = 2000;
  
  const exampleQueries = [
    "Comment réparer un impact ?",
    "Ma franchise est-elle remboursée ?",
    "Où est le centre le plus proche ?",
    "Prendre un rendez-vous en ligne",
    "Prise en charge par l'assurance ?"
  ];

  const [exampleIndex, setExampleIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentFullText = exampleQueries[exampleIndex];
    
    const handleTyping = () => {
      if (!isDeleting) {
        if (charIndex < currentFullText.length) {
          setPlaceholder(currentFullText.substring(0, charIndex + 1));
          setCharIndex(prev => prev + 1);
        } else {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        if (charIndex > 0) {
          setPlaceholder(currentFullText.substring(0, charIndex - 1));
          setCharIndex(prev => prev - 1);
        } else {
          setIsDeleting(false);
          setExampleIndex((prev) => (prev + 1) % exampleQueries.length);
        }
      }
    };

    const timer = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, exampleIndex]);

  // Fetch suggestions from backend on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`${API_URL}/suggestions`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        } else {
          console.error("Failed to fetch suggestions:", response.status);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    };
    fetchSuggestions();
  }, []);

  // Auto-scroll to the LATEST query bubble or loading state
  useEffect(() => {
    if (loading && loadingRef.current) {
      loadingRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (messages.length > 0) {
      const lastMessage = document.getElementById(`message-${messages.length - 1}`);
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [messages, loading]);

  const cleanSourceContent = (content: string) => {
    if (!content) return "";
    let cleaned = content;
    
    // Remove technical markers and JSON fragments
    cleaned = cleaned.replace(/['"{}[\],]/g, ' '); 
    cleaned = cleaned.replace(/[a-zA-Z0-9_-]+:\s*/g, ' '); // Remove keys like "title: "
    cleaned = cleaned.replace(/\s+/g, ' ').trim(); // Collapse whitespace

    // Remove repeated headers that often appear in data dumps
    const boilerplate = ["France Pare-Brise", "document", "content", "metadata", "title"];
    boilerplate.forEach(word => {
        const regex = new RegExp(`^${word}`, 'i');
        cleaned = cleaned.replace(regex, '').trim();
    });

    return cleaned.length > 180 ? cleaned.substring(0, 180) + "..." : cleaned;
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
      const response = await fetch(`${API_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: activeQuery }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      
      setMessages((prev) => [...prev, {
        query: activeQuery,
        answer: data.answer || "Désolé, je n'ai pas pu générer de réponse.",
        sources: data.sources || [],
        followup: data.followup || []
      }]);
    } catch (err: any) {
      console.error("Search error:", err);
      alert(err.message || "Une erreur est survenue.");
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
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 py-4">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="h-10 w-auto flex items-center">
              <img src="/logo.svg" alt="France Pare-Brise" className="h-full w-auto" />
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
        {messages.length === 0 && !loading && (
          <section className="mt-20 text-center">
            <div className="mb-10 inline-flex items-center justify-center w-16 h-16 bg-[#253662] rounded-2xl shadow-lg">
               <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
            </div>
            <h2 className="text-3xl font-bold text-[#253662] mb-4">France Pare-Brise Assistant</h2>
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-16">
              <div className="flex bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 overflow-hidden">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 px-8 py-5 outline-none text-lg text-[#253662]"
                />
                <button type="submit" className="bg-[#253662] text-white px-10 font-bold uppercase rounded-xl hover:bg-black">
                  Démarrer
                </button>
              </div>
            </form>
            {suggestions.length > 0 && (
              <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-3">
                {suggestions.map((q, idx) => (
                  <button key={idx} onClick={() => handleSearch(undefined, q)} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:border-[#253662]">{q}</button>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="space-y-16 pb-40">
          {messages.map((msg, idx) => (
            <div key={idx} id={`message-${idx}`} className="space-y-8">
              <div className="flex justify-end">
                <div className="bg-[#253662] text-white px-8 py-4 rounded-2xl shadow-xl max-w-[70%]">
                  <p className="text-lg font-bold">{msg.query}</p>
                </div>
              </div>
              <div className="bg-white rounded-[32px] border border-gray-100 p-10 relative shadow-sm">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-2 h-2 bg-[#253662] rounded-full"></div>
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Expert France Pare-Brise</span>
                </div>
                <div className="text-[17px] leading-[1.8] text-gray-700">
                  <ReactMarkdown>{msg.answer}</ReactMarkdown>
                </div>
                {msg.sources.length > 0 && (
                  <div className="mt-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {msg.sources.filter((s, i, self) => i === self.findIndex(t => t.content === s.content)).slice(0, 4).map((s, si) => (
                        <div key={si} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                          <p className="text-[11px] text-[#253662] font-black uppercase mb-2">{s.metadata.original_title}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-3 italic">"{cleanSourceContent(s.content)}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {msg.followup && msg.followup.length > 0 && (
                  <div className="mt-12 flex flex-wrap gap-3">
                    {msg.followup.map((fQ, fIdx) => (
                      <button key={fIdx} disabled={loading} onClick={() => handleSearch(undefined, fQ)} className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#253662] hover:border-[#253662]">{fQ}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div ref={loadingRef} className="flex items-start gap-6 py-12 animate-pulse">
              <div className="w-12 h-12 bg-[#253662] rounded-2xl flex items-center justify-center">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
              <div className="flex-1 space-y-4 pt-1">
                <span className="text-[#253662] font-black uppercase text-[10px]">Réflexion en cours...</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {(messages.length > 0 || loading) && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#F4F7F9] to-transparent">
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
            <div className="flex bg-white rounded-2xl shadow-2xl border border-gray-100 p-2">
              <input
                type="text"
                disabled={loading}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-8 py-4 outline-none text-[#253662]"
              />
              <button type="submit" disabled={loading} className="bg-[#253662] text-white w-14 h-14 rounded-xl flex items-center justify-center hover:bg-black">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

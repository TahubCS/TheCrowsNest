"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function AITutorPage({ params: _ }: { params: Promise<{ classId: string }> }) {
  const params = useParams();
  const classId = params.classId as string;
  const formattedClass = classId?.toUpperCase() || "CLASS";

  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<{ role: "student" | "tutor"; text: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent, presetMessage?: string) => {
    e?.preventDefault();
    const textToSend = presetMessage || message;
    if (!textToSend.trim()) return;
    
    const updatedMessages = [...messages, { role: "student" as const, text: textToSend }];
    setMessages(updatedMessages);
    setMessage("");
    setIsTyping(true);
    
    try {
      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, question: textToSend })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setMessages([...updatedMessages, { role: "tutor" as const, text: data.data.answer }]);
      } else {
        setMessages([...updatedMessages, { role: "tutor" as const, text: data.message || "I encountered an error retrieving that information." }]);
      }
    } catch (error) {
      console.error(error);
      setMessages([...updatedMessages, { role: "tutor" as const, text: "A network error occurred while contacting the Knowledge Base." }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="mb-6 shrink-0">
        <Link href={`/dashboard/classes/${classId}`} className="text-sm font-medium text-muted-foreground hover:text-blue-500 inline-flex items-center gap-1 mb-2 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Overview
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center gap-3">
              <span className="text-4xl">🤖</span> AI Study Tutor
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Your 24/7 personal assistant trained exclusively on {formattedClass} materials.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-500 text-xs font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            ONLINE & READY
          </div>
        </div>
      </div>

      {/* Main Chat Area - Full Width */}
      <div className="flex-1 flex flex-col bg-background/80 backdrop-blur-xl border border-border rounded-3xl shadow-lg overflow-hidden relative group min-h-0">
        
        {/* Subtle animated background glow */}
        <div className="absolute top-0 right-0 -m-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -m-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Chat History Area (Empty State) */}
        <div className="flex-1 overflow-y-auto p-6 z-10 flex flex-col justify-center items-center text-center">
          {messages.length === 0 ? (
            <div className="max-w-md space-y-6">
              <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/20 transform -rotate-6">
                <span className="text-5xl drop-shadow-md">🤖</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">How can I help you today?</h2>
                <p className="text-muted-foreground mt-2">
                  I'm fully caught up on everything uploaded for {formattedClass}. Ask me to explain a confusing concept, summarize a lecture, or walk you through a practice problem.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-2 text-left mt-8">
                <button onClick={() => handleSend(undefined, "Can you explain the main concepts we've covered so far?")} className="bg-muted/40 hover:bg-muted/80 border border-border/50 p-4 rounded-xl text-sm text-foreground transition-all hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 group/btn">
                  <span className="text-blue-500 font-bold mr-2 group-hover/btn:mr-3 transition-all">→</span>
                  Can you explain the main concepts we've covered so far?
                </button>
                <button onClick={() => handleSend(undefined, "I'm confused about the recent lecture notes. Can we review them together?")} className="bg-muted/40 hover:bg-muted/80 border border-border/50 p-4 rounded-xl text-sm text-foreground transition-all hover:border-cyan-500/50 hover:shadow-md hover:-translate-y-0.5 group/btn">
                  <span className="text-cyan-500 font-bold mr-2 group-hover/btn:mr-3 transition-all">→</span>
                  I'm confused about the recent lecture notes. Can we review them together?
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col space-y-6 pb-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-3xl p-5 shadow-sm ${msg.role === "student" ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-br-sm" : "bg-muted/60 border border-border text-foreground rounded-bl-sm text-left"}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted/60 border border-border rounded-3xl rounded-bl-sm p-5 shadow-sm flex gap-1.5 items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce delay-75"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-150"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background/95 border-t border-border z-10">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask your tutor anything..."
              className="w-full bg-muted/50 border border-muted-foreground/20 rounded-2xl py-4 pl-6 pr-16 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!message.trim() || isTyping}
              className="absolute right-2 shrink-0 bg-blue-500 text-white p-2.5 rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg shadow-blue-500/30 active:scale-95"
            >
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-3 font-medium">
            AI can make mistakes. Verify important facts with your syllabus.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Building2 } from "lucide-react";
import { aiApi, companiesApi } from "@/lib/api";
import type { Company } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatSidebar() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && companies.length === 0) {
      companiesApi.list().then(setCompanies).catch(() => {});
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);

    try {
      const data = await aiApi.ask(q, selectedCompanyId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${e instanceof Error ? e.message : String(e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <>
      {/* Floating chat button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 flex items-center justify-center transition-transform hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden"
            onClick={() => setOpen(false)}
          />

          <div className="fixed bottom-0 right-0 z-50 w-full sm:w-[360px] sm:bottom-5 sm:right-5 sm:rounded-lg bg-white border border-gray-200 shadow-2xl flex flex-col sm:max-h-[600px] max-h-[85vh]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">AI Chat</h3>
                <p className="text-[11px] text-gray-400">Ask about strategies & markets</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Company selector */}
            <div className="px-4 py-2 border-b border-gray-50 shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <select
                  value={selectedCompanyId || ""}
                  onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 text-gray-700 bg-white focus:ring-1 focus:ring-gray-300 outline-none"
                >
                  <option value="">No company context</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {selectedCompany && (
                <p className="text-[11px] text-gray-400 mt-1 ml-5.5">
                  {selectedCompany.fleet_size} vehicles · {selectedCompany.fuel_type} · {selectedCompany.address_state}
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Ask about hedging strategies, market outlook, or company-specific advice.</p>
                  <div className="mt-3 space-y-1.5">
                    {[
                      "What hedging strategy do you recommend?",
                      "How volatile is the fuel market right now?",
                      "Explain UGA vs USO for hedging",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        className="block w-full text-left text-[11px] text-gray-500 bg-gray-50 rounded px-3 py-2 hover:bg-gray-100 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gray-900 text-white"
                        : msg.content.startsWith("Error:")
                          ? "bg-red-50 text-red-700 border border-red-100"
                          : "bg-gray-50 text-gray-700 border border-gray-100"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-[13px]">{msg.content}</div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-100 shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Ask a question..."
                  disabled={loading}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none disabled:opacity-50"
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="px-3 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-30 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

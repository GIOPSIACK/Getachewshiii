import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: ChatMsg = {
  role: "assistant",
  content:
    "Hi! I'm the Gech Ekub assistant. Ask me how the lottery works, how to buy a ticket, or how to check your ticket status.",
};

export function Chat() {
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isStreaming]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setIsStreaming(true);

    // Placeholder assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          try {
            const event = JSON.parse(line);
            if (event.content) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + event.content,
                };
                return updated;
              });
            }
            if (event.error) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: event.error };
                return updated;
              });
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't reach the assistant. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-[100dvh]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 pt-10 pb-4 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm shrink-0">
          <MessageCircle className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold leading-tight">Ask Gech Ekub</h1>
          <p className="text-xs text-muted-foreground">Ask anything about the app</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 px-4 pt-4 pb-4 flex flex-col gap-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn("flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              )}
            >
              {m.content || (isStreaming && i === messages.length - 1 ? "…" : "")}
            </div>
            {m.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 px-4 pb-4 pt-2 bg-background/80 backdrop-blur-xl border-t border-border/40">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your question..."
            className="flex-1 bg-card border border-border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm shadow-sm"
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-3 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center shadow-sm shadow-primary/20 hover:brightness-105 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

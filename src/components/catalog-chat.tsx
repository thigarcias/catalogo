"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle, Trash2, X } from "lucide-react";
import { AiMarkdown } from "@/components/ai-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "O que ainda falta comprar?",
  "Qual o melhor custo-benefício do catálogo?",
  "Quanto vou gastar se comprar todos os favoritos?",
];

export function CatalogChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;

    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setMessages([
          ...next,
          {
            role: "assistant",
            content: data.error ?? "Não consegui responder agora.",
          },
        ]);
        return;
      }

      setMessages([...next, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Falha de conexão." },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed right-4 bottom-4 z-50 size-11 rounded-full shadow-lg"
        aria-label="Abrir chat do catálogo"
      >
        <MessageCircle className="size-5" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(600px,80svh)] flex-col overflow-hidden rounded-xl border bg-background shadow-xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[400px]">
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm font-medium">Chat do catálogo</span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setMessages([])}
              aria-label="Limpar conversa"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => setOpen(false)}
            aria-label="Fechar chat"
          >
            <X className="size-4" />
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pergunte sobre os itens que você já cadastrou.
            </p>
            <div className="flex flex-col items-start gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {m.content}
                </p>
              </div>
            ) : (
              <div key={i} className="max-w-full">
                {m.content ? (
                  <AiMarkdown>{m.content}</AiMarkdown>
                ) : (
                  <span className="inline-flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            ),
          )
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex shrink-0 items-end gap-2 border-t p-3"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Pergunte sobre o catálogo…"
          rows={1}
          className="max-h-28 min-h-9 resize-none py-2"
        />
        <Button
          type="submit"
          size="icon"
          className="size-9 shrink-0"
          disabled={streaming || !input.trim()}
          aria-label="Enviar"
        >
          <ArrowUp className="size-4" />
        </Button>
      </form>
    </div>
  );
}

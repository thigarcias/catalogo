"use client";

import { useState } from "react";
import { GitCompare, Loader2, X } from "lucide-react";
import type { Item } from "@/lib/types";
import {
  CompareResult,
  type CompareData,
} from "@/components/compare-result";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ItemGrid({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CompareData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const chosen = items.filter((i) => selected.has(i.id));

  async function compare() {
    setOpen(true);
    setResult(null);
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não consegui comparar agora.");
        return;
      }
      setResult(data as CompareData);
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            selected={selected.has(item.id)}
            onSelectedChange={(on) => toggle(item.id, on)}
          />
        ))}
      </div>

      {/* Barra de selecao: sobe quando ha algo marcado. */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
          <div className="flex items-center gap-3 rounded-full border bg-background/95 py-2 pr-2 pl-4 shadow-lg backdrop-blur">
            <span className="text-sm whitespace-nowrap">
              {selected.size}{" "}
              {selected.size === 1 ? "selecionado" : "selecionados"}
            </span>

            <Button
              size="sm"
              onClick={compare}
              disabled={selected.size < 2}
              title={
                selected.size < 2
                  ? "Selecione pelo menos 2 itens"
                  : "Comparar com IA"
              }
            >
              <GitCompare className="size-4" />
              Comparar
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="size-8 rounded-full"
              onClick={() => setSelected(new Set())}
              aria-label="Limpar seleção"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comparação</DialogTitle>
            <DialogDescription>
              {chosen.map((i) => i.name).join(" · ")}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Apurando o placar…
            </div>
          ) : error ? (
            <p className="py-8 text-sm text-destructive">{error}</p>
          ) : result ? (
            <CompareResult data={result} items={chosen} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

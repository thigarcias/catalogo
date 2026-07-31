"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Check,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  PlusCircle,
  Sparkles,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { createItemFromAI } from "@/app/actions";
import { formatPrice, type Item } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type SimilarItem = {
  name: string;
  store: string;
  url: string;
  price: number | null;
  reason: string;
  notes: string;
  pros: string[];
  cons: string[];
  rating: number;
  value_score: number;
};

export type SimilarResponse = {
  target_name: string;
  similar_items: SimilarItem[];
};

export function SimilarItemsDialog({
  item,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  item: Item;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (setControlledOpen) setControlledOpen(val);
    if (!isControlled) setInternalOpen(val);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SimilarResponse | null>(null);
  const [addedIndexes, setAddedIndexes] = useState<Set<number>>(new Set());
  const [addingIndex, setAddingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    // Se ja temos resultado para este mesmo item, nao precisa refazer a busca a cada reabertura
    if (result && result.target_name === item.name) return;

    async function fetchSimilars() {
      setLoading(true);
      setError("");
      setResult(null);
      setAddedIndexes(new Set());

      try {
        const res = await fetch("/api/similar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.id }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Não foi possível carregar produtos similares.");
          return;
        }

        setResult(data as SimilarResponse);
      } catch {
        setError("Erro de conexão ao buscar similares.");
      } finally {
        setLoading(false);
      }
    }

    fetchSimilars();
  }, [open, item.id, item.name, result]);

  async function handleAdd(candidate: SimilarItem, index: number) {
    setAddingIndex(index);
    try {
      await createItemFromAI({
        category_id: item.category_id,
        name: candidate.name,
        store: candidate.store,
        url: candidate.url,
        price: candidate.price,
        notes: candidate.notes
          ? `${candidate.notes} • (Similar a "${item.name}": ${candidate.reason})`
          : `Similar a "${item.name}": ${candidate.reason}`,
        pros: candidate.pros,
        cons: candidate.cons,
        rating: candidate.rating,
        value_score: candidate.value_score,
      });

      setAddedIndexes((prev) => new Set(prev).add(index));
      toast.success(`"${candidate.name}" foi adicionado ao seu catálogo!`);
    } catch {
      toast.error("Erro ao adicionar produto ao catálogo.");
    } finally {
      setAddingIndex(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5 shrink-0" />
            <DialogTitle className="text-lg">Produtos Similares</DialogTitle>
          </div>
          <DialogDescription>
            Buscando alternativas similares e concorrentes no mercado para:{" "}
            <span className="font-semibold text-foreground">{item.name}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              Pesquisando concorrentes e opções similares no mercado…
            </p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        ) : result && result.similar_items.length > 0 ? (
          <div className="space-y-4 py-2">
            {result.similar_items.map((candidate, idx) => {
              const isAdded = addedIndexes.has(idx);
              const isAdding = addingIndex === idx;
              const formattedPrice = formatPrice(candidate.price);

              return (
                <Card
                  key={idx}
                  className="overflow-hidden border bg-card transition-colors hover:border-primary/40"
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold leading-snug text-foreground">
                          {candidate.name}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {candidate.store && (
                            <span className="flex items-center gap-1">
                              <Store className="size-3 shrink-0" />
                              {candidate.store}
                            </span>
                          )}
                          {formattedPrice && (
                            <span className="font-medium text-foreground">
                              {formattedPrice}
                              <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                                (estimado)
                              </span>
                            </span>
                          )}
                          {candidate.rating > 0 && (
                            <span>★ {candidate.rating.toFixed(1)}</span>
                          )}
                          {candidate.value_score > 0 && (
                            <span>Custo-benefício {candidate.value_score}/10</span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isAdded ? "outline" : "default"}
                        disabled={isAdded || isAdding}
                        onClick={() => handleAdd(candidate, idx)}
                        className="shrink-0 gap-1.5"
                      >
                        {isAdding ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : isAdded ? (
                          <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <PlusCircle className="size-4" />
                        )}
                        {isAdded ? "Adicionado" : "Adicionar"}
                      </Button>
                    </div>

                    {candidate.reason && (
                      <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Por que é similar: </span>
                        {candidate.reason}
                      </div>
                    )}

                    {candidate.notes && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {candidate.notes}
                      </p>
                    )}

                    {(candidate.pros.length > 0 || candidate.cons.length > 0) && (
                      <div className="grid gap-2 text-xs sm:grid-cols-2 pt-1 border-t">
                        {candidate.pros.length > 0 && (
                          <div className="space-y-1">
                            {candidate.pros.map((p, pIdx) => (
                              <p key={pIdx} className="flex gap-1 text-emerald-700 dark:text-emerald-400">
                                <Plus className="size-3 shrink-0 mt-0.5" />
                                <span>{p}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        {candidate.cons.length > 0 && (
                          <div className="space-y-1">
                            {candidate.cons.map((c, cIdx) => (
                              <p key={cIdx} className="flex gap-1 text-red-600 dark:text-red-400">
                                <Minus className="size-3 shrink-0 mt-0.5" />
                                <span>{c}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {candidate.url && (
                      <div className="pt-1 text-right">
                        <a
                          href={candidate.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          Ver onde comprar <ExternalLink className="size-3" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum produto similar encontrado no momento.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

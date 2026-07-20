"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createItem, updateItem } from "@/app/actions";
import type { Item, Source } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Fields = {
  name: string;
  url: string;
  price: string;
  store: string;
  rating: string;
  value_score: string;
  image_url: string;
  status: string;
  notes: string;
};

function fieldsFrom(item?: Item): Fields {
  return {
    name: item?.name ?? "",
    url: item?.url ?? "",
    price: item?.price != null ? String(item.price) : "",
    store: item?.store ?? "",
    rating: item?.rating != null ? String(item.rating) : "",
    value_score: item?.value_score != null ? String(item.value_score) : "",
    image_url: item?.image_url ?? "",
    status: item?.status ?? "candidato",
    notes: item?.notes ?? "",
  };
}

export function ItemDialog({
  trigger,
  categoryId,
  item,
}: {
  trigger: ReactNode;
  categoryId: string;
  item?: Item;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(item));
  const [priceSource, setPriceSource] = useState<Source>(
    item?.price_source ?? "manual",
  );
  const [analyzing, setAnalyzing] = useState(false);

  const editing = Boolean(item);
  const set = (key: keyof Fields) => (value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setFields(fieldsFrom(item));
      setPriceSource(item?.price_source ?? "manual");
    }
  }

  async function analyze() {
    const url = fields.url.trim();
    if (!url) {
      toast.error("Cole o link do produto primeiro.");
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Não consegui analisar o link.");
        return;
      }

      // Nunca sobrescreve o que voce ja escreveu.
      setFields((f) => ({
        ...f,
        name: f.name || (data.name ?? ""),
        price: f.price || (data.price != null ? String(data.price) : ""),
        store: f.store || (data.store ?? ""),
        rating: f.rating || (data.rating != null ? String(data.rating) : ""),
        value_score:
          f.value_score ||
          (data.value_score != null ? String(data.value_score) : ""),
        image_url: f.image_url || (data.image_url ?? ""),
        notes: f.notes || (data.notes ?? ""),
      }));

      if (data.price != null) setPriceSource(data.price_source as Source);

      if (data.warning) toast.warning(data.warning);
      else if (data.name) toast.success("Dados preenchidos. Confira antes de salvar.");
      else toast.info("Não achei dados. Preencha manualmente.");
    } catch {
      toast.error("Falha ao chamar a análise.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form
          action={async (formData) => {
            if (editing) await updateItem(formData);
            else await createItem(formData);
            setOpen(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Editar item" : "Novo item"}</DialogTitle>
            <DialogDescription>
              Cole o link e clique em Analisar, ou preencha à mão. Só o nome é
              obrigatório.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="category_id" value={categoryId} />
          <input type="hidden" name="price_source" value={priceSource} />
          <input
            type="hidden"
            name="source"
            value={priceSource === "manual" ? "manual" : "extraido"}
          />
          {item && <input type="hidden" name="id" value={item.id} />}

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">Link</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  name="url"
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={fields.url}
                  onChange={(e) => set("url")(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={analyze}
                  disabled={analyzing}
                  className="shrink-0"
                >
                  {analyzing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {analyzing ? "Analisando…" : "Analisar"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={200}
                placeholder="Geladeira Brastemp Inverse 447L Inox"
                value={fields.name}
                onChange={(e) => set("name")(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  Preço (R$)
                  {priceSource === "estimado" && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      · estimado
                    </span>
                  )}
                </Label>
                <Input
                  id="price"
                  name="price"
                  inputMode="decimal"
                  placeholder="4499,00"
                  value={fields.price}
                  onChange={(e) => {
                    set("price")(e.target.value);
                    setPriceSource("manual");
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store">Loja</Label>
                <Input
                  id="store"
                  name="store"
                  placeholder="Amazon"
                  value={fields.store}
                  onChange={(e) => set("store")(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Avaliação (0–5)</Label>
                <Input
                  id="rating"
                  name="rating"
                  inputMode="decimal"
                  placeholder="4.5"
                  value={fields.rating}
                  onChange={(e) => set("rating")(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value_score">Custo-benefício (0–10)</Label>
                <Input
                  id="value_score"
                  name="value_score"
                  inputMode="numeric"
                  placeholder="8"
                  value={fields.value_score}
                  onChange={(e) => set("value_score")(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Imagem (URL)</Label>
              <Input
                id="image_url"
                name="image_url"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={fields.image_url}
                onChange={(e) => set("image_url")(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                value={fields.status}
                onValueChange={set("status")}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candidato">Candidato</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                  <SelectItem value="comprado">Comprado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Dimensões, consumo, cor, prazo de entrega…"
                value={fields.notes}
                onChange={(e) => set("notes")(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit">{editing ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

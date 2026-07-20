"use client";

import { useState, type ReactNode } from "react";
import { createItem, updateItem } from "@/app/actions";
import type { Item } from "@/lib/types";
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
  const editing = Boolean(item);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              Só o nome é obrigatório. O resto você preenche conforme descobre.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="category_id" value={categoryId} />
          {item && <input type="hidden" name="id" value={item.id} />}

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                required
                autoFocus={!editing}
                maxLength={200}
                defaultValue={item?.name}
                placeholder="Geladeira Brastemp Inverse 447L Inox"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Link</Label>
              <Input
                id="url"
                name="url"
                type="url"
                inputMode="url"
                defaultValue={item?.url ?? ""}
                placeholder="https://…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  name="price"
                  inputMode="decimal"
                  defaultValue={item?.price ?? ""}
                  placeholder="4499,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store">Loja</Label>
                <Input
                  id="store"
                  name="store"
                  defaultValue={item?.store ?? ""}
                  placeholder="Mercado Livre"
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
                  defaultValue={item?.rating ?? ""}
                  placeholder="4.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value_score">Custo-benefício (0–10)</Label>
                <Input
                  id="value_score"
                  name="value_score"
                  inputMode="numeric"
                  defaultValue={item?.value_score ?? ""}
                  placeholder="8"
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
                defaultValue={item?.image_url ?? ""}
                placeholder="https://…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={item?.status ?? "candidato"}>
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
                defaultValue={item?.notes ?? ""}
                placeholder="Dimensões, consumo, cor, prazo de entrega…"
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

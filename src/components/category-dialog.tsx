"use client";

import { useState, type ReactNode } from "react";
import { createCategory } from "@/app/actions";
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

export function CategoryDialog({
  trigger,
  parentId,
  parentName,
  open: controlledOpen,
  onOpenChange,
}: {
  /** Omita para controlar o dialog de fora via `open` / `onOpenChange`. */
  trigger?: ReactNode;
  parentId?: string;
  parentName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? (onOpenChange ?? (() => {}))
    : setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-sm">
        <form
          action={async (formData) => {
            await createCategory(formData);
            setOpen(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {parentId ? "Nova subcategoria" : "Nova categoria"}
            </DialogTitle>
            <DialogDescription>
              {parentId
                ? `Dentro de ${parentName}.`
                : "Ex: Eletrodomésticos, Móveis, Cozinha."}
            </DialogDescription>
          </DialogHeader>

          {parentId && (
            <input type="hidden" name="parent_id" value={parentId} />
          )}

          <div className="space-y-2 py-4">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              name="name"
              required
              autoFocus
              maxLength={80}
              placeholder={parentId ? "Geladeira" : "Eletrodomésticos"}
            />
          </div>

          <DialogFooter>
            <Button type="submit">Criar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

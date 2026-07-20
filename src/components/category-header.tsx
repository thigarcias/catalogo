"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { deleteCategory } from "@/app/actions";
import type { Category } from "@/lib/types";
import { CategoryDialog } from "@/components/category-dialog";
import { ItemDialog } from "@/components/item-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CategoryHeader({
  category,
  parent,
  itemCount,
}: {
  category: Category;
  parent: Category | null;
  itemCount: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <Separator orientation="vertical" className="mr-1 !h-4 shrink-0" />

      {/* min-w-0 deixa o breadcrumb truncar em vez de empurrar os botoes para fora */}
      <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
        {parent && (
          <>
            <Link
              href={`/c/${parent.id}`}
              className="hidden max-w-[12rem] truncate text-muted-foreground hover:text-foreground sm:block"
            >
              {parent.name}
            </Link>
            <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
          </>
        )}
        <span className="truncate font-medium">{category.name}</span>
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <ItemDialog
          categoryId={category.id}
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Novo item</span>
            </Button>
          }
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Ações da categoria"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setSubOpen(true)}>
              <Plus className="size-3.5" />
              Nova subcategoria
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Excluir categoria
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Controlados por estado, e nao por Trigger, para nao conflitar com o
          fechamento do dropdown. */}
      <CategoryDialog
        parentId={category.id}
        parentName={category.name}
        open={subOpen}
        onOpenChange={setSubOpen}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{category.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga também as subcategorias e{" "}
              {itemCount === 1 ? "o item" : `os ${itemCount} itens`} dentro
              dela. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={category.id} />
              <AlertDialogAction type="submit">Excluir</AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

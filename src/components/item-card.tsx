"use client";

import { useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { deleteItem, setItemStatus, toggleFavorite } from "@/app/actions";
import {
  formatPrice,
  SOURCE_LABEL,
  STATUS_LABEL,
  type Item,
} from "@/lib/types";
import { ItemDialog } from "@/components/item-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ItemCard({
  item,
  selected,
  onSelectedChange,
}: {
  item: Item;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const price = formatPrice(item.price, item.currency);
  const estimated = item.price_source === "estimado";
  const opinions = item.pros.length + item.cons.length;

  return (
    <Card
      className={`group relative gap-0 overflow-hidden p-0 transition-shadow ${
        item.status === "descartado" ? "opacity-55" : ""
      } ${selected ? "ring-2 ring-primary" : ""}`}
    >
      <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden bg-muted/40">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt=""
            className="size-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Sem imagem</span>
        )}

        {/* Sempre visivel de proposito: escondido atras de :hover, exigia dois
            toques no desktop e ficava inalcancavel em telas de toque. */}
        <div
          className={`absolute top-2 left-2 transition-opacity ${
            selected ? "opacity-100" : "opacity-70 hover:opacity-100"
          }`}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelectedChange(v === true)}
            aria-label={`Selecionar ${item.name} para comparar`}
            className="bg-background shadow-sm"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm leading-snug font-medium">{item.name}</h3>

          <form action={toggleFavorite}>
            <input type="hidden" name="id" value={item.id} />
            <input
              type="hidden"
              name="is_favorite"
              value={String(!item.is_favorite)}
            />
            <button
              type="submit"
              aria-label={
                item.is_favorite ? "Remover favorito" : "Marcar favorito"
              }
              className="text-muted-foreground hover:text-foreground"
            >
              <Star
                className={`size-4 ${item.is_favorite ? "fill-amber-400 text-amber-400" : ""}`}
              />
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {price ? (
            estimated ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-base font-medium text-muted-foreground decoration-dotted underline-offset-4 [text-decoration-line:underline]">
                    {price}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Preço estimado por busca — confira na loja antes de decidir.
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className="text-base font-medium">{price}</span>
            )
          ) : (
            <span className="text-sm text-muted-foreground">Sem preço</span>
          )}

          {price && item.price_source !== "manual" && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {SOURCE_LABEL[item.price_source]}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.store && <span>{item.store}</span>}
          {item.rating != null && <span>★ {item.rating}</span>}
          {item.value_score != null && (
            <span>Custo-benefício {item.value_score}/10</span>
          )}
        </div>

        {item.notes && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.notes}
          </p>
        )}

        {opinions > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
              {expanded ? "Ocultar" : "Ver"} opiniões
              <span className="text-muted-foreground/70">({opinions})</span>
            </button>

            {expanded && (
              <div className="mt-2 space-y-2 border-t pt-2">
                {item.pros.map((p, i) => (
                  <p key={`p${i}`} className="flex gap-1.5 text-xs">
                    <Plus className="mt-0.5 size-3 shrink-0 text-emerald-600 dark:text-emerald-500" />
                    <span>{p}</span>
                  </p>
                ))}
                {item.cons.map((c, i) => (
                  <p key={`c${i}`} className="flex gap-1.5 text-xs">
                    <Minus className="mt-0.5 size-3 shrink-0 text-red-600 dark:text-red-500" />
                    <span>{c}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          {item.status !== "candidato" ? (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {STATUS_LABEL[item.status]}
            </Badge>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1">
            {item.url && (
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Abrir link"
              >
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            )}

            <ItemDialog
              categoryId={item.category_id}
              item={item}
              trigger={
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label="Editar"
                >
                  <Pencil className="size-3.5" />
                </Button>
              }
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["candidato", "descartado", "comprado"] as const)
                  .filter((s) => s !== item.status)
                  .map((s) => (
                    <DropdownMenuItem key={s} asChild>
                      <form action={setItemStatus}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="status" value={s} />
                        <button type="submit" className="w-full text-left">
                          Marcar como {STATUS_LABEL[s].toLowerCase()}
                        </button>
                      </form>
                    </DropdownMenuItem>
                  ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem variant="destructive" asChild>
                  <form action={deleteItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <Trash2 className="size-3.5" />
                      Excluir
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </Card>
  );
}

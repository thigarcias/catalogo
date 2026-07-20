"use client";

import { ExternalLink, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import {
  deleteItem,
  setItemStatus,
  toggleFavorite,
} from "@/app/actions";
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

const STATUS_STYLE: Record<Item["status"], string> = {
  candidato: "",
  descartado: "opacity-55",
  comprado: "",
};

export function ItemCard({ item }: { item: Item }) {
  const price = formatPrice(item.price, item.currency);
  const estimated = item.price_source === "estimado";

  return (
    <Card
      className={`group relative gap-0 overflow-hidden p-0 ${STATUS_STYLE[item.status]}`}
    >
      <div className="flex aspect-4/3 items-center justify-center overflow-hidden bg-muted/40">
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

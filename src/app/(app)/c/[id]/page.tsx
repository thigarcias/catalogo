import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Plus, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, type Category, type Item } from "@/lib/types";
import { CategoryHeader } from "@/components/category-header";
import { ItemGrid } from "@/components/item-grid";
import { ItemDialog } from "@/components/item-dialog";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Helpers para galeria de subcategorias                              */
/* ------------------------------------------------------------------ */

type SubGalleryCard = {
  id: string;
  name: string;
  itemCount: number;
  refPrice: number | null;
  refLabel: string;
  hasFavorite: boolean;
  thumbnailUrl: string | null;
};

function buildSubGalleryCards(
  subs: Category[],
  subItems: Item[],
): SubGalleryCard[] {
  return subs.map((sub) => {
    const items = subItems.filter((i) => i.category_id === sub.id);
    const candidates = items.filter(
      (i) => i.status !== "descartado" && i.price != null,
    );
    const fav = items.find((i) => i.is_favorite && i.price != null);

    let refPrice: number | null = null;
    let refLabel = "";

    if (fav && fav.price != null) {
      refPrice = fav.price;
      refLabel = `★ ${fav.name}`;
    } else if (candidates.length > 0) {
      const sum = candidates.reduce((s, i) => s + (i.price ?? 0), 0);
      refPrice = sum / candidates.length;
      refLabel = `média de ${candidates.length} candidato${candidates.length > 1 ? "s" : ""}`;
    }

    const thumbnailUrl =
      fav?.image_url ??
      candidates.find((i) => i.image_url)?.image_url ??
      items.find((i) => i.image_url)?.image_url ??
      null;

    return {
      id: sub.id,
      name: sub.name,
      itemCount: items.length,
      refPrice,
      refLabel,
      hasFavorite: !!fav,
      thumbnailUrl,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Página                                                             */
/* ------------------------------------------------------------------ */

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: category }, { data: subcategories }, { data: items }] =
    await Promise.all([
      supabase.from("categories").select("*").eq("id", id).maybeSingle(),
      supabase.from("categories").select("*").eq("parent_id", id).order("name"),
      supabase
        .from("items")
        .select("*")
        .eq("category_id", id)
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  if (!category) notFound();

  const cat = category as Category;
  const subs = (subcategories ?? []) as Category[];
  const list = (items ?? []) as Item[];

  // Buscar itens das subcategorias para a galeria
  let subItems: Item[] = [];
  if (subs.length > 0) {
    const subIds = subs.map((s) => s.id);
    const { data } = await supabase
      .from("items")
      .select("*")
      .in("category_id", subIds);
    subItems = (data ?? []) as Item[];
  }

  const galleryCards = buildSubGalleryCards(subs, subItems);

  let parent: Category | null = null;
  if (cat.parent_id) {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("id", cat.parent_id)
      .maybeSingle();
    parent = (data as Category) ?? null;
  }

  // Resumo de comparacao: descartados ficam de fora.
  const priced = list.filter(
    (i) => i.price != null && i.status !== "descartado",
  );
  const cheapest = priced.length
    ? priced.reduce((a, b) => (a.price! <= b.price! ? a : b))
    : null;

  return (
    <div className="flex min-h-svh flex-col">
      <CategoryHeader
        category={cat}
        parent={parent}
        itemCount={list.length}
      />

      <main className="flex-1 p-4 sm:p-6">
        {/* Subcategorias — galeria */}
        {galleryCards.length > 0 && (
          <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {galleryCards.map((sub) => (
              <Link key={sub.id} href={`/c/${sub.id}`}>
                <div className="group/card flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md hover:-translate-y-0.5">
                  {/* Thumbnail area */}
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted/40">
                    {sub.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sub.thumbnailUrl}
                        alt=""
                        className="size-full object-contain transition-transform group-hover/card:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <Box className="size-8 text-muted-foreground/30" />
                    )}

                    {/* Badge de preço */}
                    {sub.refPrice != null && (
                      <span className="absolute top-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white tabular-nums backdrop-blur-sm">
                        {formatPrice(sub.refPrice)}
                      </span>
                    )}

                    {/* Favorito */}
                    {sub.hasFavorite && (
                      <Star className="absolute top-2 left-2 size-3.5 fill-amber-400 text-amber-400 drop-shadow" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex flex-col gap-0.5 px-3 py-2.5">
                    <span className="text-sm font-medium truncate leading-tight">
                      {sub.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {sub.itemCount} ite{sub.itemCount !== 1 ? "ns" : "m"}
                      {sub.refLabel && (
                        <> · {sub.refLabel}</>
                      )}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {priced.length > 1 && cheapest && (
          <p className="mb-6 text-sm text-muted-foreground">
            {priced.length} candidatos com preço · mais barato{" "}
            <span className="font-medium text-foreground">
              {formatPrice(cheapest.price, cheapest.currency)}
            </span>{" "}
            ({cheapest.name})
          </p>
        )}

        {list.length === 0 && subs.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-10">
            <p className="text-sm text-muted-foreground">
              Nenhum item em {cat.name} ainda.
            </p>
            <ItemDialog
              categoryId={cat.id}
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="size-4" />
                  Adicionar o primeiro
                </Button>
              }
            />
          </div>
        ) : list.length > 0 ? (
          <ItemGrid items={list} />
        ) : null}
      </main>
    </div>
  );
}

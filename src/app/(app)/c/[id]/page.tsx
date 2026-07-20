import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, type Category, type Item } from "@/lib/types";
import { CategoryHeader } from "@/components/category-header";
import { ItemCard } from "@/components/item-card";
import { ItemDialog } from "@/components/item-dialog";
import { Button } from "@/components/ui/button";

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
        {subs.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {subs.map((s) => (
              <Link
                key={s.id}
                href={`/c/${s.id}`}
                className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                {s.name}
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

        {list.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {list.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

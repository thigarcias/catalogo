import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buildTree, formatPrice, type Category, type Item } from "@/lib/types";
import { CategoryDialog } from "@/components/category-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    supabase.from("items").select("*"),
  ]);

  const all = (categories ?? []) as Category[];
  const list = (items ?? []) as Item[];
  const roots = buildTree(all);

  const countByCategory = new Map<string, number>();
  for (const item of list) {
    countByCategory.set(
      item.category_id,
      (countByCategory.get(item.category_id) ?? 0) + 1,
    );
  }

  /** Itens da categoria e de toda a sua descendencia. */
  const totalFor = (id: string): number => {
    const node = all.filter((c) => c.parent_id === id);
    return (
      (countByCategory.get(id) ?? 0) +
      node.reduce((sum, child) => sum + totalFor(child.id), 0)
    );
  };

  const bought = list.filter((i) => i.status === "comprado");
  const spent = bought.reduce((sum, i) => sum + (i.price ?? 0), 0);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 !h-4" />
        <span className="text-sm font-medium">Visão geral</span>
      </header>

      <main className="flex-1 p-6">
        {roots.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <h2 className="text-lg font-medium tracking-tight">
              Comece pela primeira categoria
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie algo amplo como <em>Eletrodomésticos</em>, depois abra e crie
              a subcategoria <em>Geladeira</em> dentro dela. Os itens que você
              está comparando ficam na subcategoria.
            </p>
            <div className="mt-6">
              <CategoryDialog
                trigger={
                  <Button>
                    <Plus className="size-4" />
                    Nova categoria
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap gap-x-10 gap-y-3 text-sm">
              <div>
                <div className="text-2xl font-medium">{list.length}</div>
                <div className="text-muted-foreground">itens no catálogo</div>
              </div>
              <div>
                <div className="text-2xl font-medium">{bought.length}</div>
                <div className="text-muted-foreground">já comprados</div>
              </div>
              <div>
                <div className="text-2xl font-medium">
                  {formatPrice(spent) ?? "—"}
                </div>
                <div className="text-muted-foreground">gasto até agora</div>
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {roots.map((root) => (
                <Link key={root.id} href={`/c/${root.id}`}>
                  <Card className="h-full gap-1 p-4 transition-colors hover:bg-accent/50">
                    <h3 className="text-sm font-medium">{root.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {totalFor(root.id)} itens
                      {root.children.length > 0 &&
                        ` · ${root.children.length} subcategorias`}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

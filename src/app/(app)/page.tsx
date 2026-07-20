import Link from "next/link";
import {
  BarChart3,
  Box,
  ChevronRight,
  Heart,
  Package,
  Plus,
  ShoppingCart,
  Star,
  Tag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  buildTree,
  formatPrice,
  type Category,
  type CategoryNode,
  type Item,
} from "@/lib/types";
import { CategoryDialog } from "@/components/category-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/* ------------------------------------------------------------------ */
/*  Tipos internos do dashboard                                        */
/* ------------------------------------------------------------------ */

type SubcategorySummary = {
  id: string;
  name: string;
  itemCount: number;
  candidateCount: number;
  avgPrice: number | null;
  /** Preço de referência: favorito (se houver) ou média. */
  refPrice: number | null;
  refLabel: string;
  cheapest: { name: string; price: number } | null;
  favorite: { name: string; price: number | null } | null;
  /** Thumbnail do favorito ou do primeiro item com imagem. */
  thumbnailUrl: string | null;
};

type CategorySummary = {
  id: string;
  name: string;
  totalItems: number;
  subcategories: SubcategorySummary[];
  /** Soma das refPrices das subcategorias. */
  estimatedCost: number | null;
};

/* ------------------------------------------------------------------ */
/*  Helpers de cálculo                                                 */
/* ------------------------------------------------------------------ */

function buildSubcategorySummary(
  cat: Category,
  items: Item[],
): SubcategorySummary {
  const catItems = items.filter((i) => i.category_id === cat.id);
  const candidates = catItems.filter(
    (i) => i.status !== "descartado" && i.price != null,
  );

  const fav = catItems.find((i) => i.is_favorite && i.price != null);
  const cheapest = candidates.length
    ? candidates.reduce((a, b) => (a.price! <= b.price! ? a : b))
    : null;

  let avgPrice: number | null = null;
  if (candidates.length > 0) {
    const sum = candidates.reduce((s, i) => s + (i.price ?? 0), 0);
    avgPrice = sum / candidates.length;
  }

  let refPrice: number | null = null;
  let refLabel = "";

  if (fav && fav.price != null) {
    refPrice = fav.price;
    refLabel = `★ ${fav.name}`;
  } else if (avgPrice != null) {
    refPrice = avgPrice;
    refLabel = `média de ${candidates.length} candidato${candidates.length > 1 ? "s" : ""}`;
  }

  // Thumbnail: favorito > primeiro candidato com imagem > qualquer item com imagem
  const thumbnailUrl =
    (fav?.image_url) ??
    candidates.find((i) => i.image_url)?.image_url ??
    catItems.find((i) => i.image_url)?.image_url ??
    null;

  return {
    id: cat.id,
    name: cat.name,
    itemCount: catItems.length,
    candidateCount: candidates.length,
    avgPrice,
    refPrice,
    refLabel,
    cheapest: cheapest
      ? { name: cheapest.name, price: cheapest.price! }
      : null,
    favorite: fav ? { name: fav.name, price: fav.price } : null,
    thumbnailUrl,
  };
}

function buildCategorySummaries(
  roots: CategoryNode[],
  allCategories: Category[],
  items: Item[],
): CategorySummary[] {
  return roots.map((root) => {
    // Subcategorias diretas
    const childCats = allCategories.filter((c) => c.parent_id === root.id);

    // Se a categoria raiz não tem filhas mas tem itens, ela mesma é tratada como "subcategoria"
    const subsToProcess =
      childCats.length > 0 ? childCats : [{ ...root } as Category];

    const subcategories = subsToProcess
      .map((sub) => buildSubcategorySummary(sub, items))
      .filter((s) => s.itemCount > 0 || childCats.length > 0);

    const withPrice = subcategories.filter((s) => s.refPrice != null);
    const estimatedCost =
      withPrice.length > 0
        ? withPrice.reduce((sum, s) => sum + s.refPrice!, 0)
        : null;

    // Total de itens incluindo sub-subcategorias
    const allIds = new Set<string>([root.id]);
    const collectIds = (node: CategoryNode) => {
      allIds.add(node.id);
      node.children.forEach(collectIds);
    };
    collectIds(root);
    const totalItems = items.filter((i) => allIds.has(i.category_id)).length;

    return {
      id: root.id,
      name: root.name,
      totalItems,
      subcategories: subcategories.sort(
        (a, b) => (b.refPrice ?? 0) - (a.refPrice ?? 0),
      ),
      estimatedCost,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Componente da página                                               */
/* ------------------------------------------------------------------ */

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    supabase.from("items").select("*"),
  ]);

  const all = (categories ?? []) as Category[];
  const list = (items ?? []) as Item[];
  const roots = buildTree(all);

  // KPIs
  const totalItems = list.length;
  const candidates = list.filter((i) => i.status === "candidato");
  const bought = list.filter((i) => i.status === "comprado");
  const spent = bought.reduce((sum, i) => sum + (i.price ?? 0), 0);
  const favorites = list.filter((i) => i.is_favorite);

  // Summaries por categoria
  const summaries = buildCategorySummaries(roots, all, list);

  // Custo estimado total (soma dos refPrices de todas as subcategorias de todas as categorias)
  const allSubsWithPrice = summaries.flatMap((s) =>
    s.subcategories.filter((sub) => sub.refPrice != null),
  );
  const estimatedTotal =
    allSubsWithPrice.length > 0
      ? allSubsWithPrice.reduce((sum, s) => sum + s.refPrice!, 0)
      : null;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 !h-4" />
        <BarChart3 className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Dashboard</span>
      </header>

      <main className="flex-1 p-4 sm:p-6">
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
          <div className="mx-auto max-w-6xl space-y-8">
            {/* ── KPI Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <KpiCard
                icon={<Package className="size-5" />}
                label="Itens no catálogo"
                value={String(totalItems)}
                accent="blue"
              />
              <KpiCard
                icon={<Tag className="size-5" />}
                label="Candidatos ativos"
                value={String(candidates.length)}
                accent="amber"
              />
              <KpiCard
                icon={<ShoppingCart className="size-5" />}
                label="Já comprados"
                value={String(bought.length)}
                accent="emerald"
              />
              <KpiCard
                icon={<Wallet className="size-5" />}
                label="Gasto até agora"
                value={formatPrice(spent) ?? "—"}
                accent="violet"
              />
            </div>

            {/* ── Custo Estimado Total ──────────────────────── */}
            {estimatedTotal != null && allSubsWithPrice.length > 0 && (
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-0 text-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
                {/* Decoração sutil */}
                <div className="pointer-events-none absolute -top-20 -right-20 size-60 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-white/5" />

                <div className="relative space-y-5 p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                      <TrendingUp className="size-4" />
                    </div>
                    <h2 className="text-sm font-medium text-white/80">
                      Custo Estimado da Mudança
                    </h2>
                  </div>

                  <div className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {formatPrice(estimatedTotal)}
                  </div>

                  {/* Fórmula visível */}
                  <div className="space-y-3">
                    <div className="text-xs font-medium uppercase tracking-wider text-white/50">
                      Composição
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {allSubsWithPrice.map((sub, i) => (
                        <span key={sub.id} className="contents">
                          {i > 0 && (
                            <span className="text-sm text-white/30">+</span>
                          )}
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm transition-colors hover:bg-white/15">
                            <span className="text-white/60">{sub.name}</span>
                            <span className="font-medium">
                              {formatPrice(sub.refPrice)}
                            </span>
                          </span>
                        </span>
                      ))}
                      <span className="text-sm text-white/30">=</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                        {formatPrice(estimatedTotal)}
                      </span>
                    </div>
                    <p className="text-xs text-white/40">
                      {favorites.length > 0 && (
                        <>
                          <Star className="mr-1 inline size-3" />
                          Subcategorias com favorito usam o preço do favorito.
                          As demais usam a média dos candidatos.
                        </>
                      )}
                      {favorites.length === 0 &&
                        "Baseado na média de preço dos candidatos em cada subcategoria."}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* ── Grid de Categorias ───────────────────────── */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold tracking-tight">
                Categorias
              </h2>

              <div className="space-y-4">
                {summaries.map((cat) => (
                  <Card
                    key={cat.id}
                    className="overflow-hidden p-0 transition-shadow hover:shadow-md"
                  >
                    {/* Header da categoria */}
                    <Link href={`/c/${cat.id}`}>
                      <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3.5 transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                            <Box className="size-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold">
                              {cat.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {cat.totalItems} ite{cat.totalItems !== 1 ? "ns" : "m"}
                              {cat.subcategories.length > 0 &&
                                ` · ${cat.subcategories.length} subcategoria${cat.subcategories.length !== 1 ? "s" : ""}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {cat.estimatedCost != null && (
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatPrice(cat.estimatedCost)}
                            </span>
                          )}
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>

                    {/* Subcategorias — galeria */}
                    {cat.subcategories.length > 0 && (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 p-4">
                        {cat.subcategories.map((sub) => (
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
                                {sub.favorite && (
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
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

const accentMap = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/50",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-900/50",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-900/50",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    icon: "text-violet-600 dark:text-violet-400",
    border: "border-violet-100 dark:border-violet-900/50",
  },
} as const;

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: keyof typeof accentMap;
}) {
  const colors = accentMap[accent];
  return (
    <Card
      className={`flex items-center gap-3 border p-4 ${colors.bg} ${colors.border}`}
    >
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${colors.icon} bg-white/60 dark:bg-white/10`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-xl font-bold tracking-tight">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

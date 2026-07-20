export type Source = "oficial" | "extraido" | "estimado" | "manual";
export type ItemStatus = "candidato" | "descartado" | "comprado";

export type Category = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  icon: string | null;
  position: number;
  created_at: string;
};

export type Item = {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  url: string | null;
  store: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  source: Source;
  price_source: Source;
  rating: number | null;
  value_score: number | null;
  notes: string | null;
  pros: string[];
  cons: string[];
  status: ItemStatus;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

/** Textarea de uma linha por item <-> text[] do Postgres. */
export function linesToArray(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
}

/** Categoria com os filhos aninhados, para renderizar a arvore da sidebar. */
export type CategoryNode = Category & { children: CategoryNode[] };

export function buildTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of categories) byId.set(c.id, { ...c, children: [] });

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sort = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);

  return roots;
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  candidato: "Candidato",
  descartado: "Descartado",
  comprado: "Comprado",
};

export const SOURCE_LABEL: Record<Source, string> = {
  oficial: "Oficial",
  extraido: "Extraído",
  estimado: "Estimado",
  manual: "Manual",
};

export function formatPrice(price: number | null, currency = "BRL") {
  if (price == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(price);
}

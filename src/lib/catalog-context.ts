import { createClient } from "@/lib/supabase/server";
import { formatPrice, type Category, type Item } from "@/lib/types";

/**
 * Serializa o catalogo para o modelo. Texto simples em vez de JSON porque o
 * catalogo e pequeno (uma mudanca, dezenas de itens) e o modelo responde
 * melhor a uma lista legivel do que a um dump aninhado.
 *
 * Inclui a procedencia do preco de proposito: o modelo precisa saber que um
 * preco "estimado" pode estar errado antes de recomendar o mais barato.
 */
export async function buildCatalogContext(itemIds?: string[]): Promise<string> {
  const supabase = await createClient();

  const [{ data: categories }, itemsQuery] = await Promise.all([
    supabase.from("categories").select("*"),
    itemIds?.length
      ? supabase.from("items").select("*").in("id", itemIds)
      : supabase.from("items").select("*"),
  ]);

  const cats = (categories ?? []) as Category[];
  const items = (itemsQuery.data ?? []) as Item[];

  if (items.length === 0) return "O catálogo está vazio.";

  const nameById = new Map(cats.map((c) => [c.id, c] as const));

  /** "Eletrodomésticos › Geladeira" */
  const pathOf = (categoryId: string): string => {
    const parts: string[] = [];
    let current = nameById.get(categoryId);
    let guard = 0;
    while (current && guard++ < 10) {
      parts.unshift(current.name);
      current = current.parent_id
        ? nameById.get(current.parent_id)
        : undefined;
    }
    return parts.join(" › ") || "Sem categoria";
  };

  const byPath = new Map<string, Item[]>();
  for (const item of items) {
    const path = pathOf(item.category_id);
    byPath.set(path, [...(byPath.get(path) ?? []), item]);
  }

  const blocks: string[] = [];
  for (const [path, list] of byPath) {
    const lines = list.map((item) => {
      const bits: string[] = [`- ${item.name}`];

      if (item.price != null) {
        const label = formatPrice(item.price, item.currency);
        bits.push(
          item.price_source === "estimado"
            ? `${label} (ESTIMADO, pode estar errado)`
            : `${label}`,
        );
      } else {
        bits.push("sem preço");
      }

      if (item.store) bits.push(item.store);
      if (item.rating != null) bits.push(`nota ${item.rating}/5`);
      if (item.value_score != null)
        bits.push(`custo-benefício ${item.value_score}/10`);
      bits.push(item.status);
      if (item.is_favorite) bits.push("FAVORITO");

      let line = bits.join(" | ");
      if (item.notes) line += `\n  specs: ${item.notes}`;
      if (item.pros?.length) line += `\n  prós: ${item.pros.join("; ")}`;
      if (item.cons?.length) line += `\n  contras: ${item.cons.join("; ")}`;
      if (item.url) line += `\n  link: ${item.url}`;
      return line;
    });

    blocks.push(`## ${path}\n${lines.join("\n")}`);
  }

  return blocks.join("\n\n");
}

/**
 * Contexto para comparacao. Os itens sao numerados e o modelo responde com o
 * indice, nunca com o id: ecoar um UUID inteiro e uma fonte de erro boba, e
 * um numero de 1 a N nao tem como sair errado sem ser obvio.
 */
export async function buildCompareContext(
  ids: string[],
): Promise<{ items: Item[]; text: string }> {
  const supabase = await createClient();
  const { data } = await supabase.from("items").select("*").in("id", ids);

  // Preserva a ordem em que o usuario selecionou.
  const byId = new Map((data ?? []).map((i) => [i.id, i as Item]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((i): i is Item => Boolean(i));

  const text = items
    .map((item, index) => {
      const lines = [`### Item ${index + 1}: ${item.name}`];

      if (item.price != null) {
        lines.push(
          `preço: ${formatPrice(item.price, item.currency)}${
            item.price_source === "estimado"
              ? " (ESTIMADO por busca, pode estar errado)"
              : ""
          }`,
        );
      } else {
        lines.push("preço: não informado");
      }

      if (item.store) lines.push(`loja: ${item.store}`);
      if (item.rating != null) lines.push(`avaliação: ${item.rating}/5`);
      if (item.value_score != null)
        lines.push(`custo-benefício declarado: ${item.value_score}/10`);
      if (item.notes) lines.push(`specs: ${item.notes}`);
      if (item.pros?.length) lines.push(`prós: ${item.pros.join("; ")}`);
      if (item.cons?.length) lines.push(`contras: ${item.cons.join("; ")}`);

      return lines.join("\n");
    })
    .join("\n\n");

  return { items, text };
}

export const CATALOG_SYSTEM = `Você ajuda a decidir compras para uma mudança de casa, com base num catálogo de itens que a pessoa montou.

Regras:
- Responda em português do Brasil, direto ao ponto. Sem preâmbulo.
- Use SÓ o que está no catálogo. Se a pessoa perguntar algo que os dados não respondem, diga o que falta em vez de inventar.
- Preço marcado como ESTIMADO veio de busca web e pode estar errado. Se ele for decisivo para a sua recomendação, avise que precisa ser conferido na loja.
- Quando recomendar, escolha um e diga por quê. Não liste vantagens dos dois lados e termine em cima do muro.
- Não invente itens, preços, marcas ou specs que não estejam no catálogo.`;

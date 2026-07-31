import OpenAI from "openai";
import { getModel } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["similar_items"],
  properties: {
    similar_items: {
      type: "array",
      description: "Lista de 3 a 4 produtos similares/concorrentes diretos disponíveis no Brasil.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "store",
          "url",
          "price",
          "reason",
          "notes",
          "pros",
          "cons",
          "rating",
          "value_score"
        ],
        properties: {
          name: {
            type: "string",
            description: "Nome completo e preciso do produto concorrente/similar.",
          },
          store: {
            type: "string",
            description: "Loja ou e-commerce principal recomendado (ex: Amazon, Mercado Livre, Magalu, Kabum).",
          },
          url: {
            type: "string",
            description: "URL de busca no e-commerce ou Google para encontrar o produto.",
          },
          price: {
            type: ["number", "null"],
            description: "Preço estimado em Reais (BRL) para o produto novo.",
          },
          reason: {
            type: "string",
            description: "Resumo de 1 frase explicando por que este produto é uma boa alternativa ao item de referência.",
          },
          notes: {
            type: "string",
            description: "Especificações técnicas neutras e objetivas do modelo (dimensões, capacidade, consumo, etc.). NUNCA inclua prós ou contras aqui.",
          },
          pros: {
            type: "array",
            items: { type: "string" },
            description: "De 2 a 3 pontos fortes ou vantagens do produto.",
          },
          cons: {
            type: "array",
            items: { type: "string" },
            description: "De 1 a 2 pontos fracos, limitações ou reclamações do produto.",
          },
          rating: {
            type: "number",
            description: "Nota de avaliação média estimada de 0.0 a 5.0.",
          },
          value_score: {
            type: "integer",
            description: "Nota de custo-benefício inteira de 0 a 10.",
          },
        },
      },
    },
  },
} as const;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY não configurada no servidor." },
      { status: 501 }
    );
  }

  let itemId: string | undefined;
  let customItem: {
    name: string;
    store?: string;
    price?: number;
    notes?: string;
    pros?: string[];
    cons?: string[];
  } | undefined;

  try {
    const body = await request.json();
    if (body?.itemId) {
      itemId = String(body.itemId);
    } else if (body?.name) {
      customItem = body;
    }
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  let targetName = "";
  let targetCategory = "";
  let targetDetails = "";

  if (itemId) {
    const supabase = await createClient();
    const { data: item } = await supabase
      .from("items")
      .select("*, categories(name)")
      .eq("id", itemId)
      .single();

    if (!item) {
      return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    targetName = item.name;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targetCategory = (item as any)?.categories?.name ?? "";
    targetDetails = `
Produto de Referência: ${item.name}
${targetCategory ? `Categoria: ${targetCategory}` : ""}
${item.store ? `Loja onde foi visto: ${item.store}` : ""}
${item.price ? `Preço de referência: R$ ${item.price}` : ""}
${item.notes ? `Observações/Specs: ${item.notes}` : ""}
${item.pros?.length ? `Prós: ${item.pros.join("; ")}` : ""}
${item.cons?.length ? `Contras: ${item.cons.join("; ")}` : ""}
`.trim();
  } else if (customItem) {
    targetName = customItem.name;
    targetDetails = `
Produto de Referência: ${customItem.name}
${customItem.store ? `Loja onde foi visto: ${customItem.store}` : ""}
${customItem.price ? `Preço de referência: R$ ${customItem.price}` : ""}
${customItem.notes ? `Observações/Specs: ${customItem.notes}` : ""}
`.trim();
  } else {
    return Response.json({ error: "Informe itemId ou o nome do produto." }, { status: 400 });
  }

  const systemPrompt = `Você é um assistente especialista em compras e curadoria de produtos no e-commerce brasileiro.
Sua missão é sugerir de 3 a 4 produtos SIMILARES e CONCORRENTES diretos no mercado brasileiro para o item de referência informado.

Regras:
1. Sugira marcas e modelos reais existentes e populares no mercado brasileiro.
2. Cada sugestão deve ter uma indicação realista de onde encontrar (ex: Amazon, Mercado Livre, Magazine Luiza, Kabum, Fast Shop).
3. Preço estimado em Reais (BRL) realista para o mercado atual.
4. Forneça uma URL de busca ou link representativo (ex: https://www.google.com/search?q=Nome+Do+Produto).
5. OBRIGATÓRIO: O campo 'notes' deve conter APENAS especificações técnicas neutras (ex: dimensões, voltagem, capacidade). NUNCA misture prós e contras no 'notes'. Coloque todos os pontos positivos no array 'pros' e pontos negativos no array 'cons'.
6. Responda estritamente em Português do Brasil.`;

  const userPrompt = `Ache produtos similares para o seguinte item:

${targetDetails}`;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = await getModel();

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "produtos_similares", strict: true, schema: SCHEMA },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Resposta vazia da IA.");

    const parsed = JSON.parse(raw);
    return Response.json({
      target_name: targetName,
      similar_items: parsed.similar_items ?? [],
    });
  } catch (error) {
    console.error("[similar]", error);
    return Response.json(
      { error: "Não foi possível encontrar produtos similares no momento." },
      { status: 502 }
    );
  }
}

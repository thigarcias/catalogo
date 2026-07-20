import OpenAI from "openai";
import { buildCompareContext, COMPARE_SYSTEM } from "@/lib/catalog-context";

export const maxDuration = 60;

/**
 * Devolve o veredito como JSON estruturado, nao como texto: a UI monta um
 * placar lado a lado, entao precisa dos numeros separados por criterio.
 *
 * O modelo referencia os itens por indice (1..N) e o servidor traduz para id
 * antes de responder, descartando indice invalido.
 */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["winner_index", "verdict", "scores", "criteria"],
  properties: {
    winner_index: {
      type: "integer",
      description: "Índice (1..N) do item vencedor. Escolha um, sem empate.",
    },
    verdict: {
      type: "string",
      description:
        "Uma frase dizendo por que o vencedor ganhou, citando o dado decisivo. Refira-se aos produtos pelo NOME ou marca — nunca por 'Item 1', 'Item 2': a numeração é interna e o usuário não a vê.",
    },
    scores: {
      type: "array",
      description: "Uma entrada por item, na mesma ordem recebida.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "score", "summary", "strengths", "weaknesses"],
        properties: {
          index: { type: "integer" },
          score: {
            type: "integer",
            description:
              "Nota geral de 0 a 100. Use a faixa toda: dois itens bons e diferentes não devem empatar.",
          },
          summary: {
            type: "string",
            description: "Até 12 palavras resumindo o item.",
          },
          strengths: {
            type: "array",
            items: { type: "string" },
            description: "Até 3 pontos fortes, frases curtas.",
          },
          weaknesses: {
            type: "array",
            items: { type: "string" },
            description: "Até 3 pontos fracos, frases curtas.",
          },
        },
      },
    },
    criteria: {
      type: "array",
      description:
        "Entre 3 e 6 critérios que de fato separam os itens. Ignore o que é igual em todos.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "winner_index", "values"],
        properties: {
          label: {
            type: "string",
            description: "Ex: Preço, Capacidade, Avaliação, Consumo.",
          },
          winner_index: {
            type: ["integer", "null"],
            description: "Índice do melhor neste critério, ou null se empatam.",
          },
          values: {
            type: "array",
            description: "Um valor por item, na ordem dos índices.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["index", "value"],
              properties: {
                index: { type: "integer" },
                value: {
                  type: "string",
                  description:
                    "Valor curto e comparável. '—' se o dado não existir.",
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

const PROMPT = `Compare estes produtos e dê um veredito.

- Escolha um vencedor. Não empate e não termine em cima do muro.
- Os critérios devem ser atributos técnicos do produto que você conhece: consumo, ruído, capacidade útil, construção, refrigeração, assistência, defeitos conhecidos do modelo.
- Todo critério precisa ter um valor CONCRETO para cada produto — um número, uma tecnologia, um veredito curto. Se você não tem valor concreto para todos, escolha outro critério.
- No máximo um critério pode ser preço.
- Em qualquer texto visível, chame os produtos pelo nome ou marca. A numeração "Item N" é só referência interna.`;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY não configurada no servidor." },
      { status: 501 },
    );
  }

  let ids: string[];
  try {
    const body = await request.json();
    ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (ids.length < 2) {
    return Response.json(
      { error: "Selecione pelo menos 2 itens." },
      { status: 400 },
    );
  }

  const { items, text } = await buildCompareContext(ids.slice(0, 6));
  if (items.length < 2) {
    return Response.json({ error: "Itens não encontrados." }, { status: 404 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      messages: [
        { role: "system", content: COMPARE_SYSTEM },
        { role: "user", content: `${PROMPT}\n\n${text}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "comparacao", strict: true, schema: SCHEMA },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("resposta vazia");

    const parsed = JSON.parse(raw);
    const indexToId = (i: unknown): string | null =>
      typeof i === "number" && i >= 1 && i <= items.length
        ? items[i - 1].id
        : null;

    return Response.json({
      winner_id: indexToId(parsed.winner_index),
      verdict: String(parsed.verdict ?? ""),
      scores: (parsed.scores ?? [])
        .map((s: Record<string, unknown>) => ({
          item_id: indexToId(s.index),
          score: Math.max(0, Math.min(100, Number(s.score) || 0)),
          summary: String(s.summary ?? ""),
          strengths: toStringArray(s.strengths),
          weaknesses: toStringArray(s.weaknesses),
        }))
        .filter((s: { item_id: string | null }) => s.item_id),
      // Um critério só entra se tiver valor concreto para TODOS os produtos.
      // Meia linha preenchida é pior que linha nenhuma num placar.
      criteria: (parsed.criteria ?? [])
        .map((c: Record<string, unknown>) => ({
          label: String(c.label ?? ""),
          winner_id: indexToId(c.winner_index),
          values: (Array.isArray(c.values) ? c.values : [])
            .map((v: Record<string, unknown>) => ({
              item_id: indexToId(v.index),
              value: String(v.value ?? ""),
            }))
            .filter(
              (v: { item_id: string | null; value: string }) =>
                v.item_id && !isNonAnswer(v.value),
            ),
        }))
        .filter(
          (c: { label: string; values: unknown[] }) =>
            c.label &&
            !isNonAnswer(c.label) &&
            c.values.length === items.length,
        ),
    });
  } catch (error) {
    console.error("[compare]", error);
    return Response.json(
      { error: "Não consegui comparar agora." },
      { status: 502 },
    );
  }
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !isNonAnswer(x))
    .slice(0, 3);
}

/**
 * Rede de seguranca deterministica para o que o prompt pede mas nao garante.
 *
 * O modelo as vezes devolve "sem alerta especifico no catalogo" ou "nao ha
 * dados de consumo" como se fosse conteudo. Isso nao e comparacao de produto,
 * e ocupa uma linha do placar dizendo nada. Melhor sumir com a linha do que
 * mostrar uma nao-resposta.
 */
const NON_ANSWER =
  /(catálogo|catalogo|anúncio|anuncio|listagem|cadastro|sem (dados|informa|alerta|detalh)|não (há|ha|informado|especificado|consta|disponível)|nao (ha|informado|especificado|consta)|informação não|informacao nao|n\/d|desconhecid)/i;

function isNonAnswer(text: string): boolean {
  const clean = text.trim();
  return clean === "" || clean === "—" || clean === "-" || NON_ANSWER.test(clean);
}

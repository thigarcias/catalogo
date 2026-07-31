import OpenAI from "openai";
import { getModel } from "@/lib/openai";
import type { Source } from "@/lib/types";

/**
 * Extracao de dados de produto a partir de um link, em duas vias.
 *
 * A diferenca entre elas foi medida, no mesmo link da Amazon, 3 chamadas cada:
 *
 *   ler a pagina  -> 4419, 4419, 4419   (correto, deterministico)
 *   busca web     -> 4119, 4119, 4419   (o valor 4119 nao existe na pagina)
 *
 * Ou seja: o modelo le bem e lembra mal. Entao so o caminho que passa o texto
 * da pagina ganha o selo "extraido"; o caminho de busca fica como "estimado",
 * porque na pratica ele as vezes acha um anuncio parecido ou um preco antigo.
 *
 * O caminho de leitura depende de JINA_API_KEY: sem chave o r.jina.ai devolve
 * uma versao reduzida da pagina (~6KB) que nao traz preco.
 */

export type Extracted = {
  name: string | null;
  price: number | null;
  store: string | null;
  image_url: string | null;
  rating: number | null;
  value_score: number | null;
  notes: string | null;
  pros: string[];
  cons: string[];
  price_source: Source;
  /** Como o dado foi obtido, para a UI explicar ao usuario. */
  method: "leitura" | "busca" | "nenhum";
  warning: string | null;
};

const MAX_PAGE_CHARS = 120_000;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "price",
    "store",
    "image_url",
    "rating",
    "value_score",
    "notes",
    "pros",
    "cons",
  ],
  properties: {
    name: {
      type: ["string", "null"],
      description: "Nome do produto, conciso, sem texto promocional.",
    },
    price: {
      type: ["number", "null"],
      description:
        "Valor a vista total em reais. NUNCA o valor da parcela. Se aparece '10x de R$ 441,90', o preco e 4419.00, nao 441.90.",
    },
    store: { type: ["string", "null"], description: "Nome da loja." },
    image_url: {
      type: ["string", "null"],
      description:
        "URL de imagem do produto que aparece LITERALMENTE no conteudo recebido. Nunca montar ou adivinhar uma URL.",
    },
    rating: {
      type: ["number", "null"],
      description: "Avaliacao media de 0 a 5.",
    },
    value_score: {
      type: ["integer", "null"],
      description:
        "Custo-beneficio de 0 a 10 ante concorrentes da mesma faixa. null se nao houver base.",
    },
    notes: {
      type: ["string", "null"],
      description:
        "Especificacoes tecnicas objetivas para comparar: capacidade, dimensoes, consumo, voltagem, cor, material. PROIBIDO incluir pros, contras, vantagens ou opinioes no notes. Ate 2 frases.",
    },
    pros: {
      type: "array",
      items: { type: "string" },
      description:
        "Ate 4 pontos positivos DO PRODUTO, baseados nas specs e nas avaliacoes de quem comprou. Frases curtas. NUNCA coloque estes pontos em 'notes'. Array vazio se nao houver base.",
    },
    cons: {
      type: "array",
      items: { type: "string" },
      description:
        "Ate 4 pontos negativos DO PRODUTO ou reclamacoes recorrentes. Frases curtas. NUNCA coloque estes pontos em 'notes'. Nao invente defeito para preencher: array vazio e uma resposta valida.",
    },
  },
} as const;

const SYSTEM = `Voce extrai dados de produtos de lojas brasileiras para um catalogo de comparacao de compras.

Regras inviolaveis de separacao de campos:
- notes/observacoes: EXCLUSIVO para especificacoes tecnicas neutras (ex: capacidade em L/kg, voltagem, dimensoes, consumo kWh, material, modelo). PROIBIDO colocar pros, contras, vantagens ou opinioes neste campo.
- pros: lista de ate 4 pontos positivos/vantagens reais do produto. Deve ir OBRIGATORIAMENTE no array 'pros', NUNCA no texto de 'notes'.
- cons: lista de ate 4 pontos negativos/desvantagens/defeitos recorrentes do produto. Deve ir OBRIGATORIAMENTE no array 'cons', NUNCA no texto de 'notes'.
- price e sempre o valor A VISTA TOTAL, nunca parcela. Desconfie de valores baixos demais para a categoria.
- Nao invente URL de imagem. So devolva uma que esteja literalmente no conteudo.
- Prefira devolver null a chutar. Campo vazio o usuario preenche; campo errado ele nao percebe.
- pros e cons descrevem o PRODUTO, nunca o anuncio. Nada de disponibilidade,
  estoque, vendedor, frete, prazo ou promocao: isso muda de loja para loja e
  fica desatualizado no catalogo no dia seguinte.
- Escreva em portugues do Brasil.`;

// ---------------------------------------------------------------------------

/** Baixa a pagina como markdown limpo. Retorna null se vier vazio ou bloqueado. */
async function readPage(url: string): Promise<string | null> {
  const key = process.env.JINA_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Return-Format": "markdown",
      },
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return null;

    const text = await res.text();
    // Paginas bloqueadas voltam com poucos KB (banner de cookies, WAF, login).
    return text.length > 12_000 ? text.slice(0, MAX_PAGE_CHARS) : null;
  } catch {
    return null;
  }
}

/** Le a pagina de verdade: preciso o suficiente para valer o selo "extraido". */
async function viaLeitura(
  client: OpenAI,
  url: string,
  model: string,
): Promise<Partial<Extracted> | null> {
  const page = await readPage(url);
  if (!page) return null;

  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Pagina de ${url}:\n\n${page}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "produto", strict: true, schema: SCHEMA },
    },
  });

  const raw = res.choices[0]?.message?.content;
  return raw ? safeParse(raw) : null;
}

/** Recorre a busca quando a loja bloqueia leitura. Menos confiavel. */
async function viaBusca(
  client: OpenAI,
  url: string,
  model: string,
): Promise<Partial<Extracted> | null> {
  const res = await client.responses.create({
    model,
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Nao foi possivel abrir esta pagina. Pesquise o produto e extraia o que conseguir: ${url}

Responda apenas com JSON no seguinte formato:
{"name": string|null, "price": number|null, "store": string|null, "image_url": string|null, "rating": number|null, "value_score": number|null, "notes": string|null, "pros": string[], "cons": string[]}

ATENCAO: Mantenha 'notes' apenas para especificacoes tecnicas neutras. Separe pontos positivos no array 'pros' e pontos negativos no array 'cons'.`,
      },
    ],
  });

  return res.output_text ? safeParse(res.output_text) : null;
}

// ---------------------------------------------------------------------------

export async function extractFromUrl(url: string): Promise<Extracted> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = await getModel();

  const read = await viaLeitura(client, url, model);
  if (read?.name || read?.price != null) {
    return finish(read, "leitura");
  }

  const searched = await viaBusca(client, url, model);
  if (searched?.name || searched?.price != null) {
    return finish(searched, "busca");
  }

  return finish({}, "nenhum");
}

async function finish(
  data: Partial<Extracted>,
  method: Extracted["method"],
): Promise<Extracted> {
  const price = asNumber(data.price);

  return {
    name: asString(data.name),
    price,
    store: asString(data.store),
    image_url: await validateImage(asString(data.image_url)),
    rating: asNumber(data.rating),
    value_score: asInt(data.value_score),
    notes: asString(data.notes),
    pros: asStringArray(data.pros),
    cons: asStringArray(data.cons),
    price_source:
      price == null ? "manual" : method === "leitura" ? "extraido" : "estimado",
    method,
    warning:
      method === "busca" && price != null
        ? "A loja bloqueou a leitura da página, então este preço veio de busca — confira antes de decidir."
        : method === "nenhum"
          ? "Não consegui obter os dados deste link. Preencha manualmente."
          : null,
  };
}

/** Confere se a URL responde e e mesmo uma imagem, contra URL inventada. */
async function validateImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5_000),
    });
    const type = res.headers.get("content-type") ?? "";
    return res.ok && type.startsWith("image/") ? url : null;
  } catch {
    return null;
  }
}

function safeParse(raw: string): Partial<Extracted> | null {
  // Respostas de busca as vezes vem embrulhadas em cerca de codigo.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asInt(v: unknown): number | null {
  const n = asNumber(v);
  return n != null ? Math.round(n) : null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);
}

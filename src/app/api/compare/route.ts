import OpenAI from "openai";
import { buildCatalogContext, CATALOG_SYSTEM } from "@/lib/catalog-context";

export const maxDuration = 60;

const COMPARE_PROMPT = `Compare os itens abaixo e ajude a decidir.

Estruture assim, em markdown:

**Recomendação:** o item escolhido, em uma frase, com o motivo principal.

**Por quê:** 2 a 4 bullets comparando o que de fato diferencia — preço, specs,
avaliação, prós e contras. Só o que separa um do outro; ignore o que é igual.

**Quando o outro faria mais sentido:** uma frase por alternativa descartada,
dizendo em que cenário ela ganharia.

**O que falta saber:** só se algum dado importante estiver ausente ou marcado
como estimado. Omita esta seção se não houver nada relevante.

Seja específico e cite os números. Sem preâmbulo.`;

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

  const catalog = await buildCatalogContext(ids.slice(0, 10));
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const stream = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      stream: true,
      messages: [
        { role: "system", content: CATALOG_SYSTEM },
        { role: "user", content: `${COMPARE_PROMPT}\n\n${catalog}` },
      ],
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[compare]", error);
    return Response.json(
      { error: "Não consegui comparar agora." },
      { status: 502 },
    );
  }
}

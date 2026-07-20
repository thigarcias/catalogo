import OpenAI from "openai";
import { getModel } from "@/lib/openai";
import { buildCatalogContext, CATALOG_SYSTEM } from "@/lib/catalog-context";

export const maxDuration = 60;

type Message = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY não configurada no servidor." },
      { status: 501 },
    );
  }

  let messages: Message[];
  try {
    const body = await request.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (messages.length === 0) {
    return Response.json({ error: "Nenhuma mensagem." }, { status: 400 });
  }

  // Guarda contra um historico longo demais estourar o contexto.
  const recent = messages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m.content ?? "").slice(0, 4000),
  }));

  const catalog = await buildCatalogContext();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = await getModel();

  try {
    const stream = await client.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: CATALOG_SYSTEM },
        { role: "system", content: `Catálogo atual:\n\n${catalog}` },
        ...recent,
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
        } catch {
          controller.enqueue(encoder.encode("\n\n[conexão interrompida]"));
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
    console.error("[chat]", error);
    return Response.json(
      { error: "Não consegui responder agora." },
      { status: 502 },
    );
  }
}

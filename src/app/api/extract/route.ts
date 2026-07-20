import { NextResponse } from "next/server";
import { extractFromUrl } from "@/lib/extract";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY não configurada no servidor." },
      { status: 501 },
    );
  }

  let url: string;
  try {
    const body = await request.json();
    url = String(body?.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Link inválido." }, { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json(
      { error: "Use um link http ou https." },
      { status: 400 },
    );
  }

  try {
    const data = await extractFromUrl(parsed.toString());
    return NextResponse.json(data);
  } catch (error) {
    console.error("[extract]", error);
    return NextResponse.json(
      { error: "Não consegui analisar o link. Preencha manualmente." },
      { status: 502 },
    );
  }
}

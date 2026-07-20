import { createClient } from "@/lib/supabase/server";
import { DEFAULT_MODEL } from "@/lib/constants";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("model")
    .eq("id", true)
    .single();

  if (error || !data) {
    return Response.json({ model: DEFAULT_MODEL });
  }

  return Response.json({ model: data.model || DEFAULT_MODEL });
}

export async function PUT(request: Request) {
  let model: string;
  try {
    const body = await request.json();
    model = String(body?.model ?? "").trim();
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (!model) {
    return Response.json({ error: "Modelo não pode ser vazio." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ model, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) {
    console.error("[settings]", error);
    return Response.json(
      { error: "Falha ao salvar configuração." },
      { status: 500 },
    );
  }

  return Response.json({ model });
}

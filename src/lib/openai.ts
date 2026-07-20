import OpenAI from "openai";
import { DEFAULT_MODEL } from "@/lib/constants";

export { DEFAULT_MODEL };

/**
 * @deprecated Use `getModel()` para ler o modelo configurado em runtime.
 * Mantido apenas para não quebrar imports existentes durante a migração.
 */
export const MODEL = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

/**
 * Lê o modelo vigente da tabela app_settings (configurável pelo menu oculto).
 * Hierarquia: banco → env OPENAI_MODEL → DEFAULT_MODEL.
 *
 * Usa import dinâmico do cliente Supabase server para não puxar cookies()
 * para o bundle de client components que importam apenas DEFAULT_MODEL.
 */
export async function getModel(): Promise<string> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("model")
      .eq("id", true)
      .single();
    if (data?.model) return data.model;
  } catch {
    // Supabase indisponível — segue com fallback.
  }
  return process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
}

export function openai() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

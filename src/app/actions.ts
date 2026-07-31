"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { linesToArray, type ItemStatus, type Source } from "@/lib/types";

/** Campo numerico opcional vindo de <input>: "" vira null, "4.499,90" vira 4499.9 */
function num(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function int(value: FormDataEntryValue | null | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : null;
  }
  const parsed = num(value);
  return parsed != null ? Math.round(parsed) : null;
}

function str(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return raw || null;
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    parent_id: str(formData.get("parent_id")),
    name,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function renameCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function deleteCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // ON DELETE CASCADE remove subcategorias e itens junto.
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect("/");
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

function itemPayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    url: str(formData.get("url")),
    store: str(formData.get("store")),
    image_url: str(formData.get("image_url")),
    price: num(formData.get("price")),
    rating: num(formData.get("rating")),
    value_score: int(formData.get("value_score")),
    notes: str(formData.get("notes")),
    pros: linesToArray(String(formData.get("pros") ?? "")),
    cons: linesToArray(String(formData.get("cons") ?? "")),
    status: (str(formData.get("status")) ?? "candidato") as ItemStatus,
    source: (str(formData.get("source")) ?? "manual") as Source,
    price_source: (str(formData.get("price_source")) ?? "manual") as Source,
  };
}

export async function createItem(formData: FormData) {
  const category_id = String(formData.get("category_id") ?? "");
  const payload = itemPayload(formData);
  if (!category_id || !payload.name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .insert({ ...payload, category_id });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function updateItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const payload = itemPayload(formData);
  if (!id || !payload.name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("items").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function deleteItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function toggleFavorite(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("is_favorite")) === "true";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .update({ is_favorite: next })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function setItemStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = str(formData.get("status")) as ItemStatus | null;
  if (!id || !status) return;

  const supabase = await createClient();
  const { error } = await supabase.from("items").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export type AIItemInput = {
  category_id: string;
  name: string;
  url?: string | null;
  store?: string | null;
  price?: number | null;
  notes?: string | null;
  pros?: string[];
  cons?: string[];
  rating?: number | null;
  value_score?: number | null;
};

export async function createItemFromAI(data: AIItemInput) {
  if (!data.category_id || !data.name?.trim()) return;

  const supabase = await createClient();
  const { error } = await supabase.from("items").insert({
    category_id: data.category_id,
    name: data.name.trim(),
    url: data.url?.trim() || null,
    store: data.store?.trim() || null,
    image_url: null,
    price: data.price ?? null,
    rating: data.rating ?? null,
    value_score: data.value_score != null ? int(data.value_score) : null,
    notes: data.notes?.trim() || null,
    pros: Array.isArray(data.pros) ? data.pros : [],
    cons: Array.isArray(data.cons) ? data.cons : [],
    status: "candidato",
    source: "extraido",
    price_source: "estimado",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}


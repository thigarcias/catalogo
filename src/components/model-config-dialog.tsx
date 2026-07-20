"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_MODEL } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Menu oculto de configuração: aparece ao clicar 3× rápido no título "Catálogo".
 * Permite trocar o modelo de IA usado pelas rotas de extração, chat e comparação.
 */
export function ModelConfigDialog() {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Gatilho de clique triplo ────────────────────────────────────────────
  const handleClick = useCallback(() => {
    clickCount.current += 1;

    if (clickTimer.current) clearTimeout(clickTimer.current);

    if (clickCount.current >= 3) {
      clickCount.current = 0;
      setOpen(true);
    } else {
      clickTimer.current = setTimeout(() => {
        clickCount.current = 0;
      }, 500); // 500ms para completar os 3 cliques
    }
  }, []);

  // ── Carrega o modelo atual ao abrir ─────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setSaved(false);
      return;
    }

    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("app_settings")
          .select("model")
          .eq("id", true)
          .single();
        setModel(data?.model || DEFAULT_MODEL);
      } catch {
        setModel(DEFAULT_MODEL);
      }
    })();
  }, [open]);

  // ── Salvar ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimmed = model.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: trimmed }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setOpen(false), 600);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Título-gatilho: visualmente idêntico ao original, sem pista de que é clicável */}
      <button
        type="button"
        onClick={handleClick}
        className="text-sm font-medium tracking-tight text-left cursor-default select-none focus:outline-none"
        aria-label="Catálogo"
      >
        Catálogo
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Configuração</DialogTitle>
            <DialogDescription>
              Modelo de IA usado na extração, chat e comparação. A mudança vale
              imediatamente para todas as próximas chamadas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="model-input">Modelo</Label>
            <Input
              id="model-input"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setSaved(false);
              }}
              placeholder={DEFAULT_MODEL}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Ex: gpt-5.4-nano, gpt-5.4-mini, gpt-5.4, o3-mini
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={saving || !model.trim()}
              size="sm"
            >
              {saving ? "Salvando…" : saved ? "✓ Salvo" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

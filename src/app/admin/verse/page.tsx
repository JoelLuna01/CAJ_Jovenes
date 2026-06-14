// src/app/admin/verse/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "../../../components/admin/AdminGuard";
import { supabase } from "../../../lib/supabase";

interface DailyVerse {
  id: string;
  verse_text: string;
  verse_reference: string;
  is_auto: boolean;
}

export default function AdminVersePage() {
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [reference, setReference] = useState("");
  const [isAuto, setIsAuto] = useState(true);
  const [saved, setSaved] = useState(false);
  const [previewAuto, setPreviewAuto] = useState<{ verse: string; reference: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("daily_verse")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setVerse(data as DailyVerse);
          setText(data.verse_text);
          setReference(data.verse_reference);
          setIsAuto(data.is_auto);
        }
        setLoading(false);
      });
  }, []);

  // Fetch auto verse preview from bible-api
  useEffect(() => {
    if (!isAuto) return;
    setPreviewLoading(true);
    fetch("https://bible-api.com/john+3:16?translation=rve")
      .then((r) => r.json())
      .then((data) => {
        setPreviewAuto({
          verse: data.text?.trim() || "Porque de tal manera amó Dios al mundo...",
          reference: data.reference || "Juan 3:16",
        });
      })
      .catch(() => {
        setPreviewAuto({
          verse: "No se pudo cargar el versículo automático.",
          reference: "",
        });
      })
      .finally(() => setPreviewLoading(false));
  }, [isAuto]);

  const handleSave = async () => {
    if (saving || !verse) return;
    if (!isAuto && (!text.trim() || !reference.trim())) return;
    setSaving(true);

    await supabase
      .from("daily_verse")
      .update({
        verse_text: isAuto ? (previewAuto?.verse || text) : text.trim(),
        verse_reference: isAuto ? (previewAuto?.reference || reference) : reference.trim(),
        is_auto: isAuto,
        updated_at: new Date().toISOString(),
      })
      .eq("id", verse.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AdminGuard>
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b" style={{ borderColor: "#1e293b" }}>
          <Link href="/admin">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </div>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Versículo del Día</h1>
            <p className="text-xs" style={{ color: "#475569" }}>Configura lo que verán los jóvenes</p>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl animate-shimmer" />)}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Mode selector */}
            <div className="card-glass rounded-2xl p-1 flex gap-1">
              <button
                onClick={() => setIsAuto(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={isAuto
                  ? { background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white" }
                  : { color: "#64748b" }}
              >
                🔄 Automático
              </button>
              <button
                onClick={() => setIsAuto(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={!isAuto
                  ? { background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white" }
                  : { color: "#64748b" }}
              >
                ✏️ Manual
              </button>
            </div>

            {/* Auto mode */}
            {isAuto && (
              <div className="space-y-3">
                <div className="card-glass rounded-2xl p-4" style={{ border: "1px solid rgba(99,102,241,0.2)" }}>
                  <p className="text-xs font-bold mb-2" style={{ color: "#6366f1" }}>¿Cómo funciona el automático?</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
                    La app obtiene un versículo de la Biblia Reina-Valera Española (RVE) desde una API gratuita cada vez que se recarga. El versículo puede variar dependiendo del día.
                  </p>
                </div>

                {/* Preview */}
                <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <p className="text-[10px] font-bold mb-3 uppercase tracking-wider" style={{ color: "#a5b4fc" }}>
                    Vista previa (actual)
                  </p>
                  {previewLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 rounded animate-shimmer" />
                      <div className="h-4 w-2/3 rounded animate-shimmer" />
                    </div>
                  ) : previewAuto ? (
                    <>
                      <p className="text-white font-medium text-sm leading-relaxed mb-2">
                        "{previewAuto.verse}"
                      </p>
                      <p className="text-xs" style={{ color: "#6366f1" }}>— {previewAuto.reference}</p>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Manual mode */}
            {!isAuto && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: "#94a3b8" }}>Texto del versículo *</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="input-field"
                    placeholder='"Todo lo puedo en Cristo que me fortalece."'
                    rows={4}
                    style={{ resize: "none" }}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: "#94a3b8" }}>Referencia bíblica *</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="input-field"
                    placeholder="Ej: Filipenses 4:13"
                  />
                </div>

                {/* Preview */}
                {text && reference && (
                  <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <p className="text-[10px] font-bold mb-3 uppercase tracking-wider" style={{ color: "#a5b4fc" }}>Vista previa</p>
                    <p className="text-white font-medium text-sm leading-relaxed mb-2">"{text}"</p>
                    <p className="text-xs" style={{ color: "#6366f1" }}>— {reference}</p>
                  </div>
                )}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || saved || (!isAuto && (!text.trim() || !reference.trim()))}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
              style={saved
                ? { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }
                : { background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
            >
              {saved ? "✓ Guardado con éxito" : saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}
      </main>
    </AdminGuard>
  );
}

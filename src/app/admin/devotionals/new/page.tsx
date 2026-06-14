// src/app/admin/devotionals/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminGuard } from "../../../../components/admin/AdminGuard";
import { useAuthStore } from "../../../../store/auth";
import { supabase } from "../../../../lib/supabase";

export default function NewDevotionalPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!profile || !title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("devotionals").insert({
      title: title.trim(),
      content: content.trim(),
      author_id: profile.id,
      published_date: new Date(date).toISOString(),
    });

    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      router.push("/admin/devotionals");
    }
  };

  return (
    <AdminGuard>
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b" style={{ borderColor: "#1e293b" }}>
          <Link href="/admin/devotionals">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </div>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Nuevo devocional</h1>
            <p className="text-xs" style={{ color: "#475569" }}>Crear y publicar</p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#94a3b8" }}>Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Ej: El amor de Dios es incondicional"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#94a3b8" }}>Fecha de publicación</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              style={{ colorScheme: "dark" }}
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-2" style={{ color: "#94a3b8" }}>Contenido</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input-field"
              placeholder="Escribe el devocional aquí...&#10;&#10;Puedes incluir versículos bíblicos, reflexiones y aplicaciones prácticas."
              rows={14}
              style={{ resize: "none" }}
            />
          </div>

          {/* Preview */}
          {title && (
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "#6366f1" }}>VISTA PREVIA</p>
              <p className="font-bold text-white text-sm mb-1">{title}</p>
              <p className="text-xs line-clamp-3" style={{ color: "#64748b" }}>{content}</p>
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <div className="px-5 pb-6 pt-3 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid #1e293b" }}>
          <Link
            href="/admin/devotionals"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-center transition-colors"
            style={{ background: "#1e293b", color: "#94a3b8" }}
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            className="flex-1 btn-primary py-3 text-sm"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Publicando...
              </span>
            ) : "Publicar"}
          </button>
        </div>
      </main>
    </AdminGuard>
  );
}

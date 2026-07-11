// src/app/notes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";
import { Note } from "../../types";

export default function NotesPage() {
  const { user, profile, isLoading } = useAuthStore();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [devotionalsMap, setDevotionalsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const notesList = (data as Note[]) || [];
        setNotes(notesList);

        // Fetch referenced devotionals titles
        const linkedDevoIds = [
          ...new Set(notesList.filter((n) => n.devotional_id).map((n) => n.devotional_id as string)),
        ];

        if (linkedDevoIds.length > 0) {
          const { data: devos } = await supabase
            .from("devotionals")
            .select("id, title")
            .in("id", linkedDevoIds);

          if (devos) {
            const map: Record<string, string> = {};
            devos.forEach((d: any) => {
              map[d.id] = d.title;
            });
            setDevotionalsMap(map);
          }
        }
        setLoading(false);
      });
  }, [profile]);

  const handleSave = async () => {
    if (!profile || !title.trim() || !content.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: profile.id, title: title.trim(), content: content.trim() })
      .select()
      .single();
    if (!error && data) {
      setNotes((prev) => [data as Note, ...prev]);
      setTitle("");
      setContent("");
      setCreating(false);
    }
    setSaving(false);
  };

  if (isLoading || !user) return null;

  return (
    <main className="flex flex-col min-h-screen safe-top p-5 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Diario Espiritual</h1>
          <p className="text-sm" style={{ color: "#475569" }}>Tus reflexiones privadas</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* New note sheet */}
      {creating && (
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setCreating(false); }}
        >
          <div
            className="rounded-t-3xl flex flex-col"
            style={{
              background: "#0f172a",
              border: "1px solid rgba(99,102,241,0.15)",
              maxHeight: "85dvh",
              paddingBottom: "env(safe-area-inset-bottom, 16px)"
            }}
          >
            {/* Fixed header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">Nueva nota</h2>
              <button onClick={() => setCreating(false)} style={{ color: "#64748b" }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 pb-2 flex flex-col gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="Título"
                autoFocus
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input-field"
                placeholder="¿Qué te habló Dios hoy?"
                rows={7}
                style={{ resize: "none" }}
              />
            </div>

            {/* Fixed footer button */}
            <div className="px-6 pt-3 pb-5 flex-shrink-0">
              <button
                className="btn-primary w-full"
                onClick={handleSave}
                disabled={saving || !title.trim() || !content.trim()}
              >
                {saving ? "Guardando..." : "Guardar nota"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="card-glass rounded-2xl p-8 text-center mt-4">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "#334155" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
          </svg>
          <p className="font-semibold text-white mb-1">Tu diario está vacío</p>
          <p className="text-sm" style={{ color: "#475569" }}>Toca el + para escribir tu primera nota</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {notes.map((note, i) => (
            <div
              key={note.id}
              className="card-glass rounded-2xl p-4 animate-fadeUp"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-white text-sm">{note.title}</p>
                <span className="text-[10px] flex-shrink-0" style={{ color: "#334155" }}>
                  {new Date(note.created_at).toLocaleDateString("es")}
                </span>
              </div>
              {note.devotional_id && devotionalsMap[note.devotional_id] && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-400 font-semibold">
                  <span>📖</span>
                  <span>Devocional: {devotionalsMap[note.devotional_id]}</span>
                </div>
              )}
              <p className="text-xs mt-2 line-clamp-3 leading-relaxed" style={{ color: "#475569" }}>
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

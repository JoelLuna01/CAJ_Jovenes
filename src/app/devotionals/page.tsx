// src/app/devotionals/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";
import { Devotional, DevotionalCompletion } from "../../types";

export default function DevotionalsPage() {
  const { user, profile, isLoading } = useAuthStore();
  const router = useRouter();
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [completionsMap, setCompletionsMap] = useState<Record<string, DevotionalCompletion>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Devotional | null>(null);
  
  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  const fetchDevotionalsAndCompletions = () => {
    if (!profile) return;

    Promise.all([
      supabase
        .from("devotionals")
        .select("*")
        .order("published_date", { ascending: false }),
      supabase
        .from("devotional_completions")
        .select("*")
        .eq("user_id", profile.id)
    ]).then(([devRes, compRes]) => {
      setDevotionals((devRes.data as Devotional[]) || []);
      
      const map: Record<string, DevotionalCompletion> = {};
      if (compRes.data) {
        compRes.data.forEach((item: any) => {
          map[item.devotional_id] = item as DevotionalCompletion;
        });
      }
      setCompletionsMap(map);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDevotionalsAndCompletions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleUploadEvidence = async () => {
    if (!profile || !selected || !selectedFile || submitting) return;
    setSubmitting(true);

    try {
      // 1. Upload to Supabase Storage
      const ext = selectedFile.name.split(".").pop();
      const path = `${profile.id}/${selected.id}_evidence_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("devotionals")
        .upload(path, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: urlData } = supabase.storage
        .from("devotionals")
        .getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // 3. Upsert completion entry
      const { data: dbData, error: dbError } = await supabase
        .from("devotional_completions")
        .upsert(
          {
            user_id: profile.id,
            devotional_id: selected.id,
            image_url: publicUrl,
            status: "PENDING",
            feedback: null,
            completed_at: new Date().toISOString(),
            reviewed_at: null,
            reviewed_by: null
          },
          {
            onConflict: "devotional_id,user_id"
          }
        )
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Update local state
      if (dbData) {
        setCompletionsMap((prev) => ({
          ...prev,
          [selected.id]: dbData as DevotionalCompletion
        }));
        setSelectedFile(null);
        setPreviewImage(null);
      }
    } catch (error: any) {
      console.error("Error al subir evidencia:", error);
      alert("Error al guardar la evidencia: " + (error.message || error));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user) return null;

  const userCompletion = selected ? completionsMap[selected.id] : null;

  if (selected) {
    return (
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        <div className="p-5 flex-1 flex flex-col">
          <button
            onClick={() => {
              setSelected(null);
              setSelectedFile(null);
              setPreviewImage(null);
            }}
            className="flex items-center gap-2 text-sm mb-6 flex-shrink-0"
            style={{ color: "#6366f1" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver
          </button>
          
          <div className="flex-1 overflow-y-auto pb-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold" style={{ color: "#6366f1" }}>
                  {new Date(selected.published_date).toLocaleDateString("es", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
                {userCompletion && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={
                      userCompletion.status === "APPROVED"
                        ? { background: "rgba(16,185,129,0.15)", color: "#34d399" }
                        : userCompletion.status === "REJECTED"
                        ? { background: "rgba(239,68,68,0.15)", color: "#f87171" }
                        : { background: "rgba(245,158,11,0.15)", color: "#fbbf24" }
                    }
                  >
                    {userCompletion.status === "APPROVED"
                      ? "Aprobado ✓"
                      : userCompletion.status === "REJECTED"
                      ? "Necesita corrección ❌"
                      : "Pendiente de revisión ⏳"}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight">{selected.title}</h1>
            </div>

            <div className="prose prose-invert max-w-none text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              {selected.content.split("\n").map((p, i) => p ? <p key={i} className="mb-4">{p}</p> : <br key={i} />)}
            </div>

            {/* Evidence & feedback area */}
            <div className="pt-4 border-t" style={{ borderColor: "#1e293b" }}>
              <h3 className="text-sm font-semibold text-white mb-3">Evidencia del Devocional</h3>
              
              {userCompletion ? (
                <div className="space-y-4">
                  {/* Show current uploaded photo */}
                  <div className="relative rounded-2xl overflow-hidden aspect-video border" style={{ borderColor: "#1e293b", background: "#0f172a" }}>
                    <img
                      src={userCompletion.image_url}
                      alt="Evidencia cargada"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Review feedback bubble */}
                  {userCompletion.feedback && (
                    <div className="p-4 rounded-2xl" style={{ background: "rgba(30,41,59,0.5)", border: "1px solid #1e293b" }}>
                      <p className="text-xs font-bold mb-1" style={{ color: userCompletion.status === "REJECTED" ? "#f87171" : "#34d399" }}>
                        💬 Retroalimentación del Líder:
                      </p>
                      <p className="text-xs text-slate-300 italic">"{userCompletion.feedback}"</p>
                    </div>
                  )}

                  {/* Resubmit flow if rejected */}
                  {userCompletion.status === "REJECTED" && (
                    <div className="space-y-3">
                      <p className="text-xs" style={{ color: "#94a3b8" }}>Sube una nueva foto para corregir tu devocional:</p>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      {previewImage ? (
                        <div className="space-y-3">
                          <div className="relative rounded-xl overflow-hidden aspect-video border" style={{ borderColor: "#6366f1" }}>
                            <img src={previewImage} alt="Nueva vista previa" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setSelectedFile(null); setPreviewImage(null); }}
                              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center"
                              style={{ background: "#1e293b", color: "#94a3b8" }}
                              disabled={submitting}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleUploadEvidence}
                              className="flex-1 btn-primary py-2.5 text-xs"
                              disabled={submitting}
                            >
                              {submitting ? "Subiendo..." : "Enviar Nueva Evidencia"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold"
                          style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px dashed rgba(99,102,241,0.3)" }}
                        >
                          📷 Elegir otra foto
                        </button>
                      )}
                    </div>
                  )}

                  {userCompletion.status === "PENDING" && (
                    <p className="text-xs text-center italic" style={{ color: "#475569" }}>
                      Tu evidencia ha sido entregada. Esperando aprobación del líder.
                    </p>
                  )}

                  {userCompletion.status === "APPROVED" && (
                    <div className="flex items-center justify-center gap-2 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                      <span className="text-xs font-semibold text-[#34d399]">¡Excelente! Devocional aprobado 🎉</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Upload new evidence flow */
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {previewImage ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden aspect-video border" style={{ borderColor: "#6366f1" }}>
                        <img src={previewImage} alt="Vista previa" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setSelectedFile(null); setPreviewImage(null); }}
                          className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-center"
                          style={{ background: "#1e293b", color: "#94a3b8" }}
                          disabled={submitting}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleUploadEvidence}
                          className="flex-1 btn-primary py-3.5 text-sm"
                          disabled={submitting}
                        >
                          {submitting ? "Subiendo..." : "Enviar Evidencia"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-6 rounded-2xl flex flex-col items-center justify-center gap-2"
                        style={{ background: "rgba(99,102,241,0.05)", border: "1px dashed rgba(99,102,241,0.25)", color: "#818cf8" }}
                      >
                        <span className="text-2xl">📷</span>
                        <span className="text-xs font-semibold">Subir foto de evidencia</span>
                        <span className="text-[10px]" style={{ color: "#475569" }}>Sube una foto leyendo o de tus apuntes</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen safe-top p-5 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Devocionales</h1>
      <p className="text-sm mb-6" style={{ color: "#475569" }}>Nutre tu espíritu diariamente</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}
        </div>
      ) : devotionals.length === 0 ? (
        <div className="card-glass rounded-2xl p-8 text-center mt-4">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "#334155" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="text-sm" style={{ color: "#475569" }}>Los devocionales aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devotionals.map((d, i) => {
            const completion = completionsMap[d.id];
            
            // Determine status icon and color
            let statusBadge = null;
            if (completion) {
              if (completion.status === "APPROVED") {
                statusBadge = (
                  <div className="absolute right-0 top-0 w-8 h-8 flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)", borderBottomLeftRadius: "12px" }}>
                    <span className="text-[10px] text-[#34d399] font-bold">✓</span>
                  </div>
                );
              } else if (completion.status === "REJECTED") {
                statusBadge = (
                  <div className="absolute right-0 top-0 w-8 h-8 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", borderBottomLeftRadius: "12px" }}>
                    <span className="text-[10px] text-[#f87171] font-bold">❌</span>
                  </div>
                );
              } else {
                statusBadge = (
                  <div className="absolute right-0 top-0 w-8 h-8 flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)", borderBottomLeftRadius: "12px" }}>
                    <span className="text-[10px] text-[#fbbf24] font-bold">⏳</span>
                  </div>
                );
              }
            }

            return (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className="card-glass card-hover rounded-2xl p-4 w-full text-left animate-fadeUp relative overflow-hidden"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {statusBadge}
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <span className="text-xs font-bold" style={{ color: "#818cf8" }}>
                      {new Date(d.published_date).getDate()}
                    </span>
                    <span className="text-[9px] uppercase" style={{ color: "#6366f1" }}>
                      {new Date(d.published_date).toLocaleString("es", { month: "short" })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-semibold text-white text-sm mb-1 truncate">{d.title}</p>
                    <p className="text-xs line-clamp-2" style={{ color: "#475569" }}>{d.content}</p>
                  </div>
                  <svg className="w-5 h-5 flex-shrink-0 self-center" style={{ color: "#334155" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}

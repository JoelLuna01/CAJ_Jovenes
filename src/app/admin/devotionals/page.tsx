// src/app/admin/devotionals/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "../../../components/admin/AdminGuard";
import { useAuthStore } from "../../../store/auth";
import { supabase } from "../../../lib/supabase";
import { Devotional } from "../../../types";

interface ReviewItem {
  id: string;
  devotional_id: string;
  user_id: string;
  completed_at: string;
  image_url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  feedback: string | null;
  devotionals: { title: string } | null;
  profiles: { first_name: string; last_name: string; avatar_url: string | null } | null;
}

export default function AdminDevotionalsPage() {
  const { profile } = useAuthStore();
  
  // Tab state: 'topics' or 'reviews'
  const [activeTab, setActiveTab] = useState<'topics' | 'reviews'>('topics');
  
  // Devotionals list state
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [loadingDevos, setLoadingDevos] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  
  // Modal state
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchDevotionals = async () => {
    setLoadingDevos(true);
    const { data } = await supabase
      .from("devotionals")
      .select("*")
      .order("published_date", { ascending: false });
    setDevotionals((data as Devotional[]) || []);
    setLoadingDevos(false);
  };

  const fetchReviews = async () => {
    setLoadingReviews(true);

    // 1. Get all completions (avoid relational notation which fails without named FK)
    const { data: completionsData, error: compError } = await supabase
      .from("devotional_completions")
      .select("*")
      .order("completed_at", { ascending: false });

    if (compError) {
      console.error("Error al cargar evidencias:", compError);
      alert("Error al cargar evidencias: " + compError.message);
      setLoadingReviews(false);
      return;
    }

    if (!completionsData || completionsData.length === 0) {
      setReviews([]);
      setLoadingReviews(false);
      return;
    }

    // 2. Get all unique devotional and profile IDs
    const devotionalIds = [...new Set(completionsData.map((c: any) => c.devotional_id))];
    const userIds = [...new Set(completionsData.map((c: any) => c.user_id))];

    // 3. Fetch related devotionals and profiles in parallel
    const [{ data: devotionalsData }, { data: profilesData }] = await Promise.all([
      supabase.from("devotionals").select("id, title").in("id", devotionalIds),
      supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", userIds),
    ]);

    // 4. Build lookup maps
    const devoMap: Record<string, { title: string }> = {};
    (devotionalsData || []).forEach((d: any) => { devoMap[d.id] = { title: d.title }; });

    const profileMap: Record<string, { first_name: string; last_name: string; avatar_url: string | null }> = {};
    (profilesData || []).forEach((p: any) => { profileMap[p.id] = { first_name: p.first_name, last_name: p.last_name, avatar_url: p.avatar_url }; });

    // 5. Merge data manually
    const merged = completionsData.map((c: any) => ({
      ...c,
      devotionals: devoMap[c.devotional_id] || null,
      profiles: profileMap[c.user_id] || null,
    }));

    setReviews(merged);
    setLoadingReviews(false);
  };


  useEffect(() => {
    fetchDevotionals();
    fetchReviews();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este devocional?")) return;
    setDeleting(id);
    const { error } = await supabase.from("devotionals").delete().eq("id", id);
    if (error) {
      console.error("Error al eliminar devocional:", error);
      alert("Error al eliminar devocional: " + error.message);
    } else {
      setDevotionals((prev) => prev.filter((d) => d.id !== id));
    }
    setDeleting(null);
  };

  const handleReviewAction = async (reviewId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!profile) return;
    setReviewingId(reviewId);

    const feedbackText = feedbackInputs[reviewId] || "";

    const { error } = await supabase
      .from("devotional_completions")
      .update({
        status,
        feedback: feedbackText.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile.id
      })
      .eq("id", reviewId);

    if (error) {
      console.error("Error al calificar evidencia:", error);
      alert("Error al actualizar la revisión: " + error.message);
    } else {
      // Update local reviews list
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                status,
                feedback: feedbackText.trim() || null
              }
            : r
        )
      );
    }
    setReviewingId(null);
  };

  return (
    <AdminGuard>
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "#1e293b" }}>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </div>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Devocionales</h1>
              <p className="text-xs" style={{ color: "#475569" }}>
                {activeTab === 'topics' ? `${devotionals.length} publicados` : `${reviews.filter(r => r.status === 'PENDING').length} pendientes`}
              </p>
            </div>
          </div>
          {activeTab === 'topics' && (
            <Link
              href="/admin/devotionals/new"
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl"
              style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo
            </Link>
          )}
        </div>

        {/* Custom Navigation Tabs */}
        <div className="flex px-5 py-3 border-b flex-shrink-0" style={{ borderColor: "#1e293b" }}>
          <button
            onClick={() => setActiveTab('topics')}
            className="flex-1 py-2 text-xs font-bold transition-all text-center rounded-xl"
            style={activeTab === 'topics'
              ? { background: "rgba(99,102,241,0.15)", color: "#818cf8" }
              : { color: "#475569" }}
          >
            📖 Temas Publicados
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className="flex-1 py-2 text-xs font-bold transition-all text-center rounded-xl relative"
            style={activeTab === 'reviews'
              ? { background: "rgba(99,102,241,0.15)", color: "#818cf8" }
              : { color: "#475569" }}
          >
            📷 Revisiones Evidencias
            {reviews.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-slate-950">
                {reviews.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
          {activeTab === 'topics' ? (
            /* Devotional Topics Tab */
            loadingDevos ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}
              </div>
            ) : devotionals.length === 0 ? (
              <div className="card-glass rounded-2xl p-8 text-center mt-4">
                <p className="text-3xl mb-3">📖</p>
                <p className="font-semibold text-white mb-1">Sin devocionales</p>
                <p className="text-sm mb-4" style={{ color: "#475569" }}>Crea el primero ahora</p>
                <Link href="/admin/devotionals/new" className="btn-primary text-sm py-2 px-4">
                  Crear devocional
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {devotionals.map((d, i) => (
                  <div
                    key={d.id}
                    className="card-glass rounded-2xl p-4 animate-fadeUp"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
                      >
                        <span className="text-sm font-bold" style={{ color: "#818cf8" }}>
                          {new Date(d.published_date).getDate()}
                        </span>
                        <span className="text-[9px] uppercase" style={{ color: "#6366f1" }}>
                          {new Date(d.published_date).toLocaleString("es", { month: "short" })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm mb-1 line-clamp-1">{d.title}</p>
                        <p className="text-xs line-clamp-2" style={{ color: "#475569" }}>{d.content}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(d.id)}
                        disabled={deleting === d.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}
                      >
                        {deleting === d.id ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Devotional Review Submissions Tab */
            loadingReviews ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl animate-shimmer" />)}
              </div>
            ) : reviews.length === 0 ? (
              <div className="card-glass rounded-2xl p-8 text-center mt-4">
                <p className="text-3xl mb-3">📷</p>
                <p className="font-semibold text-white mb-1">Sin entregas aún</p>
                <p className="text-sm" style={{ color: "#475569" }}>Las evidencias cargadas por los chicos aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev, i) => {
                  const userPhoto = rev.profiles?.avatar_url;
                  const userName = `${rev.profiles?.first_name || 'Joven'} ${rev.profiles?.last_name || ''}`;
                  const devoTitle = rev.devotionals?.title || 'Devocional';
                  
                  // Initialize feedback input state if empty
                  if (feedbackInputs[rev.id] === undefined && rev.feedback) {
                    setFeedbackInputs(prev => ({ ...prev, [rev.id]: rev.feedback || "" }));
                  }

                  return (
                    <div
                      key={rev.id}
                      className="card-glass rounded-2xl p-4 animate-fadeUp space-y-3 relative overflow-hidden"
                      style={{
                        animationDelay: `${i * 0.04}s`,
                        border: rev.status === 'PENDING' ? '1px solid rgba(245,158,11,0.25)' : undefined
                      }}
                    >
                      {/* User & Devo Info Header */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs overflow-hidden flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                        >
                          {userPhoto ? <img src={userPhoto} alt="" className="w-full h-full object-cover" /> : userName[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{userName}</p>
                          <p className="text-[10px] text-indigo-400 truncate font-semibold">Tema: {devoTitle}</p>
                          <p className="text-[9px]" style={{ color: "#475569" }}>
                            Entregado: {new Date(rev.completed_at).toLocaleDateString("es", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-full font-bold self-start mt-0.5"
                          style={
                            rev.status === "APPROVED"
                              ? { background: "rgba(16,185,129,0.12)", color: "#34d399" }
                              : rev.status === "REJECTED"
                              ? { background: "rgba(239,68,68,0.12)", color: "#f87171" }
                              : { background: "rgba(245,158,11,0.12)", color: "#fbbf24" }
                          }
                        >
                          {rev.status === "APPROVED" ? "Aprobado" : rev.status === "REJECTED" ? "Corregir" : "Pendiente"}
                        </span>
                      </div>

                      {/* Evidence Photo Preview */}
                      <div
                        onClick={() => setSelectedPhoto(rev.image_url)}
                        className="relative rounded-xl overflow-hidden aspect-video border cursor-zoom-in group"
                        style={{ borderColor: "#1e293b", background: "#0f172a" }}
                      >
                        <img
                          src={rev.image_url}
                          alt="Evidencia fotográfica"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-xs font-semibold bg-black/70 px-3 py-1.5 rounded-full">🔍 Ampliar Imagen</span>
                        </div>
                      </div>

                      {/* Feedback Comment Section */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#64748b" }}>
                          Comentarios / Retroalimentación
                        </label>
                        <input
                          type="text"
                          value={feedbackInputs[rev.id] || ""}
                          onChange={(e) => setFeedbackInputs(prev => ({ ...prev, [rev.id]: e.target.value }))}
                          placeholder={rev.status === 'PENDING' ? "Opcional: ¿Qué necesita mejorar o felicítalo!" : "Escribe comentarios de corrección"}
                          className="input-field py-2 text-xs"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleReviewAction(rev.id, 'REJECTED')}
                          disabled={reviewingId === rev.id}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-center border transition-all"
                          style={{
                            background: rev.status === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'transparent',
                            borderColor: 'rgba(239,68,68,0.3)',
                            color: '#f87171'
                          }}
                        >
                          {reviewingId === rev.id ? '...' : 'Rechazar / Corregir'}
                        </button>
                        <button
                          onClick={() => handleReviewAction(rev.id, 'APPROVED')}
                          disabled={reviewingId === rev.id}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-center transition-all"
                          style={{
                            background: rev.status === 'APPROVED' ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            boxShadow: rev.status === 'APPROVED' ? 'none' : '0 2px 8px rgba(16,185,129,0.25)'
                          }}
                        >
                          {reviewingId === rev.id ? '...' : rev.status === 'APPROVED' ? '✓ Aprobado' : '✓ Aprobar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Fullscreen Photo Modal */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
            onClick={() => setSelectedPhoto(null)}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <img
              src={selectedPhoto}
              alt="Ampliada"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </main>
    </AdminGuard>
  );
}

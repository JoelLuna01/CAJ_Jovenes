// src/app/admin/quizzes/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminGuard } from "../../../components/admin/AdminGuard";
import { supabase } from "../../../lib/supabase";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  scheduled_start_at: string | null;
  created_at: string;
  quiz_questions: { count: number }[];
}

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchQuizzes = async () => {
    const { data } = await supabase
      .from("quizzes")
      .select("*, quiz_questions(count)")
      .order("created_at", { ascending: false });
    setQuizzes((data as Quiz[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este cuestionario y todas sus preguntas?")) return;
    setDeletingId(id);
    await supabase.from("quizzes").delete().eq("id", id);
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
    setDeletingId(null);
  };

  return (
    <AdminGuard>
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: "#1e293b" }}>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </div>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Cuestionarios</h1>
              <p className="text-xs" style={{ color: "#475569" }}>Gestiona quizzes y retos</p>
            </div>
          </div>
          <Link href="/admin/quizzes/new">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Quiz list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="card-glass rounded-2xl p-8 text-center mt-4">
              <p className="text-3xl mb-3">🎮</p>
              <p className="font-semibold text-white mb-1">Sin cuestionarios</p>
              <p className="text-sm mb-4" style={{ color: "#475569" }}>Crea el primero</p>
              <Link href="/admin/quizzes/new">
                <button className="btn-primary">+ Nuevo Quiz</button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz, i) => {
                const questionCount = quiz.quiz_questions?.[0]?.count ?? 0;
                const isScheduled = !!quiz.scheduled_start_at;
                return (
                  <div
                    key={quiz.id}
                    className="card-glass rounded-2xl p-4 animate-fadeUp"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
                        {isScheduled ? "🕐" : "📝"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">{quiz.title}</p>
                        {quiz.description && (
                          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "#475569" }}>{quiz.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-medium" style={{ color: "#6366f1" }}>{questionCount} preguntas</span>
                          {isScheduled && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
                              {new Date(quiz.scheduled_start_at!).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/admin/quizzes/live/${quiz.id}`)}
                        className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
                        style={{ background: "linear-gradient(135deg, rgba(219,39,119,0.2), rgba(157,23,77,0.2))", color: "#f472b6", border: "1px solid rgba(219,39,119,0.2)" }}
                      >
                        ⚡ Iniciar en Vivo
                      </button>
                      <button
                        onClick={() => handleDelete(quiz.id)}
                        disabled={deletingId === quiz.id}
                        className="w-10 h-8 flex items-center justify-center rounded-lg transition-all"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}
                      >
                        {deletingId === quiz.id
                          ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

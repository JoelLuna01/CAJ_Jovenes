// src/app/admin/quizzes/results/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminGuard } from "../../../../../components/admin/AdminGuard";
import { supabase } from "../../../../../lib/supabase";

interface PlayerResult {
  profile_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  correct: number;
  total: number;
  score_pct: number;
  avg_time_ms: number;
}

interface QuizInfo {
  id: string;
  title: string;
  quiz_questions: { count: number }[];
}

const MEDAL = ["🥇", "🥈", "🥉"];
const GRADE_COLOR = (pct: number) => {
  if (pct >= 90) return { color: "#34d399", bg: "rgba(52,211,153,0.1)" };
  if (pct >= 70) return { color: "#60a5fa", bg: "rgba(96,165,250,0.1)" };
  if (pct >= 50) return { color: "#fbbf24", bg: "rgba(251,191,36,0.1)" };
  return { color: "#f87171", bg: "rgba(248,113,113,0.1)" };
};

export default function QuizResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [sessions, setSessions] = useState<{ id: string; code: string; created_at: string; status: string }[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [quizRes, sessionsRes] = await Promise.all([
        supabase.from("quizzes").select("id, title, quiz_questions(count)").eq("id", id).single(),
        supabase.from("quiz_sessions").select("id, code, created_at, status").eq("quiz_id", id).order("created_at", { ascending: false }),
      ]);

      if (quizRes.data) {
        setQuiz(quizRes.data as QuizInfo);
        setTotalQuestions(quizRes.data.quiz_questions?.[0]?.count ?? 0);
      }
      if (sessionsRes.data) setSessions(sessionsRes.data);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const loadSessionResults = async (sessionId: string) => {
    setSelectedSession(sessionId);
    setLoadingResults(true);

    const { data } = await supabase
      .from("quiz_responses")
      .select("profile_id, is_correct, response_time_ms, profiles(first_name, last_name, avatar_url)")
      .eq("session_id", sessionId);

    if (!data) { setLoadingResults(false); return; }

    // Group by player
    const grouped: Record<string, PlayerResult> = {};
    for (const row of data as any[]) {
      const pid = row.profile_id;
      if (!grouped[pid]) {
        grouped[pid] = {
          profile_id: pid,
          first_name: row.profiles?.first_name || "Jugador",
          last_name: row.profiles?.last_name || "",
          avatar_url: row.profiles?.avatar_url || null,
          correct: 0,
          total: 0,
          score_pct: 0,
          avg_time_ms: 0,
        };
      }
      grouped[pid].total += 1;
      if (row.is_correct) grouped[pid].correct += 1;
      grouped[pid].avg_time_ms += row.response_time_ms;
    }

    const playerList = Object.values(grouped).map((p) => ({
      ...p,
      score_pct: totalQuestions > 0 ? Math.round((p.correct / totalQuestions) * 100) : Math.round((p.correct / p.total) * 100),
      avg_time_ms: p.total > 0 ? Math.round(p.avg_time_ms / p.total) : 0,
    }));

    // Sort by score desc, then by avg_time asc (faster wins ties)
    playerList.sort((a, b) => b.score_pct - a.score_pct || a.avg_time_ms - b.avg_time_ms);

    setResults(playerList);
    setLoadingResults(false);
  };

  return (
    <AdminGuard>
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b" style={{ borderColor: "#1e293b" }}>
          <Link href="/admin/quizzes">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{quiz?.title || "Resultados"}</h1>
            <p className="text-xs" style={{ color: "#475569" }}>
              {totalQuestions} preguntas · {sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl animate-shimmer" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="card-glass rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">📊</p>
              <p className="font-semibold text-white mb-1">Sin sesiones registradas</p>
              <p className="text-sm" style={{ color: "#475569" }}>Inicia una sesión en vivo para ver resultados</p>
            </div>
          ) : (
            <>
              {/* Sessions list */}
              <div>
                <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: "#475569" }}>
                  Selecciona una sesión
                </p>
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => loadSessionResults(s.id)}
                      className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
                      style={{
                        background: selectedSession === s.id ? "rgba(99,102,241,0.15)" : "rgba(30,41,59,0.5)",
                        border: `1px solid ${selectedSession === s.id ? "rgba(99,102,241,0.4)" : "rgba(30,41,59,0.8)"}`,
                      }}
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">Sesión #{s.code}</p>
                        <p className="text-xs" style={{ color: "#475569" }}>
                          {new Date(s.created_at).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={s.status === "FINISHED"
                          ? { background: "rgba(52,211,153,0.1)", color: "#34d399" }
                          : { background: "rgba(251,191,36,0.1)", color: "#fbbf24" }
                        }
                      >
                        {s.status === "FINISHED" ? "Finalizada" : s.status === "PLAYING" ? "En curso" : "Lobby"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Results */}
              {selectedSession && (
                <div>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: "#475569" }}>
                    Clasificación
                  </p>
                  {loadingResults ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl animate-shimmer" />)}
                    </div>
                  ) : results.length === 0 ? (
                    <div className="card-glass rounded-2xl p-6 text-center">
                      <p className="text-sm" style={{ color: "#475569" }}>No hay respuestas en esta sesión</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {results.map((player, idx) => {
                        const grade = GRADE_COLOR(player.score_pct);
                        const initials = `${player.first_name[0] || ""}${player.last_name[0] || ""}`.toUpperCase();
                        return (
                          <div
                            key={player.profile_id}
                            className="flex items-center gap-3 p-3 rounded-2xl"
                            style={{
                              background: idx === 0 ? "rgba(251,191,36,0.05)" : "rgba(15,23,42,0.7)",
                              border: `1px solid ${idx === 0 ? "rgba(251,191,36,0.2)" : "rgba(30,41,59,0.8)"}`,
                            }}
                          >
                            {/* Rank */}
                            <div className="w-8 text-center text-lg flex-shrink-0">
                              {idx < 3 ? MEDAL[idx] : <span className="text-sm font-bold" style={{ color: "#475569" }}>#{idx + 1}</span>}
                            </div>

                            {/* Avatar */}
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden"
                              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                            >
                              {player.avatar_url
                                ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                                : initials || "U"
                              }
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {player.first_name} {player.last_name}
                              </p>
                              <p className="text-[10px]" style={{ color: "#475569" }}>
                                {player.correct}/{totalQuestions || player.total} correctas · {(player.avg_time_ms / 1000).toFixed(1)}s promedio
                              </p>
                            </div>

                            {/* Score badge */}
                            <div
                              className="px-2.5 py-1.5 rounded-xl flex-shrink-0 text-center"
                              style={{ background: grade.bg, border: `1px solid ${grade.color}22` }}
                            >
                              <p className="text-base font-bold" style={{ color: grade.color }}>{player.score_pct}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

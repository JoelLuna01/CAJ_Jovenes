// src/app/games/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  scheduled_start_at: string | null;
  created_at: string;
  quiz_questions: { count: number }[];
}

interface QuizSession {
  id: string;
  quiz_id: string;
  code: string;
  status: string;
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, unlocked: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0, unlocked: true });
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s, unlocked: false });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export default function GamesPage() {
  const { user, profile, isLoading } = useAuthStore();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"individual" | "live">("individual");
  const [pinCode, setPinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [pinError, setPinError] = useState("");
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("quizzes")
      .select("*, quiz_questions(count)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setQuizzes((data as Quiz[]) || []);
        setLoading(false);
      });
  }, [user]);

  const handleJoinLive = async () => {
    if (pinCode.length < 6 || joining) return;
    setJoining(true);
    setPinError("");
    const { data } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("code", pinCode.trim())
      .in("status", ["LOBBY", "PLAYING"])
      .single();

    if (!data) {
      setPinError("Código inválido o sesión no encontrada. Verifica con tu líder.");
      setJoining(false);
      return;
    }
    router.push(`/games/live/${pinCode.trim()}`);
  };

  const scheduledQuizzes = quizzes.filter((q) => q.scheduled_start_at);
  const individualQuizzes = quizzes.filter((q) => !q.scheduled_start_at);

  if (isLoading || !user) return null;

  return (
    <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-white">Juegos & Retos</h1>
        <p className="text-sm mt-0.5" style={{ color: "#475569" }}>Compite y aprende con tu grupo</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 py-4">
        <button
          onClick={() => setTab("individual")}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={tab === "individual"
            ? { background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white" }
            : { background: "#1e293b", color: "#64748b" }}
        >
          📖 Cuestionarios
        </button>
        <button
          onClick={() => setTab("live")}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={tab === "live"
            ? { background: "linear-gradient(135deg, #db2777, #9d174d)", color: "white", boxShadow: "0 4px 12px rgba(219,39,119,0.35)" }
            : { background: "#1e293b", color: "#64748b" }}
        >
          ⚡ Trivia en Vivo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === "individual" ? (
          <div className="space-y-4">
            {/* Scheduled Quizzes */}
            {scheduledQuizzes.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#6366f1" }}>🕐 Programados</p>
                <div className="space-y-3">
                  {scheduledQuizzes.map((quiz) => (
                    <ScheduledQuizCard key={quiz.id} quiz={quiz} profile={profile} router={router} />
                  ))}
                </div>
              </div>
            )}

            {/* Individual Quizzes */}
            <div>
              {scheduledQuizzes.length > 0 && individualQuizzes.length > 0 && (
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#475569" }}>A tu ritmo</p>
              )}
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}
                </div>
              ) : individualQuizzes.length === 0 && scheduledQuizzes.length === 0 ? (
                <div className="card-glass rounded-2xl p-8 text-center mt-4">
                  <p className="text-3xl mb-3">🎮</p>
                  <p className="font-semibold text-white mb-1">Sin cuestionarios aún</p>
                  <p className="text-sm" style={{ color: "#475569" }}>Tu líder publicará uno pronto</p>
                </div>
              ) : individualQuizzes.map((quiz, i) => {
                const questionCount = quiz.quiz_questions?.[0]?.count ?? 0;
                return (
                  <button
                    key={quiz.id}
                    onClick={() => router.push(`/games/quiz/${quiz.id}`)}
                    className="card-glass card-hover rounded-2xl p-4 w-full text-left animate-fadeUp mb-3"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
                        <span className="text-xl">📝</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm mb-1">{quiz.title}</p>
                        {quiz.description && <p className="text-xs line-clamp-2" style={{ color: "#475569" }}>{quiz.description}</p>}
                        <p className="text-[10px] mt-1.5 font-medium" style={{ color: "#6366f1" }}>{questionCount} pregunta{questionCount !== 1 ? "s" : ""}</p>
                      </div>
                      <svg className="w-5 h-5 flex-shrink-0 self-center" style={{ color: "#334155" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Live Tab */
          <div className="space-y-5">
            {/* PIN Entry */}
            <div className="card-glass rounded-2xl p-5" style={{ border: "1px solid rgba(219,39,119,0.2)" }}>
              <p className="font-bold text-white mb-1">Entrar con código</p>
              <p className="text-xs mb-4" style={{ color: "#475569" }}>Tu líder tiene un PIN de 6 dígitos para iniciar la trivia</p>
              <input
                ref={pinInputRef}
                type="text"
                maxLength={6}
                value={pinCode}
                onChange={(e) => { setPinCode(e.target.value.replace(/\D/g, "")); setPinError(""); }}
                className="input-field text-center text-2xl font-bold tracking-[0.5em] mb-3"
                placeholder="000000"
                inputMode="numeric"
              />
              {pinError && <p className="text-xs text-red-400 mb-3">{pinError}</p>}
              <button
                onClick={handleJoinLive}
                disabled={pinCode.length < 6 || joining}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
                style={pinCode.length >= 6
                  ? { background: "linear-gradient(135deg, #db2777, #9d174d)", color: "white", boxShadow: "0 4px 16px rgba(219,39,119,0.35)" }
                  : { background: "#1e293b", color: "#475569" }}
              >
                {joining ? "Verificando..." : "⚡ ¡Unirme ahora!"}
              </button>
            </div>

            {/* How it works */}
            <div className="card-glass rounded-2xl p-5">
              <p className="font-bold text-white text-sm mb-3">¿Cómo funciona?</p>
              <div className="space-y-3">
                {[
                  { emoji: "📲", text: "Tu líder inicia el juego y comparte el código" },
                  { emoji: "⏱️", text: "Responde cada pregunta antes de que se acabe el tiempo" },
                  { emoji: "🏆", text: "Gana el que más respuestas correctas tenga. ¡En empate, gana el más rápido!" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">{item.emoji}</span>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function ScheduledQuizCard({ quiz, profile, router }: { quiz: Quiz; profile: any; router: any }) {
  const countdown = CountdownTimer({ targetDate: quiz.scheduled_start_at! });
  const questionCount = quiz.quiz_questions?.[0]?.count ?? 0;

  return (
    <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.25)" }}>
      {!countdown.unlocked && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>PROGRAMADO</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.2)" }}>
          <span className="text-xl">{countdown.unlocked ? "🚀" : "🔒"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm mb-0.5">{quiz.title}</p>
          {quiz.description && <p className="text-xs mb-2" style={{ color: "#94a3b8" }}>{quiz.description}</p>}
          <p className="text-[10px] font-medium" style={{ color: "#6366f1" }}>{questionCount} preguntas</p>
        </div>
      </div>

      <div className="mt-3">
        {countdown.unlocked ? (
          <button
            onClick={() => router.push(`/games/quiz/${quiz.id}`)}
            className="w-full py-3 rounded-xl text-sm font-bold animate-pulse-glow"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white" }}
          >
            🚀 ¡Jugar ahora!
          </button>
        ) : (
          <div className="rounded-xl py-3 flex items-center justify-center gap-1" style={{ background: "rgba(0,0,0,0.2)" }}>
            <span className="text-xs" style={{ color: "#64748b" }}>Disponible en:</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: "#818cf8" }}>
              {String(countdown.h).padStart(2, "0")}h {String(countdown.m).padStart(2, "0")}m {String(countdown.s).padStart(2, "0")}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

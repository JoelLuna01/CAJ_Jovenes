// src/app/admin/quizzes/live/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "../../../../../components/admin/AdminGuard";
import { supabase } from "../../../../../lib/supabase";
import { useAuthStore } from "../../../../../store/auth";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  time_limit: number;
  order_index: number;
}

interface Session {
  id: string;
  code: string;
  status: string;
  current_question_index: number;
}

interface LiveResponse {
  profile_id: string;
  is_correct: boolean;
  response_time_ms: number;
  profiles: { first_name: string; last_name: string };
}

interface PlayerScore {
  profile_id: string;
  name: string;
  correct: number;
  total_ms: number;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function AdminLiveConsolePage() {
  const { profile } = useAuthStore();
  const params = useParams();
  const quizId = params.id as string;
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [responseCount, setResponseCount] = useState(0);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [launching, setLaunching] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!quizId) return;
    Promise.all([
      supabase.from("quizzes").select("title").eq("id", quizId).single(),
      supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("order_index"),
    ]).then(([qRes, questionsRes]) => {
      if (qRes.data) setQuizTitle(qRes.data.title);
      if (questionsRes.data) setQuestions(questionsRes.data as Question[]);
    });
  }, [quizId]);

  const startSession = async () => {
    if (!profile || launching) return;
    setLaunching(true);
    const code = generateCode();
    const { data, error } = await supabase
      .from("quiz_sessions")
      .insert({ quiz_id: quizId, code, status: "LOBBY", created_by: profile.id })
      .select("*")
      .single();

    if (error || !data) { setLaunching(false); return; }
    setSession(data as Session);

    // Subscribe to presence
    const channel = supabase.channel(`quiz_session_${code}`);
    channel.on("presence", { event: "sync" }, () => {
      setPlayerCount(Object.keys(channel.presenceState()).length);
    }).subscribe();
    channelRef.current = channel;
    setLaunching(false);
  };

  const loadScores = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("quiz_responses")
      .select("profile_id, is_correct, response_time_ms, profiles(first_name, last_name)")
      .eq("session_id", sessionId);

    if (!data) return;

    const map = new Map<string, PlayerScore>();
    data.forEach((row: any) => {
      const pid = row.profile_id;
      if (!map.has(pid)) {
        map.set(pid, {
          profile_id: pid,
          name: `${row.profiles?.first_name ?? "?"} ${row.profiles?.last_name ?? ""}`.trim(),
          correct: 0,
          total_ms: 0,
        });
      }
      const entry = map.get(pid)!;
      if (row.is_correct) entry.correct++;
      entry.total_ms += row.response_time_ms;
    });

    const sorted = Array.from(map.values()).sort((a, b) => {
      if (b.correct !== a.correct) return b.correct - a.correct;
      return a.total_ms - b.total_ms;
    });
    setScores(sorted);
    setResponseCount(data.length);
  }, []);

  const nextQuestion = async () => {
    if (!session || !channelRef.current) return;
    const nextIdx = session.current_question_index + 1;
    if (nextIdx >= questions.length) return;

    const startedAt = new Date().toISOString();
    await supabase
      .from("quiz_sessions")
      .update({ status: "PLAYING", current_question_index: nextIdx, current_question_started_at: startedAt })
      .eq("id", session.id);

    setSession((prev) => prev ? { ...prev, status: "PLAYING", current_question_index: nextIdx } : prev);

    // Broadcast to players
    channelRef.current.send({
      type: "broadcast",
      event: "next_question",
      payload: { question_index: nextIdx, started_at: startedAt },
    });

    // Start timer for this question
    const question = questions[nextIdx];
    setTimeLeft(question.time_limit);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);

    // Poll responses every second during question
    setResponseCount(0);
    const poll = setInterval(async () => {
      if (!session) return;
      loadScores(session.id);
    }, 1000);
    setTimeout(() => clearInterval(poll), question.time_limit * 1000 + 2000);
  };

  const finishGame = async () => {
    if (!session || !channelRef.current) return;
    await supabase.from("quiz_sessions").update({ status: "FINISHED" }).eq("id", session.id);
    channelRef.current.send({ type: "broadcast", event: "game_finished", payload: {} });
    setSession((prev) => prev ? { ...prev, status: "FINISHED" } : prev);
    if (timerRef.current) clearInterval(timerRef.current);
    loadScores(session.id);
  };

  const currentQuestion = session ? questions[session.current_question_index] : null;
  const isLastQuestion = session ? session.current_question_index >= questions.length - 1 : false;
  const podiumEmojis = ["🥇", "🥈", "🥉"];

  return (
    <AdminGuard>
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "#1e293b" }}>
          <Link href="/admin/quizzes">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">⚡ {quizTitle}</h1>
            <p className="text-xs" style={{ color: "#475569" }}>Consola de control</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Phase: No session yet */}
          {!session && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-6" style={{ background: "linear-gradient(135deg, rgba(219,39,119,0.2), rgba(99,102,241,0.1))", border: "1px solid rgba(219,39,119,0.25)" }}>
                🎮
              </div>
              <p className="text-white font-bold text-lg mb-2">{quizTitle}</p>
              <p className="text-sm mb-6" style={{ color: "#475569" }}>{questions.length} preguntas listas</p>
              <button
                onClick={startSession}
                disabled={launching || questions.length === 0}
                className="btn-primary px-8 py-3.5 text-base"
                style={{ boxShadow: "0 4px 20px rgba(219,39,119,0.35)" }}
              >
                {launching ? "Iniciando..." : "⚡ Crear Sala de Juego"}
              </button>
            </div>
          )}

          {/* Phase: Lobby (session created, game not started) */}
          {session && session.status === "LOBBY" && (
            <>
              <div className="card-glass rounded-2xl p-5 text-center" style={{ border: "1px solid rgba(219,39,119,0.3)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Código para los jugadores</p>
                <p className="text-5xl font-black tracking-widest my-3" style={{ color: "#f472b6", letterSpacing: "0.2em" }}>{session.code}</p>
                <p className="text-xs" style={{ color: "#475569" }}>Los jóvenes entran desde Juegos → Trivia en Vivo</p>
              </div>

              <div className="card-glass rounded-2xl p-4 flex items-center justify-between">
                <p className="text-sm" style={{ color: "#94a3b8" }}>👤 Jugadores conectados</p>
                <p className="text-2xl font-black text-white">{playerCount}</p>
              </div>

              <button
                onClick={nextQuestion}
                disabled={playerCount === 0}
                className="w-full py-4 rounded-xl font-bold text-base transition-all"
                style={playerCount > 0
                  ? { background: "linear-gradient(135deg, #db2777, #9d174d)", color: "white", boxShadow: "0 4px 20px rgba(219,39,119,0.35)" }
                  : { background: "#1e293b", color: "#475569" }
                }
              >
                🚀 ¡Comenzar el juego!
              </button>
            </>
          )}

          {/* Phase: Playing */}
          {session && session.status === "PLAYING" && currentQuestion && (
            <>
              {/* Question tracker */}
              <div className="card-glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{ color: "#6366f1" }}>
                    Pregunta {session.current_question_index + 1} de {questions.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                      style={{
                        background: timeLeft <= 5 ? "rgba(239,68,68,0.2)" : "rgba(219,39,119,0.15)",
                        color: timeLeft <= 5 ? "#ef4444" : "#f472b6",
                      }}
                    >
                      {timeLeft}
                    </div>
                  </div>
                </div>
                <p className="font-semibold text-white text-sm leading-snug">{currentQuestion.question_text}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {currentQuestion.options.map((opt, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-2 text-xs font-medium text-center"
                      style={i === currentQuestion.correct_option_index
                        ? { background: "rgba(34,197,94,0.15)", color: "#34d399", border: "1px solid rgba(34,197,94,0.3)" }
                        : { background: "#1e293b", color: "#94a3b8" }
                      }
                    >
                      {["🔴","🔵","🟡","🟢"][i]} {opt}
                    </div>
                  ))}
                </div>
              </div>

              {/* Response counter */}
              <div className="card-glass rounded-2xl p-4 flex items-center justify-between">
                <p className="text-sm" style={{ color: "#94a3b8" }}>✅ Respuestas recibidas</p>
                <p className="text-xl font-black text-white">{responseCount}</p>
              </div>

              {/* Leaderboard */}
              {scores.length > 0 && (
                <div className="card-glass rounded-2xl p-4">
                  <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: "#475569" }}>Tabla de posiciones</p>
                  <div className="space-y-2">
                    {scores.slice(0, 5).map((player, i) => (
                      <div key={player.profile_id} className="flex items-center gap-2">
                        <span className="text-base w-6 flex-shrink-0">{podiumEmojis[i] ?? `${i + 1}`}</span>
                        <p className="flex-1 text-sm font-medium text-white truncate">{player.name}</p>
                        <p className="text-xs font-bold" style={{ color: "#6366f1" }}>{player.correct} ✓</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="space-y-2">
                {!isLastQuestion ? (
                  <button onClick={nextQuestion} className="btn-primary w-full py-3.5">
                    ▶ Siguiente pregunta
                  </button>
                ) : (
                  <button
                    onClick={finishGame}
                    className="w-full py-3.5 rounded-xl font-bold transition-all"
                    style={{ background: "rgba(34,197,94,0.15)", color: "#34d399", border: "1px solid rgba(34,197,94,0.3)" }}
                  >
                    🏁 Terminar el juego
                  </button>
                )}
              </div>
            </>
          )}

          {/* Phase: Finished */}
          {session && session.status === "FINISHED" && (
            <div className="py-4">
              <div className="text-center mb-5">
                <p className="text-4xl mb-2">🏆</p>
                <h2 className="text-xl font-black text-white">¡Juego Terminado!</h2>
                <p className="text-sm mt-1" style={{ color: "#475569" }}>Resultados finales</p>
              </div>

              <div className="space-y-2">
                {scores.map((player, i) => (
                  <div
                    key={player.profile_id}
                    className="card-glass rounded-xl p-3.5 flex items-center gap-3 animate-fadeUp"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <span className="text-xl w-8 text-center">{podiumEmojis[i] ?? `${i + 1}`}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{player.name}</p>
                      <p className="text-[10px]" style={{ color: "#475569" }}>
                        {player.correct}/{questions.length} correctas · {(player.total_ms / 1000).toFixed(1)}s
                      </p>
                    </div>
                    <span className="font-black text-sm" style={{ color: "#818cf8" }}>
                      {Math.round((player.correct / Math.max(questions.length, 1)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={() => router.push("/admin/quizzes")} className="btn-primary w-full mt-5 py-3.5">
                Volver a Cuestionarios
              </button>
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

// src/app/games/live/[code]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "../../../../store/auth";
import { supabase } from "../../../../lib/supabase";
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
  quiz_id: string;
  status: string;
  current_question_index: number;
  current_question_started_at: string | null;
}

interface Leaderboard {
  profile_id: string;
  first_name: string;
  last_name: string;
  correct: number;
  total_ms: number;
}

const OPTION_COLORS = [
  { bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.4)", label: "🔴" },
  { bg: "rgba(59,130,246,0.2)", border: "rgba(59,130,246,0.4)", label: "🔵" },
  { bg: "rgba(234,179,8,0.2)", border: "rgba(234,179,8,0.4)", label: "🟡" },
  { bg: "rgba(34,197,94,0.2)", border: "rgba(34,197,94,0.4)", label: "🟢" },
];

type GamePhase = "lobby" | "question" | "feedback" | "finished";

export default function LiveQuizPage() {
  const { user, profile, isLoading } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [playerCount, setPlayerCount] = useState(1);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lastIsCorrect, setLastIsCorrect] = useState<boolean | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(0);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  // Initial data load + realtime subscription
  useEffect(() => {
    if (!user || !profile || !code) return;

    const init = async () => {
      const { data: sess } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("code", code)
        .single();

      if (!sess) { router.push("/games"); return; }
      setSession(sess as Session);

      const { data: qs } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", sess.quiz_id)
        .order("order_index");
      setQuestions((qs as Question[]) || []);

      if (sess.status === "PLAYING" && sess.current_question_index >= 0) {
        setPhase("question");
      } else if (sess.status === "FINISHED") {
        setPhase("finished");
        loadLeaderboard(sess.id);
      }

      // Subscribe to realtime changes on this session
      const channel = supabase
        .channel(`quiz_session_${code}`)
        .on("broadcast", { event: "next_question" }, ({ payload }) => {
          setSelectedOption(null);
          setLastIsCorrect(null);
          setSession((prev) => prev ? { ...prev, current_question_index: payload.question_index, current_question_started_at: payload.started_at } : prev);
          setPhase("question");
        })
        .on("broadcast", { event: "game_finished" }, () => {
          setPhase("finished");
        })
        .on("presence", { event: "sync" }, () => {
          setPlayerCount(Object.keys(channel.presenceState()).length);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ profile_id: profile.id, name: `${profile.first_name}` });
          }
        });

      channelRef.current = channel;
    };

    init();
    return () => {
      channelRef.current?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, code]);

  // Timer countdown per question
  useEffect(() => {
    if (phase !== "question" || !session) return;
    const question = questions[session.current_question_index];
    if (!question) return;

    // Calculate time left based on when question started (from server timestamp)
    const startedAt = session.current_question_started_at
      ? new Date(session.current_question_started_at).getTime()
      : Date.now();
    questionStartRef.current = startedAt;

    const calcRemaining = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, question.time_limit - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        if (selectedOption === null) {
          setPhase("feedback");
          setLastIsCorrect(false);
        }
      }
    };
    calcRemaining();
    timerRef.current = setInterval(calcRemaining, 500);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session?.current_question_index]);

  const handleAnswer = useCallback(async (optionIdx: number) => {
    if (!profile || !session || selectedOption !== null || phase !== "question") return;
    clearInterval(timerRef.current!);

    const question = questions[session.current_question_index];
    const elapsed = Date.now() - questionStartRef.current;
    const isCorrect = optionIdx === question.correct_option_index;
    const points = isCorrect ? Math.max(100, Math.round(1000 - (elapsed / question.time_limit / 10))) : 0;

    setSelectedOption(optionIdx);
    setLastIsCorrect(isCorrect);
    setMyScore((prev) => prev + points);
    setPhase("feedback");

    await supabase.from("quiz_responses").insert({
      session_id: session.id,
      profile_id: profile.id,
      question_id: question.id,
      selected_option_index: optionIdx,
      is_correct: isCorrect,
      response_time_ms: elapsed,
    });
  }, [profile, session, selectedOption, phase, questions]);

  const loadLeaderboard = async (sessionId: string) => {
    const { data } = await supabase
      .from("quiz_responses")
      .select("profile_id, is_correct, response_time_ms, profiles(first_name, last_name)")
      .eq("session_id", sessionId);

    if (!data) return;

    const map = new Map<string, Leaderboard>();
    data.forEach((row: any) => {
      const pid = row.profile_id;
      if (!map.has(pid)) {
        map.set(pid, {
          profile_id: pid,
          first_name: row.profiles?.first_name || "?",
          last_name: row.profiles?.last_name || "",
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
    setLeaderboard(sorted);
  };

  // Also load leaderboard when phase changes to finished
  useEffect(() => {
    if (phase === "finished" && session) loadLeaderboard(session.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (isLoading || !user) return null;

  // ────── LOBBY ──────
  if (phase === "lobby") {
    return (
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto items-center justify-center p-6 text-center">
        <button onClick={() => router.push("/games")} className="absolute top-6 left-5 text-sm flex items-center gap-1.5" style={{ color: "#6366f1" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Salir
        </button>

        <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-6 animate-pulse" style={{ background: "linear-gradient(135deg, rgba(219,39,119,0.2), rgba(99,102,241,0.1))", border: "1px solid rgba(219,39,119,0.3)" }}>
          ⚡
        </div>

        <h1 className="text-2xl font-black text-white mb-2">¡Estás en la sala!</h1>
        <p className="text-sm mb-8" style={{ color: "#475569" }}>Espera a que tu líder inicie el juego…</p>

        <div className="card-glass rounded-2xl p-5 w-full mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "#475569" }}>Código de sesión</p>
            <p className="text-xl font-black tracking-widest text-white">{code}</p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid #1e293b" }}>
            <p className="text-sm" style={{ color: "#475569" }}>Conectados</p>
            <p className="text-xl font-black text-white">{playerCount} 👤</p>
          </div>
        </div>

        <p className="text-xs animate-pulse" style={{ color: "#334155" }}>Conectado — esperando al líder...</p>
      </main>
    );
  }

  // ────── FINISHED ──────
  if (phase === "finished") {
    const myRank = leaderboard.findIndex((l) => l.profile_id === profile?.id) + 1;
    const podiumEmojis = ["🥇", "🥈", "🥉"];

    return (
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto p-5">
        <h1 className="text-2xl font-black text-white text-center mb-1">¡Juego Terminado!</h1>
        <p className="text-center text-sm mb-6" style={{ color: "#475569" }}>Tabla de posiciones final</p>

        {/* My result */}
        <div className="card-glass rounded-2xl p-4 mb-4 text-center" style={{ border: "1px solid rgba(99,102,241,0.3)" }}>
          <p className="text-4xl font-black text-white">{myRank > 0 ? `${myRank}°` : "—"}</p>
          <p className="text-sm mt-1" style={{ color: "#475569" }}>Tu posición · {myScore} puntos</p>
        </div>

        {/* Leaderboard */}
        <div className="space-y-2 flex-1 overflow-y-auto">
          {leaderboard.map((player, i) => (
            <div
              key={player.profile_id}
              className="card-glass rounded-xl p-3.5 flex items-center gap-3 animate-fadeUp"
              style={{
                animationDelay: `${i * 0.06}s`,
                border: player.profile_id === profile?.id ? "1px solid rgba(99,102,241,0.4)" : undefined,
              }}
            >
              <span className="text-xl w-8 text-center flex-shrink-0">{podiumEmojis[i] || `${i + 1}`}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{player.first_name} {player.last_name}</p>
                <p className="text-[10px]" style={{ color: "#475569" }}>
                  {player.correct} correctas · {(player.total_ms / 1000).toFixed(1)}s
                </p>
              </div>
              {player.profile_id === profile?.id && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>TÚ</span>
              )}
            </div>
          ))}
        </div>

        <button onClick={() => router.push("/games")} className="btn-primary w-full mt-5 py-3.5">
          Volver a Juegos
        </button>
      </main>
    );
  }

  // ────── QUESTION / FEEDBACK ──────
  const question = session ? questions[session.current_question_index] : null;
  const timePercent = question ? (timeLeft / question.time_limit) * 100 : 100;

  return (
    <main className="flex flex-col min-h-dvh safe-top max-w-lg mx-auto" style={{ background: "#080d1a" }}>
      {/* Top */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold" style={{ color: "#475569" }}>
            P. {(session?.current_question_index ?? 0) + 1}/{questions.length}
          </span>
          {phase === "question" && (
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black transition-all"
              style={{
                background: timeLeft <= 5 ? "rgba(239,68,68,0.2)" : "rgba(219,39,119,0.15)",
                color: timeLeft <= 5 ? "#ef4444" : "#f472b6",
                border: `2px solid ${timeLeft <= 5 ? "rgba(239,68,68,0.5)" : "rgba(219,39,119,0.3)"}`,
              }}
            >
              {timeLeft}
            </div>
          )}
          <span className="text-sm font-bold" style={{ color: "#6366f1" }}>{myScore} pts</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e293b" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${timePercent}%`,
              background: timeLeft <= 5 ? "#ef4444" : "linear-gradient(90deg, #db2777, #9d174d)",
            }}
          />
        </div>
      </div>

      {/* Question text */}
      <div className="flex-1 flex flex-col px-5 pb-5">
        <div className="flex-1 flex items-center justify-center py-4">
          <p className="text-xl font-bold text-white text-center leading-snug">
            {question?.question_text}
          </p>
        </div>

        {/* Answer feedback overlay */}
        {phase === "feedback" && lastIsCorrect !== null && (
          <div
            className="rounded-2xl py-4 mb-4 text-center font-black text-lg animate-fadeUp"
            style={lastIsCorrect
              ? { background: "rgba(34,197,94,0.15)", color: "#34d399", border: "1px solid rgba(34,197,94,0.3)" }
              : { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }
            }
          >
            {lastIsCorrect ? "¡Correcto! 🎉" : selectedOption === -1 ? "⏰ ¡Se acabó el tiempo!" : "Incorrecto 😢"}
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          {question?.options.map((option, idx) => {
            const color = OPTION_COLORS[idx % OPTION_COLORS.length];
            const isSelected = selectedOption === idx;
            const isCorrect = idx === question.correct_option_index;
            const showResult = phase === "feedback";

            let borderColor = color.border;
            let bgColor = color.bg;
            let textColor = "white";
            let opacity = "1";

            if (showResult) {
              if (isCorrect) { bgColor = "rgba(34,197,94,0.3)"; borderColor = "#22c55e"; }
              else if (isSelected && !isCorrect) { bgColor = "rgba(239,68,68,0.3)"; borderColor = "#ef4444"; }
              else { opacity = "0.4"; }
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={phase === "feedback"}
                className="rounded-2xl p-4 flex flex-col items-start gap-2 transition-all active:scale-95"
                style={{ background: bgColor, border: `2px solid ${borderColor}`, color: textColor, minHeight: "90px", opacity }}
              >
                <span className="text-xl">{color.label}</span>
                <span className="text-xs font-semibold leading-snug text-left">{option}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

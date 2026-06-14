// src/app/games/quiz/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "../../../../store/auth";
import { supabase } from "../../../../lib/supabase";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  scheduled_start_at: string | null;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  time_limit: number;
  order_index: number;
}

interface QuizResponse {
  question_id: string;
  selected_option_index: number;
  is_correct: boolean;
  response_time_ms: number;
}

const OPTION_COLORS = [
  { bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.4)", active: "#ef4444", label: "🔴" },
  { bg: "rgba(59,130,246,0.2)", border: "rgba(59,130,246,0.4)", active: "#3b82f6", label: "🔵" },
  { bg: "rgba(234,179,8,0.2)", border: "rgba(234,179,8,0.4)", active: "#eab308", label: "🟡" },
  { bg: "rgba(34,197,94,0.2)", border: "rgba(34,197,94,0.4)", active: "#22c55e", label: "🟢" },
];

type GamePhase = "loading" | "intro" | "question" | "feedback" | "finished";

export default function IndividualQuizPage() {
  const { user, profile, isLoading } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !quizId) return;
    Promise.all([
      supabase.from("quizzes").select("*").eq("id", quizId).single(),
      supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("order_index"),
    ]).then(([quizRes, questionsRes]) => {
      if (quizRes.data) setQuiz(quizRes.data as Quiz);
      if (questionsRes.data) setQuestions(questionsRes.data as Question[]);
      setPhase("intro");
    });
  }, [user, quizId]);

  const goToNextOrFinish = useCallback(() => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setPhase("question");
    } else {
      setPhase("finished");
    }
  }, [currentIdx, questions.length]);

  const handleAnswer = useCallback((optionIdx: number) => {
    if (selectedOption !== null || phase !== "question") return;
    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = Date.now() - questionStartTime;
    const question = questions[currentIdx];
    const isCorrect = optionIdx === question.correct_option_index;

    setSelectedOption(optionIdx);
    setResponses((prev) => [...prev, {
      question_id: question.id,
      selected_option_index: optionIdx,
      is_correct: isCorrect,
      response_time_ms: elapsed,
    }]);
    setPhase("feedback");
    setTimeout(goToNextOrFinish, 1800);
  }, [selectedOption, phase, questionStartTime, questions, currentIdx, goToNextOrFinish]);

  // Timer effect for each question
  useEffect(() => {
    if (phase !== "question") return;
    const question = questions[currentIdx];
    if (!question) return;
    setTimeLeft(question.time_limit);
    setQuestionStartTime(Date.now());

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Time expired — auto-select no answer
          handleAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx]);

  // Save results to DB when finished
  useEffect(() => {
    if (phase !== "finished" || !profile || responses.length === 0) return;

    const saveResults = async () => {
      // Find or create a solo session for this quiz
      const sessionCode = `SOLO_${quizId.slice(0, 6).toUpperCase()}`;
      let sessionId: string;

      const { data: existing } = await supabase
        .from("quiz_sessions")
        .select("id")
        .eq("quiz_id", quizId)
        .eq("code", sessionCode)
        .single();

      if (existing) {
        sessionId = existing.id;
      } else {
        const { data: newSession } = await supabase
          .from("quiz_sessions")
          .insert({ quiz_id: quizId, code: sessionCode, status: "FINISHED", created_by: profile.id })
          .select("id")
          .single();
        sessionId = newSession!.id;
      }

      // Save responses (ignore duplicates)
      await supabase.from("quiz_responses").upsert(
        responses.map((r) => ({ ...r, session_id: sessionId, profile_id: profile.id })),
        { onConflict: "session_id,profile_id,question_id" }
      );
    };

    saveResults();
  }, [phase]);

  if (isLoading || !user) return null;

  const question = questions[currentIdx];
  const correctCount = responses.filter((r) => r.is_correct).length;
  const totalTime = responses.reduce((acc, r) => acc + r.response_time_ms, 0);

  // ────── PHASES ──────

  if (phase === "loading") {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <p className="text-2xl mb-2">🎮</p>
          <p className="text-sm" style={{ color: "#475569" }}>Cargando...</p>
        </div>
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto p-6 justify-center">
        <button onClick={() => router.back()} className="self-start text-sm mb-8 flex items-center gap-1.5" style={{ color: "#6366f1" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Volver
        </button>
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.3)" }}>
            📝
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{quiz?.title}</h1>
          {quiz?.description && <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>{quiz.description}</p>}
          <div className="card-glass rounded-2xl p-4 mb-8 text-left space-y-3">
            <p className="text-xs font-bold text-white">Antes de empezar:</p>
            {[
              `📊 ${questions.length} preguntas en total`,
              "⏱️ Cada pregunta tiene un límite de tiempo",
              "🏆 Se guarda tu puntaje para el ranking",
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "#94a3b8" }}>{t}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setPhase("question")}
            className="btn-primary w-full py-4 text-base"
          >
            🚀 ¡Comenzar!
          </button>
        </div>
      </main>
    );
  }

  if (phase === "finished") {
    const score = Math.round((correctCount / questions.length) * 100);
    const emoji = score >= 80 ? "🏆" : score >= 60 ? "😊" : "💪";
    return (
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto p-6 justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{emoji}</div>
          <h1 className="text-3xl font-bold text-white mb-1">
            {score >= 80 ? "¡Excelente!" : score >= 60 ? "¡Bien hecho!" : "¡Sigue practicando!"}
          </h1>
          <p className="text-sm mb-8" style={{ color: "#475569" }}>Terminaste: {quiz?.title}</p>

          {/* Score Card */}
          <div className="card-glass rounded-2xl p-6 mb-6">
            <div className="text-5xl font-black mb-2" style={{ color: score >= 80 ? "#34d399" : score >= 60 ? "#818cf8" : "#f97316" }}>
              {score}%
            </div>
            <div className="flex justify-around mt-4 pt-4" style={{ borderTop: "1px solid #1e293b" }}>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{correctCount}/{questions.length}</p>
                <p className="text-[10px]" style={{ color: "#475569" }}>Correctas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{(totalTime / 1000).toFixed(1)}s</p>
                <p className="text-[10px]" style={{ color: "#475569" }}>Tiempo total</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => router.push("/games")} className="btn-primary w-full">Volver a Juegos</button>
          </div>
        </div>
      </main>
    );
  }

  // QUESTION / FEEDBACK phases
  const timePercent = question ? (timeLeft / question.time_limit) * 100 : 100;

  return (
    <main className="flex flex-col min-h-dvh safe-top max-w-lg mx-auto" style={{ background: "#080d1a" }}>
      {/* Top bar */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: "#475569" }}>
            {currentIdx + 1} / {questions.length}
          </span>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all"
            style={{
              background: timeLeft <= 5 ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.15)",
              color: timeLeft <= 5 ? "#ef4444" : "#818cf8",
              border: `2px solid ${timeLeft <= 5 ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.3)"}`,
            }}
          >
            {timeLeft}
          </div>
          <span className="text-sm font-semibold" style={{ color: "#6366f1" }}>
            {responses.filter((r) => r.is_correct).length} ✓
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e293b" }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${timePercent}%`,
              background: timeLeft <= 5 ? "#ef4444" : "linear-gradient(90deg, #4f46e5, #6366f1)",
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-5 pb-5">
        <div className="flex-1 flex items-center justify-center py-6">
          <p className="text-xl font-bold text-white text-center leading-snug">
            {question?.question_text}
          </p>
        </div>

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

            if (showResult) {
              if (isCorrect) { bgColor = "rgba(34,197,94,0.3)"; borderColor = "#22c55e"; }
              else if (isSelected && !isCorrect) { bgColor = "rgba(239,68,68,0.3)"; borderColor = "#ef4444"; }
              else { bgColor = "rgba(30,41,59,0.3)"; textColor = "#475569"; }
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={phase === "feedback"}
                className="relative rounded-2xl p-4 flex flex-col items-start gap-2 transition-all active:scale-95"
                style={{ background: bgColor, border: `2px solid ${borderColor}`, color: textColor, minHeight: "90px" }}
              >
                <span className="text-xl">{color.label}</span>
                <span className="text-xs font-semibold leading-snug text-left">{option}</span>
                {showResult && isCorrect && (
                  <div className="absolute top-2 right-2 text-green-400 text-sm">✓</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

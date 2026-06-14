// src/app/admin/quizzes/new/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminGuard } from "../../../../components/admin/AdminGuard";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../store/auth";

interface QuestionDraft {
  question_text: string;
  options: string[];
  correct_option_index: number;
  time_limit: number;
}

const emptyQuestion = (): QuestionDraft => ({
  question_text: "",
  options: ["", "", "", ""],
  correct_option_index: 0,
  time_limit: 20,
});

export default function NewQuizPage() {
  const { profile } = useAuthStore();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"info" | "questions">("info");

  const updateQuestion = (qi: number, field: keyof QuestionDraft, value: unknown) => {
    setQuestions((prev) => prev.map((q, i) => i === qi ? { ...q, [field]: value } : q));
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      const opts = [...q.options];
      opts[oi] = value;
      return { ...q, options: opts };
    }));
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);
  const removeQuestion = (qi: number) => setQuestions((prev) => prev.filter((_, i) => i !== qi));

  const handleSave = async () => {
    if (!profile || !title.trim() || questions.some((q) => !q.question_text.trim() || q.options.some((o) => !o.trim()))) return;
    setSaving(true);

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        scheduled_start_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (quizError || !quiz) { setSaving(false); return; }

    await supabase.from("quiz_questions").insert(
      questions.map((q, i) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index,
        time_limit: q.time_limit,
        order_index: i,
      }))
    );

    router.push("/admin/quizzes");
  };

  const canProceed = title.trim().length > 0;
  const canSave = questions.every((q) => q.question_text.trim() && q.options.every((o) => o.trim()));
  const OPTION_LABELS = ["A", "B", "C", "D"];
  const OPTION_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#22c55e"];

  return (
    <AdminGuard>
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "#1e293b" }}>
          {step === "questions" ? (
            <button onClick={() => setStep("info")}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </div>
            </button>
          ) : (
            <Link href="/admin/quizzes">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </div>
            </Link>
          )}
          <div>
            <h1 className="text-lg font-bold text-white">Nuevo Quiz</h1>
            <p className="text-xs" style={{ color: "#475569" }}>{step === "info" ? "Paso 1 de 2 — Información" : "Paso 2 de 2 — Preguntas"}</p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex px-5 py-3 gap-2 flex-shrink-0">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "#4f46e5" }} />
          <div className="flex-1 h-1.5 rounded-full" style={{ background: step === "questions" ? "#4f46e5" : "#1e293b" }} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">

          {/* ── STEP 1: INFO ── */}
          {step === "info" && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#94a3b8" }}>Título del quiz *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Repaso del culto del domingo"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#94a3b8" }}>Descripción (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  placeholder="¿De qué trata este cuestionario?"
                  rows={3}
                  style={{ resize: "none" }}
                />
              </div>

              {/* Scheduled toggle */}
              <div className="card-glass rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white">🕐 Programar apertura</p>
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Déjalo en blanco si es un quiz libre. Pon una fecha/hora si se habilitará a una hora específica (ej: cuando los jóvenes estén en casa).</p>
                </div>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="input-field"
                  style={{ colorScheme: "dark" }}
                />
                {scheduledAt && (
                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <p className="text-xs font-semibold" style={{ color: "#818cf8" }}>
                      Se habilitará el {new Date(scheduledAt).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })} a las {new Date(scheduledAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep("questions")}
                disabled={!canProceed}
                className="btn-primary w-full py-3.5 mt-2"
                style={!canProceed ? { opacity: 0.4 } : {}}
              >
                Continuar → Agregar preguntas
              </button>
            </div>
          )}

          {/* ── STEP 2: QUESTIONS ── */}
          {step === "questions" && (
            <div className="py-2">
              {questions.map((q, qi) => (
                <div
                  key={qi}
                  className="card-glass rounded-2xl p-4 mb-4 animate-fadeUp"
                  style={{ border: "1px solid #1e293b", animationDelay: `${qi * 0.04}s` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold" style={{ color: "#6366f1" }}>Pregunta {qi + 1}</p>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(qi)} className="text-xs" style={{ color: "#ef4444" }}>Eliminar</button>
                    )}
                  </div>

                  <textarea
                    value={q.question_text}
                    onChange={(e) => updateQuestion(qi, "question_text", e.target.value)}
                    className="input-field mb-3"
                    placeholder="¿Cuál fue el texto bíblico principal del culto?"
                    rows={2}
                    style={{ resize: "none" }}
                  />

                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#475569" }}>Opciones de respuesta</p>
                  <div className="space-y-2 mb-3">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuestion(qi, "correct_option_index", oi)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 transition-all"
                          style={{
                            background: q.correct_option_index === oi ? OPTION_COLORS[oi] : "rgba(30,41,59,0.5)",
                            color: q.correct_option_index === oi ? "white" : "#475569",
                            border: `1px solid ${q.correct_option_index === oi ? OPTION_COLORS[oi] : "#1e293b"}`,
                          }}
                        >
                          {OPTION_LABELS[oi]}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          className="input-field flex-1"
                          placeholder={`Opción ${OPTION_LABELS[oi]}`}
                          style={{ padding: "8px 12px", fontSize: "13px" }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mb-1" style={{ color: "#475569" }}>Toca la letra para marcar la respuesta correcta · Opción marcada: <span style={{ color: OPTION_COLORS[q.correct_option_index] }}>{OPTION_LABELS[q.correct_option_index]}</span></p>

                  <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #1e293b" }}>
                    <p className="text-[10px]" style={{ color: "#475569" }}>Tiempo límite:</p>
                    {[10, 15, 20, 30, 45].map((t) => (
                      <button
                        key={t}
                        onClick={() => updateQuestion(qi, "time_limit", t)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                        style={{
                          background: q.time_limit === t ? "rgba(99,102,241,0.2)" : "#1e293b",
                          color: q.time_limit === t ? "#818cf8" : "#475569",
                        }}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={addQuestion}
                className="w-full py-3 rounded-xl text-sm font-semibold mb-4 transition-all"
                style={{ background: "#1e293b", color: "#64748b", border: "1px dashed #334155" }}
              >
                + Agregar pregunta
              </button>

              <button
                onClick={handleSave}
                disabled={saving || !canSave}
                className="btn-primary w-full py-3.5"
                style={(!canSave || saving) ? { opacity: 0.4 } : {}}
              >
                {saving ? "Guardando..." : `💾 Guardar Quiz (${questions.length} preguntas)`}
              </button>
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

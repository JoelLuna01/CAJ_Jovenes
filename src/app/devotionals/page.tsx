// src/app/devotionals/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";
import { Devotional } from "../../types";

export default function DevotionalsPage() {
  const { user, profile, isLoading } = useAuthStore();
  const router = useRouter();
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Devotional | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!profile) return;

    // Fetch devotionals and completions in parallel
    Promise.all([
      supabase
        .from("devotionals")
        .select("*")
        .order("published_date", { ascending: false }),
      supabase
        .from("devotional_completions")
        .select("devotional_id")
        .eq("user_id", profile.id)
    ]).then(([devRes, compRes]) => {
      setDevotionals((devRes.data as Devotional[]) || []);
      
      const compSet = new Set<string>();
      if (compRes.data) {
        compRes.data.forEach((item: any) => compSet.add(item.devotional_id));
      }
      setCompletedIds(compSet);
      setLoading(false);
    });
  }, [profile]);

  const handleMarkAsRead = async () => {
    if (!profile || !selected || marking) return;
    setMarking(true);

    const { error } = await supabase
      .from("devotional_completions")
      .insert({
        user_id: profile.id,
        devotional_id: selected.id
      });

    if (!error) {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.add(selected.id);
        return next;
      });
    }
    setMarking(false);
  };

  if (isLoading || !user) return null;

  const isCompleted = selected ? completedIds.has(selected.id) : false;

  if (selected) {
    return (
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        <div className="p-5 flex-1 flex flex-col">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-sm mb-6 flex-shrink-0"
            style={{ color: "#6366f1" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver
          </button>
          
          <div className="flex-1 overflow-y-auto pb-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold" style={{ color: "#6366f1" }}>
                {new Date(selected.published_date).toLocaleDateString("es", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              {isCompleted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                  Leído ✓
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-6 leading-tight">{selected.title}</h1>
            <div className="prose prose-invert max-w-none text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              {selected.content.split("\n").map((p, i) => p ? <p key={i} className="mb-4">{p}</p> : <br key={i} />)}
            </div>
          </div>

          <div className="pt-4 pb-6 flex-shrink-0">
            {isCompleted ? (
              <div 
                className="w-full text-center py-3.5 rounded-xl text-sm font-semibold border"
                style={{ background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.2)", color: "#34d399" }}
              >
                Completado el devocional 🎉
              </div>
            ) : (
              <button
                className="btn-primary w-full py-3.5"
                onClick={handleMarkAsRead}
                disabled={marking}
              >
                {marking ? "Guardando..." : "✓ Marcar como leído"}
              </button>
            )}
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
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}
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
            const read = completedIds.has(d.id);
            return (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className="card-glass card-hover rounded-2xl p-4 w-full text-left animate-fadeUp relative overflow-hidden"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {read && (
                  <div className="absolute right-0 top-0 w-8 h-8 flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)", borderBottomLeftRadius: "12px" }}>
                    <span className="text-[10px] text-[#34d399] font-bold">✓</span>
                  </div>
                )}
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

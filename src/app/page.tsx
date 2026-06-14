// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "../store/auth";
import { supabase } from "../lib/supabase";

const GREETING = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
};

interface VerseData {
  text: string;
  reference: string;
}

// Calculate streak from list of ISO date completions
function calculateStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  // Get unique date strings (YYYY-MM-DD) sorted descending
  const uniqueDays = Array.from(
    new Set(completedDates.map((d) => new Date(d).toLocaleDateString("en-CA")))
  ).sort((a, b) => (a > b ? -1 : 1));

  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

  // Streak must start from today or yesterday
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 0;
  let expected = new Date(uniqueDays[0]);

  for (const day of uniqueDays) {
    const dayDate = new Date(day);
    const diffDays = Math.round((expected.getTime() - dayDate.getTime()) / 86400000);
    if (diffDays > 1) break; // Gap found — streak ends
    if (diffDays <= 1) {
      streak++;
      expected = dayDate;
    }
  }

  return streak;
}

const quickLinks = [
  {
    label: "Devocional de hoy",
    sub: "Fortalece tu fe",
    href: "/devotionals",
    gradient: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    label: "Peticiones de oración",
    sub: "Oremos juntos",
    href: "/prayer-requests",
    gradient: "linear-gradient(135deg, #db2777 0%, #9d174d 100%)",
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    label: "Mi diario espiritual",
    sub: "Reflexiones privadas",
    href: "/notes",
    gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
      </svg>
    ),
  },
  {
    label: "Próximos eventos",
    sub: "No te pierdas nada",
    href: "/events",
    gradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
];

export default function Home() {
  const { user, profile } = useAuthStore();
  const router = useRouter();
  const [greeting] = useState(GREETING());
  const [stats, setStats] = useState({ streak: 0, devotionals: 0, prayers: 0 });
  const [verse, setVerse] = useState<VerseData>({ text: "Cargando versículo…", reference: "" });
  const [verseLoading, setVerseLoading] = useState(true);

  // Redirect only if we're sure there's no user (after hydration)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) router.replace("/auth/login");
    }, 300);
    return () => clearTimeout(timer);
  }, [user, router]);

  // Fetch verse from DB then optionally from API
  useEffect(() => {
    const fetchVerse = async () => {
      const { data } = await supabase
        .from("daily_verse")
        .select("*")
        .limit(1)
        .single();

      if (!data) {
        setVerse({ text: "Todo lo puedo en Cristo que me fortalece.", reference: "Filipenses 4:13" });
        setVerseLoading(false);
        return;
      }

      if (data.is_auto) {
        // Fetch from external API
        try {
          const response = await fetch("https://bible-api.com/john+3:16?translation=rve");
          const json = await response.json();
          setVerse({
            text: json.text?.trim() || data.verse_text,
            reference: json.reference || data.verse_reference,
          });
        } catch {
          // Fallback to what's stored
          setVerse({ text: data.verse_text, reference: data.verse_reference });
        }
      } else {
        setVerse({ text: data.verse_text, reference: data.verse_reference });
      }
      setVerseLoading(false);
    };

    fetchVerse();
  }, []);

  // Fetch stats in background — real streak calculation
  useEffect(() => {
    if (!profile) return;
    Promise.all([
      supabase
        .from("devotional_completions")
        .select("completed_at")
        .eq("user_id", profile.id),
      supabase
        .from("prayer_requests")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id),
    ]).then(([devResult, prayerResult]) => {
      const completedDates = (devResult.data || []).map((d: any) => d.completed_at);
      const streak = calculateStreak(completedDates);

      setStats({
        streak,
        devotionals: completedDates.length,
        prayers: prayerResult.count || 0,
      });
    });
  }, [profile]);

  // Show skeleton while waiting for user from localStorage
  if (!user) {
    return (
      <main className="flex flex-col min-h-screen safe-top p-5 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-4 w-24 rounded-full animate-shimmer mb-2" />
            <div className="h-6 w-32 rounded-full animate-shimmer" />
          </div>
          <div className="w-11 h-11 rounded-full animate-shimmer" />
        </div>
        <div className="h-24 rounded-2xl animate-shimmer mb-6" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl animate-shimmer" />)}
        </div>
      </main>
    );
  }

  const firstName = profile?.first_name || user.email?.split("@")[0] || "amigo";
  const streakEmoji = stats.streak >= 7 ? "🔥🔥" : stats.streak >= 3 ? "🔥" : stats.streak >= 1 ? "✨" : "💤";

  return (
    <main className="flex flex-col min-h-screen safe-top p-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fadeUp">
        <div>
          <p className="text-sm font-medium" style={{ color: "#6366f1" }}>{greeting} 👋</p>
          <h1 className="text-2xl font-bold text-white capitalize">{firstName}</h1>
        </div>
        <Link href="/profile">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg text-white"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }}
          >
            {firstName[0]?.toUpperCase()}
          </div>
        </Link>
      </div>

      {/* Verse banner */}
      <div
        className="rounded-2xl p-5 mb-6 animate-fadeUp relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", border: "1px solid rgba(99,102,241,0.2)", animationDelay: "0.05s" }}
      >
        <div className="absolute right-0 top-0 w-32 h-32 opacity-10" style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)" }} />
        <p className="text-xs font-semibold mb-2" style={{ color: "#a5b4fc" }}>VERSÍCULO DEL DÍA</p>
        {verseLoading ? (
          <div className="space-y-2">
            <div className="h-3.5 rounded animate-shimmer" />
            <div className="h-3.5 w-3/4 rounded animate-shimmer" />
          </div>
        ) : (
          <>
            <p className="text-white font-medium text-sm leading-relaxed">
              "{verse.text}"
            </p>
            {verse.reference && (
              <p className="text-xs mt-2" style={{ color: "#6366f1" }}>— {verse.reference}</p>
            )}
          </>
        )}
      </div>

      {/* Quick Access Grid */}
      <h2 className="text-sm font-semibold mb-4" style={{ color: "#94a3b8" }}>ACCESO RÁPIDO</h2>
      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className="card-glass card-hover rounded-2xl p-4 flex flex-col gap-3 animate-fadeUp"
            style={{ animationDelay: `${0.1 + i * 0.05}s` }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.gradient }}>
              {item.icon}
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{item.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-6 mb-2 animate-fadeUp" style={{ animationDelay: "0.3s" }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#94a3b8" }}>MI PROGRESO</h2>
        <div className="card-glass rounded-2xl p-4 flex items-center justify-around">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {stats.streak > 0 ? `${stats.streak}` : "0"} {streakEmoji}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Racha de días</p>
          </div>
          <div className="h-10 w-px" style={{ background: "#1e293b" }} />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stats.devotionals}</p>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Devocionales</p>
          </div>
          <div className="h-10 w-px" style={{ background: "#1e293b" }} />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stats.prayers}</p>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Oraciones</p>
          </div>
        </div>

        {/* Streak motivational message */}
        {stats.streak > 0 && (
          <p className="text-xs text-center mt-2 animate-fadeUp" style={{ color: "#475569" }}>
            {stats.streak >= 7
              ? `🔥 ¡Increíble! Llevas ${stats.streak} días seguidos leyendo`
              : stats.streak >= 3
              ? `🔥 ¡Vas muy bien! ${stats.streak} días en racha`
              : `✨ ¡Empezaste tu racha! Sigue así mañana`}
          </p>
        )}
      </div>
    </main>
  );
}

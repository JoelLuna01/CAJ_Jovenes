// src/app/admin/streaks/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "../../../components/admin/AdminGuard";
import { supabase } from "../../../lib/supabase";

interface UserStreak {
  profile_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  streak: number;
  totalDevotionals: number;
  lastRead: string | null;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  label: string;
  emoji: string;
  color: string;
  unlocked: boolean;
}

const ACHIEVEMENTS = [
  { id: "first", label: "Primera lectura", emoji: "🌱", color: "#22c55e", threshold: 1 },
  { id: "streak3", label: "Racha de 3 días", emoji: "✨", color: "#a78bfa", threshold: 3 },
  { id: "streak7", label: "Semana completa", emoji: "🔥", color: "#f97316", threshold: 7 },
  { id: "streak14", label: "2 semanas", emoji: "⚡", color: "#facc15", threshold: 14 },
  { id: "streak30", label: "Mes completo", emoji: "🏆", color: "#fbbf24", threshold: 30 },
  { id: "devos10", label: "10 devocionales", emoji: "📖", color: "#6366f1", thresholdTotal: 10 },
  { id: "devos25", label: "25 devocionales", emoji: "📚", color: "#8b5cf6", thresholdTotal: 25 },
  { id: "devos50", label: "50 devocionales", emoji: "🎓", color: "#ec4899", thresholdTotal: 50 },
];

function calculateStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const uniqueDays = Array.from(
    new Set(completedDates.map((d) => new Date(d).toLocaleDateString("en-CA")))
  ).sort((a, b) => (a > b ? -1 : 1));

  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 0;
  let expected = new Date(uniqueDays[0]);
  for (const day of uniqueDays) {
    const dayDate = new Date(day);
    const diffDays = Math.round((expected.getTime() - dayDate.getTime()) / 86400000);
    if (diffDays > 1) break;
    if (diffDays <= 1) { streak++; expected = dayDate; }
  }
  return streak;
}

function getAchievements(streak: number, total: number): Achievement[] {
  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    label: a.label,
    emoji: a.emoji,
    color: a.color,
    unlocked: a.threshold ? streak >= a.threshold : (a.thresholdTotal ? total >= a.thresholdTotal : false),
  }));
}

function streakLabel(streak: number): { text: string; emoji: string; color: string } {
  if (streak >= 30) return { text: "Mes completo", emoji: "🏆", color: "#fbbf24" };
  if (streak >= 14) return { text: "2 semanas", emoji: "⚡", color: "#facc15" };
  if (streak >= 7)  return { text: "Semana llena", emoji: "🔥", color: "#f97316" };
  if (streak >= 3)  return { text: "¡En racha!", emoji: "✨", color: "#a78bfa" };
  if (streak >= 1)  return { text: "Iniciando", emoji: "🌱", color: "#22c55e" };
  return { text: "Sin racha", emoji: "💤", color: "#334155" };
}

export default function AdminStreaksPage() {
  const [users, setUsers] = useState<UserStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"streak" | "total">("streak");
  const [filter, setFilter] = useState<"all" | "active">("all");

  useEffect(() => {
    const load = async () => {
      // Get all profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url");

      if (!profiles) { setLoading(false); return; }

      // Get all completions in one query
      const { data: completions } = await supabase
        .from("devotional_completions")
        .select("user_id, completed_at")
        .order("completed_at", { ascending: false });

      // Group completions by user
      const completionsByUser = new Map<string, string[]>();
      (completions || []).forEach((c: any) => {
        if (!completionsByUser.has(c.user_id)) completionsByUser.set(c.user_id, []);
        completionsByUser.get(c.user_id)!.push(c.completed_at);
      });

      // Build UserStreak objects
      const result: UserStreak[] = profiles.map((p: any) => {
        const dates = completionsByUser.get(p.id) || [];
        const streak = calculateStreak(dates);
        const total = dates.length;
        const lastRead = dates.length > 0 ? dates[0] : null;
        return {
          profile_id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          avatar_url: p.avatar_url,
          streak,
          totalDevotionals: total,
          lastRead,
          achievements: getAchievements(streak, total),
        };
      });

      setUsers(result);
      setLoading(false);
    };
    load();
  }, []);

  const sorted = [...users]
    .filter((u) => filter === "all" ? true : u.streak > 0)
    .sort((a, b) => sortBy === "streak" ? b.streak - a.streak : b.totalDevotionals - a.totalDevotionals);

  const unlockedCount = (u: UserStreak) => u.achievements.filter((a) => a.unlocked).length;

  return (
    <AdminGuard>
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b" style={{ borderColor: "#1e293b" }}>
          <Link href="/admin">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </div>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Rachas y Logros</h1>
            <p className="text-xs" style={{ color: "#475569" }}>Progreso de los jóvenes</p>
          </div>
        </div>

        {/* Filters & Sort */}
        <div className="px-5 py-3 flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-1 flex-1">
            <button
              onClick={() => setFilter("all")}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={filter === "all"
                ? { background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white" }
                : { background: "#1e293b", color: "#64748b" }}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter("active")}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={filter === "active"
                ? { background: "linear-gradient(135deg, #f97316, #ea580c)", color: "white" }
                : { background: "#1e293b", color: "#64748b" }}
            >
              🔥 En racha
            </button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "streak" | "total")}
            className="text-xs bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 outline-none"
          >
            <option value="streak">Por racha</option>
            <option value="total">Por total</option>
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl animate-shimmer" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="card-glass rounded-2xl p-8 text-center mt-4">
              <p className="text-3xl mb-3">🌱</p>
              <p className="font-semibold text-white mb-1">Sin jóvenes con racha activa</p>
              <p className="text-sm" style={{ color: "#475569" }}>Publican un devocional para empezar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((u, i) => {
                const label = streakLabel(u.streak);
                const initials = `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase();
                const isTopThree = i < 3 && sortBy === "streak" && u.streak > 0;
                const podiumColors = ["#fbbf24", "#9ca3af", "#cd7c3a"];
                const podiumEmoji = ["🥇", "🥈", "🥉"];
                const unlocked = unlockedCount(u);

                return (
                  <div
                    key={u.profile_id}
                    className="card-glass rounded-2xl p-4 animate-fadeUp"
                    style={{
                      animationDelay: `${i * 0.04}s`,
                      border: isTopThree ? `1px solid ${podiumColors[i]}33` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {/* Rank badge */}
                      {isTopThree && (
                        <span className="text-xl flex-shrink-0">{podiumEmoji[i]}</span>
                      )}

                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                      >
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={u.first_name} className="w-full h-full rounded-full object-cover" />
                          : initials || "U"}
                      </div>

                      {/* Name & streak */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">
                          {u.first_name} {u.last_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold" style={{ color: label.color }}>
                            {label.emoji} {u.streak} días
                          </span>
                          <span className="text-[10px]" style={{ color: "#475569" }}>
                            · {u.totalDevotionals} devocionales
                          </span>
                        </div>
                      </div>

                      {/* Streak counter */}
                      <div
                        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{
                          background: u.streak > 0 ? `${label.color}20` : "#1e293b",
                          border: `1px solid ${u.streak > 0 ? `${label.color}40` : "#1e293b"}`,
                        }}
                      >
                        <span className="text-sm font-black" style={{ color: u.streak > 0 ? label.color : "#334155" }}>
                          {u.streak}
                        </span>
                        <span className="text-[8px] font-medium" style={{ color: "#475569" }}>días</span>
                      </div>
                    </div>

                    {/* Achievements row */}
                    {unlocked > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-2.5" style={{ borderTop: "1px solid #1e293b" }}>
                        <span className="text-[10px] font-semibold mr-1" style={{ color: "#475569" }}>Logros:</span>
                        {u.achievements.filter(a => a.unlocked).map((a) => (
                          <span
                            key={a.id}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: `${a.color}20`, color: a.color }}
                            title={a.label}
                          >
                            {a.emoji} {a.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Last read */}
                    {u.lastRead && (
                      <p className="text-[10px] mt-1.5" style={{ color: "#334155" }}>
                        Último leído: {new Date(u.lastRead).toLocaleDateString("es", { day: "numeric", month: "long" })}
                      </p>
                    )}
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

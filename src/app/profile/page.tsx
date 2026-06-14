// src/app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";

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

export default function ProfilePage() {
  const { user, profile, isLoading, clearAuth } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState({ streak: 0, devotionals: 0, notes: 0 });

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!profile) return;
    const fetchStats = async () => {
      const [devResult, notesResult] = await Promise.all([
        supabase.from("devotional_completions").select("completed_at").eq("user_id", profile.id),
        supabase.from("notes").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
      ]);
      const dates = (devResult.data || []).map((d: any) => d.completed_at);
      setStats({
        streak: calculateStreak(dates),
        devotionals: dates.length,
        notes: notesResult.count || 0,
      });
    };
    fetchStats();
  }, [profile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAuth();
    router.replace("/auth/login");
  };

  if (isLoading || !user) return null;

  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : user.email?.split("@")[0] || "Usuario";
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const isAdmin = profile?.role_name === "ADMIN" || profile?.role_name === "LIDER";

  // Determine avatar display
  const emojiAvatar = profile?.avatar_url?.startsWith("emoji:") ? profile.avatar_url.replace("emoji:", "") : null;
  const photoAvatar = profile?.avatar_url && !profile.avatar_url.startsWith("emoji:") ? profile.avatar_url : null;

  const streakEmoji = stats.streak >= 7 ? "🔥" : stats.streak >= 3 ? "✨" : stats.streak >= 1 ? "🌱" : "—";

  const menuItems = [
    ...(isAdmin ? [{
      label: "Panel de Administrador",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      href: "/admin",
    }] : []),
    {
      label: "Mis devocionales",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
      href: "/devotionals",
    },
    {
      label: "Mi diario espiritual",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
        </svg>
      ),
      href: "/notes",
    },
    {
      label: "Mis peticiones de oración",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      href: "/prayer-requests",
    },
  ];

  return (
    <main className="flex flex-col min-h-screen safe-top p-5 max-w-lg mx-auto">
      {/* Avatar header */}
      <div className="flex flex-col items-center py-8 animate-fadeUp relative">
        {/* Avatar */}
        <div className="relative mb-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}
          >
            {photoAvatar ? (
              <img src={photoAvatar} alt={name} className="w-full h-full object-cover" />
            ) : emojiAvatar ? (
              <span className="text-4xl">{emojiAvatar}</span>
            ) : (
              <span className="text-3xl font-bold text-white">{initials}</span>
            )}
          </div>
          {/* Edit button on avatar */}
          <Link href="/profile/edit">
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2"
              style={{ background: "#4f46e5", borderColor: "#0a0f1e" }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
              </svg>
            </div>
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white">{name}</h1>
        <p className="text-sm mt-1" style={{ color: "#475569" }}>{user.email}</p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            {profile?.role_name || "Joven"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="card-glass rounded-2xl p-4 flex items-center justify-around mb-6 animate-fadeUp">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {stats.streak > 0 ? stats.streak : "—"} {stats.streak > 0 ? streakEmoji : ""}
          </p>
          <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "#475569" }}>Racha</p>
        </div>
        <div className="h-10 w-px" style={{ background: "#1e293b" }} />
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats.devotionals}</p>
          <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "#475569" }}>Devocionales</p>
        </div>
        <div className="h-10 w-px" style={{ background: "#1e293b" }} />
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats.notes}</p>
          <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "#475569" }}>Notas</p>
        </div>
      </div>

      {/* Edit profile button */}
      <Link href="/profile/edit" className="block mb-4 animate-fadeUp">
        <div
          className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
          style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
          </svg>
          Editar perfil
        </div>
      </Link>

      {/* Menu */}
      <div className="card-glass rounded-2xl overflow-hidden mb-6 animate-fadeUp">
        {menuItems.map((item, i) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 px-4 py-4 transition-colors"
            style={{
              borderBottom: i < menuItems.length - 1 ? "1px solid #1e293b" : "none",
              color: "#94a3b8",
            }}
          >
            <span style={{ color: "#6366f1" }}>{item.icon}</span>
            <span className="flex-1 text-sm font-medium text-white">{item.label}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </a>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-colors animate-fadeUp"
        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}
      >
        Cerrar sesión
      </button>
    </main>
  );
}

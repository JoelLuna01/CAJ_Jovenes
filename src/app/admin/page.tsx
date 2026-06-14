// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "../../components/admin/AdminGuard";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";

interface AdminStats {
  totalUsers: number;
  totalDevotionals: number;
  openPrayers: number;
  upcomingEvents: number;
}

export default function AdminPage() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalDevotionals: 0,
    openPrayers: 0,
    upcomingEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [users, devotionals, prayers, events] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("devotionals").select("*", { count: "exact", head: true }),
        supabase.from("prayer_requests").select("*", { count: "exact", head: true }).eq("status", "OPEN"),
        supabase.from("events").select("*", { count: "exact", head: true }).gte("event_date", new Date().toISOString()),
      ]);
      setStats({
        totalUsers: users.count || 0,
        totalDevotionals: devotionals.count || 0,
        openPrayers: prayers.count || 0,
        upcomingEvents: events.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Usuarios", value: stats.totalUsers, color: "#6366f1", icon: "👥" },
    { label: "Devocionales", value: stats.totalDevotionals, color: "#059669", icon: "📖" },
    { label: "Peticiones", value: stats.openPrayers, color: "#db2777", icon: "🙏" },
    { label: "Eventos", value: stats.upcomingEvents, color: "#d97706", icon: "📅" },
  ];

  const quickActions = [
    {
      label: "Nuevo devocional",
      desc: "Publicar un devocional",
      href: "/admin/devotionals/new",
      gradient: "linear-gradient(135deg, #4f46e5, #7c3aed)",
      icon: "📖",
    },
    {
      label: "Nuevo evento",
      desc: "Crear un evento",
      href: "/admin/events/new",
      gradient: "linear-gradient(135deg, #d97706, #b45309)",
      icon: "📅",
    },
    {
      label: "Devocionales",
      desc: "Gestionar todos",
      href: "/admin/devotionals",
      gradient: "linear-gradient(135deg, #059669, #047857)",
      icon: "📋",
    },
    {
      label: "Peticiones",
      desc: "Revisar y responder",
      href: "/admin/prayer-requests",
      gradient: "linear-gradient(135deg, #db2777, #9d174d)",
      icon: "🙏",
    },
    {
      label: "Cuestionarios",
      desc: "Crear y lanzar juegos",
      href: "/admin/quizzes",
      gradient: "linear-gradient(135deg, #7c3aed, #4f46e5)",
      icon: "🎮",
    },
    {
      label: "Versículo del Día",
      desc: "Configurar modo automático o manual",
      href: "/admin/verse",
      gradient: "linear-gradient(135deg, #1e1b4b, #312e81)",
      icon: "📜",
    },
    {
      label: "Rachas y Logros",
      desc: "Ver progreso de los jóvenes",
      href: "/admin/streaks",
      gradient: "linear-gradient(135deg, #f97316, #ea580c)",
      icon: "🔥",
    },
    ...(profile?.role_name === "ADMIN"
      ? [
          {
            label: "Usuarios",
            desc: "Gestionar miembros",
            href: "/admin/users",
            gradient: "linear-gradient(135deg, #0ea5e9, #0284c7)",
            icon: "👥",
          },
        ]
      : []),
  ];

  return (
    <AdminGuard>
      <main className="flex flex-col min-h-screen safe-top p-5 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fadeUp">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
              >
                {profile?.role_name || "ADMIN"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">Panel Admin</h1>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-sm" style={{ color: "#6366f1" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Inicio
          </Link>
        </div>

        {/* Stats grid */}
        <h2 className="text-xs font-semibold mb-3 animate-fadeUp" style={{ color: "#64748b" }}>
          ESTADÍSTICAS GENERALES
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-6 animate-fadeUp">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="card-glass rounded-2xl p-4 flex items-center gap-3"
            >
              <span className="text-2xl">{card.icon}</span>
              <div>
                <p
                  className="text-2xl font-bold"
                  style={{ color: card.color }}
                >
                  {loading ? "—" : card.value}
                </p>
                <p className="text-xs" style={{ color: "#475569" }}>{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <h2 className="text-xs font-semibold mb-3 animate-fadeUp" style={{ color: "#64748b" }}>
          ACCIONES RÁPIDAS
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action, i) => (
            <Link
              key={action.href}
              href={action.href}
              className="card-glass card-hover rounded-2xl p-4 flex items-center gap-4 animate-fadeUp"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: action.gradient }}
              >
                {action.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{action.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{action.desc}</p>
              </div>
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: "#334155" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      </main>
    </AdminGuard>
  );
}

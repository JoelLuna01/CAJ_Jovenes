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
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);

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
        try {
          const response = await fetch("https://bible-api.com/john+3:16?translation=rve");
          const json = await response.json();
          setVerse({
            text: json.text?.trim() || data.verse_text,
            reference: json.reference || data.verse_reference,
          });
        } catch {
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
        .eq("user_id", profile.id)
        .eq("status", "APPROVED"),
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

  // Fetch checked devotionals feedback notifications
  useEffect(() => {
    if (!profile) return;
    
    const checkNotifications = async () => {
      const { data, error } = await supabase
        .from("devotional_completions")
        .select("id, status, feedback, devotional_id")
        .eq("user_id", profile.id)
        .neq("status", "PENDING"); // APPROVED or REJECTED

      if (error || !data) return;

      // Filter by seen notifications stored in localStorage
      const seenRaw = localStorage.getItem(`seen_devotional_notifications_${profile.id}`);
      const seenIds = seenRaw ? JSON.parse(seenRaw) : [];
      const unseen = data.filter((c: any) => !seenIds.includes(c.id));

      if (unseen.length > 0) {
        // Fetch devotionals titles manually
        const devoIds = unseen.map((u: any) => u.devotional_id);
        const { data: devos } = await supabase
          .from("devotionals")
          .select("id, title")
          .in("id", devoIds);

        const titleMap: Record<string, string> = {};
        (devos || []).forEach((d: any) => { titleMap[d.id] = d.title; });

        const mapped = unseen.map((c: any) => ({
          id: c.id,
          devotionalId: c.devotional_id,
          title: titleMap[c.devotional_id] || "Devocional",
          status: c.status,
          feedback: c.feedback
        }));

        setActiveNotifications(mapped);
      }
    };

    checkNotifications();
  }, [profile]);

  // Share daily verse options
  const handleShareWhatsApp = () => {
    const text = `*Versículo del Día - CAJ Jóvenes*\n\n"${verse.text}"\n— ${verse.reference}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: "Versículo del Día - CAJ Jóvenes",
      text: `"${verse.text}" — ${verse.reference}`,
      url: window.location.origin
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Error al compartir:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`"${verse.text}" — ${verse.reference}`);
        alert("¡Versículo copiado al portapapeles!");
      } catch (err) {
        alert("No se pudo copiar el texto.");
      }
    }
  };

  const handleDownloadCard = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, "#0a0f1e"); // dark navy
    gradient.addColorStop(0.5, "#1e1b4b"); // deep indigo
    gradient.addColorStop(1, "#0a0f1e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. Glow effect
    const radial = ctx.createRadialGradient(540, 960, 50, 540, 960, 700);
    radial.addColorStop(0, "rgba(99, 102, 241, 0.15)");
    radial.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 1080, 1920);

    // 3. Top Title
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#818cf8";
    ctx.textAlign = "center";
    ctx.fillText("VERSÍCULO DEL DÍA", 540, 320);

    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText("COMUNIDAD CAJ JÓVENES", 540, 365);

    // 4. Quotation marks background
    ctx.font = "italic 320px serif";
    ctx.fillStyle = "rgba(99, 102, 241, 0.05)";
    ctx.fillText("“", 540, 750);

    // 5. Wrap text logic
    ctx.font = "500 52px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";

    const text = `"${verse.text}"`;
    const maxWidth = 860;
    const lineHeight = 75;
    const words = text.split(" ");
    let line = "";
    const lines = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // Center text vertically
    const totalHeight = lines.length * lineHeight;
    let startY = 960 - (totalHeight / 2);

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i].trim(), 540, startY);
      startY += lineHeight;
    }

    // 6. Cita
    if (verse.reference) {
      ctx.font = "bold 44px sans-serif";
      ctx.fillStyle = "#6366f1";
      ctx.fillText(`— ${verse.reference}`, 540, startY + 70);
    }

    // 7. Footer decoration
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillText("✝", 540, 1680);

    ctx.font = "medium 20px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillText("Nutre tu espíritu diariamente", 540, 1725);

    // 8. Download trigger
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = `Versiculo_${verse.reference.replace(/[\s:]/g, "_")}.png`;
    a.href = url;
    a.click();
  };

  const handleDismissNotification = (id: string) => {
    if (!profile) return;
    const seenRaw = localStorage.getItem(`seen_devotional_notifications_${profile.id}`);
    const seenIds = seenRaw ? JSON.parse(seenRaw) : [];
    seenIds.push(id);
    localStorage.setItem(`seen_devotional_notifications_${profile.id}`, JSON.stringify(seenIds));
    setActiveNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl animate-shimmer" />)}
        </div>
      </main>
    );
  }

  const firstName = profile?.first_name || user.email?.split("@")[0] || "amigo";
  const streakEmoji = stats.streak >= 7 ? "🔥🔥" : stats.streak >= 3 ? "🔥" : stats.streak >= 1 ? "✨" : "💤";

  return (
    <main className="flex flex-col min-h-screen safe-top p-5 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fadeUp">
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

      {/* Devotional Review Notification Banners */}
      {activeNotifications.map((notif) => (
        <div
          key={notif.id}
          className="mb-4 p-4 rounded-2xl flex items-start gap-3 border animate-fadeUp relative overflow-hidden"
          style={{
            background: notif.status === "APPROVED" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            borderColor: notif.status === "APPROVED" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"
          }}
        >
          <div className="text-xl flex-shrink-0">
            {notif.status === "APPROVED" ? "🎉" : "❌"}
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h4 className="text-xs font-bold text-white">
              {notif.status === "APPROVED" ? "¡Devocional Aprobado!" : "Corrección Requerida"}
            </h4>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              {notif.status === "APPROVED"
                ? `Tu evidencia para el devocional "${notif.title}" ha sido aprobada con éxito.`
                : `Tu evidencia para "${notif.title}" necesita cambios.`}
              {notif.feedback && <span className="block mt-1 font-semibold text-slate-400 italic">"{notif.feedback}"</span>}
            </p>
            <Link
              href={`/devotionals?id=${notif.devotionalId}`}
              className="inline-block text-[10px] font-bold mt-2 underline"
              style={{ color: notif.status === "APPROVED" ? "#34d399" : "#f87171" }}
            >
              Ver devocional
            </Link>
          </div>
          <button
            onClick={() => handleDismissNotification(notif.id)}
            className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center bg-slate-950/20"
          >
            ✕
          </button>
        </div>
      ))}

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

            {/* Verse Share actions */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-indigo-950/30">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-1.5 rounded-xl hover:bg-emerald-950/40 transition-all"
              >
                🟢 WhatsApp
              </button>
              <button
                onClick={handleNativeShare}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-2.5 py-1.5 rounded-xl hover:bg-indigo-950/40 transition-all"
              >
                🔗 Compartir
              </button>
              <button
                onClick={handleDownloadCard}
                className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/20 border border-amber-900/30 px-2.5 py-1.5 rounded-xl hover:bg-amber-950/40 transition-all ml-auto"
              >
                📷 Tarjeta PNG
              </button>
            </div>
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

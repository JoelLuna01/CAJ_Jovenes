// src/app/admin/devotionals/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "../../../components/admin/AdminGuard";
import { supabase } from "../../../lib/supabase";
import { Devotional } from "../../../types";

export default function AdminDevotionalsPage() {
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDevotionals = async () => {
    const { data } = await supabase
      .from("devotionals")
      .select("*")
      .order("published_date", { ascending: false });
    setDevotionals((data as Devotional[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDevotionals(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este devocional?")) return;
    setDeleting(id);
    await supabase.from("devotionals").delete().eq("id", id);
    setDevotionals((prev) => prev.filter((d) => d.id !== id));
    setDeleting(null);
  };

  return (
    <AdminGuard>
      <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: "#1e293b" }}>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </div>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Devocionales</h1>
              <p className="text-xs" style={{ color: "#475569" }}>{devotionals.length} publicados</p>
            </div>
          </div>
          <Link
            href="/admin/devotionals/new"
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl"
            style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}
            </div>
          ) : devotionals.length === 0 ? (
            <div className="card-glass rounded-2xl p-8 text-center mt-4">
              <p className="text-3xl mb-3">📖</p>
              <p className="font-semibold text-white mb-1">Sin devocionales</p>
              <p className="text-sm mb-4" style={{ color: "#475569" }}>Crea el primero ahora</p>
              <Link href="/admin/devotionals/new" className="btn-primary text-sm py-2 px-4">
                Crear devocional
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {devotionals.map((d, i) => (
                <div
                  key={d.id}
                  className="card-glass rounded-2xl p-4 animate-fadeUp"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
                    >
                      <span className="text-sm font-bold" style={{ color: "#818cf8" }}>
                        {new Date(d.published_date).getDate()}
                      </span>
                      <span className="text-[9px] uppercase" style={{ color: "#6366f1" }}>
                        {new Date(d.published_date).toLocaleString("es", { month: "short" })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm mb-1 line-clamp-1">{d.title}</p>
                      <p className="text-xs line-clamp-2" style={{ color: "#475569" }}>{d.content}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deleting === d.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}
                    >
                      {deleting === d.id ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

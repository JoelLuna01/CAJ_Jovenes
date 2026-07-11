// src/app/admin/prayer-requests/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "../../../components/admin/AdminGuard";
import { supabase } from "../../../lib/supabase";
import { PrayerRequest } from "../../../types";

type FilterStatus = "ALL" | "OPEN" | "ANSWERED" | "CLOSED";

const STATUS_STYLES = {
  OPEN: { bg: "rgba(99,102,241,0.15)", color: "#818cf8", label: "Abierta" },
  ANSWERED: { bg: "rgba(16,185,129,0.15)", color: "#34d399", label: "Contestada" },
  CLOSED: { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", label: "Cerrada" },
};

export default function AdminPrayerRequestsPage() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchRequests = async () => {
    let query = supabase.from("prayer_requests").select("*").order("created_at", { ascending: false });
    if (filter !== "ALL") query = query.eq("status", filter);
    const { data } = await query;
    setRequests((data as PrayerRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => { setLoading(true); fetchRequests(); }, [filter]);

  const updateStatus = async (id: string, status: "OPEN" | "ANSWERED" | "CLOSED") => {
    setUpdating(id);
    const { error } = await supabase.from("prayer_requests").update({ status }).eq("id", id);
    if (error) {
      console.error("Error al actualizar petición:", error);
      alert("Error al actualizar el estado de la petición: " + error.message);
    } else {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    }
    setUpdating(null);
  };

  const filters: FilterStatus[] = ["ALL", "OPEN", "ANSWERED", "CLOSED"];

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
            <h1 className="text-lg font-bold text-white">Peticiones de oración</h1>
            <p className="text-xs" style={{ color: "#475569" }}>Gestiona y responde</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-5 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={
                filter === f
                  ? { background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white" }
                  : { background: "#1e293b", color: "#64748b" }
              }
            >
              {f === "ALL" ? "Todas" : STATUS_STYLES[f].label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl animate-shimmer" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="card-glass rounded-2xl p-8 text-center mt-4">
              <p className="text-3xl mb-3">🙏</p>
              <p className="font-semibold text-white">Sin peticiones</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req, i) => {
                const style = STATUS_STYLES[req.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.OPEN;
                return (
                  <div
                    key={req.id}
                    className="card-glass rounded-2xl p-4 animate-fadeUp"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-white text-sm flex-1 leading-snug">{req.title}</p>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {style.label}
                      </span>
                    </div>
                    {req.description && (
                      <p className="text-xs mb-3 line-clamp-2" style={{ color: "#475569" }}>{req.description}</p>
                    )}
                    <p className="text-[10px] mb-3" style={{ color: "#334155" }}>
                      {new Date(req.created_at).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
                    </p>

                    {/* Status actions */}
                    <div className="flex gap-2">
                      {req.status !== "ANSWERED" && (
                        <button
                          onClick={() => updateStatus(req.id, "ANSWERED")}
                          disabled={updating === req.id}
                          className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
                          style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}
                        >
                          ✓ Contestada
                        </button>
                      )}
                      {req.status !== "CLOSED" && (
                        <button
                          onClick={() => updateStatus(req.id, "CLOSED")}
                          disabled={updating === req.id}
                          className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
                          style={{ background: "rgba(100,116,139,0.15)", color: "#94a3b8" }}
                        >
                          Cerrar
                        </button>
                      )}
                      {req.status !== "OPEN" && (
                        <button
                          onClick={() => updateStatus(req.id, "OPEN")}
                          disabled={updating === req.id}
                          className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
                          style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
                        >
                          Reabrir
                        </button>
                      )}
                    </div>
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

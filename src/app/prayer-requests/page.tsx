// src/app/prayer-requests/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";
import { PrayerRequest } from "../../types";

interface PrayerRequestWithJoins extends PrayerRequest {
  prayer_joins: { user_id: string }[];
}

export default function PrayerRequestsPage() {
  const { user, profile, isLoading } = useAuthStore();
  const router = useRouter();
  const [requests, setRequests] = useState<PrayerRequestWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  const fetchRequests = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("prayer_requests")
      .select("*, prayer_joins(user_id)")
      .order("created_at", { ascending: false });

    setRequests((data as PrayerRequestWithJoins[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleSave = async () => {
    if (!profile || !title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("prayer_requests")
      .insert({ user_id: profile.id, title: title.trim(), description: description.trim(), status: "OPEN" })
      .select("*, prayer_joins(user_id)")
      .single();

    if (!error && data) {
      setRequests((prev) => [data as PrayerRequestWithJoins, ...prev]);
      setTitle("");
      setDescription("");
      setCreating(false);
    }
    setSaving(false);
  };

  const handleTogglePray = async (request: PrayerRequestWithJoins) => {
    if (!profile || actionId) return;
    setActionId(request.id);

    const hasJoined = request.prayer_joins.some((j) => j.user_id === profile.id);

    if (hasJoined) {
      // Remove join
      const { error } = await supabase
        .from("prayer_joins")
        .delete()
        .eq("prayer_request_id", request.id)
        .eq("user_id", profile.id);

      if (!error) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === request.id
              ? { ...r, prayer_joins: r.prayer_joins.filter((j) => j.user_id !== profile.id) }
              : r
          )
        );
      }
    } else {
      // Add join
      const { error } = await supabase
        .from("prayer_joins")
        .insert({ prayer_request_id: request.id, user_id: profile.id });

      if (!error) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === request.id
              ? { ...r, prayer_joins: [...r.prayer_joins, { user_id: profile.id }] }
              : r
          )
        );
      }
    }
    setActionId(null);
  };

  if (isLoading || !user) return null;

  return (
    <main className="flex flex-col min-h-screen safe-top p-5 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Peticiones</h1>
          <p className="text-sm" style={{ color: "#475569" }}>Oremos juntos</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #db2777, #9d174d)", boxShadow: "0 4px 12px rgba(219,39,119,0.35)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* New request sheet */}
      {creating && (
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setCreating(false); }}
        >
          <div
            className="rounded-t-3xl flex flex-col"
            style={{
              background: "#0f172a",
              border: "1px solid rgba(219,39,119,0.15)",
              maxHeight: "85dvh",
              paddingBottom: "env(safe-area-inset-bottom, 16px)"
            }}
          >
            {/* Fixed header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">Nueva petición</h2>
              <button onClick={() => setCreating(false)} style={{ color: "#64748b" }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 pb-2 flex flex-col gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="¿Por qué necesitas oración?"
                autoFocus
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
                placeholder="Comparte más detalles (opcional)"
                rows={5}
                style={{ resize: "none" }}
              />
            </div>

            {/* Fixed footer button */}
            <div className="px-6 pt-3 pb-5 flex-shrink-0">
              <button
                className="w-full font-semibold py-3.5 rounded-xl transition-all"
                style={{ background: "linear-gradient(135deg, #db2777, #9d174d)", color: "white", boxShadow: "0 4px 16px rgba(219,39,119,0.35)" }}
                onClick={handleSave}
                disabled={saving || !title.trim()}
              >
                {saving ? "Publicando..." : "Publicar petición"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-shimmer" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="card-glass rounded-2xl p-8 text-center mt-4">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "#334155" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="font-semibold text-white mb-1">Sin peticiones aún</p>
          <p className="text-sm" style={{ color: "#475569" }}>Sé el primero en compartir</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req, i) => {
            const joined = profile ? req.prayer_joins.some((j) => j.user_id === profile.id) : false;
            const prayCount = req.prayer_joins.length;
            return (
              <div
                key={req.id}
                className="card-glass rounded-2xl p-4 animate-fadeUp"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-semibold text-white text-sm flex-1">{req.title}</p>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={
                      req.status === "OPEN"
                        ? { background: "rgba(99,102,241,0.15)", color: "#818cf8" }
                        : { background: "rgba(16,185,129,0.15)", color: "#34d399" }
                    }
                  >
                    {req.status === "OPEN" ? "Abierta" : req.status === "ANSWERED" ? "Contestada" : "Cerrada"}
                  </span>
                </div>
                {req.description && (
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: "#94a3b8" }}>{req.description}</p>
                )}
                
                <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid #1e293b" }}>
                  <button
                    onClick={() => handleTogglePray(req)}
                    disabled={actionId === req.id}
                    className="flex items-center gap-1.5 text-xs font-semibold transition-all py-1.5 px-3 rounded-lg"
                    style={
                      joined
                        ? { background: "rgba(219,39,119,0.15)", color: "#f472b6" }
                        : { background: "transparent", color: "#64748b" }
                    }
                  >
                    <svg className="w-4 h-4" fill={joined ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {joined ? "¡Apoyando!" : "Unirme en oración"}
                  </button>

                  {prayCount > 0 && (
                    <span className="text-[10px] font-medium" style={{ color: "#475569" }}>
                      🙏 {prayCount} {prayCount === 1 ? "persona orando" : "personas orando"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

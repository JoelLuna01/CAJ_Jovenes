// src/app/events/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";
import { Event } from "../../types";

const MONTHS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

export default function EventsPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true })
      .then(({ data }) => {
        setEvents((data as Event[]) || []);
        setLoading(false);
      });
  }, [user]);

  if (isLoading || !user) return null;

  return (
    <main className="flex flex-col min-h-screen safe-top p-5 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Eventos</h1>
      <p className="text-sm mb-6" style={{ color: "#475569" }}>Próximas actividades CAJ</p>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl animate-shimmer" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="card-glass rounded-2xl p-8 text-center mt-4">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "#334155" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="font-semibold text-white mb-1">Sin eventos</p>
          <p className="text-sm" style={{ color: "#475569" }}>Pronto habrá nuevas actividades</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => {
            const d = new Date(event.event_date);
            const isPast = d < new Date();
            return (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="w-full text-left card-glass card-hover rounded-2xl p-4 flex gap-4 animate-fadeUp"
                style={{ animationDelay: `${i * 0.05}s`, opacity: isPast ? 0.6 : 1 }}
              >
                {/* Date badge */}
                <div
                  className="w-14 flex flex-col items-center justify-center rounded-xl flex-shrink-0 py-2"
                  style={{
                    background: isPast ? "rgba(100,116,139,0.1)" : "rgba(217,119,6,0.1)",
                    border: `1px solid ${isPast ? "rgba(100,116,139,0.2)" : "rgba(217,119,6,0.2)"}`
                  }}
                >
                  <span className="text-[10px] font-bold" style={{ color: isPast ? "#64748b" : "#f59e0b" }}>
                    {MONTHS[d.getMonth()]}
                  </span>
                  <span className="text-2xl font-bold leading-none text-white">{d.getDate()}</span>
                  <span className="text-[10px]" style={{ color: "#78716c" }}>{d.getFullYear()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-white text-sm mb-1">{event.title}</p>
                    {isPast && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(100,116,139,0.2)", color: "#64748b" }}>
                        Pasado
                      </span>
                    )}
                  </div>
                  <p className="text-xs mb-2 line-clamp-2" style={{ color: "#475569" }}>{event.description}</p>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "#64748b" }}>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <p className="text-[10px] mt-2 font-medium" style={{ color: "#4f46e5" }}>Toca para ver detalles →</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvent(null); }}
        >
          <div
            className="rounded-t-3xl flex flex-col"
            style={{
              background: "#0f172a",
              border: "1px solid rgba(217,119,6,0.15)",
              maxHeight: "85dvh",
              paddingBottom: "env(safe-area-inset-bottom, 16px)"
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "#1e293b" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-3 pb-4 flex-shrink-0">
              <div
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  background: new Date(selectedEvent.event_date) < new Date()
                    ? "rgba(100,116,139,0.2)"
                    : "rgba(217,119,6,0.15)",
                  color: new Date(selectedEvent.event_date) < new Date() ? "#64748b" : "#f59e0b"
                }}
              >
                {new Date(selectedEvent.event_date) < new Date() ? "Evento pasado" : "Próximo evento"}
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{ color: "#64748b" }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 pb-6 flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{selectedEvent.title}</h2>
                <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>{selectedEvent.description}</p>
              </div>

              {/* Info cards */}
              <div className="space-y-3">
                {/* Date & Time */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.15)" }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(217,119,6,0.15)" }}>
                    <svg className="w-4 h-4" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {new Date(selectedEvent.event_date).toLocaleDateString("es", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <p className="text-xs" style={{ color: "#f59e0b" }}>
                      {new Date(selectedEvent.event_date).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })} hrs
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)" }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
                    <svg className="w-4 h-4" style={{ color: "#818cf8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{selectedEvent.location}</p>
                    <p className="text-xs" style={{ color: "#818cf8" }}>Lugar del evento</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

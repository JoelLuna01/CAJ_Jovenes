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

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString())
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
          <p className="font-semibold text-white mb-1">Sin eventos próximos</p>
          <p className="text-sm" style={{ color: "#475569" }}>Pronto habrá nuevas actividades</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => {
            const d = new Date(event.event_date);
            return (
              <div
                key={event.id}
                className="card-glass card-hover rounded-2xl p-4 flex gap-4 animate-fadeUp"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Date badge */}
                <div
                  className="w-14 flex flex-col items-center justify-center rounded-xl flex-shrink-0 py-2"
                  style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)" }}
                >
                  <span className="text-[10px] font-bold" style={{ color: "#f59e0b" }}>
                    {MONTHS[d.getMonth()]}
                  </span>
                  <span className="text-2xl font-bold leading-none text-white">{d.getDate()}</span>
                  <span className="text-[10px]" style={{ color: "#78716c" }}>
                    {d.getFullYear()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm mb-1">{event.title}</p>
                  <p className="text-xs mb-2 line-clamp-2" style={{ color: "#475569" }}>{event.description}</p>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#64748b" }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

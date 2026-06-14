// src/features/events/EventList.tsx
"use client";

import { useEffect } from "react";
import { useEventsStore } from "../../store/events";
import { supabase } from "../../lib/supabase";

export const EventList = () => {
  const { events, isLoading, setEvents, setLoading } = useEventsStore();

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })
        .gte('event_date', new Date().toISOString()); // Only upcoming events

      if (!error && data) {
        setEvents(data);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [setEvents, setLoading]);

  if (isLoading) {
    return <div className="text-center text-slate-400 py-10">Cargando próximos eventos...</div>;
  }

  if (events.length === 0) {
    return <div className="text-center text-slate-400 py-10">No hay eventos próximos agendados.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <div key={event.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg hover:shadow-primary/20 transition-all group">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-700 text-center rounded-lg px-3 py-2 flex flex-col justify-center min-w-[60px]">
              <span className="text-sm text-slate-400 font-semibold uppercase">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
              <span className="text-2xl font-bold text-white leading-none">{new Date(event.event_date).getDate()}</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{event.title}</h3>
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.location}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-2 line-clamp-3">
            {event.description}
          </p>
          <div className="mt-6">
            <button className="w-full bg-slate-700 hover:bg-primary text-white font-medium py-2 rounded-lg transition-colors">
              Confirmar Asistencia
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

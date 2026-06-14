// src/app/admin/events/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminGuard } from "../../../../components/admin/AdminGuard";
import { useAuthStore } from "../../../../store/auth";
import { supabase } from "../../../../lib/supabase";

export default function NewEventPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("10:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!profile || !title.trim() || !location.trim() || !eventDate) return;
    setSaving(true);
    setError(null);

    const fullDate = new Date(`${eventDate}T${eventTime}:00`).toISOString();

    const { error } = await supabase.from("events").insert({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      event_date: fullDate,
      created_by: profile.id,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      router.push("/events");
    }
  };

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
            <h1 className="text-lg font-bold text-white">Nuevo evento</h1>
            <p className="text-xs" style={{ color: "#475569" }}>Crear y publicar</p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#94a3b8" }}>Nombre del evento</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Ej: Retiro de jóvenes 2024"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "#94a3b8" }}>Fecha</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="input-field"
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "#94a3b8" }}>Hora</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="input-field"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#94a3b8" }}>Lugar</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
              placeholder="Ej: Iglesia CAJ, Sala Principal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#94a3b8" }}>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="Detalles del evento..."
              rows={5}
              style={{ resize: "none" }}
            />
          </div>

          {/* Preview */}
          {title && eventDate && (
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.15)" }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "#f59e0b" }}>VISTA PREVIA</p>
              <p className="font-bold text-white text-sm mb-1">{title}</p>
              <p className="text-xs" style={{ color: "#f59e0b" }}>
                📅 {new Date(`${eventDate}T${eventTime}:00`).toLocaleDateString("es", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} — {eventTime}h
              </p>
              {location && <p className="text-xs mt-1" style={{ color: "#64748b" }}>📍 {location}</p>}
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <div className="px-5 pb-6 pt-3 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid #1e293b" }}>
          <Link
            href="/admin"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-center transition-colors"
            style={{ background: "#1e293b", color: "#94a3b8" }}
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !location.trim() || !eventDate}
            className="flex-1 btn-primary py-3 text-sm"
            style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}
          >
            {saving ? "Publicando..." : "Publicar evento"}
          </button>
        </div>
      </main>
    </AdminGuard>
  );
}

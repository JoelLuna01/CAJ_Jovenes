// src/features/prayer-requests/PrayerRequestList.tsx
"use client";

import { useEffect, useState } from "react";
import { usePrayerStore } from "../../store/prayer";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth";

export const PrayerRequestList = () => {
  const { requests, isLoading, setRequests, setLoading, addRequest } = usePrayerStore();
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
      setLoading(false);
    };

    fetchRequests();
  }, [setRequests, setLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Simulate optimistic update or wait for edge function
    // For now, simple insert
    const request = {
      title: newTitle,
      description: newDescription,
      user_id: user.id,
      status: 'OPEN',
    };
    
    const { data, error } = await supabase
      .from('prayer_requests')
      .insert(request)
      .select()
      .single();
      
    if (!error && data) {
      addRequest(data);
      setShowForm(false);
      setNewTitle("");
      setNewDescription("");
    }
  };

  if (isLoading) {
    return <div className="text-center text-slate-400 py-10">Cargando peticiones...</div>;
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
        >
          + Nueva Petición
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-slate-800 border border-slate-700 rounded-xl shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Enviar petición de oración</h3>
          <input 
            type="text" 
            placeholder="Título (ej: Por la salud de mi madre)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-primary mb-4"
          />
          <textarea 
            placeholder="Detalles de la petición..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            required
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-primary mb-4"
          />
          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button type="submit" className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Publicar
            </button>
          </div>
        </form>
      )}

      {requests.length === 0 ? (
        <div className="text-center text-slate-400 py-10 bg-slate-800/50 rounded-xl border border-slate-700/50">
          No hay peticiones de oración abiertas en este momento.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-md hover:border-slate-600 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white">{req.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${req.status === 'OPEN' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                    {req.status === 'OPEN' ? 'Abierta' : 'Contestada'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">{req.description}</p>
              </div>
              <div className="flex-shrink-0">
                <button className="text-primary hover:text-white transition-colors text-sm font-medium border border-primary hover:bg-primary px-4 py-2 rounded-lg">
                  Unirme en Oración
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

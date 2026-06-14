// src/features/notes/NotesList.tsx
"use client";

import { useEffect, useState } from "react";
import { useNotesStore } from "../../store/notes";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth";

export const NotesList = () => {
  const { notes, isLoading, setNotes, setLoading } = useNotesStore();
  const { user } = useAuthStore();
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotes(data);
      }
      setLoading(false);
    };

    fetchNotes();
  }, [user, setNotes, setLoading]);

  if (isLoading) {
    return <div className="text-center text-slate-400 py-10">Cargando tu diario...</div>;
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button 
          onClick={() => setShowEditor(!showEditor)}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
        >
          + Nueva Nota
        </button>
      </div>

      {showEditor && (
        <div className="mb-8 p-6 bg-slate-800 border border-slate-700 rounded-xl shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Escribir en mi diario</h3>
          <input 
            type="text" 
            placeholder="Título de la nota"
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-primary mb-4"
          />
          <textarea 
            placeholder="¿Qué aprendiste hoy? ¿Qué te habló Dios?"
            rows={4}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-primary mb-4"
          />
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setShowEditor(false)}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Guardar Nota
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="text-center text-slate-400 py-10 bg-slate-800/50 rounded-xl border border-slate-700/50">
          Aún no tienes notas. ¡Comienza a escribir tu diario espiritual!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notes.map((note) => (
            <div key={note.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-md hover:border-slate-600 transition-colors">
              <h3 className="text-xl font-bold text-white">{note.title}</h3>
              <p className="text-sm text-slate-400 mt-2 line-clamp-4">{note.content}</p>
              <div className="mt-4 text-xs text-slate-500">
                {new Date(note.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

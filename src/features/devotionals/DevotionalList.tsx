// src/features/devotionals/DevotionalList.tsx
"use client";

import { useEffect } from "react";
import { useDevotionalsStore } from "../../store/devotionals";
import { supabase } from "../../lib/supabase";

export const DevotionalList = () => {
  const { devotionals, isLoading, setDevotionals, setLoading } = useDevotionalsStore();

  useEffect(() => {
    const fetchDevotionals = async () => {
      setLoading(true);
      // We use the Edge Function or direct DB query. Here we use direct query for now,
      // but in production we can call the 'get-devotionals' Edge Function.
      const { data, error } = await supabase
        .from('devotionals')
        .select('*')
        .order('published_date', { ascending: false });

      if (!error && data) {
        setDevotionals(data);
      }
      setLoading(false);
    };

    fetchDevotionals();
  }, [setDevotionals, setLoading]);

  if (isLoading) {
    return <div className="text-center text-slate-400 py-10">Cargando devocionales...</div>;
  }

  if (devotionals.length === 0) {
    return <div className="text-center text-slate-400 py-10">No hay devocionales disponibles en este momento.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {devotionals.map((devotional) => (
        <div 
          key={devotional.id} 
          className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg hover:shadow-primary/20 transition-all cursor-pointer group"
        >
          <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
            {devotional.title}
          </h3>
          <p className="text-sm text-slate-400 mt-2 line-clamp-3">
            {devotional.content}
          </p>
          <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center text-xs text-slate-500">
            <span>{new Date(devotional.published_date).toLocaleDateString()}</span>
            <span className="text-primary font-medium">Leer más →</span>
          </div>
        </div>
      ))}
    </div>
  );
};

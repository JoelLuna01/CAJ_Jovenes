// src/features/profiles/ProfileView.tsx
"use client";

import { useAuthStore } from "../../store/auth";

export const ProfileView = () => {
  const { user, profile } = useAuthStore();

  if (!profile || !user) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-xl max-w-2xl mx-auto">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative">
          <div className="w-32 h-32 bg-slate-700 rounded-full flex items-center justify-center border-4 border-slate-600 overflow-hidden shadow-lg shadow-black/50">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-slate-400">
                {profile.first_name[0]}{profile.last_name[0]}
              </span>
            )}
          </div>
          <button className="absolute bottom-0 right-0 bg-primary hover:bg-blue-600 text-white p-2 rounded-full transition-colors shadow-md shadow-blue-500/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold text-white mb-2">{profile.first_name} {profile.last_name}</h2>
          <p className="text-slate-400 mb-4">{user.email}</p>
          <div className="inline-block bg-slate-900 border border-slate-700 rounded-lg px-4 py-2">
            <p className="text-sm text-slate-400">Rol en la Comunidad</p>
            <p className="font-semibold text-primary capitalize">{profile.role_id}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-10 pt-8 border-t border-slate-700">
        <h3 className="text-xl font-bold text-white mb-6">Mis Estadísticas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Devocionales</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Racha Actual</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Peticiones</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Eventos</p>
          </div>
        </div>
      </div>
      
      <div className="mt-10 flex justify-end">
        <button 
          onClick={() => { /* Implement logout logic */ }}
          className="text-red-400 hover:text-red-300 font-medium transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "../../../components/admin/AdminGuard";
import { supabase } from "../../../lib/supabase";
import { UserProfile } from "../../../types";

interface Role {
  id: string;
  name: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*, roles(name)"),
      supabase.from("roles").select("id, name"),
    ]);

    if (profilesRes.data) {
      const mapped = profilesRes.data.map((p) => ({
        ...p,
        role_name: (p.roles as { name: string } | null)?.name || "JOVEN",
      })) as UserProfile[];
      setUsers(mapped);
    }
    if (rolesRes.data) {
      setRoles(rolesRes.data as Role[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const changeRole = async (profileId: string, newRoleId: string) => {
    setUpdating(profileId);
    const { error } = await supabase
      .from("profiles")
      .update({ role_id: newRoleId })
      .eq("id", profileId);

    if (!error) {
      const updatedRoleName = roles.find((r) => r.id === newRoleId)?.name || "JOVEN";
      setUsers((prev) =>
        prev.map((u) => (u.id === profileId ? { ...u, role_id: newRoleId, role_name: updatedRoleName } : u))
      );
    }
    setUpdating(null);
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
            <h1 className="text-lg font-bold text-white">Usuarios</h1>
            <p className="text-xs" style={{ color: "#475569" }}>Gestiona roles y permisos</p>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl animate-shimmer" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="card-glass rounded-2xl p-8 text-center mt-4">
              <p className="text-sm" style={{ color: "#475569" }}>No hay usuarios registrados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u, i) => {
                const initials = `${u.first_name[0] || ""}${u.last_name[0] || ""}`.toUpperCase();
                return (
                  <div
                    key={u.id}
                    className="card-glass rounded-2xl p-4 flex items-center gap-4 animate-fadeUp"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.first_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        initials || "U"
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>
                        Rol actual: <span className="font-bold text-indigo-400">{u.role_name}</span>
                      </p>
                    </div>

                    {/* Role Selector */}
                    <div className="flex-shrink-0">
                      {updating === u.id ? (
                        <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <select
                          value={u.role_id || ""}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-white rounded-lg text-xs p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                          <option value="" disabled>Seleccionar Rol</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
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

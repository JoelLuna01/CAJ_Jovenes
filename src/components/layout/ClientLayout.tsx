// src/components/layout/ClientLayout.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BottomNav } from "./BottomNav";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";
import { UserProfile } from "../../types";


export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname?.startsWith("/auth");
  const { user, setUser, setProfile, setHydrated, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registrado:", reg.scope))
        .catch((err) => console.error("Error al registrar SW:", err));
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (initialized.current) return;
    initialized.current = true;

    // Background auth check — doesn't block render
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*, roles(name)")
        .eq("user_id", userId)
        .single();
      if (data) {
        const profile = {
          ...data,
          role_name: (data.roles as { name: string } | null)?.name || "JOVEN",
        } as UserProfile;
        setProfile(profile);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        clearAuth();
        // Only redirect if not already on an auth page
        if (!pathname?.startsWith("/auth")) {
          router.replace("/auth/login");
        }
      }
      setHydrated(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          clearAuth();
        }
        setHydrated(true);
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-2xl" style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }} />
          <p style={{ color: "#475569" }} className="text-sm">Iniciando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen min-h-dvh${!isAuthPage ? " pb-16" : ""}`}>
      {children}
      {!isAuthPage && user && <BottomNav />}
    </div>
  );
};

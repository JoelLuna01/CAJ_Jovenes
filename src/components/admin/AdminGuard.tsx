// src/components/admin/AdminGuard.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "../../store/auth";

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Give 500ms for localStorage hydration
    const timer = setTimeout(() => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      if (profile && profile.role_name !== "ADMIN" && profile.role_name !== "LIDER") {
        router.replace("/");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [user, profile, router]);

  // Show nothing while checking permissions
  if (!user || !profile) return null;
  if (profile.role_name !== "ADMIN" && profile.role_name !== "LIDER") return null;

  return <>{children}</>;
};

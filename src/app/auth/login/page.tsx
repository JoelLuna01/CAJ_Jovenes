// src/app/auth/login/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "../../../features/auth/LoginForm";
import { useAuthStore } from "../../../store/auth";

export default function LoginPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  return (
    <main className="flex min-h-screen min-h-dvh items-center justify-center p-5">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">CAJ Jóvenes</h1>
          <p className="text-sm" style={{ color: "#64748b" }}>
            Comunidad Apostólica de Jesucristo
          </p>
        </div>

        {/* Card */}
        <div
          className="card-glass rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-6">Bienvenido de vuelta</h2>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

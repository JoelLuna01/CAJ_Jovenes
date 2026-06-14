// src/app/profile/edit/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/auth";
import { supabase } from "../../../lib/supabase";

const AVATAR_EMOJIS = ["😊", "🙏", "✝️", "🕊️", "⭐", "🌿", "🔥", "💎", "🦁", "🌊", "🌸", "🎵"];

export default function EditProfilePage() {
  const { user, profile, setProfile, isLoading } = useAuthStore();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"upload" | "emoji">("upload");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  // Initialize form from profile
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setAvatarUrl(profile.avatar_url || null);
      setPreviewUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;
    setUploading(true);

    // Preview locally immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedEmoji(null);

    // Upload to Supabase Storage
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

    if (!error) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Add cache-busting param so image reloads
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(publicUrl);
      setPreviewUrl(publicUrl);
    }
    setUploading(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    setPreviewUrl(null);
    setAvatarUrl(null);
  };

  const handleSave = async () => {
    if (!profile || saving) return;
    if (!firstName.trim()) return;
    setSaving(true);

    // Determine final avatar: photo URL or emoji encoded as data
    const finalAvatar = selectedEmoji ? `emoji:${selectedEmoji}` : (avatarUrl || profile.avatar_url);

    const { data, error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        avatar_url: finalAvatar || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select("*, roles(name)")
      .single();

    if (!error && data) {
      const updated = { ...data, role_name: (data.roles as any)?.name || profile.role_name };
      setProfile(updated);
      setSaved(true);
      setTimeout(() => {
        router.push("/profile");
      }, 1000);
    }
    setSaving(false);
  };

  if (isLoading || !user) return null;

  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  const displayEmoji = selectedEmoji || (profile?.avatar_url?.startsWith("emoji:") ? profile.avatar_url.replace("emoji:", "") : null);
  const displayPhoto = !selectedEmoji && previewUrl && !previewUrl.startsWith("emoji:") ? previewUrl : null;

  return (
    <main className="flex flex-col min-h-screen safe-top max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "#1e293b" }}>
        <button onClick={() => router.back()}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e293b" }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </div>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Editar perfil</h1>
          <p className="text-xs" style={{ color: "#475569" }}>Personaliza tu cuenta</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* Avatar preview */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}
          >
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.5)" }}>
                <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
            {displayPhoto ? (
              <img src={displayPhoto} alt="Avatar" className="w-full h-full object-cover" />
            ) : displayEmoji ? (
              <span className="text-4xl">{displayEmoji}</span>
            ) : (
              <span className="text-3xl font-bold text-white">{initials}</span>
            )}
          </div>

          <p className="text-xs" style={{ color: "#475569" }}>Elige tu foto de perfil</p>
        </div>

        {/* Avatar selector tabs */}
        <div className="card-glass rounded-2xl overflow-hidden">
          <div className="flex border-b" style={{ borderColor: "#1e293b" }}>
            <button
              onClick={() => setTab("upload")}
              className="flex-1 py-3 text-xs font-semibold transition-all"
              style={tab === "upload" ? { color: "#818cf8", borderBottom: "2px solid #6366f1" } : { color: "#475569" }}
            >
              📷 Subir foto
            </button>
            <button
              onClick={() => setTab("emoji")}
              className="flex-1 py-3 text-xs font-semibold transition-all"
              style={tab === "emoji" ? { color: "#818cf8", borderBottom: "2px solid #6366f1" } : { color: "#475569" }}
            >
              😊 Usar emoji
            </button>
          </div>

          {tab === "upload" ? (
            <div className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
                style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px dashed rgba(99,102,241,0.3)" }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {uploading ? "Subiendo..." : "Elegir foto de galería"}
              </button>
              <p className="text-[10px] text-center mt-2" style={{ color: "#334155" }}>
                JPG, PNG o GIF · máx. 5MB
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all"
                    style={{
                      background: selectedEmoji === emoji ? "rgba(99,102,241,0.2)" : "#1e293b",
                      border: selectedEmoji === emoji ? "2px solid #6366f1" : "2px solid transparent",
                      transform: selectedEmoji === emoji ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Name fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#94a3b8" }}>Nombre *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-field"
              placeholder="Tu nombre"
              autoCapitalize="words"
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#94a3b8" }}>Apellido</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-field"
              placeholder="Tu apellido"
              autoCapitalize="words"
            />
          </div>
        </div>

        {/* Email (read only) */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: "#94a3b8" }}>Correo electrónico</label>
          <div
            className="input-field flex items-center gap-2 cursor-not-allowed"
            style={{ opacity: 0.5 }}
          >
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#475569" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-sm" style={{ color: "#94a3b8" }}>{user.email}</span>
          </div>
          <p className="text-[10px] mt-1" style={{ color: "#334155" }}>El correo no se puede cambiar</p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !firstName.trim() || uploading}
          className="w-full py-4 rounded-xl font-semibold text-sm transition-all"
          style={saved
            ? { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }
            : firstName.trim() && !uploading
            ? { background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }
            : { background: "#1e293b", color: "#475569" }}
        >
          {saved ? "✓ ¡Perfil actualizado!" : saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </main>
  );
}

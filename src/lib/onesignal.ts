// src/lib/onesignal.ts

export const initOneSignal = () => {
  if (typeof window === "undefined") return;
  
  // @ts-ignore
  window.OneSignal = window.OneSignal || [];
  // @ts-ignore
  window.OneSignal.push(function () {
    // @ts-ignore
    window.OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "placeholder-app-id",
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: true,
      },
    });
  });
};

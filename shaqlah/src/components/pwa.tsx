"use client";
import { useEffect, useState } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

/** "Install the app": native prompt on Android/desktop, instructions on iOS Safari. */
export function InstallButton() {
  const [evt, setEvt] = useState<any>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (standalone || (!evt && !ios)) return null;
  return (
    <div>
      <button
        className="btn-outline btn-sm !border-white/25 !bg-transparent !text-white hover:!border-brand hover:!text-brand"
        onClick={async () => {
          if (evt) {
            evt.prompt();
            await evt.userChoice;
            setEvt(null);
          } else setShowIos((v) => !v);
        }}
      >
        📲 ثبّت التطبيق على جهازك
      </button>
      {showIos && (
        <p className="mt-2 max-w-xs text-xs leading-6 text-white/70">
          على الآيفون: اضغط زر المشاركة <span aria-hidden>⬆️</span> في متصفح Safari ثم اختر «إضافة إلى الشاشة الرئيسية».
        </p>
      )}
    </div>
  );
}

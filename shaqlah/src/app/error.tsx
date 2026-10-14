"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <div className="text-6xl">😕</div>
      <h1 className="text-2xl font-black">حدث خطأ غير متوقع</h1>
      <p className="max-w-md text-ink-muted">نعتذر عن ذلك. يمكنك إعادة المحاولة، وإن استمرت المشكلة يرجى التواصل معنا.</p>
      <div className="flex gap-3">
        <button className="btn-primary" onClick={reset}>إعادة المحاولة</button>
        <a href="/" className="btn-outline">الرئيسية</a>
      </div>
    </div>
  );
}

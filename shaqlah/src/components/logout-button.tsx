"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function LogoutButton({ className = "btn-outline btn-sm", to = "/" }: { className?: string; to?: string }) {
  const router = useRouter();
  return (
    <button className={className} onClick={async () => { await api("/api/auth/logout", { body: {} }).catch(() => {}); router.push(to); router.refresh(); }}>
      تسجيل الخروج
    </button>
  );
}

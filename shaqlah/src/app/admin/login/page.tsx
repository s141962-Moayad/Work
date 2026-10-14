import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { isStaff } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { BrandMark } from "@/components/brand";

export const metadata: Metadata = { title: "دخول لوحة التحكم", robots: { index: false } };

export default async function AdminLogin() {
  if (isStaff(await getCurrentUser())) redirect("/admin");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-ink px-4 py-10">
      <div className="flex items-center gap-3 text-white"><BrandMark size={52} /><span className="text-3xl font-black">لوحة تحكم شقلح</span></div>
      <AuthForm mode="login" admin />
    </div>
  );
}

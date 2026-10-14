import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/account");
  return <div className="container-x py-12"><AuthForm mode="register" next={next} /></div>;
}

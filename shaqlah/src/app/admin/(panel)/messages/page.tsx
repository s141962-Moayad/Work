import type { Metadata } from "next";
import { query } from "@/lib/db";
import { MessagesList } from "@/components/messages-list";

export const metadata: Metadata = { title: "الرسائل" };

export default async function AdminMessages() {
  const rows = await query(`SELECT * FROM contact_messages ORDER BY handled, id DESC LIMIT 100`);
  return (
    <div className="space-y-5"><h1 className="text-2xl font-black">رسائل العملاء</h1><MessagesList messages={JSON.parse(JSON.stringify(rows))} /></div>
  );
}

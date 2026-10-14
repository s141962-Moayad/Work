"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { recentRefs, type RecentRef } from "@/lib/cart-store";

export function GuestReservations({ loggedIn }: { loggedIn: boolean }) {
  const [refs, setRefs] = useState<RecentRef[]>([]);
  useEffect(() => setRefs(recentRefs("reservation").slice(0, 4)), []);
  if (loggedIn || !refs.length) return null;
  return (
    <ul className="mb-3 space-y-2">
      {refs.map((r) => (
        <li key={r.number}>
          <Link href={`/reservations/${r.number}?k=${r.token}`} className="card flex items-center justify-between p-3 text-sm font-bold hover:shadow-lift">
            <bdi className="ltr">{r.number}</bdi> <span className="text-brand">عرض ←</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

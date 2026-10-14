"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MenuItem } from "@/lib/menu";
import { api } from "@/lib/client";
import { toast } from "@/components/ui/toast";
import { ItemModal } from "@/components/item-modal";

interface Ctx {
  user: { name: string; role: string } | null;
  favorites: Set<number>;
  toggleFavorite: (id: number) => Promise<void>;
  openItem: (item: MenuItem, icon: string) => void;
}
const SiteCtx = createContext<Ctx | null>(null);

export function useSite() {
  const c = useContext(SiteCtx);
  if (!c) throw new Error("SiteProvider missing");
  return c;
}

export function SiteProvider({
  user, favorites: initialFavs, children,
}: { user: Ctx["user"]; favorites: number[]; children: React.ReactNode }) {
  const router = useRouter();
  const [favorites, setFavs] = useState(() => new Set(initialFavs));
  const [open, setOpen] = useState<{ item: MenuItem; icon: string } | null>(null);

  const toggleFavorite = useCallback(
    async (id: number) => {
      if (!user) {
        toast("سجّل الدخول لحفظ أطباقك المفضلة", "info");
        router.push("/login?next=" + encodeURIComponent(location.pathname));
        return;
      }
      const next = !favorites.has(id);
      setFavs((s) => {
        const n = new Set(s);
        next ? n.add(id) : n.delete(id);
        return n;
      });
      try {
        await api("/api/account/favorites", { body: { itemId: id, favorite: next } });
      } catch (e: any) {
        setFavs((s) => {
          const n = new Set(s);
          next ? n.delete(id) : n.add(id);
          return n;
        });
        toast(e.message, "err");
      }
    },
    [favorites, user, router],
  );

  const value = useMemo<Ctx>(
    () => ({ user, favorites, toggleFavorite, openItem: (item, icon) => setOpen({ item, icon }) }),
    [user, favorites, toggleFavorite],
  );

  return (
    <SiteCtx.Provider value={value}>
      {children}
      <ItemModal data={open} onClose={() => setOpen(null)} />
    </SiteCtx.Provider>
  );
}

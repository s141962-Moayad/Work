"use client";
import { useEffect } from "react";

export function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => { if (auto) setTimeout(() => window.print(), 400); }, [auto]);
  return <button className="btn-dark no-print" onClick={() => window.print()}>🖨️ طباعة</button>;
}

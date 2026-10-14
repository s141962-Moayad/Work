import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "شقلح — اطلب واحجز",
    short_name: "شقلح",
    description: "اطلب وجبتك من مطعم شقلح، حدّد موعد الاستلام، واحجز طاولتك.",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    background_color: "#FAF8F5",
    theme_color: "#151515",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "اطلب الآن", url: "/menu", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "احجز طاولة", url: "/reservations", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "طلباتي", url: "/orders", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

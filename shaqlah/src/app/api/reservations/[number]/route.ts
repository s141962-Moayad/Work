import { handler } from "@/lib/api";
import { loadReservationForRequest } from "@/lib/reservation-access";
import { cancelReservationByCustomer, modifyReservation, modifySchema, publicReservation, getReservation } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export const GET = handler({ rate: ["res-get", 120, 60_000] }, async ({ params, user, query }) => {
  return publicReservation(await loadReservationForRequest(params.number, user, query.get("k")));
});

export const PATCH = handler({ schema: modifySchema, rate: ["res-mod", 20, 10 * 60_000] }, async ({ params, user, query, body }) => {
  const r = await loadReservationForRequest(params.number, user, query.get("k"));
  await modifyReservation(r.id, body);
  return publicReservation((await getReservation({ id: r.id }))!);
});

export const DELETE = handler({ rate: ["res-cancel", 20, 10 * 60_000] }, async ({ params, user, query }) => {
  const r = await loadReservationForRequest(params.number, user, query.get("k"));
  await cancelReservationByCustomer(r.id);
  return { cancelled: true };
});

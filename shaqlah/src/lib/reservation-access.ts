import { ApiError } from "./api";
import type { SessionUser } from "./auth";
import { canAccessReservation, getReservation } from "./reservations";

export async function loadReservationForRequest(number: string, user: SessionUser | null, token: string | null | undefined) {
  const r = await getReservation({ number });
  if (!r || !(await canAccessReservation(r, user, token))) throw new ApiError(404, "لم نعثر على الحجز. تأكد من رقم الحجز ورقم الهاتف.");
  return r;
}

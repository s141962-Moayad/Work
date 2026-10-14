import { z } from "zod";
import { handler, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { reassignTable, setReservationStatus } from "@/lib/reservations";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { id } from "@/lib/validation";

const schema = z.object({ status: z.enum(RESERVATION_STATUSES).optional(), tableId: id.optional() });

export const PATCH = handler({ auth: "staff", schema }, async ({ params, body, user, ip }) => {
  const rid = Number(params.id);
  if (!body.status && !body.tableId) throw new ApiError(400, "لا توجد تغييرات.");
  if (body.tableId) await reassignTable(rid, body.tableId);
  if (body.status) await setReservationStatus(rid, body.status);
  await audit(user, "reservation.update", "reservation", rid, body, ip);
  return { saved: true };
});

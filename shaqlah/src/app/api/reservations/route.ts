import { handler } from "@/lib/api";
import { createReservation, reservationSchema } from "@/lib/reservations";

export const POST = handler({ schema: reservationSchema, rate: ["reserve", 15, 10 * 60_000] }, async ({ body, user }) => {
  return createReservation(body, user);
});

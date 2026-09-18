import { getRealtimeCorsOrigins, getRealtimeSecret } from "@/lib/realtime/config";
import { verifyRealtimeToken } from "@/lib/realtime/token";
import type { RealtimeDeps } from "@/server/realtime/attach";
import {
  joinTrackingForUser,
  publishTrackingLocationForUser,
} from "@/server/tracking/service";

export function createProductionRealtimeDeps(): RealtimeDeps {
  return {
    verifyToken: (token) => verifyRealtimeToken(token, getRealtimeSecret()),
    async join(user, bookingId) {
      const result = await joinTrackingForUser(user, bookingId);
      return { snapshot: result.snapshot };
    },
    async publish(user, payload) {
      const result = await publishTrackingLocationForUser(user, payload);
      return {
        position: result.position,
        skipped: result.skipped,
        context: {
          bookingId: result.context.bookingId,
          bookingStatus: result.context.bookingStatus,
        },
      };
    },
    corsOrigins: getRealtimeCorsOrigins(),
  };
}

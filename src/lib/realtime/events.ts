export const TRACKING_EVENTS = {
  join: "tracking:join",
  leave: "tracking:leave",
  location: "tracking:location",
  position: "tracking:position",
  status: "tracking:status",
  error: "tracking:error",
} as const;

export type TrackingEvent = (typeof TRACKING_EVENTS)[keyof typeof TRACKING_EVENTS];

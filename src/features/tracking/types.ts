import type { BookingStatus } from "@/types/domain";

export type TrackingPosition = {
  bookingId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
  source: "geolocation";
};

export type TrackingSnapshot = {
  bookingId: string;
  bookingStatus: BookingStatus;
  trackingActive: boolean;
  canPublish: boolean;
  position: TrackingPosition | null;
};

export type TrackingConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "unauthorized"
  | "unconfigured";

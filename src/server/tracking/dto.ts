import type { BookingStatus } from "@/types/domain";

export type TrackingPositionDto = {
  bookingId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
  source: "geolocation";
};

export type TrackingSnapshotDto = {
  bookingId: string;
  bookingStatus: BookingStatus;
  trackingActive: boolean;
  canPublish: boolean;
  position: TrackingPositionDto | null;
};

export type TrackingStatusPayload = {
  bookingId: string;
  bookingStatus: BookingStatus;
  trackingActive: boolean;
};

export type TrackingErrorPayload = {
  code: string;
  message: string;
};

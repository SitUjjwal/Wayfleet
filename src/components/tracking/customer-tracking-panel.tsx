"use client";

import { TrackingMap } from "@/components/tracking/tracking-map";
import { TrackingStatusBar } from "@/components/tracking/tracking-status-bar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { useTrackingSession } from "@/features/tracking/use-tracking-session";
import type { TrackingSnapshot } from "@/features/tracking/types";

export function CustomerTrackingPanel({
  bookingId,
  vehicleName,
  initial,
}: {
  bookingId: string;
  vehicleName: string;
  initial: TrackingSnapshot;
}) {
  const session = useTrackingSession({
    bookingId,
    initial,
  });
  const position = session.snapshot.position;

  return (
    <div className="space-y-4" data-customer-tracking="1">
      <Card>
        <h2 className="font-semibold text-navy">Live vehicle location</h2>
        <p className="mt-2 text-sm text-muted">
          This page is read-only. Distance shown later will not be driving ETA.
          You are watching {vehicleName} for this booking only.
        </p>
        <div className="mt-4">
          <TrackingStatusBar
            connection={session.connection}
            trackingActive={session.snapshot.trackingActive}
            lastUpdated={position?.recordedAt}
            error={session.error}
          />
        </div>
      </Card>
      {position ? (
        <>
          <TrackingMap
            latitude={position.latitude}
            longitude={position.longitude}
            title={`${vehicleName} approximate location`}
          />
          <p className="text-sm text-muted">
            Approximate coordinates: {position.latitude.toFixed(5)},{" "}
            {position.longitude.toFixed(5)}
          </p>
        </>
      ) : (
        <EmptyState
          title="Waiting for the vehicle"
          description="The last known position will appear here as soon as the driver shares GPS for this trip."
        />
      )}
    </div>
  );
}

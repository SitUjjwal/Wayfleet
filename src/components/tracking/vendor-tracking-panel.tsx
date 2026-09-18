"use client";

import { TrackingMap } from "@/components/tracking/tracking-map";
import { TrackingStatusBar } from "@/components/tracking/tracking-status-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTrackingSession } from "@/features/tracking/use-tracking-session";
import type { TrackingSnapshot } from "@/features/tracking/types";
import { EmptyState } from "@/components/feedback/empty-state";

export function VendorTrackingPanel({
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
    <div className="space-y-4" data-vendor-tracking="1">
      <Card>
        <h2 className="font-semibold text-navy">Share live location</h2>
        <p className="mt-2 text-sm text-muted">
          GPS is sent only while sharing is on for {vehicleName}. Closing this page
          stops the watch. The vehicle listing location is not updated.
        </p>
        <div className="mt-4">
          <TrackingStatusBar
            connection={session.connection}
            trackingActive={session.snapshot.trackingActive}
            sharing={session.sharing}
            lastUpdated={position?.recordedAt}
            error={session.error}
          />
        </div>
        <p className="mt-3 text-sm text-muted" data-gps-state={session.gpsState}>
          GPS: {session.gpsState}
        </p>
        {session.snapshot.trackingActive && session.snapshot.canPublish ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {session.sharing ? (
              <Button type="button" variant="secondary" onClick={session.stopSharing}>
                Stop sharing
              </Button>
            ) : (
              <Button type="button" onClick={session.startSharing}>
                Start sharing
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Tracking is available for confirmed and in-progress trips after the
            booking is accepted.
          </p>
        )}
      </Card>
      {position ? (
        <TrackingMap
          latitude={position.latitude}
          longitude={position.longitude}
          title={`${vehicleName} live location`}
        />
      ) : (
        <EmptyState
          title="No live position yet"
          description={
            session.snapshot.trackingActive
              ? "Turn on sharing to send GPS for this trip. The public listing location is not updated."
              : "Live GPS is available only while this booking is confirmed or in progress."
          }
        />
      )}
      {position ? (
        <p className="text-sm text-muted">
          Current coordinates: {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
        </p>
      ) : null}
    </div>
  );
}

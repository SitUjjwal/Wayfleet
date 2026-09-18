"use client";

import type { ReactNode } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { getBrowserGoogleMapsKey } from "@/lib/maps/config";

export function MapsProvider({ children }: { children: ReactNode }) {
  const apiKey = getBrowserGoogleMapsKey();
  if (!apiKey) {
    return <>{children}</>;
  }
  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      {children}
    </APIProvider>
  );
}

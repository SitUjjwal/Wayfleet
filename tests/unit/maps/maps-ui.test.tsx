/** @jsxImportSource react */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LocationSummary } from "@/components/maps/location-summary";
import { MapView } from "@/components/maps/map-view";
import { locationFromPlaceDetails } from "@/lib/maps/places";

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Map: ({ children }: { children?: ReactNode }) => <div data-mock-map="1">{children}</div>,
  useMap: () => null,
  useMapsLibrary: () => null,
}));

describe("maps UI", () => {
  it("shows a missing-key state without calling Google", () => {
    const html = renderToStaticMarkup(<MapView latitude={18.52} longitude={73.85} />);
    expect(html).toContain("Google Maps is not configured");
    expect(html).toContain('data-map-state="missing-key"');
  });

  it("renders a selected location summary", () => {
    const html = renderToStaticMarkup(
      <LocationSummary
        location={{
          address: "Pune Airport",
          city: "Pune",
          latitude: 18.5793,
          longitude: 73.9089,
        }}
      />,
    );
    expect(html).toContain("Pune Airport");
    expect(html).toContain("18.57930");
    expect(html).toContain('data-location-summary="selected"');
  });

  it("normalizes a place result and ignores incomplete geometry", () => {
    expect(
      locationFromPlaceDetails({
        formattedAddress: "Pune Airport, Pune",
        latitude: 18.5793,
        longitude: 73.9089,
        addressComponents: [
          { long_name: "Pune", types: ["locality"] },
          { long_name: "Maharashtra", types: ["administrative_area_level_1"] },
          { long_name: "India", types: ["country"] },
        ],
      }),
    ).toMatchObject({
      address: "Pune Airport, Pune",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
    });
    expect(locationFromPlaceDetails({ formattedAddress: "Nowhere" })).toBeNull();
  });
});

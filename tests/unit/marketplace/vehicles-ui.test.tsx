/** @jsxImportSource react */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VehicleGrid } from "@/components/marketplace/vehicle-grid";
import { VehiclePagination } from "@/components/marketplace/vehicle-pagination";
import { VehicleFilters } from "@/components/marketplace/vehicle-filters";
import { VendorVehicleForm, VendorVehicleManager } from "@/components/vehicle/vendor-vehicle-manager";
import { LoadingState } from "@/components/feedback/loading-state";
import { ErrorState } from "@/components/feedback/error-state";
import { DEFAULT_VEHICLE_FILTERS } from "@/features/vehicles/filter-vehicles";
import { DEMO_VEHICLES } from "@/features/vehicles/data/mock-vehicles";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/maps/nearby-filter", () => ({
  NearbyFilter: () => <div data-nearby-filter="1" />,
}));

vi.mock("@/components/maps/location-picker", () => ({
  LocationPicker: ({ label }: { label: string }) => (
    <label>
      {label}
      <input type="hidden" name="locationJson" value="" />
    </label>
  ),
}));

describe("marketplace UI", () => {
  it("renders an empty catalog state", () => {
    const html = renderToStaticMarkup(<VehicleGrid vehicles={[]} />);
    expect(html).toContain("No vehicles found.");
  });

  it("renders pagination links from the current filters", () => {
    const html = renderToStaticMarkup(
      <VehiclePagination
        filters={{ ...DEFAULT_VEHICLE_FILTERS, query: "innova", page: 2 }}
        page={2}
        totalPages={4}
      />,
    );
    expect(html).toContain("Page 2 of 4");
    expect(html).toContain("Previous");
    expect(html).toContain("Next");
    expect(html).toContain("q=innova");
  });

  it("keeps search, filter, and sort controls server-driven", () => {
    const html = renderToStaticMarkup(
      <VehicleFilters filters={DEFAULT_VEHICLE_FILTERS} />,
    );
    expect(html).toContain('name="q"');
    expect(html).toContain('name="category"');
    expect(html).toContain('name="minPrice"');
    expect(html).toContain('name="sort"');
    expect(html).toContain("Apply filters");
  });

  it("shows vendor form loading, error, and validation states", () => {
    const vehicle = DEMO_VEHICLES[0];
    const html = renderToStaticMarkup(
      <VendorVehicleForm
        vehicle={vehicle}
        pending
        errors={{ brand: "Enter the brand" }}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );
    expect(html).toContain("Saving…");
    expect(html).toContain("Enter the brand");
    expect(html).toContain('data-vehicle-form="api"');
    expect(html).toContain(vehicle?.registrationNumber);
  });

  it("renders the vendor fleet list and empty state from server data", () => {
    const empty = renderToStaticMarkup(
      <VendorVehicleManager initialVehicles={[]} />,
    );
    expect(empty).toContain("Vendor has no vehicles.");
    const vehicle = DEMO_VEHICLES[0];
    if (!vehicle) {
      throw new Error("expected demo vehicle");
    }
    const html = renderToStaticMarkup(
      <VendorVehicleManager
        initialVehicles={[
          {
            id: vehicle.id,
            category: vehicle.category,
            brand: vehicle.brand,
            model: vehicle.model,
            description: vehicle.description,
            images: vehicle.images,
            vendorName: vehicle.vendorName,
            vendorVerified: vehicle.vendorVerified,
            pricing: vehicle.pricing,
            location: vehicle.location,
            availability: vehicle.availability,
            rating: vehicle.rating,
            registrationNumber: vehicle.registrationNumber,
            status: vehicle.status,
          },
        ]}
      />,
    );
    expect(html).toContain(vehicle.brand);
    expect(html).toContain("Inactivate");
    expect(html).toContain("Edit");
  });

  it("renders loading and error catalog states", () => {
    expect(renderToStaticMarkup(<LoadingState message="Loading vehicles…" />)).toContain(
      "Loading vehicles…",
    );
    expect(
      renderToStaticMarkup(
        <ErrorState title="Could not load vehicles" description="Database unavailable" />,
      ),
    ).toContain("Database unavailable");
  });
});

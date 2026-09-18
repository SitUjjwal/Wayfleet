/** @jsxImportSource react */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublicVehicles = vi.fn();
const getPublicVehicleById = vi.fn();

vi.mock("@/server/vehicles/service", () => ({
  listPublicVehicles: (...args: unknown[]) => listPublicVehicles(...args),
  getPublicVehicleById: (...args: unknown[]) => getPublicVehicleById(...args),
}));

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

vi.mock("@/components/marketplace/vehicle-filters", () => ({
  VehicleFilters: () => <form aria-label="Filter vehicles" />,
}));

describe("marketplace pages", () => {
  beforeEach(() => {
    listPublicVehicles.mockReset();
    getPublicVehicleById.mockReset();
  });

  it("renders vehicles from the public API", { timeout: 20_000 }, async () => {
    listPublicVehicles.mockResolvedValue({
      data: [
        {
          id: "507f1f77bcf86cd799439011",
          category: "suv",
          brand: "Toyota",
          model: "Innova Crysta",
          description: "Family MPV",
          images: [],
          pricing: { amount: 450000, currency: "INR", unit: "day" },
          location: { label: "Pune Airport", city: "Pune" },
          availability: "available",
          rating: { average: 4.8, count: 126 },
          vendor: {
            id: "507f1f77bcf86cd799439012",
            businessName: "Harbor Fleet",
            verificationStatus: "verified",
            rating: { average: 4.8, count: 126 },
          },
          createdAt: "2026-09-08T00:00:00.000Z",
        },
      ],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });
    const { default: VehiclesPage } = await import("@/app/vehicles/page");
    const html = renderToStaticMarkup(
      await VehiclesPage({ searchParams: Promise.resolve({ q: "innova" }) }),
    );
    expect(html).toContain("Toyota Innova Crysta");
    expect(html).toContain("Harbor Fleet");
    expect(html).toContain("1 vehicle");
    expect(html).not.toContain("MH12");
    expect(listPublicVehicles).toHaveBeenCalled();
  });

  it("renders an error state when the catalog cannot load", { timeout: 20_000 }, async () => {
    listPublicVehicles.mockRejectedValue(new Error("down"));
    const { default: VehiclesPage } = await import("@/app/vehicles/page");
    const html = renderToStaticMarkup(
      await VehiclesPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("Could not load vehicles");
  });
});

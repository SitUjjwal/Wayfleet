import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VehicleCard } from "@/components/marketplace/vehicle-card";
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

describe("VehicleCard", () => {
  it("renders name, vendor, price, rating, and availability text", () => {
    const vehicle = DEMO_VEHICLES[0];
    if (!vehicle) {
      throw new Error("expected demo vehicle");
    }
    const html = renderToStaticMarkup(<VehicleCard vehicle={vehicle} />);
    expect(html).toContain("Toyota Innova Crysta");
    expect(html).toContain("Harbor Fleet");
    expect(html).toContain("Verified vendor");
    expect(html).toContain("Available");
    expect(html).toContain("4.8");
    expect(html).toContain(`href="/vehicles/${vehicle.id}"`);
    expect(html).toContain('aria-label="Toyota Innova Crysta in Pune"');
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthHttpError } from "@/server/auth/http-error";
import type { SessionUser } from "@/server/auth/types";
import { VehicleHttpError } from "@/server/vehicles/errors";
import { parseVehicleCreateBody } from "@/server/vehicles/input";
import { validCreateBody } from "../vehicles/helpers";

vi.mock("@/server/auth/guards", () => ({
  requireRole: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/server/vehicles/service", () => ({
  listPublicVehicles: vi.fn(),
  listVendorVehicles: vi.fn(),
  createVehicleForVendor: vi.fn(),
  getPublicVehicleById: vi.fn(),
  updateVehicleForVendor: vi.fn(),
  inactivateVehicleForVendor: vi.fn(),
}));

import { requireRole } from "@/server/auth/guards";
import { GET, POST } from "@/app/api/vehicles/route";
import {
  DELETE,
  GET as GET_VEHICLE,
  PATCH,
} from "@/app/api/vehicles/[id]/route";
import {
  createVehicleForVendor,
  getPublicVehicleById,
  inactivateVehicleForVendor,
  listPublicVehicles,
  updateVehicleForVendor,
} from "@/server/vehicles/service";

const vendor: SessionUser = {
  id: "507f1f77bcf86cd799439011",
  role: "vendor",
  status: "active",
  name: "Harbor",
  email: "harbor@example.com",
};

const publicVehicle = {
  id: "507f1f77bcf86cd799439099",
  category: "car" as const,
  brand: "Toyota",
  model: "Etios",
  description: "City sedan",
  images: [] as string[],
  pricing: { amount: 150000, currency: "INR", unit: "day" },
  location: { label: "Pune", city: "Pune" },
  availability: "available" as const,
  rating: { average: 0, count: 0 },
  vendor: {
    id: "507f1f77bcf86cd799439012",
    businessName: "Harbor Fleet",
    verificationStatus: "unverified" as const,
    rating: { average: 0, count: 0 },
  },
  createdAt: "2026-09-08T00:00:00.000Z",
};

function jsonRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("vehicle API routes", () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockReset();
    vi.mocked(listPublicVehicles).mockReset();
    vi.mocked(createVehicleForVendor).mockReset();
    vi.mocked(getPublicVehicleById).mockReset();
    vi.mocked(updateVehicleForVendor).mockReset();
    vi.mocked(inactivateVehicleForVendor).mockReset();
  });

  it("returns a public list with pagination metadata", async () => {
    vi.mocked(listPublicVehicles).mockResolvedValue({
      data: [publicVehicle],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });
    const response = await GET(
      jsonRequest("http://localhost/api/vehicles?category=car&minPrice=500&maxPrice=3000"),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({ page: 1, limit: 12, total: 1, totalPages: 1 });
    expect(JSON.stringify(body)).not.toContain("registrationNumber");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("rejects unauthenticated vendor create with 401", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthHttpError(401));
    const response = await POST(
      jsonRequest("http://localhost/api/vehicles", {
        method: "POST",
        body: JSON.stringify(validCreateBody()),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthenticated");
  });

  it("rejects customer create with 403", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthHttpError(403));
    const response = await POST(
      jsonRequest("http://localhost/api/vehicles", {
        method: "POST",
        body: JSON.stringify(validCreateBody()),
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("Forbidden");
  });

  it("creates a vehicle for an authenticated vendor", async () => {
    vi.mocked(requireRole).mockResolvedValue(vendor);
    vi.mocked(createVehicleForVendor).mockImplementation(async (_user, body) => {
      const input = parseVehicleCreateBody(body);
      return {
        ...publicVehicle,
        registrationNumber: input.registrationNumber,
        status: "active",
        brand: input.brand,
      };
    });
    const response = await POST(
      jsonRequest("http://localhost/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody()),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.registrationNumber).toBe("MH12ZZ9999");
  });

  it("returns 422 for invalid vehicle data", async () => {
    vi.mocked(requireRole).mockResolvedValue(vendor);
    vi.mocked(createVehicleForVendor).mockImplementation(async (_user, body) => {
      parseVehicleCreateBody(body);
      throw new Error("unreachable");
    });
    const response = await POST(
      jsonRequest("http://localhost/api/vehicles", {
        method: "POST",
        body: JSON.stringify(validCreateBody({ priceRupees: -1, category: "spaceship" })),
      }),
    );
    expect(response.status).toBe(422);
  });

  it("does not let a client override vendorId", async () => {
    vi.mocked(requireRole).mockResolvedValue(vendor);
    vi.mocked(createVehicleForVendor).mockImplementation(async (_user, body) => {
      parseVehicleCreateBody(body);
      throw new Error("unreachable");
    });
    const response = await POST(
      jsonRequest("http://localhost/api/vehicles", {
        method: "POST",
        body: JSON.stringify(validCreateBody({ vendorId: "507f1f77bcf86cd799439099" })),
      }),
    );
    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe("Unauthorized field cannot be modified");
  });

  it("forbids a vendor from modifying another vendor's vehicle", async () => {
    vi.mocked(requireRole).mockResolvedValue(vendor);
    vi.mocked(updateVehicleForVendor).mockRejectedValue(new VehicleHttpError(403, "Forbidden"));
    const response = await PATCH(
      jsonRequest("http://localhost/api/vehicles/507f1f77bcf86cd799439099", {
        method: "PATCH",
        body: JSON.stringify({ brand: "Stolen" }),
      }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439099" }) },
    );
    expect(response.status).toBe(403);
  });

  it("forbids a vendor from deleting another vendor's vehicle", async () => {
    vi.mocked(requireRole).mockResolvedValue(vendor);
    vi.mocked(inactivateVehicleForVendor).mockRejectedValue(new VehicleHttpError(403, "Forbidden"));
    const response = await DELETE(
      jsonRequest("http://localhost/api/vehicles/507f1f77bcf86cd799439099", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439099" }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 400 for an invalid vehicle id", async () => {
    vi.mocked(getPublicVehicleById).mockRejectedValue(
      new VehicleHttpError(400, "Invalid vehicle id"),
    );
    const response = await GET_VEHICLE(jsonRequest("http://localhost/api/vehicles/not-an-id"), {
      params: Promise.resolve({ id: "not-an-id" }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 404 when a public vehicle is missing", async () => {
    vi.mocked(getPublicVehicleById).mockRejectedValue(
      new VehicleHttpError(404, "Vehicle not found"),
    );
    const response = await GET_VEHICLE(
      jsonRequest("http://localhost/api/vehicles/507f1f77bcf86cd799439099"),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439099" }) },
    );
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("Vehicle not found");
  });

  it("rejects unsupported query operators on GET", async () => {
    const response = await GET(jsonRequest("http://localhost/api/vehicles?$where=true"));
    expect(response.status).toBe(400);
    expect(listPublicVehicles).not.toHaveBeenCalled();
  });

  it("parses nearby search query parameters", async () => {
    vi.mocked(listPublicVehicles).mockResolvedValue({
      data: [{ ...publicVehicle, location: { ...publicVehicle.location, distanceMeters: 1250 } }],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });
    const response = await GET(
      jsonRequest(
        "http://localhost/api/vehicles?latitude=18.52&longitude=73.85&radius=10000&category=car",
      ),
    );
    expect(response.status).toBe(200);
    expect(listPublicVehicles).toHaveBeenCalledWith(
      expect.objectContaining({
        nearby: { latitude: 18.52, longitude: 73.85, radiusMeters: 10000 },
        category: "car",
      }),
    );
    expect((await response.json()).data[0].location.distanceMeters).toBe(1250);
  });

  it("rejects an invalid nearby radius", async () => {
    const response = await GET(
      jsonRequest("http://localhost/api/vehicles?latitude=18.52&longitude=73.85&radius=-5"),
    );
    expect(response.status).toBe(422);
    expect(listPublicVehicles).not.toHaveBeenCalled();
  });

  it("rejects invalid coordinates on create", async () => {
    vi.mocked(requireRole).mockResolvedValue(vendor);
    vi.mocked(createVehicleForVendor).mockImplementation(async (_user, body) => {
      parseVehicleCreateBody(body);
      throw new Error("unreachable");
    });
    const response = await POST(
      jsonRequest("http://localhost/api/vehicles", {
        method: "POST",
        body: JSON.stringify(
          validCreateBody({
            location: { address: "Pune", latitude: 18.52, longitude: 200 },
          }),
        ),
      }),
    );
    expect(response.status).toBe(422);
  });
});

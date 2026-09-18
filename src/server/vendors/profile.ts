import "server-only";

import { isDuplicateKeyError, VehicleHttpError } from "@/server/vehicles/errors";
import { connectDb, isMongoConfigured } from "@/lib/db";
import { VendorModel, type VendorDocument } from "@/models/vendor";
import type { SessionUser } from "@/server/auth/types";

export function requireMongoForVehicles(): void {
  if (!isMongoConfigured()) {
    throw new VehicleHttpError(503, "Database unavailable");
  }
}

export async function ensureVendorForUser(user: SessionUser): Promise<VendorDocument> {
  requireMongoForVehicles();
  await connectDb();
  const existing = await VendorModel.findOne({ user: user.id });
  if (existing) {
    return existing;
  }

  try {
    return await VendorModel.create({
      user: user.id,
      businessName: user.name?.trim() || "Vendor",
      contact: user.email ? { email: user.email } : {},
      kycStatus: "not_started",
      verificationStatus: "unverified",
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const raced = await VendorModel.findOne({ user: user.id });
      if (raced) {
        return raced;
      }
    }
    throw error;
  }
}

export async function requireVendorProfile(user: SessionUser): Promise<VendorDocument> {
  if (user.role !== "vendor") {
    throw new VehicleHttpError(403, "Forbidden");
  }
  return ensureVendorForUser(user);
}

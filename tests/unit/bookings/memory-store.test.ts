import { describe, expect, it } from "vitest";
import { rangesOverlap } from "@/lib/booking/overlap";
import { resolveBookingTransition } from "@/lib/booking/transitions";
import { calculateBookingAmount } from "@/lib/booking/pricing";
import type { BookingStatus } from "@/types/domain";

type StoredBooking = {
  id: string;
  customerId: string;
  vendorId: string;
  vehicleId: string;
  startsAt: Date;
  endsAt: Date;
  amount: number;
  status: BookingStatus;
};

const BLOCKING: BookingStatus[] = ["pending", "confirmed", "in_progress"];

class MemoryBookingStore {
  bookings: StoredBooking[] = [];

  create(input: Omit<StoredBooking, "id" | "status" | "amount"> & { unitAmount: number }) {
    const amount = calculateBookingAmount({
      unitAmount: input.unitAmount,
      unit: "day",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    });
    const conflict = this.bookings.some(
      (booking) =>
        booking.vehicleId === input.vehicleId &&
        BLOCKING.includes(booking.status) &&
        rangesOverlap(booking.startsAt, booking.endsAt, input.startsAt, input.endsAt),
    );
    if (conflict) {
      throw new Error("BOOKING_CONFLICT");
    }
    const created: StoredBooking = {
      id: `b-${this.bookings.length + 1}`,
      customerId: input.customerId,
      vendorId: input.vendorId,
      vehicleId: input.vehicleId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      amount,
      status: "pending",
    };
    this.bookings.push(created);
    return created;
  }

  transition(actor: { id: string; role: "customer" | "vendor" }, id: string, action: "confirm" | "reject" | "start" | "complete" | "cancel") {
    const booking = this.bookings.find((item) => item.id === id);
    if (!booking) {
      throw new Error("not found");
    }
    if (actor.role === "customer" && booking.customerId !== actor.id) {
      throw new Error("forbidden");
    }
    if (actor.role === "vendor" && booking.vendorId !== actor.id) {
      throw new Error("forbidden");
    }
    booking.status = resolveBookingTransition(booking.status, action, actor.role);
    return booking;
  }
}

describe("in-memory booking store", () => {
  const windowA = {
    startsAt: new Date("2026-09-10T10:00:00.000Z"),
    endsAt: new Date("2026-09-11T10:00:00.000Z"),
  };

  it("creates a booking with a server-calculated amount", () => {
    const store = new MemoryBookingStore();
    const created = store.create({
      customerId: "c1",
      vendorId: "v1",
      vehicleId: "car-1",
      unitAmount: 150000,
      ...windowA,
    });
    expect(created.amount).toBe(150000);
    expect(created.status).toBe("pending");
  });

  it("rejects overlapping pending bookings on the same vehicle", () => {
    const store = new MemoryBookingStore();
    store.create({
      customerId: "c1",
      vendorId: "v1",
      vehicleId: "car-1",
      unitAmount: 150000,
      ...windowA,
    });
    expect(() =>
      store.create({
        customerId: "c2",
        vendorId: "v1",
        vehicleId: "car-1",
        unitAmount: 150000,
        startsAt: new Date("2026-09-10T20:00:00.000Z"),
        endsAt: new Date("2026-09-11T20:00:00.000Z"),
      }),
    ).toThrow("BOOKING_CONFLICT");
  });

  it("lets a cancelled booking free the vehicle", () => {
    const store = new MemoryBookingStore();
    const first = store.create({
      customerId: "c1",
      vendorId: "v1",
      vehicleId: "car-1",
      unitAmount: 150000,
      ...windowA,
    });
    store.transition({ id: "c1", role: "customer" }, first.id, "cancel");
    const second = store.create({
      customerId: "c2",
      vendorId: "v1",
      vehicleId: "car-1",
      unitAmount: 150000,
      ...windowA,
    });
    expect(second.status).toBe("pending");
  });

  it("enforces customer and vendor ownership", () => {
    const store = new MemoryBookingStore();
    const created = store.create({
      customerId: "c1",
      vendorId: "v1",
      vehicleId: "car-1",
      unitAmount: 150000,
      ...windowA,
    });
    expect(() =>
      store.transition({ id: "c2", role: "customer" }, created.id, "cancel"),
    ).toThrow("forbidden");
    expect(() =>
      store.transition({ id: "v2", role: "vendor" }, created.id, "confirm"),
    ).toThrow("forbidden");
    expect(store.transition({ id: "v1", role: "vendor" }, created.id, "confirm").status).toBe(
      "confirmed",
    );
  });
});

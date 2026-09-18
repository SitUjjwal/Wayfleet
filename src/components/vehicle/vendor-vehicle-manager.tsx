"use client";

import { useMemo, useState, type FormEvent } from "react";
import { LocationPicker } from "@/components/maps/location-picker";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { SelectField } from "@/components/forms/select-field";
import { TextAreaField } from "@/components/forms/text-area-field";
import { TextField } from "@/components/forms/text-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { ManagedVehicle } from "@/features/vehicles/types";
import {
  requestVehicleApi,
  toManagedVehicle,
} from "@/features/vehicles/vehicle-api";
import { CATEGORY_LABELS } from "@/lib/labels";
import { formatMinorUnits } from "@/lib/money";
import type { FieldErrors } from "@/lib/validation/auth-input";
import {
  parseVehicleFormInput,
  VEHICLE_FORM_CATEGORIES,
} from "@/lib/validation/vehicle-form";
import type { LocationInput } from "@/lib/geo/types";
import { VEHICLE_AVAILABILITY } from "@/types/domain";

type ManagedDto = Parameters<typeof toManagedVehicle>[0];

export function VendorVehicleForm({
  vehicle,
  errors,
  pending,
  onClose,
  onSubmit,
}: {
  vehicle?: ManagedVehicle;
  errors?: FieldErrors;
  pending?: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [location, setLocation] = useState<LocationInput | null>(
    vehicle?.location.latitude !== undefined && vehicle.location.longitude !== undefined
      ? {
          address: vehicle.location.address ?? vehicle.location.label,
          ...(vehicle.location.city ? { city: vehicle.location.city } : {}),
          ...(vehicle.location.state ? { state: vehicle.location.state } : {}),
          ...(vehicle.location.country ? { country: vehicle.location.country } : {}),
          latitude: vehicle.location.latitude,
          longitude: vehicle.location.longitude,
        }
      : null,
  );
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-line bg-paper-strong p-5"
      data-vehicle-form="api"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-navy">
          {vehicle ? "Edit vehicle" : "Add vehicle"}
        </h2>
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          Close
        </Button>
      </div>
      <SelectField
        id="category"
        name="category"
        label="Category"
        required
        defaultValue={vehicle?.category ?? "car"}
        error={errors?.category}
      >
        {VEHICLE_FORM_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </option>
        ))}
      </SelectField>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="brand"
          name="brand"
          label="Brand"
          required
          defaultValue={vehicle?.brand}
          error={errors?.brand}
        />
        <TextField
          id="model"
          name="model"
          label="Model"
          required
          defaultValue={vehicle?.model}
          error={errors?.model}
        />
      </div>
      <TextField
        id="registrationNumber"
        name="registrationNumber"
        label="Registration number"
        required
        defaultValue={vehicle?.registrationNumber}
        error={errors?.registrationNumber}
      />
      <TextField
        id="priceRupees"
        name="priceRupees"
        label="Price per day (₹)"
        type="number"
        min={0}
        inputMode="numeric"
        required
        defaultValue={
          vehicle ? String(Math.round(vehicle.pricing.amount / 100)) : ""
        }
        error={errors?.priceRupees}
      />
      <TextAreaField
        id="description"
        name="description"
        label="Description"
        defaultValue={vehicle?.description}
        error={errors?.description}
      />
      <TextField
        id="images"
        name="images"
        label="Image URLs"
        defaultValue={vehicle?.images.join(", ")}
        error={errors?.images}
      />
      <p className="text-xs text-muted">
        File uploads are not enabled yet. Optional http(s) URLs are stored as-is.
      </p>
      <LocationPicker
        id="location"
        label="Operating location"
        value={location}
        error={errors?.location}
        onChange={setLocation}
      />
      <input
        type="hidden"
        name="locationJson"
        value={location ? JSON.stringify(location) : ""}
      />
      <SelectField
        id="availability"
        name="availability"
        label="Availability"
        required
        defaultValue={vehicle?.availability ?? "unavailable"}
        error={errors?.availability}
      >
        {VEHICLE_AVAILABILITY.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </SelectField>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : vehicle ? "Save changes" : "Create vehicle"}
      </Button>
    </form>
  );
}

export function VendorVehicleManager({
  initialVehicles,
  initialError,
}: {
  initialVehicles: ManagedVehicle[];
  initialError?: string;
}) {
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>(initialVehicles);
  const [loadError, setLoadError] = useState<string | undefined>(initialError);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>();
  const [notice, setNotice] = useState<string>();
  const [pending, setPending] = useState(false);
  const editing = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === editingId),
    [vehicles, editingId],
  );

  async function refresh() {
    const { status, body } = await requestVehicleApi<ManagedDto[]>(
      "/api/vehicles?mine=1&limit=50",
    );
    if (!body.success) {
      throw new Error(body.error || `Could not load vehicles (${status})`);
    }
    setVehicles(body.data.map(toManagedVehicle));
    setLoadError(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseVehicleFormInput({
      category: form.get("category"),
      brand: form.get("brand"),
      model: form.get("model"),
      registrationNumber: form.get("registrationNumber"),
      priceRupees: form.get("priceRupees"),
      description: form.get("description"),
      images: form.get("images"),
      locationJson: form.get("locationJson"),
      availability: form.get("availability"),
    });
    if (!parsed.data) {
      setErrors(parsed.fields);
      return;
    }

    const payload = {
      category: parsed.data.category,
      brand: parsed.data.brand,
      model: parsed.data.model,
      registrationNumber: parsed.data.registrationNumber,
      priceRupees: parsed.data.priceRupees,
      description: parsed.data.description,
      images: parsed.data.images,
      location: parsed.data.location,
      availability: parsed.data.availability,
    };

    setPending(true);
    setNotice(undefined);
    try {
      const path = editing ? `/api/vehicles/${editing.id}` : "/api/vehicles";
      const { body } = await requestVehicleApi<ManagedDto>(path, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      if (!body.success) {
        setErrors(body.fields);
        setNotice(body.error);
        return;
      }
      setErrors(undefined);
      setCreating(false);
      setEditingId(null);
      setNotice(editing ? "Vehicle updated." : "Vehicle created.");
      await refresh();
    } catch {
      setNotice("Could not save the vehicle. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function inactivate(id: string) {
    setPending(true);
    setNotice(undefined);
    try {
      const { body } = await requestVehicleApi<ManagedDto>(`/api/vehicles/${id}`, {
        method: "DELETE",
      });
      if (!body.success) {
        setNotice(body.error);
        return;
      }
      if (editingId === id) {
        setEditingId(null);
      }
      setNotice("Listing inactivated. The record is kept for future bookings.");
      await refresh();
    } catch {
      setNotice("Could not inactivate the vehicle.");
    } finally {
      setPending(false);
    }
  }

  async function toggleAvailability(vehicle: ManagedVehicle) {
    setPending(true);
    setNotice(undefined);
    try {
      const next =
        vehicle.availability === "available" ? "unavailable" : "available";
      const { body } = await requestVehicleApi<ManagedDto>(
        `/api/vehicles/${vehicle.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ availability: next }),
        },
      );
      if (!body.success) {
        setNotice(body.error);
        return;
      }
      setNotice("Availability updated.");
      await refresh();
    } catch {
      setNotice("Could not update availability.");
    } finally {
      setPending(false);
    }
  }

  if (loadError) {
    return (
      <ErrorState
        title="Could not load vehicles"
        description={loadError}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">Vehicles</h1>
          <p className="mt-1 text-sm text-muted">
            Listings you create are stored in MongoDB and appear in the public catalog
            when active.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreating(true);
            setEditingId(null);
            setErrors(undefined);
            setNotice(undefined);
          }}
          disabled={pending}
        >
          Add vehicle
        </Button>
      </div>
      {notice ? (
        <p role="status" className="text-sm text-muted">
          {notice}
        </p>
      ) : null}

      {creating || editing ? (
        <VendorVehicleForm
          key={editing?.id ?? "new"}
          vehicle={editing}
          errors={errors}
          pending={pending}
          onClose={() => {
            setCreating(false);
            setEditingId(null);
            setErrors(undefined);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {vehicles.length === 0 ? (
        <EmptyState
          title="Vendor has no vehicles."
          description="Add a listing to publish it in the marketplace."
        />
      ) : (
        <ul className="space-y-3">
          {vehicles.map((vehicle) => (
            <li
              key={vehicle.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-paper-strong p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-navy">
                  {vehicle.brand} {vehicle.model}
                </p>
                <p className="text-sm text-muted">
                  {vehicle.registrationNumber} · {CATEGORY_LABELS[vehicle.category]}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusIndicator availability={vehicle.availability} />
                  <Badge tone={vehicle.status === "active" ? "success" : "neutral"}>
                    Status: {vehicle.status}
                  </Badge>
                  <span className="text-sm text-ink">
                    {formatMinorUnits(vehicle.pricing.amount)} / day
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    setEditingId(vehicle.id);
                    setCreating(false);
                    setErrors(undefined);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  disabled={pending || vehicle.status === "inactive"}
                  onClick={() => {
                    void toggleAvailability(vehicle);
                  }}
                >
                  Toggle availability
                </Button>
                <Button
                  variant="danger"
                  disabled={pending || vehicle.status === "inactive"}
                  onClick={() => {
                    void inactivate(vehicle.id);
                  }}
                >
                  Inactivate
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

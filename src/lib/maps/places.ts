import type { LocationInput } from "@/lib/geo/types";

export type PlaceSuggestion = {
  placeId: string;
  description: string;
};

type AddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

function component(
  parts: AddressComponent[],
  type: string,
): string | undefined {
  const match = parts.find((item) => item.types?.includes(type));
  const value = match?.long_name ?? match?.short_name;
  return value?.trim() || undefined;
}

export function locationFromPlaceDetails(input: {
  formattedAddress?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  addressComponents?: AddressComponent[];
}): LocationInput | null {
  if (
    typeof input.latitude !== "number" ||
    typeof input.longitude !== "number" ||
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude)
  ) {
    return null;
  }
  const parts = input.addressComponents ?? [];
  const city =
    component(parts, "locality") ??
    component(parts, "administrative_area_level_2") ??
    component(parts, "postal_town");
  const address = (input.formattedAddress ?? input.name ?? city ?? "").trim();
  if (!address) {
    return null;
  }
  return {
    address,
    ...(city ? { city } : {}),
    ...(component(parts, "administrative_area_level_1")
      ? { state: component(parts, "administrative_area_level_1") }
      : {}),
    ...(component(parts, "country") ? { country: component(parts, "country") } : {}),
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

export function locationFromCoordinates(
  latitude: number,
  longitude: number,
  address = "Selected location",
): LocationInput {
  return { address, latitude, longitude };
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { LocationInput } from "@/lib/geo/types";
import { getBrowserGoogleMapsKey } from "@/lib/maps/config";
import {
  locationFromPlaceDetails,
  type PlaceSuggestion,
} from "@/lib/maps/places";

const DEBOUNCE_MS = 300;

type PlacesLibrary = {
  AutocompleteService: new () => {
    getPlacePredictions: (
      request: { input: string },
      callback: (
        predictions: Array<{ place_id: string; description: string }> | null,
        status: string,
      ) => void,
    ) => void;
  };
  PlacesService: new (attrContainer: HTMLDivElement) => {
    getDetails: (
      request: { placeId: string; fields: string[] },
      callback: (
        place: {
          formatted_address?: string;
          name?: string;
          address_components?: Array<{
            long_name?: string;
            short_name?: string;
            types?: string[];
          }>;
          geometry?: { location?: { lat: () => number; lng: () => number } };
        } | null,
        status: string,
      ) => void,
    ) => void;
  };
};

export function LocationSearch(props: {
  id: string;
  label: string;
  value?: string;
  error?: string;
  placeholder?: string;
  onSelect: (location: LocationInput) => void;
  onQueryChange?: (query: string) => void;
}) {
  if (!getBrowserGoogleMapsKey()) {
    return <LocationSearchFields {...props} places={null} />;
  }
  return <LocationSearchGoogle {...props} />;
}

function LocationSearchGoogle(props: Parameters<typeof LocationSearch>[0]) {
  const places = useMapsLibrary("places") as PlacesLibrary | null;
  return <LocationSearchFields {...props} places={places} />;
}

function LocationSearchFields({
  id,
  label,
  value,
  error,
  placeholder = "Search for a place",
  onSelect,
  onQueryChange,
  places,
}: Parameters<typeof LocationSearch>[0] & { places: PlacesLibrary | null }) {
  const listId = useId();
  const errorId = `${id}-error`;
  const [query, setQuery] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const debounceRef = useRef<number | undefined>(undefined);
  const visibleSuggestions = query.trim().length < 3 ? [] : suggestions;
  const visibleStatus = query.trim().length < 3 ? "idle" : status;

  useEffect(() => {
    if (!places || query.trim().length < 3) {
      return;
    }
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setStatus("loading");
      const service = new places.AutocompleteService();
      service.getPlacePredictions({ input: query.trim() }, (predictions, resultStatus) => {
        if (resultStatus === "ZERO_RESULTS" || !predictions?.length) {
          setSuggestions([]);
          setStatus("empty");
          return;
        }
        if (resultStatus !== "OK") {
          setSuggestions([]);
          setStatus("error");
          return;
        }
        setSuggestions(
          predictions.map((item) => ({
            placeId: item.place_id,
            description: item.description,
          })),
        );
        setStatus("idle");
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(debounceRef.current);
  }, [places, query]);

  function choose(suggestion: PlaceSuggestion) {
    if (!places) {
      setStatus("error");
      return;
    }
    const service = new places.PlacesService(document.createElement("div"));
    service.getDetails(
      {
        placeId: suggestion.placeId,
        fields: ["geometry", "formatted_address", "address_components", "name"],
      },
      (place, resultStatus) => {
        if (resultStatus !== "OK" || !place?.geometry?.location) {
          setStatus("error");
          return;
        }
        const location = locationFromPlaceDetails({
          formattedAddress: place.formatted_address ?? suggestion.description,
          name: place.name,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          addressComponents: place.address_components,
        });
        if (!location) {
          setStatus("error");
          return;
        }
        setQuery(location.address);
        setSuggestions([]);
        onSelect(location);
      },
    );
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        {label}
      </label>
      <input
        id={id}
        name={`${id}Query`}
        type="search"
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-controls={listId}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          onQueryChange?.(next);
          if (!next.trim()) {
            setSuggestions([]);
            setStatus("idle");
          }
        }}
        className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
      />
      {visibleStatus === "loading" ? (
        <p className="text-sm text-muted" role="status">
          Searching places…
        </p>
      ) : null}
      {visibleStatus === "empty" ? (
        <p className="text-sm text-muted" role="status">
          No places found.
        </p>
      ) : null}
      {visibleStatus === "error" ? (
        <p className="text-sm text-danger" role="alert">
          Place search is unavailable. Enter coordinates below or try again.
        </p>
      ) : null}
      {visibleSuggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Place suggestions"
          className="max-h-48 overflow-auto rounded-md border border-line bg-paper-strong"
        >
          {visibleSuggestions.map((item) => (
            <li key={item.placeId}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                className="w-full px-3 py-2 text-left text-sm text-navy hover:bg-paper focus-visible:bg-paper"
                onClick={() => choose(item)}
              >
                {item.description}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!getBrowserGoogleMapsKey() ? (
        <p className="text-xs text-muted">
          Google Maps search is off. Use coordinates or your current location.
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

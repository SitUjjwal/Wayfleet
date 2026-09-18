"use client";

import { useState } from "react";
import { VehiclePhoto } from "@/components/marketplace/vehicle-card";
import type { CatalogVehicle } from "@/features/vehicles/types";

export function VehicleGallery({ vehicle }: { vehicle: CatalogVehicle }) {
  const frames = vehicle.images.length > 0 ? vehicle.images : [""];
  const [index, setIndex] = useState(0);
  const current = { ...vehicle, images: frames[index] ? [frames[index]] : [] };

  return (
    <div>
      <VehiclePhoto vehicle={current} className="h-64 sm:h-80" />
      {frames.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {frames.map((src, frameIndex) => (
            <button
              key={`${src}-${frameIndex}`}
              type="button"
              onClick={() => setIndex(frameIndex)}
              aria-pressed={index === frameIndex}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border ${
                index === frameIndex ? "border-navy" : "border-line"
              }`}
            >
              <VehiclePhoto
                vehicle={{ ...vehicle, images: src ? [src] : [] }}
                className="h-16"
              />
              <span className="sr-only">Show image {frameIndex + 1}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

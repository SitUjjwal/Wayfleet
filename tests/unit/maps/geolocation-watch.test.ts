import { afterEach, describe, expect, it, vi } from "vitest";
import {
  geolocationMessage,
  watchBrowserLocation,
} from "@/lib/maps/geolocation";

describe("browser geolocation watch", () => {
  const original = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: original,
    });
  });
  it("reports unsupported browsers and permission errors", () => {
    expect(geolocationMessage("denied")).toContain("denied");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: undefined,
    });
    const unsupported: string[] = [];
    const handle = watchBrowserLocation((result) => {
      if (!result.ok) {
        unsupported.push(result.reason);
      }
    });
    expect(unsupported).toEqual(["unsupported"]);
    handle.stop();
  });

  it("starts and stops watchPosition only while sharing", () => {
    const clearWatch = vi.fn();
    const watchPosition = vi.fn(() => 42);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        geolocation: {
          watchPosition,
          clearWatch,
        },
      },
    });
    const handle = watchBrowserLocation(() => undefined);
    expect(watchPosition).toHaveBeenCalledTimes(1);
    handle.stop();
    expect(clearWatch).toHaveBeenCalledWith(42);
  });
});

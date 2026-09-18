import type { ReactNode } from "react";

export function APIProvider({ children }: { children: ReactNode; apiKey?: string; libraries?: string[] }) {
  return <>{children}</>;
}

export function Map({ children }: { children?: ReactNode }) {
  return <div data-mock-map="1">{children}</div>;
}

export function useMap() {
  return null;
}

export function useMapsLibrary() {
  return null;
}

export type GeoPoint = {
  type: "Point";
  coordinates: [longitude: number, latitude: number];
};

export type LocationInput = {
  address: string;
  city?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

export type StoredLocation = {
  label: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  point?: GeoPoint;
};

export type PublicLocation = {
  label: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
};

export type PreciseLocation = PublicLocation & {
  address: string;
};

export type NearbySearch = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export function getBrowserGoogleMapsKey(): string | undefined {
  const value = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return value ? value : undefined;
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getBrowserGoogleMapsKey());
}

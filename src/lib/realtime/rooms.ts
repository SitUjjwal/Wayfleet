export function trackingRoom(bookingId: string): string {
  return `tracking:booking:${bookingId}`;
}
